import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RotateCcw,
  Check,
  X,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Smile,
  Edit3,
} from 'lucide-react';
import type { DiaryEntry, MessageItem, UserSettings } from '../types';
import { generateDiaryEntry } from '../services/aiService';

interface DaySummaryModalProps {
  userSettings: UserSettings;
  todayDate: string;
  messages: MessageItem[];
  existingEntry?: DiaryEntry;
  onSaveEntry: (entry: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onClose: () => void;
}

const COMMON_MOODS = [
  { mood: 'Grateful', emoji: '✨' },
  { mood: 'Peaceful', emoji: '🌿' },
  { mood: 'Accomplished', emoji: '🌟' },
  { mood: 'Tired', emoji: '☕' },
  { mood: 'Overwhelmed', emoji: '🌧️' },
  { mood: 'Hopeful', emoji: '🌅' },
  { mood: 'Reflective', emoji: '🌱' },
  { mood: 'Content', emoji: '😌' },
];

export const DaySummaryModal: React.FC<DaySummaryModalProps> = ({
  userSettings,
  todayDate,
  messages,
  existingEntry,
  onSaveEntry,
  onClose,
}) => {
  const [isGenerating, setIsGenerating] = useState(!existingEntry);
  const [title, setTitle] = useState(existingEntry?.title || '');
  const [mood, setMood] = useState(existingEntry?.mood || 'Reflective');
  const [moodEmoji, setMoodEmoji] = useState(existingEntry?.moodEmoji || '🌱');
  const [highlights, setHighlights] = useState<string[]>(
    existingEntry?.highlights || ['', '', '']
  );
  const [text, setText] = useState(existingEntry?.text || '');
  const [showRawConversation, setShowRawConversation] = useState(false);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Generate summary on mount if no entry exists yet
  useEffect(() => {
    if (!existingEntry) {
      handleGenerate();
    }
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateDiaryEntry(userSettings.name, messages, todayDate);
      setTitle(generated.title);
      setMood(generated.mood);
      setMoodEmoji(generated.moodEmoji);
      setHighlights(
        generated.highlights.length >= 3
          ? generated.highlights.slice(0, 3)
          : [...generated.highlights, '', ''].slice(0, 3)
      );
      setText(generated.text);
    } catch (err) {
      console.warn('Summary generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleHighlightChange = (index: number, val: string) => {
    const updated = [...highlights];
    updated[index] = val;
    setHighlights(updated);
  };

  const countWords = (str: string) => {
    return str.trim() ? str.trim().split(/\s+/).length : 0;
  };

  const handleSave = async () => {
    if (!text.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const entryPayload: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'> = {
        date: todayDate,
        title: title.trim() || 'Notes on Today',
        mood: mood.trim() || 'Reflective',
        moodEmoji: moodEmoji || '🌿',
        highlights: highlights.filter((h) => h.trim().length > 0),
        text: text.trim(),
        rawConversation: messages,
      };
      await onSaveEntry(entryPayload);
      onClose();
    } catch (err) {
      console.error('Error saving diary entry:', err);
      setIsSaving(false);
    }
  };

  const wordCount = countWords(text);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg bg-journal-50 dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-3xl p-6 sm:p-7 shadow-soft-lg text-stone-900 dark:text-stone-100 my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-journal-200 dark:border-stone-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-journal font-semibold text-stone-800 dark:text-stone-100">
                Today's Diary Entry
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Review and personalize your first-person entry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {isGenerating ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center animate-spin">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <p className="font-journal text-base font-semibold text-stone-800 dark:text-stone-100">
                Writing your entry...
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mt-1">
                Dear Day is weaving your spoken and typed words into an authentic first-person story.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {/* Title & Mood Row */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give today a title..."
                  className="w-full px-4 py-2.5 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 font-journal font-semibold text-base focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>

              {/* Mood Badge & Picker */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
                  Mood
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMoodPicker(!showMoodPicker)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition-colors"
                  >
                    <span className="text-base leading-none">{moodEmoji}</span>
                    <span>{mood}</span>
                    <Edit3 className="w-3 h-3 opacity-60 ml-1" />
                  </button>
                </div>

                {showMoodPicker && (
                  <div className="mt-2 p-2.5 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-xl shadow-sm flex flex-wrap gap-1.5 animate-fade-in">
                    {COMMON_MOODS.map((m) => (
                      <button
                        key={m.mood}
                        type="button"
                        onClick={() => {
                          setMood(m.mood);
                          setMoodEmoji(m.emoji);
                          setShowMoodPicker(false);
                        }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          mood === m.mood
                            ? 'bg-amber-600 text-white'
                            : 'bg-journal-100 dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-journal-200'
                        }`}
                      >
                        <span>{m.emoji}</span>
                        <span>{m.mood}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3 Highlight Bullets */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                Today's 3 Highlights
              </label>
              <div className="space-y-2">
                {highlights.map((bullet, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) => handleHighlightChange(idx, e.target.value)}
                      placeholder={`Highlight #${idx + 1}`}
                      className="flex-1 px-3 py-2 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* First-Person Diary Narrative */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Diary Entry (First Person)
                </label>
                <span
                  className={`text-[11px] font-medium ${
                    wordCount >= 150 && wordCount <= 350
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-stone-400 dark:text-stone-500'
                  }`}
                >
                  {wordCount} words
                </span>
              </div>
              <textarea
                rows={7}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-2xl text-stone-800 dark:text-stone-100 font-journal text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none transition-all"
              />
            </div>

            {/* Collapsible Raw Conversation */}
            <div className="border border-journal-200 dark:border-stone-800 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowRawConversation(!showRawConversation)}
                className="w-full px-4 py-2.5 bg-journal-100/60 dark:bg-stone-800/60 flex items-center justify-between text-xs font-semibold text-stone-600 dark:text-stone-300"
              >
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                  View Original Conversation ({messages.length} messages)
                </span>
                {showRawConversation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showRawConversation && (
                <div className="p-3 bg-white dark:bg-stone-900 space-y-2 max-h-48 overflow-y-auto text-xs">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-xl ${
                        m.role === 'ai'
                          ? 'bg-journal-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-medium'
                      }`}
                    >
                      <span className="font-semibold text-[10px] block opacity-70 mb-0.5">
                        {m.role === 'ai' ? 'Dear Day' : userSettings.name || 'You'} ({m.inputMode}):
                      </span>
                      {m.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isGenerating && (
          <div className="pt-3 border-t border-journal-200 dark:border-stone-800 flex items-center justify-between gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={handleGenerate}
              className="px-3.5 py-2.5 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 hover:bg-journal-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Regenerate</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !text.trim()}
              className="flex-1 py-2.5 px-5 bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-50 text-white font-medium rounded-xl shadow-sm text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save to Diary'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
