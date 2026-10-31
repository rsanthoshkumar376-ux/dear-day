import React, { useState } from 'react';
import { Sparkles, Bell, Volume2, ShieldCheck, Check } from 'lucide-react';
import { updateUserSettings } from '../db/dexie';
import { requestNotificationPermission } from '../services/notificationService';
import type { UserSettings } from '../types';

interface OnboardingModalProps {
  onComplete: (updatedSettings: UserSettings) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [reminderTime, setReminderTime] = useState('20:30');
  const [voiceReplies, setVoiceReplies] = useState(false);
  const [notifState, setNotifState] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestNotif = async () => {
    const perm = await requestNotificationPermission();
    setNotifState(perm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const trimmedName = name.trim() || 'Friend';
    const partial: Partial<UserSettings> = {
      name: trimmedName,
      reminderTime,
      voiceReplies,
      notificationsEnabled: notifState === 'granted',
      onboardingCompleted: true,
    };

    await updateUserSettings(partial);
    onComplete(partial as UserSettings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="w-full max-w-md bg-journal-50 dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 shadow-soft-lg text-stone-900 dark:text-stone-100 my-auto">
        {/* Header Icon */}
        <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl shadow-inner">
          <Sparkles className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-journal font-semibold text-center mb-1 text-stone-800 dark:text-stone-100">
          Welcome to Dear Day
        </h1>
        <p className="text-sm text-stone-600 dark:text-stone-400 text-center mb-6">
          Your warm, thoughtful daily AI diary companion. Talk or type about your day, and let AI craft your personal journal.
        </p>

        {/* Privacy Highlight Badge */}
        <div className="mb-6 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/40 rounded-2xl flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
            <span className="font-semibold">Privacy First:</span> All your diary entries and conversations are saved directly on this device in local storage. No accounts, no cloud sync, and no tracking.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              What should Dear Day call you?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name or nickname"
              required
              className="w-full px-4 py-3 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-sm"
            />
          </div>

          {/* Reminder Time */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              Preferred Daily Reminder Time
            </label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            />
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
              We'll gently check in with you around this time each evening.
            </p>
          </div>

          {/* Voice Replies Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-journal-100 dark:bg-stone-700 rounded-lg text-stone-700 dark:text-stone-300">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-800 dark:text-stone-200">Read AI questions aloud</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">Hear the AI speak via voice synthesis</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVoiceReplies(!voiceReplies)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                voiceReplies ? 'bg-amber-600 justify-end' : 'bg-stone-300 dark:bg-stone-600 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          {/* Notification Permission Request */}
          <div className="flex items-center justify-between p-3.5 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-journal-100 dark:bg-stone-700 rounded-lg text-stone-700 dark:text-stone-300">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-800 dark:text-stone-200">Daily Reminders</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {notifState === 'granted' ? 'Notifications enabled' : 'Keep your streak going'}
                </p>
              </div>
            </div>
            {notifState === 'granted' ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                <Check className="w-3.5 h-3.5" /> Allowed
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestNotif}
                className="text-xs font-semibold px-3 py-1.5 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 rounded-lg text-stone-800 dark:text-stone-200 transition-colors"
              >
                Allow
              </button>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 py-3.5 px-6 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-medium rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            Start My Journal
          </button>
        </form>
      </div>
    </div>
  );
};
