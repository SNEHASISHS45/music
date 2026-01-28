
import React, { useState, useEffect } from 'react';
import { TRACKS } from '../constants';
import { Track } from '../types';

interface DiscoverViewProps {
  onTrackSelect: (track: Track) => void;
  onSearchClick: () => void;
}

// Sample Podcasts Data
const PODCASTS = [
  {
    id: 'pod1',
    title: 'Music & Culture',
    publisher: 'Spotify Studios',
    cover: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300&h=300&fit=crop',
    episodes: 156
  },
  {
    id: 'pod2',
    title: 'Behind The Lyrics',
    publisher: 'iHeart Radio',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
    episodes: 89
  },
  {
    id: 'pod3',
    title: 'Producer Sessions',
    publisher: 'Audio Network',
    cover: 'https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=300&h=300&fit=crop',
    episodes: 234
  },
  {
    id: 'pod4',
    title: 'The Sound Lab',
    publisher: 'NPR Music',
    cover: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=300&h=300&fit=crop',
    episodes: 67
  },
  {
    id: 'pod5',
    title: 'Indie Spotlight',
    publisher: 'Music Weekly',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    episodes: 112
  },
  {
    id: 'pod6',
    title: 'Vinyl Stories',
    publisher: 'Classic FM',
    cover: 'https://images.unsplash.com/photo-1461360370896-922624d12a74?w=300&h=300&fit=crop',
    episodes: 45
  }
];

const DiscoverView: React.FC<DiscoverViewProps> = ({ onTrackSelect, onSearchClick }) => {
  const podcastsRef = React.useRef<HTMLElement>(null);
  const newReleasesRef = React.useRef<HTMLElement>(null);
  const moodsRef = React.useRef<HTMLElement>(null);

  const scrollToSection = (section: string) => {
    const refs: Record<string, React.RefObject<HTMLElement>> = {
      'Podcasts': podcastsRef,
      'New releases': newReleasesRef,
      'Moods & genres': moodsRef,
      'Charts': newReleasesRef // Charts scrolls to new releases for now
    };
    refs[section]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const categories = [
    { label: 'New releases', icon: 'fiber_new', color: 'bg-red-500' },
    { label: 'Charts', icon: 'trending_up', color: 'bg-blue-500' },
    { label: 'Moods & genres', icon: 'mood', color: 'bg-green-600' },
    { label: 'Podcasts', icon: 'podcasts', color: 'bg-purple-500' }
  ];

  return (
    <div className="bg-yt-black min-h-screen pb-32 pt-4 animate-fade-in flex flex-col">
      <header className="px-4 mb-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Explore</h1>
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-white">cast</span>
            <button onClick={onSearchClick} className="flex items-center justify-center">
              <span className="material-symbols-outlined text-white">search</span>
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 space-y-10 flex-1">
        {/* Category Buttons - Now Functional */}
        <div className="grid grid-cols-2 gap-3">
          {categories.map(cat => (
            <div
              key={cat.label}
              onClick={() => scrollToSection(cat.label)}
              className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/5 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            >
              <span className={`material-symbols-outlined text-white p-2 rounded-lg shadow-lg ${cat.color}`}>{cat.icon}</span>
              <span className="text-sm font-bold">{cat.label}</span>
            </div>
          ))}
        </div>

        {/* Podcasts Section */}
        <section ref={podcastsRef}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold tracking-tight">Podcasts</h2>
            <button className="text-sm font-bold text-yt-gray px-3 py-1 border border-white/20 rounded-full hover:bg-white/5">See all</button>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
            {PODCASTS.map(podcast => (
              <div key={podcast.id} className="shrink-0 w-36 group cursor-pointer">
                <div className="relative aspect-square rounded-2xl overflow-hidden mb-2 shadow-xl border border-white/10">
                  <img src={podcast.cover} className="size-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-white text-4xl fill-1">play_circle</span>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-bold">
                    {podcast.episodes} eps
                  </div>
                </div>
                <p className="text-sm font-bold text-white truncate">{podcast.title}</p>
                <p className="text-xs text-yt-gray truncate">{podcast.publisher}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Global New Releases - Direct from Data */}
        <section ref={newReleasesRef}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold tracking-tight">New releases</h2>
            <button className="text-sm font-bold text-yt-gray px-3 py-1 border border-white/20 rounded-full hover:bg-white/5">See all</button>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
            {[...TRACKS].reverse().map(track => (
              <div key={track.id} onClick={() => onTrackSelect(track)} className="shrink-0 w-40 group cursor-pointer">
                <div className="relative aspect-square rounded-lg overflow-hidden mb-2 shadow-xl border border-white/5">
                  <img src={track.albumArt} className="size-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-white text-4xl fill-1">play_circle</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-white truncate">{track.title}</p>
                <p className="text-xs text-yt-gray truncate font-medium">{track.artist}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trending Genres - Dynamic mapping */}
        <section ref={moodsRef}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold tracking-tight">Trending moods</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 pb-10">
            {[
              { name: 'Chill', color: 'from-blue-600/40', genre: 'Lofi' },
              { name: 'Commute', color: 'from-orange-600/40', genre: 'Pop' },
              { name: 'Focus', color: 'from-indigo-600/40', genre: 'Ambient' },
              { name: 'Workout', color: 'from-red-600/40', genre: 'Phonk' },
              { name: 'Party', color: 'from-purple-600/40', genre: 'Electronic' },
              { name: 'Sleep', color: 'from-teal-600/40', genre: 'Jazz' }
            ].map(mood => (
              <div key={mood.name} onClick={() => {
                const found = TRACKS.find(t => t.genre.includes(mood.genre));
                if (found) onTrackSelect(found);
              }} className={`h-24 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center font-bold text-lg active:scale-95 transition-transform cursor-pointer overflow-hidden relative group`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${mood.color} to-transparent group-hover:opacity-100 opacity-40 transition-opacity`}></div>
                <span className="relative z-10 tracking-tight">{mood.name}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default DiscoverView;
