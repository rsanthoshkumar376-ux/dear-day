import { db, DEFAULT_USER_SETTINGS, getUserSettings } from '../db/dexie';
import type { DiaryEntry, MessageItem, UserSettings } from '../types';

export interface ExportData {
  version: number;
  exportedAt: string;
  userSettings: UserSettings;
  entries: DiaryEntry[];
  messages: MessageItem[];
}

export async function exportAllData(): Promise<void> {
  const settings = await getUserSettings();
  const entries = await db.entries.toArray();
  const messages = await db.messages.toArray();

  const exportData: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    userSettings: settings,
    entries,
    messages,
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `dear-day-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importDataFromJson(file: File): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const text = await file.text();
    const data: Partial<ExportData> = JSON.parse(text);

    if (!Array.isArray(data.entries)) {
      return { success: false, count: 0, error: 'Invalid backup file: "entries" array not found.' };
    }

    await db.transaction('rw', db.entries, db.messages, db.userSettings, async () => {
      // Import entries
      for (const entry of data.entries!) {
        if (entry.date && entry.text) {
          const existing = await db.entries.where('date').equals(entry.date).first();
          if (existing && existing.id) {
            await db.entries.put({
              ...entry,
              id: existing.id,
              updatedAt: Date.now(),
            });
          } else {
            const { id, ...rest } = entry;
            await db.entries.add({
              ...rest,
              createdAt: entry.createdAt || Date.now(),
              updatedAt: Date.now(),
            });
          }
        }
      }

      // Import messages if present
      if (Array.isArray(data.messages)) {
        for (const msg of data.messages) {
          if (msg.date && msg.content) {
            const { id, ...rest } = msg;
            await db.messages.add(rest);
          }
        }
      }

      // Import settings if present
      if (data.userSettings) {
        const current = await getUserSettings();
        if (current.id) {
          await db.userSettings.update(current.id, {
            name: data.userSettings.name || current.name,
            reminderTime: data.userSettings.reminderTime || current.reminderTime,
            voiceReplies: data.userSettings.voiceReplies ?? current.voiceReplies,
            notificationsEnabled: data.userSettings.notificationsEnabled ?? current.notificationsEnabled,
            streakFreezeUsedWeek: data.userSettings.streakFreezeUsedWeek ?? current.streakFreezeUsedWeek,
          });
        }
      }
    });

    return { success: true, count: data.entries.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Failed to parse JSON backup.' };
  }
}

export async function deleteAllData(): Promise<void> {
  await db.transaction('rw', db.entries, db.messages, db.userSettings, async () => {
    await db.entries.clear();
    await db.messages.clear();
    await db.userSettings.clear();
    await db.userSettings.add({
      ...DEFAULT_USER_SETTINGS,
      onboardingCompleted: true, // Keep user past onboarding so they don't get trapped
    });
  });

  // Clear reminder localStorage flags
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('dear_day_')) {
      localStorage.removeItem(key);
    }
  }
}

// PIN hashing with Web Crypto API
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + '_dear_day_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(pin: string, expectedHash: string): Promise<boolean> {
  const hash = await hashPin(pin);
  return hash === expectedHash;
}
