import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_USER_SETTINGS, updateUserSettings } from './db/dexie';
import type { DiaryEntry, MessageItem, UserSettings } from './types';
import { calculateStreakInfo, formatLocalDate, MILESTONES } from './services/streakService';
import { checkScheduledReminders } from './services/notificationService';
import { Navbar, type TabType } from './components/Navbar';
import { TodayScreen } from './components/TodayScreen';
import { VoiceDiaryWriter } from './components/VoiceDiaryWriter';
import { DiaryScreen } from './components/DiaryScreen';
import { StreakScreen } from './components/StreakScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { OnboardingModal } from './components/OnboardingModal';
import { DaySummaryModal } from './components/DaySummaryModal';
import { CelebrationModal } from './components/CelebrationModal';
import { PinLockScreen } from './components/PinLockScreen';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('today');
  const [todayDate, setTodayDate] = useState<string>(formatLocalDate(new Date()));
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [selectedDiaryDate, setSelectedDiaryDate] = useState<string | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [celebrationMilestone, setCelebrationMilestone] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return (
      localStorage.getItem('dear_day_theme') === 'dark' ||
      (!('dear_day_theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  // Query Dexie databases reactively
  const storedSettings = useLiveQuery<UserSettings | undefined>(
    () => db.userSettings.toCollection().first(),
    []
  );
  const userSettings: UserSettings = useMemo(() => {
    return storedSettings || DEFAULT_USER_SETTINGS;
  }, [storedSettings]);

  const entries = useLiveQuery<DiaryEntry[]>(() => db.entries.toArray(), []);
  const todayMessages = useLiveQuery<MessageItem[]>(
    () => db.messages.where('date').equals(todayDate).sortBy('timestamp'),
    [todayDate]
  );

  // Today's entry if saved
  const todayEntry = useMemo(() => {
    return entries?.find((e) => e.date === todayDate);
  }, [entries, todayDate]);

  // Derived streak calculation
  const streakInfo = useMemo(() => {
    return calculateStreakInfo(entries || [], userSettings);
  }, [entries, userSettings]);

  // Apply dark mode to document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('dear_day_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('dear_day_theme', 'light');
    }
  }, [isDarkMode]);

  // Handle midnight date rollover
  useEffect(() => {
    const interval = setInterval(() => {
      const nowStr = formatLocalDate(new Date());
      if (nowStr !== todayDate) {
        setTodayDate(nowStr);
      }
    }, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [todayDate]);

  // Check scheduled reminders on launch and periodically
  useEffect(() => {
    if (userSettings && entries) {
      checkScheduledReminders(userSettings, entries);
      const reminderTimer = setInterval(() => {
        checkScheduledReminders(userSettings, entries);
      }, 60000);
      return () => clearInterval(reminderTimer);
    }
  }, [userSettings, entries]);

  // Lock app if PIN is configured in stored settings
  useEffect(() => {
    if (storedSettings?.pinHash) {
      setIsLocked(true);
    }
  }, [storedSettings?.pinHash]);

  // Save new message to Dexie
  const handleSaveMessage = useCallback(async (msg: Omit<MessageItem, 'id'>) => {
    await db.messages.add(msg as MessageItem);
  }, []);

  // Save diary entry to Dexie & check milestones
  const handleSaveEntry = async (entryData: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const existing = await db.entries.where('date').equals(entryData.date).first();
    const now = Date.now();

    if (existing && existing.id) {
      await db.entries.put({
        ...entryData,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: now,
      });
    } else {
      await db.entries.add({
        ...entryData,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Recalculate streak to check for milestone celebration
    const allEntries = await db.entries.toArray();
    const newStreak = calculateStreakInfo(allEntries, userSettings);

    if (MILESTONES.includes(newStreak.currentStreak)) {
      setCelebrationMilestone(newStreak.currentStreak);
    }
  };

  // Update entry in Diary
  const handleEditEntry = async (entry: DiaryEntry) => {
    if (entry.id) {
      await db.entries.put(entry);
    }
  };

  // Delete entry in Diary
  const handleDeleteEntry = async (id: number) => {
    await db.entries.delete(id);
  };

  // Jump to specific date in Diary
  const handleOpenDiaryDay = (date: string) => {
    setSelectedDiaryDate(date);
    setCurrentTab('diary');
  };

  // Onboarding completion
  const handleOnboardingComplete = async (updated: UserSettings) => {
    await updateUserSettings({ ...updated, onboardingCompleted: true });
  };

  // Reset all data
  const handleDataReset = () => {
    setCurrentTab('today');
  };

  // PIN Lock Screen (only if PIN is set and app is currently locked)
  if (userSettings.pinHash && isLocked) {
    return (
      <PinLockScreen
        pinHash={userSettings.pinHash}
        onUnlock={() => setIsLocked(false)}
      />
    );
  }

  const hasUnfinishedChat = !streakInfo.isTodayCompleted && (todayMessages?.length || 0) > 0;

  return (
    <div className="min-h-screen bg-journal-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans transition-colors duration-200">
      {/* Onboarding Modal (first launch only) */}
      {!userSettings.onboardingCompleted && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}

      {/* Top Header & Bottom Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'diary') {
            setSelectedDiaryDate(null);
          }
          setCurrentTab(tab);
        }}
        streakCount={streakInfo.currentStreak}
        hasUnfinishedChat={hasUnfinishedChat}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        language={userSettings.language || 'en'}
      />

      {/* Screen Views */}
      <main className="w-full">
        {currentTab === 'today' && (
          <TodayScreen
            userSettings={userSettings}
            streakInfo={streakInfo}
            todayEntry={todayEntry}
            chatMessageCount={todayMessages?.length || 0}
            onStartChat={() => setCurrentTab('chat')}
            onOpenDiaryDay={handleOpenDiaryDay}
            onOpenSettings={() => setCurrentTab('settings')}
          />
        )}

        {currentTab === 'chat' && (
          <VoiceDiaryWriter
            userSettings={userSettings}
            todayDate={todayDate}
            todayEntry={todayEntry}
            onSaveEntry={async (entry) => {
              await handleSaveEntry(entry);
            }}
            onNavigateToDiary={() => {
              setSelectedDiaryDate(todayDate);
              setCurrentTab('diary');
            }}
            onUpdateLanguage={async (lang) => {
              await updateUserSettings({ language: lang });
            }}
          />
        )}

        {currentTab === 'diary' && (
          <DiaryScreen
            entries={entries || []}
            todayDate={todayDate}
            onEditEntry={handleEditEntry}
            onDeleteEntry={handleDeleteEntry}
            onAddMoreToToday={() => setCurrentTab('chat')}
            initialSelectedDate={selectedDiaryDate}
          />
        )}

        {currentTab === 'streak' && (
          <StreakScreen
            streakInfo={streakInfo}
            onOpenEntryDate={handleOpenDiaryDay}
            onTriggerCelebration={(m) => setCelebrationMilestone(m)}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsScreen
            userSettings={userSettings}
            onUpdateSettings={async (updated) => {
              await updateUserSettings(updated);
            }}
            onDataReset={handleDataReset}
          />
        )}
      </main>

      {/* Day Summary / End of Day Modal */}
      {showSummaryModal && (
        <DaySummaryModal
          userSettings={userSettings}
          todayDate={todayDate}
          messages={todayMessages || []}
          existingEntry={todayEntry}
          onSaveEntry={async (entry) => {
            await handleSaveEntry(entry);
            setShowSummaryModal(false);
            setCurrentTab('today');
          }}
          onClose={() => setShowSummaryModal(false)}
        />
      )}

      {/* Milestone Celebration Animation */}
      {celebrationMilestone !== null && (
        <CelebrationModal
          milestoneDays={celebrationMilestone}
          onClose={() => setCelebrationMilestone(null)}
        />
      )}
    </div>
  );
};

export default App;
