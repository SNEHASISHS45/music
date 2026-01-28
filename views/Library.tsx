
import React, { useState } from 'react';
import { TRACKS } from '../constants';
import { Track } from '../types';
import { useRecommendations } from '../hooks/useRecommendations';
import { useAuth } from '../contexts/AuthContext';
import ProfileImage from '../components/ProfileImage';

interface LibraryViewProps {
  onTrackSelect: (track: Track) => void;
  onSearchClick: () => void;
}

const LibraryView: React.FC<LibraryViewProps> = ({ onTrackSelect, onSearchClick }) => {
  const [activeTab, setActiveTab] = useState('Recent');
  const { profile } = useRecommendations();
  const { user } = useAuth();

  const tabs = ['Recent', 'Playlists', 'Songs', 'Albums', 'Artists'];

  // Mock playlists for YTM feel
  const playlists = [
    { id: 'p1', title: 'Your Likes', subtitle: 'Auto-playlist', icon: 'favorite', count: profile?.likedSongs.length || 0 },
    { id: 'p2', title: 'Episodes for Later', subtitle: '1 episode', icon: 'watch_later', count: 1 },
    { id: 'p3', title: 'My Music', subtitle: 'User playlist', icon: 'playlist_play', count: TRACKS.length }
  ];

  return (
    <div className="bg-yt-black min-h-screen pb-32 pt-4 animate-fade-in flex flex-col">
      <header className="px-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ProfileImage
              src={user?.photoURL}
              displayName={user?.displayName}
              className="size-8 rounded-full"
            />
            <h1 className="text-2xl font-bold tracking-tight">Library</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-white">cast</span>
            <button onClick={onSearchClick} className="flex items-center justify-center">
              <span className="material-symbols-outlined text-white">search</span>
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${activeTab === tab ? 'bg-white text-black border-white' : 'bg-white/10 text-white border-white/5'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-4 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1 text-sm font-medium">
            <span>Recent activity</span>
            <span className="material-symbols-outlined text-sm">expand_more</span>
          </div>
          <span className="material-symbols-outlined text-white/60">grid_view</span>
        </div>

        <div className="space-y-4">
          {/* Liked Songs Special Entry */}
          <div className="flex items-center gap-4 group cursor-pointer active:scale-[0.98] transition-all">
            <div className="size-14 rounded-md bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white text-3xl fill-1">favorite</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-medium">Liked songs</p>
              <p className="text-xs text-yt-gray">Auto-playlist • {profile?.likedSongs.length || 0} songs</p>
            </div>
            <span className="material-symbols-outlined text-yt-gray">play_circle</span>
          </div>

          {/* Regular Library Items */}
          {TRACKS.slice(0, 10).map((track, i) => (
            <div
              key={track.id + i}
              onClick={() => onTrackSelect(track)}
              className="flex items-center gap-4 group cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="size-14 rounded-md overflow-hidden bg-yt-surface">
                <img src={track.albumArt} className="size-full object-cover" alt="" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium truncate">{track.title}</p>
                <p className="text-xs text-yt-gray truncate">Song • {track.artist}</p>
              </div>
              <span className="material-symbols-outlined text-yt-gray">more_vert</span>
            </div>
          ))}
        </div>

        {/* Categories Section */}
        <section className="mt-8 mb-4">
          <h3 className="text-xl font-bold mb-4">Your playlists</h3>
          <div className="grid grid-cols-2 gap-4">
            {playlists.map(p => (
              <div key={p.id} className="aspect-square bg-yt-surface/50 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                <span className="material-symbols-outlined text-primary text-4xl">{p.icon}</span>
                <div>
                  <p className="font-bold truncate">{p.title}</p>
                  <p className="text-xs text-yt-gray">{p.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default LibraryView;
