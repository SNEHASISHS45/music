
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
    <nav className="fixed bottom-0 left-0 right-0 z-[120] bg-black/80 backdrop-blur-3xl border-t border-white/5 pt-1.5 pb-1.5 px-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map(tab => {
          const isActive = currentScreen === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className="group relative flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 flex-1"
            >
              {/* Material You Pill Indicator */}
              <div className={`
                relative px-6 py-1 rounded-full transition-all duration-300
                ${isActive ? 'bg-primary/20 scale-110 shadow-[0_0_20px_rgba(255,0,0,0.1)]' : 'bg-transparent'}
              `}>
                <span className={`
                    material-symbols-outlined text-xl transition-all duration-300
                    ${isActive ? 'text-primary fill-1' : 'text-white/40'}
                `}>
                  {tab.icon}
                </span>
              </div>
              <span className={`
                text-[9px] font-bold tracking-tight transition-all duration-300
                ${isActive ? 'text-primary' : 'text-white/40'}
              `}>
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
