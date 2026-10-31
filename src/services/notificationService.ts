import type { DiaryEntry, UserSettings } from '../types';
import { calculateStreakInfo, formatLocalDate } from './streakService';

export interface NotificationStatus {
  isSupported: boolean;
  permission: NotificationPermission;
}

export function getNotificationStatus(): NotificationStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { isSupported: false, permission: 'denied' };
  }
  return {
    isSupported: true,
    permission: Notification.permission,
  };
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return 'denied';
  }
}

export async function showNotification(title: string, options: NotificationOptions = {}): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const defaultOptions: NotificationOptions = {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    body: options.body || '',
    data: { url: '/' },
    ...options,
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, defaultOptions);
        return;
      }
    }
    // Fallback to Window Notification constructor
    new Notification(title, defaultOptions);
  } catch (err) {
    console.warn('Error showing notification:', err);
  }
}

/**
 * Check if a reminder or streak nudge is due
 * Called on every app open, resume, and interval
 */
export function checkScheduledReminders(
  userSettings: UserSettings,
  entries: DiaryEntry[]
): void {
  if (!userSettings.notificationsEnabled) return;
  if (getNotificationStatus().permission !== 'granted') return;

  const todayStr = formatLocalDate(new Date());
  const streakInfo = calculateStreakInfo(entries, userSettings);

  // RULE: Never send a reminder if today's entry is already saved.
  if (streakInfo.isTodayCompleted) {
    return;
  }

  const now = new Date();
  const [reminderHour, reminderMinute] = (userSettings.reminderTime || '20:30').split(':').map(Number);
  
  const reminderDate = new Date();
  reminderDate.setHours(reminderHour, reminderMinute, 0, 0);

  const streakNudgeDate = new Date(reminderDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

  const lastReminderKey = `dear_day_last_reminder_${todayStr}`;
  const lastNudgeKey = `dear_day_last_nudge_${todayStr}`;

  const hasSentDailyReminder = localStorage.getItem(lastReminderKey) === 'true';
  const hasSentStreakNudge = localStorage.getItem(lastNudgeKey) === 'true';

  // Check for 2-hour streak nudge first if past that time and streak > 0
  if (now >= streakNudgeDate && !hasSentStreakNudge && streakInfo.currentStreak > 0) {
    showNotification('Dear Day — Streak at Risk', {
      body: `Your ${streakInfo.currentStreak}-day streak is waiting for you. Take a few minutes to check in!`,
      tag: 'streak-nudge',
    });
    localStorage.setItem(lastNudgeKey, 'true');
    localStorage.setItem(lastReminderKey, 'true'); // don't also fire the older reminder
    return;
  }

  // Check for normal daily reminder
  if (now >= reminderDate && !hasSentDailyReminder) {
    showNotification('Dear Day', {
      body: `Hey ${userSettings.name || 'friend'}, ready to tell me about your day?`,
      tag: 'daily-reminder',
    });
    localStorage.setItem(lastReminderKey, 'true');
  }
}
