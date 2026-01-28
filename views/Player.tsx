
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Track } from '../types';
import { useRecommendations } from '../hooks/useRecommendations';
import { useToast } from '../contexts/ToastContext';
import { audioCache } from '../services/audioCache';

interface PlayerViewProps {
  track: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  queue: Track[];
  analyser: AnalyserNode | null;
  eqGains: number[];
  sleepTimer: number | null;
  onUpdateEq: (gains: number[]) => void;
  onVolumeChange: (volume: number) => void;
  playbackSpeed: number;
  onPlaybackSpeedChange: (speed: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onPlayNext: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onReorderQueue: (newQueue: Track[]) => void;
  onClose: () => void;
}

const PlayerView: React.FC<PlayerViewProps> = ({
  track, isPlaying, currentTime, duration, isShuffle, repeatMode, queue,
  onSeek, onToggleShuffle, onToggleRepeat, onTogglePlay, onNext, onPrevious, onClose, onAddToQueue,
  playbackSpeed, onPlaybackSpeedChange, sleepTimer, onSetSleepTimer
}) => {
  const [activeTab, setActiveTab] = useState<'UP NEXT' | 'LYRICS' | 'RELATED'>('UP NEXT');
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const [showActions, setShowActions] = useState(false);
  const [seekAnimation, setSeekAnimation] = useState<'forward' | 'backward' | null>(null);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);

  // Gesture states
  const [playerDragY, setPlayerDragY] = useState(0);
  const [isPlayerDragging, setIsPlayerDragging] = useState(false);
  const playerTouchStart = useRef<number | null>(null);

  const [drawerDragY, setDrawerDragY] = useState(0);
  const [isDrawerDragging, setIsDrawerDragging] = useState(false);
  const drawerTouchStart = useRef<number | null>(null);

  const { like, dislike, unlike, isLiked: checkLiked, isDisliked: checkDisliked, getSimilar } = useRecommendations();
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    setLiked(checkLiked(track.id));
  }, [track.id, checkLiked]);

  const similarTracks = useMemo(() => getSimilar(track, queue, 10), [track.id, queue, getSimilar]);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (liked) unlike(track); else like(track);
    setLiked(!liked);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const cycleSpeed = () => {
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    onPlaybackSpeedChange(speeds[nextIndex]);
  };

  const currentDisplayTime = isScrubbing ? scrubValue : currentTime;
  const progress = (currentDisplayTime / duration) * 100 || 0;

  // Swipe handlers
  const handlePlayerTouchStart = (e: React.TouchEvent) => {
    const touchY = e.touches[0].clientY;
    // Always allow swiping down from the header area (top 100px)
    const isHeaderArea = touchY < 120;

    if (isPanelExpanded && !isHeaderArea) return;
    playerTouchStart.current = touchY;
    setIsPlayerDragging(true);
  };

  const handlePlayerTouchMove = (e: React.TouchEvent) => {
    if (playerTouchStart.current === null) return;
    const deltaY = e.touches[0].clientY - playerTouchStart.current;

    // Only allow sliding DOWN
    if (deltaY > 0) {
      setPlayerDragY(deltaY);
    }
  };

  const handlePlayerTouchEnd = () => {
    if (playerDragY > 150) {
      onClose();
      // Reset state after a delay to allow the animation to finish
      setTimeout(() => setPlayerDragY(0), 300);
    } else {
      setPlayerDragY(0);
    }
    setIsPlayerDragging(false);
    playerTouchStart.current = null;
  };

  const listRef = useRef<HTMLDivElement>(null);

  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    drawerTouchStart.current = e.touches[0].clientY;
    setIsDrawerDragging(true);
    setDrawerDragY(0);
  };

  const handleDrawerTouchMove = (e: React.TouchEvent) => {
    if (drawerTouchStart.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - drawerTouchStart.current;

    // If panel is expanded, only allow dragging down if the list is at the top
    if (isPanelExpanded) {
      const scrollTop = listRef.current?.scrollTop || 0;
      if (scrollTop <= 0 && deltaY > 0) {
        setDrawerDragY(deltaY);
        if (e.cancelable) e.preventDefault();
      } else {
        setDrawerDragY(0);
      }
    } else {
      // If collapsed, allow dragging up or down
      setDrawerDragY(deltaY);
    }
  };

  const handleDrawerTouchEnd = () => {
    setIsDrawerDragging(false);

    if (isPanelExpanded) {
      if (drawerDragY > 100) setIsPanelExpanded(false);
    } else {
      if (drawerDragY < -50) setIsPanelExpanded(true);
    }

    setDrawerDragY(0);
    drawerTouchStart.current = null;
  };

  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const { left, width } = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = clientX - left;

    if (lastTapRef.current && (now - lastTapRef.current.time) < 300) {
      if (x < width / 2) {
        onSeek(Math.max(0, currentTime - 10));
        setSeekAnimation('backward');
      } else {
        onSeek(Math.min(duration, currentTime + 10));
        setSeekAnimation('forward');
      }
      setTimeout(() => setSeekAnimation(null), 800);
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { time: now, x };
    }
  };

  const { showToast } = useToast();

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: track.title,
          text: `Listening to ${track.title} by ${track.artist} on Nove`,
          url: window.location.href,
        });
      } else {
        navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard!', 'link', 'info');
      }
    } catch (e) { }
  };

  const handleDownload = async () => {
    showToast('Downloading for offline...', 'downloading', 'info');
    const success = await audioCache.cacheAudio(track.id, track.audioUrl, track.title, track.artist);
    if (success) {
      showToast('Available offline!', 'offline_pin', 'success');
    } else {
      showToast('Download failed', 'error', 'error');
    }
    setShowActions(false);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] bg-[#050505] text-white flex flex-col items-center overflow-hidden select-none transition-transform ${!isPlayerDragging ? 'duration-500' : ''}`}
      style={{ transform: `translateY(${playerDragY}px)` }}
      onTouchStart={handlePlayerTouchStart}
      onTouchMove={handlePlayerTouchMove}
      onTouchEnd={handlePlayerTouchEnd}
    >

      {/* Immersive Background Decor */}
      <div className="absolute inset-0 -z-20 overflow-hidden pointer-events-none">
        <img src={track.albumArt} className="w-full h-full object-cover scale-[1.8] blur-[100px] opacity-25" alt="" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-[#050505]"></div>
      </div>

      {/* Modern Header */}
      <header className="w-full px-6 pt-6 pb-2 flex flex-col items-center gap-4 z-30 shrink-0">
        <div className="w-12 h-1.5 bg-white/10 rounded-full mb-2" />
        <div className="w-full flex items-center justify-between">
          <button onClick={onClose} className="size-10 flex items-center justify-center bg-white/5 rounded-2xl border border-white/5 active:scale-90 transition-all">
            <span className="material-symbols-outlined text-2xl text-white/50">expand_more</span>
          </button>
          <div className="text-center">
            <p className="text-[10px] font-black tracking-[0.25em] text-white/30 uppercase">NOW PLAYING</p>
            <p className="text-[11px] font-bold text-white/60">Vibe Studio</p>
          </div>
          <button onClick={() => setShowActions(true)} className="size-10 flex items-center justify-center bg-white/5 rounded-2xl border border-white/5 active:scale-90 transition-all">
            <span className="material-symbols-outlined text-xl text-white/50">more_horiz</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 w-full max-w-lg flex flex-col px-8 pb-32 z-10 min-h-0 transition-all duration-300 ${isPanelExpanded ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>

        {/* BIG Album Art with Double Tap Seek */}
        <div className="flex-[5] flex items-center justify-center min-h-0 py-4">
          <div
            onClick={handleDoubleTap}
            className="relative aspect-square h-full max-h-[340px] rounded-[36px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/10 group cursor-pointer"
          >
            <img src={track.albumArt} className="w-full h-full object-cover" alt={track.title} />
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none"></div>

            {/* Seek Indicators */}
            {seekAnimation === 'backward' && (
              <div className="absolute inset-y-0 left-0 w-1/2 bg-white/10 flex items-center justify-center animate-fade-in pointer-events-none">
                <div className="flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-4xl animate-bounce-horizontal-reverse">replay_10</span>
                  <span className="text-xs font-bold">-10s</span>
                </div>
              </div>
            )}
            {seekAnimation === 'forward' && (
              <div className="absolute inset-y-0 right-0 w-1/2 bg-white/10 flex items-center justify-center animate-fade-in pointer-events-none">
                <div className="flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-4xl animate-bounce-horizontal">forward_10</span>
                  <span className="text-xs font-bold">+10s</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Identity Section */}
        <div className="mt-4 mb-6 flex items-center justify-between shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h1 className="text-2xl font-black truncate tracking-tighter leading-tight">{track.title}</h1>
            <p className="text-base font-bold text-white/40 truncate tracking-tight uppercase leading-none mt-1">{track.artist}</p>
          </div>
          <button onClick={handleLike} className={`size-11 rounded-xl flex items-center justify-center transition-all border ${liked ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white/5 text-white/20 border-white/5 hover:border-white/10'}`}>
            <span className={`material-symbols-outlined text-xl ${liked ? 'fill-1' : ''}`}>{liked ? 'favorite' : 'favorite_border'}</span>
          </button>
        </div>

        {/* ULTRA-SMOOTH Slider Section */}
        <div className="space-y-6 shrink-0">
          <div className="px-1 relative group py-4 -my-4">
            {/* Track Background */}
            <div className="h-[6px] w-full bg-white/10 rounded-full relative overflow-visible">
              {/* Glow Trail */}
              <div
                className="absolute top-0 left-0 h-full rounded-full blur-sm opacity-60"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, rgba(255,0,0,0.3), rgba(255,0,0,0.8))',
                  transition: isScrubbing ? 'none' : 'width 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              ></div>

              {/* Main Progress Fill */}
              <div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #ff4444, #ff0000)',
                  boxShadow: '0 0 12px rgba(255,0,0,0.5)',
                  transition: isScrubbing ? 'none' : 'width 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              ></div>
            </div>

            {/* Large Touch Target - Invisible */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentDisplayTime}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setScrubValue(val);
                onSeek(val);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsScrubbing(true);
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                setIsScrubbing(false);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setIsScrubbing(true);
              }}
              onTouchMove={(e) => {
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                setIsScrubbing(false);
              }}
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-12 opacity-0 cursor-pointer z-30"
              style={{ touchAction: 'none' }}
            />

            {/* Premium Thumb */}
            <div
              className="absolute top-1/2 pointer-events-none z-20"
              style={{
                left: `${progress}%`,
                transform: 'translate(-50%, -50%)',
                transition: isScrubbing ? 'none' : 'left 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {/* Outer Ring - Visible on interaction */}
              <div
                className={`absolute inset-0 rounded-full transition-all duration-300 ${isScrubbing ? 'scale-[2.2] opacity-100' : 'scale-100 opacity-0'}`}
                style={{
                  background: 'radial-gradient(circle, rgba(255,0,0,0.3) 0%, transparent 70%)',
                  width: '20px',
                  height: '20px',
                  marginLeft: '-10px',
                  marginTop: '-10px'
                }}
              ></div>

              {/* Main Thumb */}
              <div
                className={`size-5 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.5)] flex items-center justify-center transition-transform duration-150 ${isScrubbing ? 'scale-125' : 'scale-100 group-hover:scale-110'}`}
                style={{ marginLeft: '-10px', marginTop: '-10px' }}
              >
                <div className={`rounded-full bg-primary transition-all duration-300 ${isScrubbing ? 'size-2.5' : 'size-1.5'}`}></div>
              </div>
            </div>

            {/* Time Tooltip */}
            <div
              className={`absolute -top-10 pointer-events-none z-40 transition-all duration-200 ${isScrubbing ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
              style={{
                left: `${progress}%`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="bg-primary text-white text-[11px] font-black px-3 py-1.5 rounded-lg shadow-lg">
                {formatTime(currentDisplayTime)}
              </div>
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-primary mx-auto"></div>
            </div>

            {/* Time Labels */}
            <div className="flex justify-between mt-4 text-[11px] font-bold tracking-wide font-mono">
              <span className={isScrubbing ? 'text-primary' : ''}>{formatTime(currentDisplayTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Precision Controls */}
          <div className="flex items-center justify-between pb-4">
            <button onClick={onToggleShuffle} className={`size-10 flex items-center justify-center transition-all ${isShuffle ? 'text-primary' : 'text-white/20'}`}>
              <span className="material-symbols-outlined text-xl">shuffle</span>
            </button>

            <div className="flex items-center gap-6">
              <button onClick={onPrevious} className="size-10 flex items-center justify-center text-white/80 active:scale-75 transition-all">
                <span className="material-symbols-outlined text-3xl">skip_previous</span>
              </button>
              <button onClick={onTogglePlay} className="size-16 rounded-[24px] bg-white text-black flex items-center justify-center shadow-xl active:scale-95 transition-all">
                <span className="material-symbols-outlined text-4xl fill-1">{isPlaying ? 'pause' : 'play_arrow'}</span>
              </button>
              <button onClick={onNext} className="size-10 flex items-center justify-center text-white/80 active:scale-75 transition-all">
                <span className="material-symbols-outlined text-3xl">skip_next</span>
              </button>
            </div>

            <button onClick={onToggleRepeat} className={`size-10 flex items-center justify-center transition-all ${repeatMode !== 'off' ? 'text-primary' : 'text-white/20'}`}>
              <span className="material-symbols-outlined text-xl">{repeatMode === 'one' ? 'repeat_one' : 'repeat'}</span>
            </button>
          </div>
        </div>
      </main>

      {/* Floating Glass Drawer */}
      <footer
        className={`fixed left-0 right-0 bg-black/95 backdrop-blur-3xl border-t border-white/5 rounded-t-[40px] overflow-hidden z-[110] transition-transform ${!isDrawerDragging ? 'duration-500 ease-out' : 'duration-0'}`}
        style={{
          height: isPanelExpanded ? '85vh' : '140px',
          bottom: 0,
          transform: `translateY(${isDrawerDragging ? drawerDragY : 0}px)`
        }}
        onTouchStart={handleDrawerTouchStart}
        onTouchMove={handleDrawerTouchMove}
        onTouchEnd={handleDrawerTouchEnd}
      >
        <div className="flex justify-center pt-4 pb-1 cursor-pointer group shrink-0" onClick={() => setIsPanelExpanded(!isPanelExpanded)}>
          <div className={`h-1 rounded-full transition-all ${isPanelExpanded ? 'bg-primary w-16' : 'bg-white/10 w-10 group-hover:bg-primary/50'}`}></div>
        </div>

        <div className="flex justify-center gap-10 px-8 shrink-0">
          {['UP NEXT', 'LYRICS', 'RELATED'].map(tab => (
            <button key={tab} onClick={(e) => { e.stopPropagation(); setActiveTab(tab as any); }} className={`py-4 text-[10px] font-black tracking-[0.2em] border-b-2 transition-all ${activeTab === tab ? 'border-primary text-white' : 'border-transparent text-white/20'}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar px-8 pb-32" ref={listRef}>
          {activeTab === 'UP NEXT' && (
            <div className="space-y-4 py-4 animate-fade-in">
              {queue.map((t, i) => (
                <div key={`${t.id}-${i}`} onClick={() => t.id !== track.id && onAddToQueue(t)} className={`flex items-center gap-4 group cursor-pointer p-2 rounded-2xl transition-all ${t.id === track.id ? 'bg-white/5' : 'hover:bg-white/5'}`}>
                  <div className="relative size-12 rounded-xl overflow-hidden shadow-lg border border-white/5 shrink-0">
                    <img src={t.albumArt} className="w-full h-full object-cover" alt="" />
                    {t.id === track.id && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="flex gap-0.5 items-end h-4">
                          <div className="w-1 bg-white animate-music-bar-1"></div>
                          <div className="w-1 bg-white animate-music-bar-2"></div>
                          <div className="w-1 bg-white animate-music-bar-3"></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${t.id === track.id ? 'text-primary' : 'text-white/80'}`}>{t.title}</p>
                    <p className="text-[10px] font-black text-white/20 truncate uppercase tracking-widest">{t.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'LYRICS' && (
            <div className="py-8 space-y-8 animate-fade-in text-center">
              {track.lyrics ? (
                track.lyrics.map((line, i) => (
                  <p key={i} className={`text-xl font-bold transition-all duration-500 ${i === 0 ? 'text-white scale-110' : 'text-white/20 hover:text-white/40'}`}>
                    {line}
                  </p>
                ))
              ) : (
                <div className="py-20 flex flex-col items-center gap-4 opacity-25">
                  <span className="material-symbols-outlined text-6xl">format_quote</span>
                  <p className="text-xl font-black tracking-tight italic">Lyrics are currently unavailable for this track.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'RELATED' && (
            <div className="space-y-4 py-4 animate-fade-in">
              {similarTracks.map((t, i) => (
                <div key={`${t.id}-${i}`} onClick={() => onAddToQueue(t)} className="flex items-center gap-4 group cursor-pointer p-2 hover:bg-white/5 rounded-2xl transition-all">
                  <div className="size-14 rounded-2xl overflow-hidden border border-white/5 shrink-0 shadow-md">
                    <img src={t.albumArt} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white/80 truncate">{t.title}</p>
                    <p className="text-[10px] font-black text-white/20 truncate uppercase tracking-widest">{t.artist}</p>
                  </div>
                  <button className="size-10 rounded-full flex items-center justify-center bg-white/5 text-white/40 hover:bg-primary hover:text-white transition-all">
                    <span className="material-symbols-outlined text-xl">add</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </footer>

      <style>{`
        @keyframes music-bar-1 { 0%, 100% { height: 4px; } 50% { height: 16px; } }
        @keyframes music-bar-2 { 0%, 100% { height: 16px; } 50% { height: 8px; } }
        @keyframes music-bar-3 { 0%, 100% { height: 8px; } 50% { height: 14px; } }
        .animate-music-bar-1 { animation: music-bar-1 0.6s ease-in-out infinite; }
        .animate-music-bar-2 { animation: music-bar-2 0.8s ease-in-out infinite; }
        .animate-music-bar-3 { animation: music-bar-3 0.7s ease-in-out infinite; }
        @keyframes sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-sheet-up { animation: sheet-up 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        @keyframes bounce-horizontal { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(10px); } }
        @keyframes bounce-horizontal-reverse { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-10px); } }
        .animate-bounce-horizontal { animation: bounce-horizontal 0.5s ease-in-out infinite; }
        .animate-bounce-horizontal-reverse { animation: bounce-horizontal-reverse 0.5s ease-in-out infinite; }
      `}</style>

      {/* Quick Actions Bottom Sheet */}
      {showActions && (
        <div className="fixed inset-0 z-[200]" onClick={() => setShowActions(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-[#1a1a1a] rounded-t-[32px] p-6 animate-sheet-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Track Info */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/10">
              <img src={track.albumArt} className="size-16 rounded-xl" alt="" />
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-white truncate">{track.title}</p>
                <p className="text-sm text-white/50 truncate">{track.artist}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {/* Playback Speed */}
              <button
                onClick={cycleSpeed}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-2xl text-white/70">speed</span>
                <span className="flex-1 text-left font-medium">Playback Speed</span>
                <span className="text-primary font-bold">{playbackSpeed}x</span>
              </button>

              {/* Sleep Timer */}
              <button
                onClick={() => { onSetSleepTimer(sleepTimer ? null : 15); setShowActions(false); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-2xl text-white/70">bedtime</span>
                <span className="flex-1 text-left font-medium">Sleep Timer (15 min)</span>
                <span className={`${sleepTimer ? 'text-primary' : 'text-white/40'} text-sm font-bold`}>{sleepTimer ? `${sleepTimer}m remaining` : 'Off'}</span>
              </button>

              {/* Add to Playlist */}
              <button className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 active:scale-[0.98] transition-all">
                <span className="material-symbols-outlined text-2xl text-white/70">playlist_add</span>
                <span className="flex-1 text-left font-medium">Add to Playlist</span>
              </button>

              {/* Download for Offline */}
              <button
                onClick={handleDownload}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-2xl text-white/70">download</span>
                <span className="flex-1 text-left font-medium">Download for Offline</span>
              </button>

              {/* Share */}
              <button
                onClick={() => { handleShare(); setShowActions(false); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-2xl text-white/70">share</span>
                <span className="flex-1 text-left font-medium">Share</span>
              </button>

              {/* Go to Artist */}
              <button className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 active:scale-[0.98] transition-all">
                <span className="material-symbols-outlined text-2xl text-white/70">person</span>
                <span className="flex-1 text-left font-medium">Go to Artist</span>
              </button>
            </div>

            {/* Cancel */}
            <button
              onClick={() => setShowActions(false)}
              className="w-full mt-4 p-4 rounded-2xl bg-white/5 font-bold text-white/70 hover:bg-white/10 active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerView;
