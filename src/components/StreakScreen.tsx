import React from 'react';
import { Flame, Trophy, Calendar, Sparkles, Snowflake, Award, ChevronRight } from 'lucide-react';
import type { StreakInfo } from '../types';
import { getHeatmap30Days } from '../services/streakService';

interface StreakScreenProps {
  streakInfo: StreakInfo;
  onOpenEntryDate: (date: string) => void;
  onTriggerCelebration: (milestone: number) => void;
}

export const StreakScreen: React.FC<StreakScreenProps> = ({
  streakInfo,
  onOpenEntryDate,
  onTriggerCelebration,
}) => {
  const heatmap = getHeatmap30Days(streakInfo.historyMap);

  // Milestones list
  const milestoneList = [3, 7, 14, 30, 100];

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-24 space-y-6 animate-fade-in">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-journal font-semibold text-stone-800 dark:text-stone-100">
          Your Daily Streak
        </h1>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          Building mindfulness one thoughtful day at a time
        </p>
      </div>

      {/* Main Flame Hero Card */}
      <div className="p-6 bg-gradient-to-tr from-amber-500 via-amber-600 to-amber-700 text-white rounded-3xl shadow-soft-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-100/90">
              Current Streak
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-5xl sm:text-6xl font-journal font-bold">
                {streakInfo.currentStreak}
              </span>
              <span className="text-lg font-medium text-amber-100">
                {streakInfo.currentStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
            <p className="text-xs text-amber-100/90 mt-2 max-w-xs leading-relaxed">
              {streakInfo.isTodayCompleted
                ? "You've saved today's journal entry. Your flame burns bright!"
                : streakInfo.currentStreak > 0
                ? "Your streak is alive! Finish today's check-in before midnight to keep it."
                : "Check in today to ignite your streak."}
            </p>
          </div>

          <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-inner">
            <Flame className="w-12 h-12 fill-white animate-pulse" />
          </div>
        </div>

        {/* Milestone Progress Bar */}
        <div className="mt-6 pt-4 border-t border-white/20">
          <div className="flex items-center justify-between text-xs font-medium text-amber-100 mb-1.5">
            <span>Next Milestone: {streakInfo.nextMilestone} Days</span>
            <span>
              {streakInfo.daysToNextMilestone === 0
                ? 'Reached today!'
                : `${streakInfo.daysToNextMilestone} days left`}
            </span>
          </div>
          <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(5, (streakInfo.currentStreak / streakInfo.nextMilestone) * 100)
                )}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Stats Triplets */}
      <div className="grid grid-cols-3 gap-3">
        {/* Longest Streak */}
        <div className="p-4 bg-white dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-2xl shadow-soft text-center">
          <div className="w-8 h-8 mx-auto mb-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Trophy className="w-4 h-4" />
          </div>
          <p className="text-xl font-journal font-bold text-stone-800 dark:text-stone-100">
            {streakInfo.longestStreak}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mt-0.5">
            Longest
          </p>
        </div>

        {/* Total Entries */}
        <div className="p-4 bg-white dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-2xl shadow-soft text-center">
          <div className="w-8 h-8 mx-auto mb-1.5 rounded-xl bg-journal-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <p className="text-xl font-journal font-bold text-stone-800 dark:text-stone-100">
            {streakInfo.totalEntries}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mt-0.5">
            Total Entries
          </p>
        </div>

        {/* Streak Freeze */}
        <div className="p-4 bg-white dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-2xl shadow-soft text-center">
          <div className="w-8 h-8 mx-auto mb-1.5 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <Snowflake className="w-4 h-4" />
          </div>
          <p className="text-sm font-journal font-bold text-stone-800 dark:text-stone-100 mt-1">
            {streakInfo.streakFreezeUsedThisWeek ? 'Used' : 'Ready'}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mt-0.5">
            Weekly Freeze
          </p>
        </div>
      </div>

      {/* Streak Freeze Explanation Banner */}
      <div className="p-4 bg-cyan-50/80 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800/50 rounded-2xl flex items-start gap-3">
        <Snowflake className="w-5 h-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-cyan-950 dark:text-cyan-200 leading-relaxed">
          <span className="font-semibold">Automatic Weekly Freeze:</span> You get 1 free streak freeze every calendar week. If you miss a day, it auto-applies so your hard-earned streak won't vanish.
        </div>
      </div>

      {/* 30-Day Heatmap Section */}
      <div className="p-5 sm:p-6 bg-white dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-3xl shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-journal font-semibold text-stone-800 dark:text-stone-100">
              30-Day Activity Heatmap
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Each square represents one day. Tap any completed day to read its entry.
            </p>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 pt-2">
          {heatmap.map((day) => (
            <button
              key={day.date}
              type="button"
              onClick={() => {
                if (day.completed) {
                  onOpenEntryDate(day.date);
                }
              }}
              title={`${day.date} ${day.completed ? '— Completed (tap to view)' : '— Missed'}`}
              className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-center transition-all ${
                day.completed
                  ? 'bg-amber-500 text-white hover:scale-105 active:scale-95 shadow-sm'
                  : day.isToday
                  ? 'border-2 border-dashed border-amber-500 text-stone-700 dark:text-stone-300 bg-amber-50/50 dark:bg-amber-950/30'
                  : 'bg-journal-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 hover:bg-journal-200'
              }`}
            >
              <span className="text-[9px] uppercase font-bold opacity-80">{day.dayOfWeek}</span>
              <span className="text-xs font-semibold leading-none mt-0.5">{day.dayNumber}</span>
              {day.completed && <span className="w-1 h-1 rounded-full bg-white mt-0.5" />}
            </button>
          ))}
        </div>

        {/* Heatmap Legend */}
        <div className="flex items-center justify-center gap-4 text-xs text-stone-500 dark:text-stone-400 pt-3 border-t border-journal-100 dark:border-stone-800">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md border-2 border-dashed border-amber-500" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-journal-100 dark:bg-stone-800" />
            <span>Missed</span>
          </div>
        </div>
      </div>

      {/* Milestone Badges Collection */}
      <div className="p-5 sm:p-6 bg-white dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-3xl shadow-soft space-y-3">
        <h2 className="text-base font-journal font-semibold text-stone-800 dark:text-stone-100">
          Streak Milestones
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {milestoneList.map((m) => {
            const isUnlocked = streakInfo.currentStreak >= m || streakInfo.longestStreak >= m;
            return (
              <button
                key={m}
                onClick={() => onTriggerCelebration(m)}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isUnlocked
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:scale-105 active:scale-95'
                    : 'bg-journal-50/50 dark:bg-stone-800/40 border-journal-200 dark:border-stone-800 text-stone-400 opacity-60'
                }`}
              >
                <Award
                  className={`w-6 h-6 mx-auto mb-1 ${
                    isUnlocked ? 'text-amber-600 dark:text-amber-400 fill-amber-200/50' : 'text-stone-400'
                  }`}
                />
                <span className="text-xs font-bold block">{m} Days</span>
                <span className="text-[10px] block opacity-75">
                  {isUnlocked ? 'Unlocked 🎉' : 'Locked'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
