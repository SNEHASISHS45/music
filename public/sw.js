const CACHE_NAME = 'nove-v3';
const STATIC_CACHE = 'nove-static-v3';
const AUDIO_CACHE = 'nove-audio-v1';

// Core assets to cache immediately
const STATIC_ASSETS = [
    './',
    'index.html',
    'manifest.json',
    'index.css'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== STATIC_CACHE && name !== AUDIO_CACHE && name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip cross-origin requests except for CDN assets
    if (!url.origin.includes(self.location.origin) &&
        !url.origin.includes('googleapis.com') &&
        !url.origin.includes('gstatic.com') &&
        !url.origin.includes('esm.sh')) {
        return;
    }

    // Handle audio files specially - cache on demand
    if (url.pathname.includes('/audio/') ||
        event.request.url.includes('.mp3') ||
        event.request.url.includes('.m4a') ||
        event.request.url.includes('.webm')) {
        event.respondWith(
            caches.open(AUDIO_CACHE).then((cache) => {
                return cache.match(event.request).then((response) => {
                    if (response) {
                        console.log('[SW] Serving audio from cache:', url.pathname);
                        return response;
                    }
                    return fetch(event.request).then((networkResponse) => {
                        // Only cache successful responses
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // For other requests, try cache first, then network
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                // Return cached version and update in background
                event.waitUntil(
                    fetch(event.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, networkResponse);
                            });
                        }
                    }).catch(() => { })
                );
                return response;
            }

            // Not in cache, fetch from network
            return fetch(event.request).then((networkResponse) => {
                // Cache successful GET requests
                if (networkResponse &&
                    networkResponse.status === 200 &&
                    event.request.method === 'GET') {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Return offline page if available
                if (event.request.mode === 'navigate') {
                    return caches.match('index.html');
                }
                return new Response('Offline', { status: 503 });
            });
        })
    );
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CACHE_AUDIO') {
        const { url, id } = event.data;
        caches.open(AUDIO_CACHE).then((cache) => {
            fetch(url).then((response) => {
                if (response.ok) {
                    cache.put(url, response);
                    console.log('[SW] Cached audio:', id);
                }
            });
        });
    }
});
