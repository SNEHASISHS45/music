
import React from 'react';
import { Screen } from '../types';

interface NavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentScreen, onNavigate }) => {
  const tabs: { id: Screen, icon: string, label: string }[] = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'discover', icon: 'explore', label: 'Explore' },
    { id: 'library', icon: 'library_music', label: 'Library' },
    { id: 'profile', icon: 'person', label: 'You' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-2">
      <div className="flex items-center justify-around px-4">
        {tabs.map(tab => {
          const isActive = currentScreen === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-2xl transition-all active:scale-90 ${isActive ? 'text-white' : 'text-white/40'}`}
            >
              {/* Active Indicator */}
              {isActive && (
                <div className="absolute inset-0 bg-white/10 rounded-2xl animate-pulse-subtle" />
              )}

              <span className={`material-symbols-outlined text-2xl relative z-10 transition-transform ${isActive ? 'fill-1 scale-110' : ''}`}>
                {tab.icon}
              </span>
              <span className={`text-[10px] font-semibold relative z-10 transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </nav>
  );
};

export default Navigation;
