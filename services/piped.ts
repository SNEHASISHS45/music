
// Expanded list of Piped instances
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.moomoo.me',
  'https://piped-api.lunar.icu',
  'https://api.piped.privacydev.net',
  'https://pipedapi.synced.cloud',
  'https://piped-api.garudalinux.org'
];

/**
 * Internal helper to try multiple instances until one succeeds.
 * Uses a CORS proxy to bypass browser security restrictions.
 */
async function fetchWithFallback(path: string) {
  let lastError = null;
  const corsProxy = 'https://api.allorigins.win/raw?url=';
  
  for (const instance of PIPED_INSTANCES) {
    try {
      const targetUrl = `${instance}${path}`;
      const proxyUrl = `${corsProxy}${encodeURIComponent(targetUrl)}`;
      
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 6000); 
      
      const response = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(id);
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn(`Node ${instance} bypass failed:`, error.message);
      lastError = error;
      continue; 
    }
  }
  
  throw lastError || new Error("Satellite array unresponsive. All Vibe nodes unreachable.");
}

export interface PipedSearchResult {
  title: string;
  thumbnail: string;
  uploaderName: string;
  url: string; 
  videoId?: string;
  duration: number;
}

export const searchMusic = async (query: string): Promise<any[]> => {
  if (!query) return [];
  
  try {
    const data = await fetchWithFallback(`/search?q=${encodeURIComponent(query)}&filter=music_videos`);
    return data.items || [];
  } catch (error) {
    try {
      const fallbackData = await fetchWithFallback(`/search?q=${encodeURIComponent(query)}&filter=videos`);
      return fallbackData.items || [];
    } catch (finalError) {
      throw finalError; // Triggers UI Gemini Fallback
    }
  }
};

export const getAudioStream = async (videoId: string): Promise<string | null> => {
  try {
    const data = await fetchWithFallback(`/streams/${videoId}`);
    const audioStreams = data.audioStreams || [];
    
    // Prefer M4A for universal browser compatibility
    const bestStream = audioStreams.find((s: any) => s.format === 'M4A' || s.mimetype?.includes('audio/mp4')) 
                    || audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    
    return bestStream ? bestStream.url : null;
  } catch (error) {
    console.error("Transmission Interrupted:", error);
    return null;
  }
};
