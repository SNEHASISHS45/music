
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Screen, Track } from './types';
import { TRACKS } from './constants';
import HomeView from './views/Home';
import DiscoverView from './views/Discover';
import LibraryView from './views/Library';
import ProfileView from './views/Profile';
import PlayerView from './views/Player';
import MiniPlayer from './components/MiniPlayer';
import Navigation from './components/Navigation';
import SearchOverlay from './components/SearchOverlay';
import { getAudioStream } from './services/musicService';
import { useRecommendations } from './hooks/useRecommendations';
import { audioCache } from './services/audioCache';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

const App: React.FC = () => {
  // Persistence logic: Load initial state from localStorage if available
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [activeTrack, setActiveTrack] = useState<Track>(() => {
    const saved = localStorage.getItem('vibe_active_track');
    return saved ? JSON.parse(saved) : TRACKS[0];
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('vibe_volume');
    return saved ? parseFloat(saved) : 0.8;
  });
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [queue, setQueue] = useState<Track[]>(() => {
    const saved = localStorage.getItem('vibe_queue');
    return saved ? JSON.parse(saved) : TRACKS;
  });
  const [isResolving, setIsResolving] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [eqGains, setEqGains] = useState<number[]>([0, 0, 0, 0, 0]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isPlayerDismissed, setIsPlayerDismissed] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    const saved = localStorage.getItem('vibe_playback_speed');
    return saved ? parseFloat(saved) : 1;
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const [isYTReady, setIsYTReady] = useState(false);
  const [isUsingYT, setIsUsingYT] = useState(false);
  const prevTrackRef = useRef<Track | null>(null);

  // Sync state to localStorage on changes
  useEffect(() => {
    localStorage.setItem('vibe_active_track', JSON.stringify(activeTrack));
  }, [activeTrack]);

  useEffect(() => {
    localStorage.setItem('vibe_queue', JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    localStorage.setItem('vibe_volume', volume.toString());
  }, [volume]);

  useEffect(() => {
    localStorage.setItem('vibe_playback_speed', playbackSpeed.toString());
    if (audioRef.current) audioRef.current.playbackRate = playbackSpeed;
    if (isUsingYT && ytPlayerRef.current) ytPlayerRef.current.setPlaybackRate(playbackSpeed);
  }, [playbackSpeed, isUsingYT]);

  // Sleep Timer Logic
  useEffect(() => {
    if (!sleepTimer) return;

    const timer = setInterval(() => {
      setSleepTimer(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          setIsPlaying(false);
          if (audioRef.current) audioRef.current.pause();
          if (ytPlayerRef.current) ytPlayerRef.current.pauseVideo();
          return null;
        }
        return prev - 1;
      });
    }, 60000); // Check every minute

    return () => clearInterval(timer);
  }, [sleepTimer]);


  // Recommendation engine hook
  const recommendations = useRecommendations();

  const connectAudioNode = useCallback((audio: HTMLAudioElement) => {
    if (!audioContextRef.current || !gainNodeRef.current) return;

    try {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
      sourceRef.current.connect(gainNodeRef.current);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn("[Nove] Routing failed:", e);
      }
    }
  }, []);

  const initAudioEngine = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const gainNode = ctx.createGain();
      gainNodeRef.current = gainNode;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyserRef.current = analyser;

      const frequencies = [60, 230, 910, 4000, 14000];
      eqNodesRef.current = frequencies.map((freq, i) => {
        const filter = ctx.createBiquadFilter();
        filter.type = i === 0 ? 'lowshelf' : i === 4 ? 'highshelf' : 'peaking';
        filter.frequency.value = freq;
        filter.gain.value = eqGains[i];
        return filter;
      });

      gainNode.connect(eqNodesRef.current[0]);
      eqNodesRef.current.reduce((prev, curr) => {
        prev.connect(curr);
        return curr;
      }).connect(analyser);

      analyser.connect(ctx.destination);
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (audioRef.current && !sourceRef.current) {
      connectAudioNode(audioRef.current);
    }
  }, [eqGains, connectAudioNode]);

  useEffect(() => {
    eqNodesRef.current.forEach((node, i) => {
      if (node) node.gain.value = eqGains[i];
    });
  }, [eqGains]);

  const handleTrackSelect = useCallback(async (track: Track) => {
    setIsPlayerDismissed(false);
    initAudioEngine();
    const isYouTube = track.audioUrl.includes('youtube.com') || track.audioUrl.includes('youtu.be') || track.videoId || track.id.startsWith('vibe-');

    if (isYouTube) {
      const videoId = track.videoId || (track.id?.replace('vibe-', '')) || track.audioUrl.split('v=')[1]?.split('&')[0];

      if (ytPlayerRef.current && isYTReady) {
        setIsUsingYT(true);
        setActiveTrack(track);
        setIsPlaying(true);
        ytPlayerRef.current.loadVideoById(videoId);

        // Clean up standard audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }
      } else {
        alert("YouTube Interface initializing... Please try again in a moment.");
      }
    } else {
      setIsUsingYT(false);
      if (activeTrack.id === track.id) {
        setIsPlaying(prev => !prev);
      } else {
        setActiveTrack(track);
        setIsPlaying(true);
      }
    }
  }, [activeTrack.id, initAudioEngine, isYTReady]);

  const handleNext = useCallback(() => {
    const currentIndex = queue.findIndex(t => t.id === activeTrack.id);
    const nextIndex = isShuffle ? Math.floor(Math.random() * queue.length) : (currentIndex + 1) % queue.length;
    handleTrackSelect(queue[nextIndex]);
  }, [activeTrack.id, queue, isShuffle, handleTrackSelect]);

  const handlePrevious = useCallback(() => {
    const currentIndex = queue.findIndex(t => t.id === activeTrack.id);
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    handleTrackSelect(queue[prevIndex]);
  }, [activeTrack.id, queue, handleTrackSelect]);

  // Track change detection for recommendation engine and audio caching
  useEffect(() => {
    // Record skip/complete for previous track
    if (prevTrackRef.current && prevTrackRef.current.id !== activeTrack.id) {
      const completionRate = duration > 0 ? currentTime / duration : 0;
      if (completionRate > 0.1) {
        recommendations.recordComplete(prevTrackRef.current, completionRate);
      } else {
        recommendations.recordSkip(prevTrackRef.current);
      }
    }

    // Record play for new track
    recommendations.recordPlay(activeTrack);
    prevTrackRef.current = activeTrack;

    // Record play for caching system and trigger cache if threshold met
    (async () => {
      if (!activeTrack.id) return;

      const { shouldCache, playCount } = await audioCache.recordPlay(
        activeTrack.id,
        activeTrack.audioUrl,
        activeTrack.title,
        activeTrack.artist
      );

      if (shouldCache && playCount === 3) {
        // Only trigger download on exactly the threshold to avoid repeated attempts
        audioCache.cacheAudio(
          activeTrack.id,
          activeTrack.audioUrl,
          activeTrack.title,
          activeTrack.artist
        );
      }
    })();
  }, [activeTrack.id]);

  // Main Audio Mounting Effect
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
    }
    sourceRef.current = null;

    const isYT = activeTrack.audioUrl.includes('youtube.com') || activeTrack.audioUrl.includes('youtu.be') || !!activeTrack.videoId;
    if (isResolving || isYT || activeTrack.audioUrl.includes('/watch') || !activeTrack.audioUrl.startsWith('http')) return;

    let cleanupFn: (() => void) | undefined;

    // Check cache first, then fallback to network
    const setupAudio = async () => {
      let audioSrc = activeTrack.audioUrl;

      // Try to get cached version first
      const cachedUrl = await audioCache.getCachedAudioUrl(activeTrack.id);
      if (cachedUrl) {
        audioSrc = cachedUrl;
        console.log(`[Nove] 🎵 Playing from cache: ${activeTrack.title}`);
      }

      const audio = new Audio();
      audio.crossOrigin = cachedUrl ? undefined : "anonymous"; // No CORS needed for blob URLs
      audio.src = audioSrc;
      audio.volume = volume;
      audio.preload = "auto";
      audioRef.current = audio;

      const updateTime = () => setCurrentTime(audio.currentTime);
      const handleEnded = () => repeatMode === 'one' ? (audio.currentTime = 0, audio.play()) : handleNext();

      const handleError = (e: any) => {
        const error = audio.error;
        console.warn("[Nove] Node Alert:", error?.message || "Stream corrupt", e);

        // If it's a CORS issue or similar, retry without crossOrigin
        if (audio.crossOrigin === "anonymous") {
          console.info("[Nove] Signal interference detected. Switching to secure direct link...");

          // Clean up current audio listeners and routing
          audio.removeEventListener('timeupdate', updateTime);
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('error', handleError);
          audio.pause();
          if (sourceRef.current) {
            try { sourceRef.current.disconnect(); } catch { }
            sourceRef.current = null;
          }

          // Create a fresh element without CORS to ensure it plays to system output
          const freshAudio = new Audio(activeTrack.audioUrl);
          freshAudio.volume = volume;
          audioRef.current = freshAudio;

          freshAudio.addEventListener('timeupdate', updateTime);
          freshAudio.addEventListener('ended', handleEnded);
          // We don't add another retry error listener to prevent infinite loops

          if (isPlaying) {
            freshAudio.play().catch(() => { });
          }
          return;
        }

        if (isPlaying) {
          setTimeout(() => {
            audio.load();
            playPromiseRef.current = audio.play();
            playPromiseRef.current.catch(() => { });
          }, 1000);
        }
      };

      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      // ONLY connect to Web Audio if we have CORS permission
      if (audioContextRef.current && gainNodeRef.current && audio.crossOrigin === "anonymous") {
        connectAudioNode(audio);
      }

      if (isPlaying) {
        playPromiseRef.current = audio.play();
        playPromiseRef.current.catch(e => {
          if (e.name !== 'AbortError') console.warn("Sync block:", e);
        });
      }

      // Store cleanup function
      cleanupFn = () => {
        const currentAudio = audioRef.current;
        if (!currentAudio) return;

        if (playPromiseRef.current) {
          playPromiseRef.current.then(() => currentAudio.pause()).catch(() => { });
        } else {
          currentAudio.pause();
        }
        currentAudio.src = "";
        currentAudio.removeEventListener('timeupdate', updateTime);
        currentAudio.removeEventListener('ended', handleEnded);
        currentAudio.removeEventListener('error', handleError);
      };
    };

    setupAudio();

    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, [activeTrack.id, activeTrack.audioUrl, handleNext]);

  // MediaSession API for Lock Screen & System Controls
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: activeTrack.title,
        artist: activeTrack.artist,
        album: activeTrack.genre || 'Nove AI',
        artwork: [
          { src: activeTrack.albumArt, sizes: '96x96', type: 'image/jpeg' },
          { src: activeTrack.albumArt, sizes: '128x128', type: 'image/jpeg' },
          { src: activeTrack.albumArt, sizes: '192x192', type: 'image/jpeg' },
          { src: activeTrack.albumArt, sizes: '256x256', type: 'image/jpeg' },
          { src: activeTrack.albumArt, sizes: '384x384', type: 'image/jpeg' },
          { src: activeTrack.albumArt, sizes: '512x512', type: 'image/jpeg' },
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', handlePrevious);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          if (isUsingYT && ytPlayerRef.current) ytPlayerRef.current.seekTo(details.seekTime, true);
          else if (audioRef.current) audioRef.current.currentTime = details.seekTime;
        }
      });
    }
  }, [activeTrack, handleNext, handlePrevious, isUsingYT]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  // YouTube API Initialization
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        ytPlayerRef.current = new window.YT.Player('yt-player-internal', {
          height: '0',
          width: '0',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            rel: 0,
            enablejsapi: 1,
            origin: window.location.origin
          },
          events: {
            onReady: () => setIsYTReady(true),
            onStateChange: (event: any) => {
              // 0: ended
              if (event.data === 0) handleNext();
              // 1: playing, 2: paused
              if (event.data === 1) setIsPlaying(true);
              if (event.data === 2) setIsPlaying(false);
            }
          }
        });
      };
    }
  }, [handleNext]);

  // Polling for YouTube Progress
  useEffect(() => {
    if (!isUsingYT || !ytPlayerRef.current || !isPlaying) return;

    const interval = setInterval(() => {
      if (ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) {
        setCurrentTime(ytPlayerRef.current.getCurrentTime());
        setDuration(ytPlayerRef.current.getDuration());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isUsingYT, isPlaying]);

  // Playback Control Effect
  useEffect(() => {
    if (isUsingYT) {
      if (ytPlayerRef.current && ytPlayerRef.current.getPlayerState) {
        if (isPlaying) ytPlayerRef.current.playVideo();
        else ytPlayerRef.current.pauseVideo();
      }
      return;
    }

    const audio = audioRef.current;
    if (audio && !isResolving) {
      if (isPlaying) {
        initAudioEngine();
        playPromiseRef.current = audio.play();
        playPromiseRef.current.catch(e => {
          if (e.name !== 'AbortError') setIsPlaying(false);
        });
      } else {
        if (playPromiseRef.current) {
          playPromiseRef.current.then(() => audio.pause()).catch(() => { });
        } else {
          audio.pause();
        }
      }
    }
  }, [isPlaying, isResolving, isUsingYT, initAudioEngine]);

  const handleTogglePlay = useCallback(() => {
    initAudioEngine();
    setIsPlaying(prev => !prev);
  }, [initAudioEngine]);

  const playNext = useCallback((track: Track) => {
    setQueue(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      const currentIndex = filtered.findIndex(t => t.id === activeTrack.id);
      const newQueue = [...filtered];
      newQueue.splice(currentIndex + 1, 0, track);
      return newQueue;
    });
  }, [activeTrack.id]);

  const addToQueue = useCallback((track: Track) => {
    setQueue(prev => prev.some(t => t.id === track.id) ? prev : [...prev, track]);
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    if (ytPlayerRef.current && ytPlayerRef.current.setVolume) {
      ytPlayerRef.current.setVolume(volume * 100);
    }
  }, [volume]);

  return (
    <div className="mobile-container flex flex-col h-screen bg-black overflow-hidden relative">
      <div id="yt-player-internal" className="hidden"></div>
      {isResolving && (
        <div className="absolute inset-0 z-[200] bg-vibe-dark/95 backdrop-blur-3xl flex flex-col items-center justify-center animate-fade-in">
          <div className="relative size-24 mb-10">
            <div className="absolute inset-0 border-[3px] border-accent/10 rounded-full"></div>
            <div className="absolute inset-0 border-[3px] border-accent border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-4 border-[2px] border-primary/20 border-b-transparent rounded-full animate-spin-slow" style={{ animationDirection: 'reverse' }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-accent text-3xl animate-pulse">satellite_alt</span>
            </div>
          </div>
          <p className="text-accent text-[11px] font-black tracking-[0.6em] uppercase mb-2 text-center">SYNCHRONIZING_FREQUENCY</p>
          <div className="w-32 h-0.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-accent animate-[loading_2s_ease-in-out_infinite]"></div>
          </div>
          <style>{`
            @keyframes loading {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
          `}</style>
          <button
            onClick={() => setIsResolving(false)}
            className="mt-20 text-[9px] font-black text-white/30 uppercase tracking-widest hover:text-white/60 transition-colors border-b border-white/10 pb-1"
          >
            Abort_Sequence
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto hide-scrollbar scroll-smooth relative bg-yt-black">
        <div className="pb-48">
          {currentScreen === 'home' && (
            <HomeView
              onTrackSelect={handleTrackSelect}
              onPlayNext={playNext}
              onAddToQueue={addToQueue}
              onSearchClick={() => setIsSearchOpen(true)}
            />
          )}
          {currentScreen === 'discover' && (
            <DiscoverView
              onTrackSelect={handleTrackSelect}
              onSearchClick={() => setIsSearchOpen(true)}
            />
          )}
          {currentScreen === 'library' && (
            <LibraryView
              onTrackSelect={handleTrackSelect}
              onSearchClick={() => setIsSearchOpen(true)}
            />
          )}
          {currentScreen === 'profile' && <ProfileView />}
        </div>
      </div>

      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onTrackSelect={handleTrackSelect}
      />

      {currentScreen === 'player' && (
        <PlayerView
          track={activeTrack} isPlaying={isPlaying} currentTime={currentTime} duration={duration} volume={volume}
          isShuffle={isShuffle} repeatMode={repeatMode} queue={queue} analyser={analyserRef.current} eqGains={eqGains}
          sleepTimer={sleepTimer} onSetSleepTimer={setSleepTimer} onUpdateEq={setEqGains}
          playbackSpeed={playbackSpeed} onPlaybackSpeedChange={setPlaybackSpeed}
          onSeek={(t) => {
            if (isUsingYT && ytPlayerRef.current) ytPlayerRef.current.seekTo(t, true);
            else if (audioRef.current) audioRef.current.currentTime = t;
          }} onVolumeChange={setVolume}
          onToggleShuffle={() => setIsShuffle(!isShuffle)}
          onToggleRepeat={() => setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off')}
          onTogglePlay={handleTogglePlay} onNext={handleNext} onPrevious={handlePrevious}
          onPlayNext={playNext} onAddToQueue={addToQueue} onReorderQueue={setQueue} onClose={() => setCurrentScreen('home')}
        />
      )}

      {currentScreen !== 'player' && !isPlayerDismissed && (
        <>
          <MiniPlayer
            track={activeTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onTogglePlay={handleTogglePlay}
            onClick={() => setCurrentScreen('player')}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onDismiss={() => {
              setIsPlayerDismissed(true);
              setIsPlaying(false);
              if (audioRef.current) audioRef.current.pause();
              if (ytPlayerRef.current) ytPlayerRef.current.pauseVideo();
            }}
          />
          <Navigation currentScreen={currentScreen} onNavigate={setCurrentScreen} />
        </>
      )}
      {currentScreen !== 'player' && isPlayerDismissed && (
        <Navigation currentScreen={currentScreen} onNavigate={setCurrentScreen} />
      )}
    </div>
  );
};

export default App;
