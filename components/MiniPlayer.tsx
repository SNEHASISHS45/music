
import React, { useRef, useState } from 'react';
import { Track } from '../types';

interface MiniPlayerProps {
  track: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onClick: () => void;
  onPrevious?: () => void;
  onDismiss?: () => void;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({
  track, isPlaying, currentTime, duration,
  onTogglePlay, onClick, onNext, onPrevious, onDismiss
}) => {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Swipe gesture handling
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 });
  const [isSwiping, setIsSwiping] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;

    // Only allow swipe if it's more horizontal or more vertical than the other
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeOffset({ x: deltaX * 0.5, y: 0 }); // Dampen horizontal
    } else if (deltaY > 0) {
      setSwipeOffset({ x: 0, y: deltaY });
    }
  };

  const handleTouchEnd = () => {
    if (Math.abs(swipeOffset.x) > 50) {
      if (swipeOffset.x > 0 && onPrevious) {
        onPrevious();
      } else if (swipeOffset.x < 0 && onNext) {
        onNext();
      }
    } else if (swipeOffset.y > 70 && onDismiss) {
      onDismiss();
    }

    setSwipeOffset({ x: 0, y: 0 });
    setIsSwiping(false);
    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      className="fixed bottom-[72px] left-3 right-3 z-50 animate-fade-in"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="bg-[#1a1a1a] rounded-xl overflow-hidden shadow-2xl border border-white/10 transition-transform"
        style={{
          transform: `translate(${swipeOffset.x}px, ${swipeOffset.y}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        {/* Progress Bar */}
        <div className="h-[3px] bg-white/10 w-full">
          <div
            className="h-full bg-primary rounded-r-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-3 p-2 pr-3">
          {/* Album Art with Equalizer */}
          <div
            onClick={onClick}
            className="size-12 rounded-lg overflow-hidden flex-shrink-0 relative cursor-pointer group"
          >
            <img src={track.albumArt} className="size-full object-cover" alt="" />
            {isPlaying && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="flex gap-[2px] items-end h-4">
                  <div className="w-[3px] bg-primary rounded-t animate-eq-1"></div>
                  <div className="w-[3px] bg-primary rounded-t animate-eq-2"></div>
                  <div className="w-[3px] bg-primary rounded-t animate-eq-3"></div>
                  <div className="w-[3px] bg-primary rounded-t animate-eq-4"></div>
                </div>
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
            <p className="text-sm font-semibold text-white truncate">{track.title}</p>
            <p className="text-xs text-white/50 truncate">{track.artist}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
              className="size-11 rounded-full bg-white flex items-center justify-center active:scale-90 transition-transform"
            >
              <span className="material-symbols-outlined text-black text-2xl fill-1">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
          </div>
        </div>

        {/* Swipe Hint Icons */}
        {Math.abs(swipeOffset.x) > 20 && (
          <>
            <div
              className="absolute left-4 top-1/2 -translate-y-1/2 transition-opacity"
              style={{ opacity: swipeOffset.x > 0 ? Math.min(swipeOffset.x / 50, 1) : 0 }}
            >
              <span className="material-symbols-outlined text-white/60">skip_previous</span>
            </div>
            <div
              className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity"
              style={{ opacity: swipeOffset.x < 0 ? Math.min(Math.abs(swipeOffset.x) / 50, 1) : 0 }}
            >
              <span className="material-symbols-outlined text-white/60">skip_next</span>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes eq-1 { 0%, 100% { height: 4px; } 50% { height: 14px; } }
        @keyframes eq-2 { 0%, 100% { height: 12px; } 50% { height: 6px; } }
        @keyframes eq-3 { 0%, 100% { height: 8px; } 50% { height: 16px; } }
        @keyframes eq-4 { 0%, 100% { height: 14px; } 50% { height: 4px; } }
        .animate-eq-1 { animation: eq-1 0.5s ease-in-out infinite; }
        .animate-eq-2 { animation: eq-2 0.6s ease-in-out infinite; }
        .animate-eq-3 { animation: eq-3 0.4s ease-in-out infinite; }
        .animate-eq-4 { animation: eq-4 0.55s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default MiniPlayer;
