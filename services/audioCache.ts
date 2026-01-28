
/**
 * Audio Cache Service
 * Automatically caches frequently played songs to reduce API usage.
 * Uses IndexedDB for persistent storage of audio blobs.
 */

const DB_NAME = 'NoveAudioCache';
const DB_VERSION = 1;
const STORE_NAME = 'audioCache';
const PLAY_COUNT_STORE = 'playCounts';
const CACHE_THRESHOLD = 3; // Number of plays before caching
const MAX_CACHE_SIZE_MB = 500; // Maximum cache size in MB
const MAX_CACHE_ITEMS = 50; // Maximum number of cached songs

interface CachedAudio {
    id: string;
    blob: Blob;
    mimeType: string;
    size: number;
    cachedAt: number;
    lastAccessed: number;
    title: string;
    artist: string;
}

interface PlayCount {
    id: string;
    count: number;
    lastPlayed: number;
    audioUrl: string;
    title: string;
    artist: string;
}

class AudioCacheService {
    private db: IDBDatabase | null = null;
    private dbReady: Promise<boolean>;

    constructor() {
        this.dbReady = this.initDB();
    }

    private initDB(): Promise<boolean> {
        return new Promise((resolve) => {
            if (!('indexedDB' in window)) {
                console.warn('[AudioCache] IndexedDB not supported');
                resolve(false);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('[AudioCache] Failed to open database');
                resolve(false);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('[AudioCache] Database initialized');
                resolve(true);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Store for cached audio blobs
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const audioStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    audioStore.createIndex('cachedAt', 'cachedAt', { unique: false });
                    audioStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
                }

                // Store for play counts
                if (!db.objectStoreNames.contains(PLAY_COUNT_STORE)) {
                    const countStore = db.createObjectStore(PLAY_COUNT_STORE, { keyPath: 'id' });
                    countStore.createIndex('count', 'count', { unique: false });
                }
            };
        });
    }

    /**
     * Record a play and check if song should be cached
     */
    async recordPlay(trackId: string, audioUrl: string, title: string, artist: string): Promise<{ shouldCache: boolean; playCount: number }> {
        await this.dbReady;
        if (!this.db) return { shouldCache: false, playCount: 0 };

        return new Promise((resolve) => {
            const transaction = this.db!.transaction([PLAY_COUNT_STORE], 'readwrite');
            const store = transaction.objectStore(PLAY_COUNT_STORE);

            const getRequest = store.get(trackId);

            getRequest.onsuccess = () => {
                const existing = getRequest.result as PlayCount | undefined;
                const newCount = (existing?.count || 0) + 1;

                const playData: PlayCount = {
                    id: trackId,
                    count: newCount,
                    lastPlayed: Date.now(),
                    audioUrl,
                    title,
                    artist
                };

                store.put(playData);

                resolve({
                    shouldCache: newCount >= CACHE_THRESHOLD,
                    playCount: newCount
                });
            };

            getRequest.onerror = () => {
                resolve({ shouldCache: false, playCount: 0 });
            };
        });
    }

    /**
     * Check if a song is cached
     */
    async isCached(trackId: string): Promise<boolean> {
        await this.dbReady;
        if (!this.db) return false;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(trackId);

            request.onsuccess = () => {
                resolve(!!request.result);
            };

            request.onerror = () => {
                resolve(false);
            };
        });
    }

    /**
     * Get cached audio URL (creates object URL from blob)
     */
    async getCachedAudioUrl(trackId: string): Promise<string | null> {
        await this.dbReady;
        if (!this.db) return null;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(trackId);

            request.onsuccess = () => {
                const cached = request.result as CachedAudio | undefined;
                if (cached) {
                    // Update last accessed time
                    cached.lastAccessed = Date.now();
                    store.put(cached);

                    // Create object URL from blob
                    const url = URL.createObjectURL(cached.blob);
                    console.log(`[AudioCache] 🎵 Serving "${cached.title}" from cache`);
                    resolve(url);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => {
                resolve(null);
            };
        });
    }

    /**
     * Cache an audio file
     */
    async cacheAudio(trackId: string, audioUrl: string, title: string, artist: string): Promise<boolean> {
        await this.dbReady;
        if (!this.db) return false;

        // Check if already cached
        const alreadyCached = await this.isCached(trackId);
        if (alreadyCached) {
            console.log(`[AudioCache] "${title}" already cached`);
            return true;
        }

        try {
            // Ensure we have space
            await this.ensureCacheSpace();

            console.log(`[AudioCache] ⬇️ Downloading "${title}" for offline use...`);

            // Fetch the audio file
            const response = await fetch(audioUrl, { mode: 'cors' });
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status}`);
            }

            const blob = await response.blob();
            const size = blob.size;

            // Don't cache if file is too large (> 50MB)
            if (size > 50 * 1024 * 1024) {
                console.warn(`[AudioCache] "${title}" too large to cache (${(size / 1024 / 1024).toFixed(1)}MB)`);
                return false;
            }

            const cachedAudio: CachedAudio = {
                id: trackId,
                blob,
                mimeType: blob.type || 'audio/mpeg',
                size,
                cachedAt: Date.now(),
                lastAccessed: Date.now(),
                title,
                artist
            };

            return new Promise((resolve) => {
                const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(cachedAudio);

                request.onsuccess = () => {
                    console.log(`[AudioCache] ✅ Cached "${title}" (${(size / 1024 / 1024).toFixed(1)}MB)`);
                    resolve(true);
                };

                request.onerror = () => {
                    console.error(`[AudioCache] Failed to cache "${title}"`);
                    resolve(false);
                };
            });
        } catch (error) {
            console.error(`[AudioCache] Error caching "${title}":`, error);
            return false;
        }
    }

    /**
     * Ensure we have space in the cache by removing old items
     */
    private async ensureCacheSpace(): Promise<void> {
        if (!this.db) return;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('lastAccessed');

            const request = index.openCursor();
            const items: CachedAudio[] = [];
            let totalSize = 0;

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor) {
                    const item = cursor.value as CachedAudio;
                    items.push(item);
                    totalSize += item.size;
                    cursor.continue();
                } else {
                    // Check if we need to remove items
                    const maxBytes = MAX_CACHE_SIZE_MB * 1024 * 1024;

                    // Sort by last accessed (oldest first)
                    items.sort((a, b) => a.lastAccessed - b.lastAccessed);

                    // Remove items if over limits
                    while ((totalSize > maxBytes || items.length > MAX_CACHE_ITEMS) && items.length > 0) {
                        const oldest = items.shift()!;
                        store.delete(oldest.id);
                        totalSize -= oldest.size;
                        console.log(`[AudioCache] 🗑️ Evicted "${oldest.title}" from cache`);
                    }

                    resolve();
                }
            };

            request.onerror = () => {
                resolve();
            };
        });
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<{ itemCount: number; totalSizeMB: number; items: Array<{ title: string; artist: string; sizeMB: number }> }> {
        await this.dbReady;
        if (!this.db) return { itemCount: 0, totalSizeMB: 0, items: [] };

        return new Promise((resolve) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                const items = request.result as CachedAudio[];
                const totalSize = items.reduce((sum, item) => sum + item.size, 0);

                resolve({
                    itemCount: items.length,
                    totalSizeMB: Math.round((totalSize / 1024 / 1024) * 100) / 100,
                    items: items.map(i => ({
                        title: i.title,
                        artist: i.artist,
                        sizeMB: Math.round((i.size / 1024 / 1024) * 100) / 100
                    }))
                });
            };

            request.onerror = () => {
                resolve({ itemCount: 0, totalSizeMB: 0, items: [] });
            };
        });
    }

    /**
     * Clear all cached audio
     */
    async clearCache(): Promise<void> {
        await this.dbReady;
        if (!this.db) return;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction([STORE_NAME, PLAY_COUNT_STORE], 'readwrite');
            transaction.objectStore(STORE_NAME).clear();
            transaction.objectStore(PLAY_COUNT_STORE).clear();

            transaction.oncomplete = () => {
                console.log('[AudioCache] Cache cleared');
                resolve();
            };

            transaction.onerror = () => {
                resolve();
            };
        });
    }
}

// Singleton instance
export const audioCache = new AudioCacheService();
