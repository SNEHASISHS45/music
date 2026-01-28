
const YT_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || 'AIzaSyCSmx5N2FdUMLXbZz1aTOcczQcHRIr6z54';
const YT_BASE_URL = 'https://www.googleapis.com/youtube/v3';

const IS_PROD = import.meta.env.PROD;

const CACHE_KEY = 'NOVE_NEURAL_VAULT_FINAL_V10';
const CHANNEL_CACHE_KEY = 'NOVE_CHANNEL_CACHE_V1';

const getCache = (): Record<string, any[]> => {
  try {
    const data = localStorage.getItem(CACHE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) { return {}; }
};

const getChannelCache = (): Record<string, any[]> => {
  try {
    const data = localStorage.getItem(CHANNEL_CACHE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) { return {}; }
};

const saveToCache = (query: string, results: any[]) => {
  try {
    const cache = getCache();
    const keys = Object.keys(cache);
    if (keys.length > 100) delete cache[keys[0]];
    cache[query.toLowerCase().trim()] = results;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) { }
};

const saveChannelCache = (query: string, results: any[]) => {
  try {
    const cache = getChannelCache();
    const keys = Object.keys(cache);
    if (keys.length > 50) delete cache[keys[0]];
    cache[query.toLowerCase().trim()] = results;
    localStorage.setItem(CHANNEL_CACHE_KEY, JSON.stringify(cache));
  } catch (e) { }
};

export interface YouTubeChannel {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  subscriberCount: string;
}

export const searchMusic = async (query: string): Promise<any[]> => {
  if (!query) return [];
  const normalizedQuery = query.toLowerCase().trim();
  const cached = getCache()[normalizedQuery];
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      maxResults: '30',
      q: query,
      type: 'video',
      videoCategoryId: '10',
      key: YT_API_KEY
    });

    if (!IS_PROD) console.info(`[Nove] Querying official Uplink for: ${query}`);
    const response = await fetch(`${YT_BASE_URL}/search?${params.toString()}`);

    if (response.ok) {
      const data = await response.json();
      const results = (data.items || []).map((item: any, index: number) => ({
        id: item.id.videoId || `track-${Date.now()}-${index}`,
        videoId: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        uploaderName: item.snippet.channelTitle,
        albumArt: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        audioUrl: item.id.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : '',
        duration: '04:00'
      }));
      saveToCache(normalizedQuery, results);
      return results;
    } else {
      const errorData = await response.json();
      console.warn("[Nove] Uplink signal weak:", errorData.error?.message);
    }
  } catch (e) {
    console.error("[Nove] Transceiver failure:", e);
  }

  return [];
};

export const searchChannels = async (query: string): Promise<YouTubeChannel[]> => {
  if (!query) return [];
  const normalizedQuery = query.toLowerCase().trim();
  const cached = getChannelCache()[normalizedQuery];
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      maxResults: '10',
      q: query,
      type: 'channel',
      key: YT_API_KEY
    });

    if (!IS_PROD) console.info(`[Nove] Searching channels for: ${query}`);
    const response = await fetch(`${YT_BASE_URL}/search?${params.toString()}`);

    if (response.ok) {
      const data = await response.json();
      const channels: YouTubeChannel[] = (data.items || []).map((item: any, index: number) => ({
        id: item.id.channelId || item.snippet.channelId || `channel-${Date.now()}-${index}`,
        name: item.snippet.channelTitle || item.snippet.title,
        description: item.snippet.description || '',
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || '',
        subscriberCount: formatSubscribers(Math.floor(Math.random() * 50000000)) // Placeholder - would need channels.list for real count
      }));
      saveChannelCache(normalizedQuery, channels);
      return channels;
    }
  } catch (e) {
    console.error("[Nove] Channel search failed:", e);
  }

  return [];
};

export const searchChannelVideos = async (channelId: string): Promise<any[]> => {
  try {
    const params = new URLSearchParams({
      part: 'snippet',
      maxResults: '20',
      channelId: channelId,
      type: 'video',
      order: 'date',
      key: YT_API_KEY
    });

    console.info(`[Nove] Fetching videos for channel: ${channelId}`);
    const response = await fetch(`${YT_BASE_URL}/search?${params.toString()}`);

    if (response.ok) {
      const data = await response.json();
      return (data.items || []).map((item: any, index: number) => ({
        id: item.id.videoId || `track-${Date.now()}-${index}`,
        videoId: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        uploaderName: item.snippet.channelTitle,
        albumArt: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        audioUrl: item.id.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : '',
        duration: '04:00'
      }));
    }
  } catch (e) {
    console.error("[Nove] Channel video fetch failed:", e);
  }
  return [];
};

// Helper to format subscriber count
const formatSubscribers = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return String(count);
};

/**
 * YouTube videos will now be handled by the IFrame player in App.tsx
 * This function remains as a signal for the UI.
 */
export const getAudioStream = async (videoId: string): Promise<string | null> => {
  return `https://www.youtube.com/watch?v=${videoId}`;
};
