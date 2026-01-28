
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRecommendations } from '../hooks/useRecommendations';
import { audioCache } from '../services/audioCache';
import ProfileImage from '../components/ProfileImage';

interface CacheStats {
  itemCount: number;
  totalSizeMB: number;
}

const ProfileView: React.FC = () => {
  const { user, loading, signIn, logout } = useAuth();
  const { tasteSummary, topInterests } = useRecommendations();
  const [neuralAudio, setNeuralAudio] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [cacheStats, setCacheStats] = useState<CacheStats>({ itemCount: 0, totalSizeMB: 0 });
  const [clearingCache, setClearingCache] = useState(false);

  // Load cache stats
  useEffect(() => {
    const loadStats = async () => {
      const stats = await audioCache.getStats();
      setCacheStats(stats);
    };
    loadStats();
  }, []);

  const handleClearCache = async () => {
    setClearingCache(true);
    await audioCache.clearCache();
    setCacheStats({ itemCount: 0, totalSizeMB: 0 });
    setClearingCache(false);
  };

  // Show login UI if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-yt-black animate-fade-in pb-48 flex flex-col items-center justify-center px-6">
        <div className="text-center space-y-6 max-w-sm">
          {/* Logo */}
          <div className="mb-8">
            <img src="/logo.png" className="size-20 mx-auto rounded-[24px] shadow-2xl mb-6" alt="Nove" />
            <h1 className="text-3xl font-bold tracking-tight">Welcome to Nove</h1>
            <p className="text-yt-gray mt-2">Sign in to sync your music preferences across devices</p>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={signIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-medium py-4 px-6 rounded-full hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <div className="size-5 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="size-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Benefits */}
          <div className="mt-10 space-y-4 text-left">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary">sync</span>
              <div>
                <p className="font-medium text-white">Sync your library</p>
                <p className="text-sm text-yt-gray">Access your liked songs on any device</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary">auto_awesome</span>
              <div>
                <p className="font-medium text-white">AI Recommendations</p>
                <p className="text-sm text-yt-gray">Get personalized music suggestions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary">history</span>
              <div>
                <p className="font-medium text-white">Listen history</p>
                <p className="text-sm text-yt-gray">Pick up where you left off</p>
              </div>
            </div>
          </div>

          {/* Skip login */}
          <p className="text-sm text-yt-gray mt-8">
            You can also continue without signing in
          </p>
        </div>
      </div>
    );
  }

  // Logged in view
  return (
    <div className="min-h-screen bg-yt-black animate-fade-in pb-48">
      {/* Header / Identity */}
      <section className="px-6 pt-10 pb-8 text-center space-y-4">
        <div className="relative inline-block">
          <div className="absolute -inset-2 bg-gradient-to-r from-primary via-white to-primary rounded-full blur-md animate-spin-slow opacity-30"></div>
          <div className="relative size-28 rounded-full border-4 border-yt-black overflow-hidden bg-yt-surface shadow-2xl">
            <ProfileImage
              src={user.photoURL}
              displayName={user.displayName}
              className="w-full h-full"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 size-6 bg-primary rounded-full border-2 border-yt-black flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-[12px] text-white font-black fill-1">verified</span>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight">{user.displayName || 'Music Lover'}</h2>
          <p className="text-sm text-yt-gray mt-1">{user.email}</p>
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={logout}
            disabled={loading}
            className="bg-white/10 px-6 py-2 rounded-full text-sm font-medium text-white border border-white/10 hover:bg-white/20 transition-colors"
          >
            Sign out
          </button>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="px-6 grid grid-cols-2 gap-4 mb-10">
        <div className="bg-white/5 p-5 rounded-xl border border-white/5 space-y-1">
          <p className="text-xs text-yt-gray">Liked Songs</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">{tasteSummary?.totalLikes || 0}</span>
          </div>
        </div>
        <div className="bg-white/5 p-5 rounded-xl border border-white/5 space-y-1">
          <p className="text-xs text-yt-gray">Top Genre</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-primary">
              {topInterests.length > 0 && topInterests[0].score > 0 ? topInterests[0].tag : '—'}
            </span>
          </div>
        </div>
        <div className="bg-white/5 p-5 rounded-xl border border-white/5 space-y-1">
          <p className="text-xs text-yt-gray">Recent Activity</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">{tasteSummary?.recentActivity || 0}</span>
            <span className="text-xs text-yt-gray">this week</span>
          </div>
        </div>
        <div className="bg-white/5 p-5 rounded-xl border border-white/5 space-y-1">
          <p className="text-xs text-yt-gray">Dislikes</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-yt-gray">{tasteSummary?.totalDislikes || 0}</span>
          </div>
        </div>
      </section>

      {/* Your Interests */}
      {topInterests.length > 0 && topInterests[0].score > 0 && (
        <section className="px-6 mb-10">
          <h3 className="text-sm font-bold text-white mb-4">Your music taste</h3>
          <div className="flex flex-wrap gap-2">
            {topInterests.filter(i => i.score > 0).map(interest => (
              <div
                key={interest.tag}
                className="bg-white/10 px-4 py-2 rounded-full text-sm font-medium border border-white/5"
              >
                {interest.tag}
                <span className="ml-2 text-yt-gray text-xs">+{Math.round(interest.score)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Settings */}
      <section className="px-6 space-y-6">
        <h3 className="text-sm font-bold text-white mb-4">Settings</h3>

        <div className="space-y-3">
          {/* Toggle Switch Item */}
          <div className="bg-white/5 p-4 rounded-xl flex items-center justify-between border border-white/5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">graphic_eq</span>
              <div>
                <p className="text-sm font-medium">Audio Enhancement</p>
                <p className="text-xs text-yt-gray">AI-powered clarity boost</p>
              </div>
            </div>
            <button
              onClick={() => setNeuralAudio(!neuralAudio)}
              className={`w-12 h-6 rounded-full p-1 transition-all ${neuralAudio ? 'bg-primary' : 'bg-white/10'}`}
            >
              <div className={`size-4 bg-white rounded-full transition-transform ${neuralAudio ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>

          <div className="bg-white/5 p-4 rounded-xl flex items-center justify-between border border-white/5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">vibration</span>
              <div>
                <p className="text-sm font-medium">Haptic Feedback</p>
                <p className="text-xs text-yt-gray">Vibrate on beat</p>
              </div>
            </div>
            <button
              onClick={() => setHapticFeedback(!hapticFeedback)}
              className={`w-12 h-6 rounded-full p-1 transition-all ${hapticFeedback ? 'bg-primary' : 'bg-white/10'}`}
            >
              <div className={`size-4 bg-white rounded-full transition-transform ${hapticFeedback ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
          </div>

          {/* Audio Cache Storage */}
          <div className="bg-white/5 p-4 rounded-xl flex items-center justify-between border border-white/5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-green-400">download_done</span>
              <div>
                <p className="text-sm font-medium">Offline Cache</p>
                <p className="text-xs text-yt-gray">
                  {cacheStats.itemCount} songs • {cacheStats.totalSizeMB.toFixed(1)} MB
                </p>
              </div>
            </div>
            <button
              onClick={handleClearCache}
              disabled={clearingCache || cacheStats.itemCount === 0}
              className="px-3 py-1.5 text-xs font-medium bg-white/10 rounded-full hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {clearingCache ? 'Clearing...' : 'Clear'}
            </button>
          </div>

          <div className="bg-white/5 p-4 rounded-xl flex items-center justify-between border border-white/5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-yt-gray">info</span>
              <div>
                <p className="text-sm font-medium">About Nove</p>
                <p className="text-xs text-yt-gray">Version 1.2.0-PRO</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-yt-gray">chevron_right</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProfileView;
