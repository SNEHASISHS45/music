
import React, { useState, useEffect, useRef } from 'react';
import { TRACKS } from '../constants';
import { Track } from '../types';
import { useRecommendations } from '../hooks/useRecommendations';
import { useAuth } from '../contexts/AuthContext';
import ProfileImage from '../components/ProfileImage';

interface HomeViewProps {
  onTrackSelect: (track: Track) => void;
  onPlayNext: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onSearchClick: () => void;
}

const RECENTLY_PLAYED_KEY = 'vibe_recently_played';
const MAX_RECENT = 20;

const HomeView: React.FC<HomeViewProps> = ({ onTrackSelect, onPlayNext, onAddToQueue, onSearchClick }) => {
  const [greeting, setGreeting] = useState('Good evening');
  const [activeChip, setActiveChip] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  const { getForYou, topInterests } = useRecommendations();
  const { user } = useAuth();
  const [forYouTracks, setForYouTracks] = useState<Track[]>([]);

  const chips = ['All', 'Relax', 'Workout', 'Energize', 'Focus', 'Commute'];

  // Load recently played from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(RECENTLY_PLAYED_KEY);
    if (saved) {
      try {
        setRecentlyPlayed(JSON.parse(saved));
      } catch (e) {
        setRecentlyPlayed([]);
      }
    }
  }, []);

  // Set greeting based on time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Compute personalized recommendations
  useEffect(() => {
    let baseTracks = TRACKS;

    if (activeChip !== 'All') {
      baseTracks = TRACKS.filter(t =>
        t.genre.toLowerCase().includes(activeChip.toLowerCase()) ||
        activeChip === 'Relax' && ['Lofi', 'Ambient', 'Chill'].includes(t.genre) ||
        activeChip === 'Workout' && ['Phonk', 'Rock', 'Electronic'].includes(t.genre) ||
        activeChip === 'Energize' && ['Pop', 'Dance', 'Phonk'].includes(t.genre)
      );
    }

    const personalized = getForYou(baseTracks.length > 0 ? baseTracks : TRACKS, 16);
    setForYouTracks(personalized.length > 0 ? personalized : (baseTracks.length > 0 ? baseTracks : TRACKS).slice(0, 16));
  }, [getForYou, topInterests, activeChip]);

  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0 && containerRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(delta * 0.5, 100));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60) {
      setIsRefreshing(true);
      // Simulate refresh
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
        // Re-trigger recommendations
        const personalized = getForYou(TRACKS, 16);
        setForYouTracks(personalized.length > 0 ? personalized : TRACKS.slice(0, 16));
      }, 1500);
    } else {
      setPullDistance(0);
    }
    touchStartY.current = null;
  };

  // Handle track selection and update history
  const handleTrackClick = (track: Track) => {
    // Update recently played
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      const updated = [track, ...filtered].slice(0, MAX_RECENT);
      localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(updated));
      return updated;
    });
    onTrackSelect(track);
  };

  return (
    <div
      ref={containerRef}
      className="bg-yt-black min-h-screen pb-32 pt-4 overflow-y-auto relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ambient Glows */}
      <div className="absolute top-0 left-0 right-0 h-[400px] overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[100px] -left-[100px] size-[300px] bg-primary/20 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute -top-[50px] right-0 size-[250px] bg-purple-600/20 rounded-full blur-[80px] animate-float" />
        <div className="absolute top-[100px] left-1/2 -translate-x-1/2 size-[200px] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Pull to Refresh Indicator */}
      <div
        className="flex justify-center items-center overflow-hidden transition-all duration-300 relative z-10"
        style={{ height: isRefreshing ? 60 : pullDistance }}
      >
        <div className={`size-8 border-2 border-primary border-t-transparent rounded-full ${isRefreshing ? 'animate-spin' : ''}`}
          style={{
            opacity: pullDistance > 20 || isRefreshing ? 1 : 0,
            transform: `rotate(${pullDistance * 3}deg)`
          }}
        />
      </div>

      <header className="px-4 mb-8 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight bg-gradient-to-br from-white via-white to-white/30 bg-clip-text text-transparent">Nove</span>
          </div>
          <div className="flex items-center gap-5">
            <span className="material-symbols-outlined text-white/50 text-2xl hover:text-white transition-colors cursor-pointer">cast</span>
            <button onClick={onSearchClick} className="flex items-center justify-center size-10 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-white text-2xl">search</span>
            </button>
            <ProfileImage
              src={user?.photoURL}
              displayName={user?.displayName}
              className="size-8 rounded-full border border-white/10"
            />
          </div>
        </div>

        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar">
          {chips.map(chip => (
            <button
              key={chip}
              onClick={() => setActiveChip(chip)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border active:scale-95 ${activeChip === chip ? 'bg-white text-black border-white shadow-lg shadow-white/10' : 'bg-white/5 text-white/60 border-white/5 hover:border-white/10'}`}
            >
              {chip}
            </button>
          ))}
        </div>
      </header>

      <main className="space-y-12 relative z-10">
        {/* Recently Played - Only show if there's history */}
        {recentlyPlayed.length > 0 && (
          <section className="px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold tracking-tight">{greeting}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {recentlyPlayed.slice(0, 4).map(track => (
                <div
                  key={track.id}
                  onClick={() => handleTrackClick(track)}
                  className="flex items-center gap-3 bg-white/5 rounded-lg overflow-hidden group cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all"
                >
                  <img src={track.albumArt} className="size-12 object-cover" alt="" />
                  <p className="text-sm font-semibold text-white truncate pr-2 flex-1">{track.title}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Listen Again if no recent history */}
        {recentlyPlayed.length === 0 && (
          <section className="px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold tracking-tight">{greeting}</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar">
              {TRACKS.slice(0, 5).map(track => (
                <div key={track.id} onClick={() => handleTrackClick(track)} className="shrink-0 w-36 group cursor-pointer">
                  <div className="relative aspect-square rounded-lg overflow-hidden mb-2 shadow-lg">
                    <img src={track.albumArt} className="size-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-4xl opacity-0 group-hover:opacity-100 fill-1 transition-opacity">play_arrow</span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-white truncate">{track.title}</p>
                  <p className="text-xs text-yt-gray truncate">{track.artist}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Picks Section */}
        <section className="px-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-yt-gray uppercase font-bold tracking-wider mb-1">
                {topInterests.length > 0 && topInterests[0].score > 0
                  ? `Based on your taste in ${topInterests[0].tag}`
                  : 'Start radio from a song'}
              </p>
              <h2 className="text-2xl font-bold tracking-tight">For you</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-y-4">
            <div className="grid grid-rows-4 grid-flow-col gap-x-6 gap-y-4 overflow-x-auto hide-scrollbar pb-2">
              {forYouTracks.map(track => (
                <div key={track.id} onClick={() => handleTrackClick(track)} className="flex items-center gap-3 w-72 shrink-0 group cursor-pointer">
                  <div className="size-14 rounded-md overflow-hidden shrink-0 relative">
                    <img src={track.albumArt} className="size-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-white fill-1">play_arrow</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{track.title}</p>
                    <p className="text-xs text-yt-gray truncate">{track.artist}</p>
                  </div>
                  <span className="material-symbols-outlined text-white/40 group-hover:text-white">more_vert</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mixed For You - New section with auto-generated playlists */}
        <section className="px-4">
          <h2 className="text-2xl font-bold tracking-tight mb-4">Mixed for you</h2>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar">
            {[
              { name: 'Discover Mix', color: 'from-purple-600 to-blue-600', icon: 'explore' },
              { name: 'Chill Mix', color: 'from-blue-500 to-teal-500', icon: 'self_improvement' },
              { name: 'Energy Mix', color: 'from-orange-500 to-red-500', icon: 'bolt' },
              { name: 'Focus Mix', color: 'from-green-500 to-emerald-600', icon: 'psychology' }
            ].map(mix => (
              <div key={mix.name} className="shrink-0 w-40 group cursor-pointer" onClick={() => handleTrackClick(TRACKS[Math.floor(Math.random() * TRACKS.length)])}>
                <div className={`relative aspect-square rounded-2xl overflow-hidden mb-3 bg-gradient-to-br ${mix.color} flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform`}>
                  <span className="material-symbols-outlined text-white/80 text-6xl">{mix.icon}</span>
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-white text-lg font-black tracking-tight drop-shadow-lg">{mix.name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recommended Albums */}
        <section className="px-4">
          <h2 className="text-2xl font-bold tracking-tight mb-4">Recommended albums</h2>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar">
            {TRACKS.slice(4, 9).map(track => (
              <div key={track.id} onClick={() => handleTrackClick(track)} className="shrink-0 w-44 group cursor-pointer">
                <div className="relative aspect-square rounded-lg overflow-hidden mb-2">
                  <img src={track.albumArt} className="size-full object-cover" alt="" />
                </div>
                <p className="text-sm font-medium text-white truncate">{track.title}</p>
                <p className="text-xs text-yt-gray">Album • {track.artist}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Similar Artists */}
        <section className="px-4 pb-8">
          <h2 className="text-2xl font-bold tracking-tight mb-4">Similar to {TRACKS[0].artist}</h2>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4">
            {TRACKS.slice(2, 7).map(track => (
              <div key={track.id} onClick={() => handleTrackClick(track)} className="shrink-0 w-36 group cursor-pointer">
                <div className="relative aspect-square rounded-full overflow-hidden mb-2 group-hover:ring-2 ring-primary transition-all">
                  <img src={track.albumArt} className="size-full object-cover" alt="" />
                </div>
                <p className="text-sm font-medium text-white text-center truncate">{track.artist}</p>
                <p className="text-xs text-yt-gray text-center">Artist</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default HomeView;
