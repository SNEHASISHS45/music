
import React, { useState, useEffect, useRef } from 'react';
import { Track } from '../types';
import { searchMusic, searchChannels, searchChannelVideos, YouTubeChannel } from '../services/musicService';

interface SearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onTrackSelect: (track: Track) => void;
}

interface Podcast {
    id: string;
    title: string;
    publisher: string;
    cover: string;
    episodes: number;
}

interface Video {
    id: string;
    title: string;
    channel: string;
    thumbnail: string;
    duration: string;
    views: string;
}

// Sample Podcasts for search
const ALL_PODCASTS: Podcast[] = [
    { id: 'pod1', title: 'Music & Culture', publisher: 'Spotify Studios', cover: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300&h=300&fit=crop', episodes: 156 },
    { id: 'pod2', title: 'Behind The Lyrics', publisher: 'iHeart Radio', cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop', episodes: 89 },
    { id: 'pod3', title: 'Producer Sessions', publisher: 'Audio Network', cover: 'https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=300&h=300&fit=crop', episodes: 234 },
    { id: 'pod4', title: 'The Sound Lab', publisher: 'NPR Music', cover: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&h=300&fit=crop', episodes: 67 },
    { id: 'pod5', title: 'Indie Spotlight', publisher: 'Music Weekly', cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop', episodes: 112 },
    { id: 'pod6', title: 'Vinyl Stories', publisher: 'Classic FM', cover: 'https://images.unsplash.com/photo-1461360370896-922624d12a74?w=300&h=300&fit=crop', episodes: 45 },
    { id: 'pod7', title: 'Hip Hop Weekly', publisher: 'Complex', cover: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=300&h=300&fit=crop', episodes: 320 },
    { id: 'pod8', title: 'EDM Nation', publisher: 'DJ Mag', cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop', episodes: 198 },
];

const SEARCH_HISTORY_KEY = 'vibe_search_history';
const SEARCH_CACHE_KEY = 'vibe_search_cache';
const MAX_HISTORY = 10;
const CACHE_EXPIRY_MS = 1000 * 60 * 30; // 30 minutes

interface CachedSearch {
    query: string;
    results: Track[];
    timestamp: number;
}

type ResultTab = 'all' | 'songs' | 'videos' | 'podcasts' | 'channels';

const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose, onTrackSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Track[]>([]);
    const [videoResults, setVideoResults] = useState<Video[]>([]);
    const [podcastResults, setPodcastResults] = useState<Podcast[]>([]);
    const [channelResults, setChannelResults] = useState<YouTubeChannel[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<YouTubeChannel | null>(null);
    const [channelVideos, setChannelVideos] = useState<Track[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<ResultTab>('all');
    const inputRef = useRef<HTMLInputElement>(null);
    const timeoutRef = useRef<number | null>(null);

    // Load search history from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
        if (saved) {
            try {
                setSearchHistory(JSON.parse(saved));
            } catch (e) {
                setSearchHistory([]);
            }
        }
    }, []);

    // Save search history to localStorage
    const saveToHistory = (searchQuery: string) => {
        if (!searchQuery.trim()) return;

        setSearchHistory(prev => {
            const filtered = prev.filter(q => q.toLowerCase() !== searchQuery.toLowerCase());
            const updated = [searchQuery, ...filtered].slice(0, MAX_HISTORY);
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    const removeFromHistory = (searchQuery: string) => {
        setSearchHistory(prev => {
            const updated = prev.filter(q => q !== searchQuery);
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    const clearHistory = () => {
        setSearchHistory([]);
        localStorage.removeItem(SEARCH_HISTORY_KEY);
    };

    // Cache management
    const getCachedResults = (searchQuery: string): Track[] | null => {
        try {
            const cached = localStorage.getItem(SEARCH_CACHE_KEY);
            if (!cached) return null;

            const cacheMap: Record<string, CachedSearch> = JSON.parse(cached);
            const entry = cacheMap[searchQuery.toLowerCase()];

            if (entry && Date.now() - entry.timestamp < CACHE_EXPIRY_MS) {
                return entry.results;
            }
            return null;
        } catch (e) {
            return null;
        }
    };

    const setCachedResults = (searchQuery: string, searchResults: Track[]) => {
        try {
            const cached = localStorage.getItem(SEARCH_CACHE_KEY);
            const cacheMap: Record<string, CachedSearch> = cached ? JSON.parse(cached) : {};

            // Clean old entries (keep max 20)
            const entries = Object.entries(cacheMap);
            if (entries.length > 20) {
                entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
                const newMap: Record<string, CachedSearch> = {};
                entries.slice(0, 15).forEach(([key, val]) => { newMap[key] = val; });
                localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(newMap));
            }

            cacheMap[searchQuery.toLowerCase()] = {
                query: searchQuery,
                results: searchResults,
                timestamp: Date.now()
            };
            localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(cacheMap));
        } catch (e) {
            // Ignore cache errors
        }
    };

    // Search podcasts locally
    const searchPodcasts = (q: string): Podcast[] => {
        const lower = q.toLowerCase();
        return ALL_PODCASTS.filter(p =>
            p.title.toLowerCase().includes(lower) ||
            p.publisher.toLowerCase().includes(lower)
        );
    };

    // Generate video results from song results
    const generateVideoResults = (songs: Track[]): Video[] => {
        return songs.slice(0, 8).map((song, i) => ({
            id: `vid-${song.id || i}-${Date.now()}`,
            title: `${song.title} - Official Music Video`,
            channel: song.artist,
            thumbnail: song.albumArt,
            duration: `${3 + Math.floor(Math.random() * 3)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
            views: `${Math.floor(Math.random() * 50) + 1}M views`
        }));
    };

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setQuery('');
            setResults([]);
            setVideoResults([]);
            setPodcastResults([]);
            setChannelResults([]);
            setSelectedChannel(null);
            setChannelVideos([]);
            setActiveTab('all');
        }
    }, [isOpen]);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setVideoResults([]);
            setPodcastResults([]);
            setChannelResults([]);
            return;
        }

        // Search podcasts immediately (local)
        setPodcastResults(searchPodcasts(query));

        // Check cache first for songs
        const cached = getCachedResults(query);
        if (cached) {
            setResults(cached);
            setVideoResults(generateVideoResults(cached));
            setIsLoading(false);
            // Still search for channels even if songs are cached
            searchChannels(query).then(setChannelResults).catch(() => setChannelResults([]));
            return;
        }

        setIsLoading(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = window.setTimeout(async () => {
            try {
                // Search songs and channels in parallel
                const [found, channels] = await Promise.all([
                    searchMusic(query),
                    searchChannels(query)
                ]);
                setResults(found);
                setVideoResults(generateVideoResults(found));
                setChannelResults(channels);
                setCachedResults(query, found);
                saveToHistory(query);
            } catch (err) {
                setResults([]);
                setVideoResults([]);
                setChannelResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 600);

        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, [query]);

    const handleHistoryClick = (historyQuery: string) => {
        setQuery(historyQuery);
    };

    const handleChannelClick = async (channel: YouTubeChannel) => {
        setSelectedChannel(channel);
        setIsLoading(true);
        try {
            const videos = await searchChannelVideos(channel.id);
            setChannelVideos(videos);
        } catch (err) {
            setChannelVideos([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVisitChannel = (e: React.MouseEvent, channelId: string) => {
        e.stopPropagation();
        window.open(`https://www.youtube.com/channel/${channelId}`, '_blank');
    };

    const totalResults = results.length + videoResults.length + podcastResults.length + channelResults.length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] bg-yt-black animate-fade-in flex flex-col">
            <header className="px-4 py-2 bg-yt-surface flex items-center gap-2 border-b border-white/5">
                <button onClick={() => selectedChannel ? setSelectedChannel(null) : onClose()} className="size-10 flex items-center justify-center hover:bg-white/10 rounded-full">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="flex-1 relative">
                    {!selectedChannel ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search songs, videos, podcasts, channels"
                            className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-yt-gray h-12"
                        />
                    ) : (
                        <div className="flex flex-col justify-center h-12">
                            <p className="text-white font-bold leading-tight truncate">{selectedChannel.name}</p>
                            <p className="text-[10px] text-yt-gray font-bold tracking-widest uppercase">Channel Profile</p>
                        </div>
                    )}
                    {query && !selectedChannel && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute right-0 top-1/2 -translate-y-1/2 size-10 flex items-center justify-center text-yt-gray"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Result Tabs - Hide when on channel profile */}
            {query && totalResults > 0 && !isLoading && !selectedChannel && (
                <div className="flex gap-2 px-4 py-3 border-b border-white/5 overflow-x-auto hide-scrollbar">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'all' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setActiveTab('songs')}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'songs' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
                    >
                        Songs ({results.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('videos')}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'videos' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
                    >
                        Videos ({videoResults.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('podcasts')}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'podcasts' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
                    >
                        Podcasts ({podcastResults.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('channels')}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'channels' ? 'bg-white text-black' : 'bg-white/10 text-white'}`}
                    >
                        Channels ({channelResults.length})
                    </button>
                </div>
            )}

            <main className="flex-1 overflow-y-auto hide-scrollbar px-2 py-4">
                {isLoading && (
                    <div className="flex justify-center py-10">
                        <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}


                {/* ALL RESULTS - Shows everything together */}
                {query && activeTab === 'all' && totalResults > 0 && !isLoading && (
                    <div className="space-y-6">
                        {/* Top Songs */}
                        {results.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between px-4 mb-2">
                                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Songs</h3>
                                    {results.length > 3 && (
                                        <button onClick={() => setActiveTab('songs')} className="text-xs text-primary">See all</button>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    {results.slice(0, 4).map((track, i) => (
                                        <div
                                            key={`all-song-${track.id || i}`}
                                            onClick={() => { onTrackSelect(track); onClose(); }}
                                            className="flex items-center gap-4 px-4 py-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                                        >
                                            <div className="size-11 rounded overflow-hidden flex-shrink-0 bg-yt-surface border border-white/5">
                                                <img src={track.albumArt} className="size-full object-cover" alt="" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate text-white">{track.title}</p>
                                                <p className="text-xs text-yt-gray truncate">{track.artist}</p>
                                            </div>
                                            <span className="material-symbols-outlined text-yt-gray text-lg">play_circle</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Videos */}
                        {videoResults.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between px-4 mb-2">
                                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Videos</h3>
                                    {videoResults.length > 2 && (
                                        <button onClick={() => setActiveTab('videos')} className="text-xs text-primary">See all</button>
                                    )}
                                </div>
                                <div className="flex gap-3 px-4 overflow-x-auto hide-scrollbar pb-2">
                                    {videoResults.slice(0, 4).map((video, i) => (
                                        <div
                                            key={`all-vid-${video.id || i}`}
                                            onClick={() => {
                                                const track = results.find(t => t.id && video.id.includes(t.id));
                                                if (track) { onTrackSelect(track); onClose(); }
                                            }}
                                            className="shrink-0 w-36 cursor-pointer group"
                                        >
                                            <div className="relative aspect-video rounded-lg overflow-hidden bg-yt-surface mb-1">
                                                <img src={video.thumbnail} className="size-full object-cover group-hover:scale-105 transition-transform" alt="" />
                                                <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[9px] font-bold">{video.duration}</div>
                                            </div>
                                            <p className="text-xs font-medium text-white line-clamp-2">{video.title}</p>
                                            <p className="text-[10px] text-yt-gray">{video.channel}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Podcasts */}
                        {podcastResults.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between px-4 mb-2">
                                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Podcasts</h3>
                                    {podcastResults.length > 2 && (
                                        <button onClick={() => setActiveTab('podcasts')} className="text-xs text-primary">See all</button>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    {podcastResults.slice(0, 3).map((podcast) => (
                                        <div
                                            key={podcast.id}
                                            className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                                        >
                                            <div className="size-12 rounded-xl overflow-hidden flex-shrink-0 bg-yt-surface border border-white/10">
                                                <img src={podcast.cover} className="size-full object-cover" alt="" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold truncate text-white">{podcast.title}</p>
                                                <p className="text-xs text-yt-gray truncate">{podcast.publisher} • {podcast.episodes} eps</p>
                                            </div>
                                            <span className="material-symbols-outlined text-purple-400 text-lg">podcasts</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Channels */}
                        {channelResults.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between px-4 mb-2">
                                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">Channels</h3>
                                    {channelResults.length > 3 && (
                                        <button onClick={() => setActiveTab('channels')} className="text-xs text-primary">See all</button>
                                    )}
                                </div>
                                <div className="flex gap-4 px-4 overflow-x-auto hide-scrollbar pb-2">
                                    {channelResults.slice(0, 5).map((channel) => (
                                        <div
                                            key={channel.id}
                                            onClick={() => handleChannelClick(channel)}
                                            className="shrink-0 flex flex-col items-center gap-2 w-24 text-center cursor-pointer group active:scale-95 transition-transform"
                                        >
                                            <div className="size-20 rounded-full overflow-hidden border border-white/5 shadow-lg group-hover:scale-105 transition-transform duration-300">
                                                <img src={channel.thumbnail} className="size-full object-cover" alt="" />
                                            </div>
                                            <div className="min-w-0 w-full">
                                                <p className="text-xs font-bold text-white truncate group-hover:text-primary transition-colors">{channel.name}</p>
                                                <p className="text-[10px] text-yt-gray truncate">{channel.subscriberCount} subs</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {/* Songs Results */}
                {query && activeTab === 'songs' && results.length > 0 && !isLoading && (
                    <div className="space-y-1">
                        {results.map((track, i) => (
                            <div
                                key={`songs-tab-${track.id || i}`}
                                onClick={() => { onTrackSelect(track); onClose(); }}
                                className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors active:scale-[0.98]"
                            >
                                <div className="size-12 rounded overflow-hidden flex-shrink-0 bg-yt-surface border border-white/5">
                                    <img src={track.albumArt} className="size-full object-cover" alt="" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-medium truncate text-white">{track.title}</p>
                                    <p className="text-xs text-yt-gray truncate">{track.artist} • {track.genre}</p>
                                </div>
                                <span className="material-symbols-outlined text-yt-gray text-xl">play_circle</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Video Results */}
                {query && activeTab === 'videos' && videoResults.length > 0 && !isLoading && (
                    <div className="space-y-4 px-2">
                        {videoResults.map((video, i) => (
                            <div
                                key={`tab-vid-${video.id || i}`}
                                onClick={() => {
                                    const track = results.find(t => t.id && video.id.includes(t.id));
                                    if (track) { onTrackSelect(track); onClose(); }
                                }}
                                className="flex gap-3 cursor-pointer group"
                            >
                                <div className="relative w-40 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-yt-surface">
                                    <img src={video.thumbnail} className="size-full object-cover group-hover:scale-105 transition-transform" alt="" />
                                    <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold">{video.duration}</div>
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="material-symbols-outlined text-white text-3xl fill-1">play_arrow</span>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 py-1">
                                    <p className="text-sm font-medium text-white line-clamp-2">{video.title}</p>
                                    <p className="text-xs text-yt-gray mt-1">{video.channel}</p>
                                    <p className="text-xs text-yt-gray">{video.views}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Podcast Results */}
                {query && activeTab === 'podcasts' && podcastResults.length > 0 && !isLoading && (
                    <div className="space-y-1">
                        {podcastResults.map((podcast) => (
                            <div
                                key={podcast.id}
                                className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors active:scale-[0.98]"
                            >
                                <div className="size-14 rounded-xl overflow-hidden flex-shrink-0 bg-yt-surface border border-white/10">
                                    <img src={podcast.cover} className="size-full object-cover" alt="" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-bold truncate text-white">{podcast.title}</p>
                                    <p className="text-xs text-yt-gray truncate">{podcast.publisher} • {podcast.episodes} episodes</p>
                                </div>
                                <span className="material-symbols-outlined text-purple-400 text-xl">podcasts</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Channel Results */}
                {query && activeTab === 'channels' && channelResults.length > 0 && !isLoading && (
                    <div className="space-y-1">
                        {channelResults.map((channel) => (
                            <div
                                key={channel.id}
                                onClick={() => handleChannelClick(channel)}
                                className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors active:scale-[0.98]"
                            >
                                <div className="size-14 rounded-full overflow-hidden flex-shrink-0 bg-yt-surface border border-white/10">
                                    <img src={channel.thumbnail} className="size-full object-cover" alt="" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-bold truncate text-white">{channel.name}</p>
                                    <p className="text-xs text-yt-gray line-clamp-1">{channel.subscriberCount} subscribers • {channel.description}</p>
                                </div>
                                <button
                                    onClick={(e) => handleVisitChannel(e, channel.id)}
                                    className="px-4 py-1.5 bg-white text-black text-xs font-bold rounded-full hover:bg-white/90 active:scale-90 transition-transform"
                                >
                                    Visit
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* No results for current tab */}
                {query && !isLoading && activeTab !== 'all' && (
                    (activeTab === 'songs' && results.length === 0) ||
                    (activeTab === 'videos' && videoResults.length === 0) ||
                    (activeTab === 'podcasts' && podcastResults.length === 0) ||
                    (activeTab === 'channels' && channelResults.length === 0)
                ) && (
                        <div className="text-center py-10 text-yt-gray">
                            <span className="material-symbols-outlined text-4xl mb-2">
                                {activeTab === 'songs' ? 'music_off' : activeTab === 'videos' ? 'videocam_off' : activeTab === 'podcasts' ? 'podcasts' : 'person_off'}
                            </span>
                            <p>No {activeTab} found for "{query}"</p>
                        </div>
                    )}

                {/* Recent Searches - Only show when no query */}
                {!query && searchHistory.length > 0 && (
                    <div className="px-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest opacity-40">Recent searches</h3>
                            <button
                                onClick={clearHistory}
                                className="text-xs text-primary px-2 py-1 hover:bg-primary/10 rounded-full transition-colors"
                            >
                                Clear all
                            </button>
                        </div>
                        <div className="space-y-3">
                            {searchHistory.map((historyItem, i) => (
                                <div
                                    key={`${historyItem}-${i}`}
                                    className="flex items-center gap-4 text-yt-gray group cursor-pointer hover:text-white transition-colors"
                                >
                                    <span className="material-symbols-outlined text-xl">history</span>
                                    <span
                                        className="text-base font-medium flex-1 truncate"
                                        onClick={() => handleHistoryClick(historyItem)}
                                    >
                                        {historyItem}
                                    </span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFromHistory(historyItem); }}
                                        className="size-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 rounded-full"
                                    >
                                        <span className="material-symbols-outlined text-lg">close</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!query && searchHistory.length === 0 && (
                    <div className="px-4 py-10 text-center opacity-30">
                        <span className="material-symbols-outlined text-6xl mb-4">search</span>
                        <p className="text-lg font-bold tracking-tight">Search songs, videos & podcasts</p>
                        <p className="text-sm mt-1">Your recent searches will appear here</p>
                    </div>
                )}

                {query && totalResults === 0 && !isLoading && !selectedChannel && (
                    <div className="text-center py-20 text-yt-gray">
                        <span className="material-symbols-outlined text-6xl mb-4">search_off</span>
                        <p>No results found for "{query}"</p>
                    </div>
                )}

                {/* Selected Channel Profile View */}
                {selectedChannel && !isLoading && (
                    <div className="animate-fade-in">
                        {/* Channel Header Banner Area */}
                        <div className="px-4 py-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                            <div className="flex items-center gap-5">
                                <div className="size-20 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl">
                                    <img src={selectedChannel.thumbnail} className="size-full object-cover" alt="" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-2xl font-black text-white truncate">{selectedChannel.name}</h2>
                                    <p className="text-primary text-sm font-bold">{selectedChannel.subscriberCount} subscribers</p>
                                </div>
                            </div>
                            <p className="mt-4 text-sm text-yt-gray line-clamp-3 leading-relaxed">
                                {selectedChannel.description || 'No description available for this channel.'}
                            </p>
                            <button
                                onClick={(e) => handleVisitChannel(e, selectedChannel.id)}
                                className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-black rounded-xl transition-colors"
                            >
                                VISIT ON YOUTUBE
                            </button>
                        </div>

                        {/* Channel Videos */}
                        <div className="px-4 py-6">
                            <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-4">Latest Uploads</h3>
                            <div className="space-y-4">
                                {channelVideos.length > 0 ? channelVideos.map((track, i) => (
                                    <div
                                        key={`chan-vid-${track.id || i}`}
                                        onClick={() => { onTrackSelect(track); onClose(); }}
                                        className="flex gap-4 group cursor-pointer active:scale-[0.98] transition-all"
                                    >
                                        <div className="relative w-32 aspect-video rounded-lg overflow-hidden bg-yt-surface shrink-0">
                                            <img src={track.albumArt} className="size-full object-cover group-hover:scale-105 transition-transform" alt="" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="material-symbols-outlined text-white fill-1">play_arrow</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <p className="text-sm font-bold text-white line-clamp-2 leading-tight mb-1 group-hover:text-primary transition-colors">
                                                {track.title}
                                            </p>
                                            <p className="text-[10px] text-yt-gray font-bold uppercase tracking-wider">
                                                {track.duration || '04:00'}
                                            </p>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center py-10 opacity-20">
                                        <span className="material-symbols-outlined text-4xl mb-2">videocam_off</span>
                                        <p className="text-sm">No videos found for this channel</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SearchOverlay;
