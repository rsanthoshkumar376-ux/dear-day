import React, { useState, useEffect } from 'react';
import {
  User,
  Clock,
  Volume2,
  Bell,
  Lock,
  Unlock,
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  Cpu,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Globe,
} from 'lucide-react';
import type { UserSettings } from '../types';
import { updateUserSettings } from '../db/dexie';
import {
  exportAllData,
  importDataFromJson,
  deleteAllData,
  hashPin,
} from '../services/exportImportService';
import {
  requestNotificationPermission,
  showNotification,
  getNotificationStatus,
} from '../services/notificationService';
import { checkAiHealth, type AiStatus } from '../services/aiService';

interface SettingsScreenProps {
  userSettings: UserSettings;
  onUpdateSettings: (updated: UserSettings) => void;
  onDataReset: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  userSettings,
  onUpdateSettings,
  onDataReset,
}) => {
  const [name, setName] = useState(userSettings.name);
  const [reminderTime, setReminderTime] = useState(userSettings.reminderTime || '20:30');
  const [voiceReplies, setVoiceReplies] = useState(userSettings.voiceReplies);
  const [notificationsEnabled, setNotificationsEnabled] = useState(userSettings.notificationsEnabled);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);

  // PIN Lock states
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Delete all modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Check AI health on mount
  useEffect(() => {
    checkAiHealth().then((status) => setAiStatus(status));
  }, []);

  const showFeedback = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Save basic fields on blur or toggle
  const handleSaveField = async (partial: Partial<UserSettings>) => {
    const updated = { ...userSettings, ...partial };
    await updateUserSettings(partial);
    onUpdateSettings(updated);
    showFeedback('Settings updated');
  };

  // Notification Toggle
  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const perm = await requestNotificationPermission();
      if (perm === 'granted') {
        setNotificationsEnabled(true);
        await handleSaveField({ notificationsEnabled: true });
        showNotification('Dear Day Notifications Active', {
          body: `We will check in with you every evening at ${reminderTime}.`,
        });
      } else {
        showFeedback('Notification permission was not granted by browser.');
      }
    } else {
      setNotificationsEnabled(false);
      await handleSaveField({ notificationsEnabled: false });
    }
  };

  // Test Reminder notification
  const handleTestNotification = async () => {
    const status = getNotificationStatus();
    if (status.permission !== 'granted') {
      const perm = await requestNotificationPermission();
      if (perm !== 'granted') {
        alert('Please allow notifications in your browser settings to test reminders.');
        return;
      }
    }

    await showNotification('Dear Day Test Reminder', {
      body: `Hey ${name || 'friend'}, this is how your daily check-in reminder will appear!`,
    });
    showFeedback('Test notification sent!');
  };

  // PIN Setup
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError('PIN must be exactly 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match.');
      return;
    }

    const hashed = await hashPin(newPin);
    await handleSaveField({ pinHash: hashed });
    setShowPinModal(false);
    setNewPin('');
    setConfirmPin('');
    setPinError('');
    showFeedback('4-digit PIN lock enabled');
  };

  const handleRemovePin = async () => {
    await handleSaveField({ pinHash: null });
    showFeedback('PIN lock removed');
  };

  // Export JSON
  const handleExport = async () => {
    try {
      await exportAllData();
      showFeedback('Backup downloaded as JSON');
    } catch {
      showFeedback('Failed to export data');
    }
  };

  // Import JSON
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await importDataFromJson(file);
    if (res.success) {
      showFeedback(`Successfully imported ${res.count} entries!`);
      setTimeout(() => window.location.reload(), 1000);
    } else {
      alert(`Import failed: ${res.error}`);
    }
  };

  // Delete All Data
  const handleDeleteAll = async () => {
    await deleteAllData();
    setShowDeleteModal(false);
    onDataReset();
    showFeedback('All local data cleared');
  };

  return (
    <div className="max-w-xl mx-auto px-4 pt-6 pb-28 space-y-6 animate-fade-in">
      {/* Toast alert */}
      {saveToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-full shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-journal font-semibold text-stone-800 dark:text-stone-100">
          Settings
        </h1>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
          Personalize your companion, privacy, and backup preferences
        </p>
      </div>

      {/* AI Mode & Backend Status Indicator */}
      <div className="p-4 sm:p-5 bg-white dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-3xl shadow-soft space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">AI Engine</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {aiStatus?.mode === 'live' ? 'Connected to Claude API Proxy' : 'Offline / Scripted Demo Mode'}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              aiStatus?.mode === 'live'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300/40'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                aiStatus?.mode === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {aiStatus?.mode === 'live' ? 'Claude API Live' : 'Demo Mode Active'}
          </span>
        </div>

        <p className="text-xs text-stone-500 dark:text-stone-400 pt-1 leading-relaxed">
          {aiStatus?.mode === 'live'
            ? `Your proxy server is authenticated and routing via ${aiStatus.model}.`
            : 'No Anthropic API key is configured in .env. Dear Day is running seamlessly on its built-in scripted conversational and reflection engine.'}
        </p>
      </div>

      {/* Profile & Name */}
      <div className="p-5 bg-white dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-3xl shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-journal-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">Your Name</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">Used by Dear Day during check-ins</p>
          </div>
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => handleSaveField({ name: name.trim() || 'Friend' })}
          className="w-full px-4 py-2.5 bg-journal-50 dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="Your name"
        />
      </div>

      {/* Check-in Preferences (Reminder Time & Voice Replies) */}
      <div className="p-5 bg-white dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-3xl shadow-soft space-y-4">
        <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
          Check-in Preferences
        </h2>

        {/* Language Selection */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-journal-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-800 dark:text-stone-200">Conversation Language</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">English or தமிழ் (Tamil)</p>
            </div>
          </div>
          <div className="flex items-center rounded-xl bg-journal-100 dark:bg-stone-800 p-0.5 border border-journal-200 dark:border-stone-700">
            <button
              type="button"
              onClick={() => handleSaveField({ language: 'en' })}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                (userSettings.language || 'en') === 'en'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => handleSaveField({ language: 'ta' })}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                userSettings.language === 'ta'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              தமிழ்
            </button>
          </div>
        </div>

        {/* Reminder Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-journal-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-800 dark:text-stone-200">Daily Reminder Time</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">Time for your daily reflection</p>
            </div>
          </div>
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => {
              setReminderTime(e.target.value);
              handleSaveField({ reminderTime: e.target.value });
            }}
            className="px-3 py-1.5 bg-journal-50 dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-xl text-xs font-semibold text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Voice Replies Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-journal-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-journal-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-800 dark:text-stone-200">Voice Replies</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">Speak AI questions via speech synthesis</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const updated = !voiceReplies;
              setVoiceReplies(updated);
              handleSaveField({ voiceReplies: updated });
            }}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              voiceReplies ? 'bg-amber-600 justify-end' : 'bg-stone-300 dark:bg-stone-600 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
          </button>
        </div>

        {/* Notifications Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-journal-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-journal-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-800 dark:text-stone-200">Daily Notifications</p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {notificationsEnabled ? 'Reminders & streak alerts on' : 'Reminders off'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {notificationsEnabled && (
              <button
                type="button"
                onClick={handleTestNotification}
                className="text-[11px] font-semibold px-2.5 py-1 bg-journal-100 dark:bg-stone-800 hover:bg-journal-200 rounded-lg text-stone-700 dark:text-stone-300 transition-colors"
              >
                Test
              </button>
            )}
            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                notificationsEnabled ? 'bg-amber-600 justify-end' : 'bg-stone-300 dark:bg-stone-600 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </button>
          </div>
        </div>
      </div>

      {/* Security: PIN Lock */}
      <div className="p-5 bg-white dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-3xl shadow-soft space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-journal-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center">
              {userSettings.pinHash ? <Lock className="w-5 h-5 text-amber-600" /> : <Unlock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">PIN Protection</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {userSettings.pinHash ? '4-digit PIN is active' : 'Lock your journal with a 4-digit code'}
              </p>
            </div>
          </div>

          {userSettings.pinHash ? (
            <button
              type="button"
              onClick={handleRemovePin}
              className="text-xs font-semibold px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-xl transition-colors"
            >
              Remove PIN
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowPinModal(true)}
              className="text-xs font-semibold px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm transition-all"
            >
              Set PIN
            </button>
          )}
        </div>
      </div>

      {/* Backup, Export & Import */}
      <div className="p-5 bg-white dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-3xl shadow-soft space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
            Backup & Data Portability
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Your data is yours. Export or restore your entries at any time.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center justify-center gap-2 p-3 bg-journal-50 dark:bg-stone-800 border border-journal-200 dark:border-stone-700 hover:bg-journal-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-2xl text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4 text-amber-600" />
            <span>Export JSON</span>
          </button>

          <label className="flex items-center justify-center gap-2 p-3 bg-journal-50 dark:bg-stone-800 border border-journal-200 dark:border-stone-700 hover:bg-journal-100 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-2xl text-xs font-semibold cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-amber-600" />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* Privacy Guarantee Banner */}
      <div className="p-5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-3xl flex items-start gap-3.5">
        <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-950 dark:text-emerald-200 space-y-1">
          <h3 className="font-semibold text-sm text-emerald-900 dark:text-emerald-100">
            Zero-Cloud Privacy Promise
          </h3>
          <p className="leading-relaxed">
            All your journal entries, messages, and streaks live exclusively in your browser's IndexedDB storage.
            When connected to Claude, messages are routed transiently through your local Node proxy to generate questions and summaries. The server never logs or saves your diary text.
          </p>
        </div>
      </div>

      {/* Danger Zone: Delete All Data */}
      <div className="p-5 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-rose-800 dark:text-rose-300">Danger Zone</h2>
            <p className="text-xs text-rose-600 dark:text-rose-400">Permanently erase all entries and resets</p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            Delete All
          </button>
        </div>
      </div>

      {/* PIN Setup Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xs bg-journal-50 dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-3xl p-6 shadow-soft-lg text-stone-900 dark:text-stone-100">
            <h3 className="text-lg font-journal font-semibold mb-2">Set 4-Digit PIN</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
              Enter a 4-digit code to protect your diary
            </p>

            <form onSubmit={handleSavePin} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-stone-500 uppercase">PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center text-xl tracking-widest px-3 py-2 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-500 uppercase">Confirm PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full text-center text-xl tracking-widest px-3 py-2 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100"
                />
              </div>

              {pinError && <p className="text-xs text-rose-500 font-medium">{pinError}</p>}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-stone-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold"
                >
                  Save PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete All Data Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-journal-50 dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-3xl p-6 shadow-soft-lg text-stone-900 dark:text-stone-100 space-y-4">
            <h3 className="text-lg font-journal font-semibold text-rose-600 dark:text-rose-400">
              Clear All Diary Data?
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              This will permanently delete all your diary entries, conversation histories, and streak records from this device.
              Make sure to export a JSON backup first if you wish to keep them.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
