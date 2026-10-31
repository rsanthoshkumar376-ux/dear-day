import React from 'react';
import { Sparkles, BookOpen, Flame, Settings, Mic, Sun, Moon } from 'lucide-react';

export type TabType = 'today' | 'chat' | 'diary' | 'streak' | 'settings';

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  streakCount: number;
  hasUnfinishedChat?: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  language?: 'en' | 'ta';
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  streakCount,
  hasUnfinishedChat,
  isDarkMode,
  onToggleTheme,
  language = 'en',
}) => {
  const isTamil = language === 'ta';

  const tabs: Array<{ id: TabType; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'today', label: isTamil ? 'இன்று' : 'Today', icon: Sparkles },
    { id: 'chat', label: isTamil ? 'நாட்குறிப்பு' : 'Voice Diary', icon: Mic },
    { id: 'diary', label: isTamil ? 'பதிவுகள்' : 'Diary', icon: BookOpen },
    { id: 'streak', label: isTamil ? 'தொடர்' : 'Streak', icon: Flame },
    { id: 'settings', label: isTamil ? 'அமைப்புகள்' : 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Top Header (Brand + Dark Mode Toggle + Streak Quick Glance) */}
      <header className="sticky top-0 z-30 w-full bg-journal-50/90 dark:bg-stone-950/90 backdrop-blur-md border-b border-journal-200/80 dark:border-stone-800/80 transition-colors pt-safe">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => onSelectTab('today')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white shadow-sm">
              <span className="font-journal font-bold text-base leading-none">D</span>
            </div>
            <div>
              <span className="font-journal font-bold text-lg text-stone-800 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                Dear Day
              </span>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {/* Quick Streak Pill */}
            <button
              onClick={() => onSelectTab('streak')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100/80 dark:bg-amber-950/60 border border-amber-300/50 dark:border-amber-800/50 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-200/80 transition-all active:scale-95"
              title="View Streak Details"
            >
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{streakCount}</span>
            </button>

            {/* Dark/Light mode toggle */}
            <button
              onClick={onToggleTheme}
              aria-label="Toggle Dark/Light Mode"
              className="p-2 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-journal-200/60 dark:hover:bg-stone-800 transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Bottom Navigation Bar for Mobile and Responsive View */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-journal-50/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-journal-200/80 dark:border-stone-800 pb-safe transition-colors">
        <div className="max-w-md mx-auto px-3 h-16 flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
                  isActive
                    ? 'text-amber-600 dark:text-amber-400 font-semibold'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  {/* Badge indicator for active in-progress chat */}
                  {tab.id === 'chat' && hasUnfinishedChat && !isActive && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
                  )}
                  {tab.id === 'chat' && hasUnfinishedChat && !isActive && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full" />
                  )}
                </div>
                <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 w-8 h-1 bg-amber-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
