import React from 'react';
import { Flame, Sparkles, ArrowRight, CheckCircle2, BookOpen, AlertCircle, Shield } from 'lucide-react';
import type { DiaryEntry, StreakInfo, UserSettings } from '../types';
import { getNotificationStatus } from '../services/notificationService';

interface TodayScreenProps {
  userSettings: UserSettings;
  streakInfo: StreakInfo;
  todayEntry?: DiaryEntry;
  chatMessageCount: number;
  onStartChat: () => void;
  onOpenDiaryDay: (date: string) => void;
  onOpenSettings: () => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({
  userSettings,
  streakInfo,
  todayEntry,
  chatMessageCount,
  onStartChat,
  onOpenDiaryDay,
  onOpenSettings,
}) => {
  // Determine time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const notifStatus = getNotificationStatus();
  const showNotifDeniedBanner =
    userSettings.notificationsEnabled && notifStatus.isSupported && notifStatus.permission === 'denied';

  const isCompleted = streakInfo.isTodayCompleted;
  const isInProgress = !isCompleted && chatMessageCount > 0;

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-24 space-y-6 animate-fade-in">
      {/* Notification Denied Warning Banner */}
      {showNotifDeniedBanner && (
        <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3 text-stone-800 dark:text-stone-200 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900 dark:text-amber-300">Reminders are blocked by your browser</p>
            <p className="mt-0.5 text-stone-600 dark:text-stone-400 leading-relaxed">
              To get your daily check-in nudge at {userSettings.reminderTime}, click the site settings icon in your browser URL bar and allow notifications.
            </p>
          </div>
          <button
            onClick={onOpenSettings}
            className="text-amber-700 dark:text-amber-400 font-semibold underline underline-offset-2 flex-shrink-0"
          >
            Settings
          </button>
        </div>
      )}

      {/* Greeting Header */}
      <div className="space-y-1">
        <p className="text-xs font-semibold tracking-wider uppercase text-amber-700 dark:text-amber-400">
          {formattedDate}
        </p>
        <h1 className="text-3xl sm:text-4xl font-journal font-semibold text-stone-800 dark:text-stone-100">
          {getGreeting()}, {userSettings.name || 'Friend'}
        </h1>
        <p className="text-sm text-stone-600 dark:text-stone-400 font-normal">
          {isCompleted
            ? "Your diary for today is safely written. You can always add more reflections or relax."
            : isInProgress
            ? "You started checking in! Tap below to continue your conversation."
            : "Take a quiet breath. How did today treat you?"}
        </p>
      </div>

      {/* Current Streak Card */}
      <div className="p-5 sm:p-6 bg-white dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-3xl shadow-soft relative overflow-hidden transition-all">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/70 border border-amber-300/40 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
              <Flame className="w-8 h-8 fill-amber-500 text-amber-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-journal font-bold text-stone-800 dark:text-stone-100">
                  {streakInfo.currentStreak}
                </span>
                <span className="text-sm font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  {streakInfo.currentStreak === 1 ? 'Day Streak' : 'Days Streak'}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {isCompleted
                  ? 'Completed for today. Streak extended!'
                  : streakInfo.currentStreak > 0
                  ? 'Save today\'s entry to keep your streak going'
                  : 'Start your streak today with a 3-minute check-in'}
              </p>
            </div>
          </div>

          {streakInfo.streakFreezeUsedThisWeek && (
            <span className="text-[11px] px-2.5 py-1 bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 rounded-full font-medium border border-cyan-300/40">
              Freeze Active ❄️
            </span>
          )}
        </div>
      </div>

      {/* Primary Action Button */}
      <div>
        {!isCompleted ? (
          <button
            onClick={onStartChat}
            className="w-full group p-5 rounded-3xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-[0.99] text-white shadow-soft-lg flex items-center justify-between transition-all"
          >
            <div className="text-left">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-medium text-amber-50 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                {isInProgress ? 'In Progress' : 'Daily Reflection'}
              </span>
              <h2 className="text-xl font-journal font-bold">
                {isInProgress ? "Continue today's check-in" : "Start today's check-in"}
              </h2>
              <p className="text-xs text-amber-100/90 mt-0.5">
                {isInProgress
                  ? `${chatMessageCount} message${chatMessageCount === 1 ? '' : 's'} recorded so far`
                  : 'Speak or type your thoughts in a warm conversation'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <ArrowRight className="w-6 h-6" />
            </div>
          </button>
        ) : (
          <div className="p-5 rounded-3xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-soft flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-journal font-bold text-emerald-900 dark:text-emerald-200">
                  Done for today
                </h2>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Your entry is saved and your streak is safe!
                </p>
              </div>
            </div>
            <button
              onClick={onStartChat}
              className="text-xs font-semibold px-3 py-2 bg-white dark:bg-stone-800 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100/50 rounded-xl text-emerald-800 dark:text-emerald-200 transition-colors shadow-sm"
            >
              Add more
            </button>
          </div>
        )}
      </div>

      {/* Today's Saved Entry Snapshot (if completed) */}
      {isCompleted && todayEntry && (
        <div className="p-5 bg-white dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-3xl shadow-soft space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Today's Journal Entry
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-journal-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              <span>{todayEntry.moodEmoji}</span>
              <span>{todayEntry.mood}</span>
            </span>
          </div>

          <h3 className="text-lg font-journal font-semibold text-stone-800 dark:text-stone-100">
            {todayEntry.title}
          </h3>

          <p className="text-sm font-journal text-stone-600 dark:text-stone-300 line-clamp-3 leading-relaxed">
            {todayEntry.text}
          </p>

          <button
            onClick={() => onOpenDiaryDay(todayEntry.date)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline pt-1"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Read Full Entry & Highlights
          </button>
        </div>
      )}

      {/* Privacy Guarantee Pill */}
      <div className="flex items-center justify-center gap-2 text-xs text-stone-400 dark:text-stone-500 pt-2">
        <Shield className="w-3.5 h-3.5 text-stone-400" />
        <span>Stored securely on your device &bull; No cloud accounts</span>
      </div>
    </div>
  );
};
