export type Role = 'ai' | 'user';
export type InputMode = 'typed' | 'voice';

export interface MessageItem {
  id?: number;
  date: string; // YYYY-MM-DD
  role: Role;
  content: string;
  inputMode: InputMode;
  timestamp: number;
}

export interface DiaryEntry {
  id?: number;
  date: string; // YYYY-MM-DD, unique key
  title: string;
  mood: string;
  moodEmoji: string;
  highlights: string[];
  text: string;
  createdAt: number;
  updatedAt: number;
  rawConversation?: MessageItem[];
}

export interface UserSettings {
  id?: number;
  name: string;
  reminderTime: string; // 'HH:MM', e.g. '21:00'
  voiceReplies: boolean; // SpeechSynthesis for AI questions
  notificationsEnabled: boolean;
  pinHash?: string | null; // Optional SHA-256 PIN hash
  streakFreezeUsedWeek?: string | null; // e.g. '2026-W44' week identifier when freeze was used
  onboardingCompleted: boolean;
  theme?: 'light' | 'dark' | 'system';
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalEntries: number;
  streakFreezeAvailable: boolean;
  streakFreezeUsedThisWeek: boolean;
  isTodayCompleted: boolean;
  isStreakAtRisk: boolean;
  nextMilestone: number;
  daysToNextMilestone: number;
  historyMap: Record<string, boolean>; // date -> boolean
}
