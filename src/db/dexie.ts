import Dexie, { type Table } from 'dexie';
import type { DiaryEntry, MessageItem, UserSettings } from '../types';

export class DearDayDatabase extends Dexie {
  entries!: Table<DiaryEntry, number>;
  messages!: Table<MessageItem, number>;
  userSettings!: Table<UserSettings, number>;

  constructor() {
    super('DearDayDB');
    this.version(1).stores({
      entries: '++id, &date, createdAt',
      messages: '++id, date, timestamp',
      userSettings: '++id',
    });
  }
}

export const db = new DearDayDatabase();

// Default initial user settings
export const DEFAULT_USER_SETTINGS: UserSettings = {
  name: 'Friend',
  reminderTime: '20:30',
  voiceReplies: false,
  notificationsEnabled: false,
  pinHash: null,
  streakFreezeUsedWeek: null,
  onboardingCompleted: false,
  theme: 'system',
};

export async function getUserSettings(): Promise<UserSettings> {
  const settings = await db.userSettings.toCollection().first();
  return settings || DEFAULT_USER_SETTINGS;
}

export async function updateUserSettings(partial: Partial<UserSettings>): Promise<void> {
  const existing = await db.userSettings.toCollection().first();
  if (existing && existing.id) {
    await db.userSettings.update(existing.id, partial);
  } else {
    await db.userSettings.add({
      ...DEFAULT_USER_SETTINGS,
      ...partial,
    });
  }
}
