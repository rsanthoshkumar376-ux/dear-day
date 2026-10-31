import type { DiaryEntry, StreakInfo, UserSettings } from '../types';

export const MILESTONES = [3, 7, 14, 30, 100];

/**
 * Format Date to local YYYY-MM-DD
 */
export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add or subtract days from a YYYY-MM-DD string
 */
export function shiftDate(dateStr: string, offsetDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + offsetDays);
  return formatLocalDate(date);
}

/**
 * Get ISO week identifier (e.g., '2026-W44')
 */
export function getIsoWeekString(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Compute full streak information purely derived from saved entries
 */
export function calculateStreakInfo(entries: DiaryEntry[], userSettings?: UserSettings): StreakInfo {
  const todayStr = formatLocalDate(new Date());
  const yesterdayStr = shiftDate(todayStr, -1);
  const currentWeek = getIsoWeekString(new Date());

  const completedMap: Record<string, boolean> = {};
  for (const entry of entries) {
    if (entry.date) {
      completedMap[entry.date] = true;
    }
  }

  const isTodayCompleted = !!completedMap[todayStr];
  const isYesterdayCompleted = !!completedMap[yesterdayStr];

  // Freeze availability: 1 per calendar week
  const streakFreezeUsedThisWeek = userSettings?.streakFreezeUsedWeek === currentWeek;
  let streakFreezeAvailable = !streakFreezeUsedThisWeek;

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = isTodayCompleted ? todayStr : yesterdayStr;

  // If today is not completed and yesterday was not completed:
  // Check if we can apply a streak freeze to yesterday
  let freezeUsedForYesterday = false;
  if (!isTodayCompleted && !isYesterdayCompleted) {
    const twoDaysAgo = shiftDate(todayStr, -2);
    if (completedMap[twoDaysAgo] && streakFreezeAvailable) {
      // Streak can be preserved by freezing yesterday
      freezeUsedForYesterday = true;
      checkDate = twoDaysAgo;
    }
  }

  // Walk backward while days are completed
  while (completedMap[checkDate]) {
    currentStreak++;
    checkDate = shiftDate(checkDate, -1);
  }

  // Calculate Longest Streak in history
  const allDates = Object.keys(completedMap).sort();
  let longestStreak = 0;
  let runningStreak = 0;
  let prevDate: string | null = null;

  for (const date of allDates) {
    if (!prevDate) {
      runningStreak = 1;
    } else {
      const expectedNext = shiftDate(prevDate, 1);
      if (date === expectedNext) {
        runningStreak++;
      } else {
        // Gap occurred
        runningStreak = 1;
      }
    }
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
    prevDate = date;
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  // Milestone logic
  const nextMilestone = MILESTONES.find((m) => m > currentStreak) || (Math.floor(currentStreak / 50) + 1) * 50;
  const daysToNextMilestone = Math.max(0, nextMilestone - currentStreak);

  // Streak at risk: If today is not completed yet and currentStreak > 0
  const isStreakAtRisk = !isTodayCompleted && currentStreak > 0;

  return {
    currentStreak,
    longestStreak,
    totalEntries: entries.length,
    streakFreezeAvailable: streakFreezeAvailable && !freezeUsedForYesterday,
    streakFreezeUsedThisWeek: streakFreezeUsedThisWeek || freezeUsedForYesterday,
    isTodayCompleted,
    isStreakAtRisk,
    nextMilestone,
    daysToNextMilestone,
    historyMap: completedMap,
  };
}

/**
 * Generate 30-day calendar heatmap data
 */
export interface HeatmapDay {
  date: string;
  dayNumber: number;
  monthName: string;
  dayOfWeek: string;
  completed: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export function getHeatmap30Days(completedMap: Record<string, boolean>): HeatmapDay[] {
  const days: HeatmapDay[] = [];
  const todayStr = formatLocalDate(new Date());

  // 30 days ending today
  for (let i = 29; i >= 0; i--) {
    const dStr = shiftDate(todayStr, -i);
    const [y, m, d] = dStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);

    days.push({
      date: dStr,
      dayNumber: d,
      monthName: dateObj.toLocaleDateString(undefined, { month: 'short' }),
      dayOfWeek: dateObj.toLocaleDateString(undefined, { weekday: 'narrow' }),
      completed: !!completedMap[dStr],
      isToday: dStr === todayStr,
      isFuture: false,
    });
  }

  return days;
}
