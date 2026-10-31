import React, { useState, useMemo } from 'react';
import {
  Search,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  X,
  MessageSquare,
  Sparkles,
  BookOpen,
  Plus,
} from 'lucide-react';
import type { DiaryEntry, MessageItem } from '../types';

interface DiaryScreenProps {
  entries: DiaryEntry[];
  todayDate: string;
  onEditEntry: (entry: DiaryEntry) => Promise<void>;
  onDeleteEntry: (id: number) => Promise<void>;
  onAddMoreToToday: () => void;
  initialSelectedDate?: string | null;
}

export const DiaryScreen: React.FC<DiaryScreenProps> = ({
  entries,
  todayDate,
  onEditEntry,
  onDeleteEntry,
  onAddMoreToToday,
  initialSelectedDate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(() => {
    if (initialSelectedDate) {
      return entries.find((e) => e.date === initialSelectedDate) || null;
    }
    return null;
  });

  // Edit modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editMood, setEditMood] = useState('');
  const [editMoodEmoji, setEditMoodEmoji] = useState('');
  const [editHighlights, setEditHighlights] = useState<string[]>([]);
  const [editText, setEditText] = useState('');

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRawChat, setShowRawChat] = useState(false);

  // Touch swipe tracking
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Sort entries descending (newest first)
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => b.date.localeCompare(a.date));
  }, [entries]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return sortedEntries.filter((entry) => {
      const matchesDate = !filterDate || entry.date === filterDate;
      if (!matchesDate) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inTitle = entry.title.toLowerCase().includes(q);
      const inText = entry.text.toLowerCase().includes(q);
      const inMood = entry.mood.toLowerCase().includes(q);
      const inHighlights = entry.highlights.some((h) => h.toLowerCase().includes(q));

      return inTitle || inText || inMood || inHighlights;
    });
  }, [sortedEntries, filterDate, searchQuery]);

  // Open entry reader
  const handleOpenEntry = (entry: DiaryEntry) => {
    setSelectedEntry(entry);
    setShowRawChat(false);
  };

  // Navigate Prev / Next Day
  const handleNavigateDay = (direction: 'prev' | 'next') => {
    if (!selectedEntry) return;
    const currentIndex = sortedEntries.findIndex((e) => e.date === selectedEntry.date);
    if (currentIndex === -1) return;

    if (direction === 'prev' && currentIndex < sortedEntries.length - 1) {
      setSelectedEntry(sortedEntries[currentIndex + 1]);
    } else if (direction === 'next' && currentIndex > 0) {
      setSelectedEntry(sortedEntries[currentIndex - 1]);
    }
  };

  // Swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    // Minimum swipe distance of 50px
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swiped Left -> Next day
        handleNavigateDay('next');
      } else {
        // Swiped Right -> Previous day
        handleNavigateDay('prev');
      }
    }
    setTouchStart(null);
  };

  // Start Editing
  const handleStartEdit = () => {
    if (!selectedEntry) return;
    setEditTitle(selectedEntry.title);
    setEditMood(selectedEntry.mood);
    setEditMoodEmoji(selectedEntry.moodEmoji);
    setEditHighlights([...selectedEntry.highlights]);
    setEditText(selectedEntry.text);
    setIsEditing(true);
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!selectedEntry || !selectedEntry.id) return;
    const updated: DiaryEntry = {
      ...selectedEntry,
      title: editTitle.trim() || selectedEntry.title,
      mood: editMood.trim() || selectedEntry.mood,
      moodEmoji: editMoodEmoji || selectedEntry.moodEmoji,
      highlights: editHighlights.filter((h) => h.trim().length > 0),
      text: editText.trim() || selectedEntry.text,
      updatedAt: Date.now(),
    };

    await onEditEntry(updated);
    setSelectedEntry(updated);
    setIsEditing(false);
  };

  // Delete Entry
  const handleConfirmDelete = async () => {
    if (!selectedEntry || !selectedEntry.id) return;
    await onDeleteEntry(selectedEntry.id);
    setShowDeleteConfirm(false);
    setSelectedEntry(null);
  };

  const formatCardDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(dateObj);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 space-y-5 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-journal font-semibold text-stone-800 dark:text-stone-100">
            My Diary
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} penned across time
          </p>
        </div>

        {/* Date Filter Quick Picker */}
        <div className="relative">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="text-xs px-3 py-2 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-xl text-stone-700 dark:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search entries by title, feeling, or memory..."
          className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-2xl text-stone-800 dark:text-stone-100 placeholder-stone-400 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
        />
        {(searchQuery || filterDate) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterDate('');
            }}
            aria-label="Clear filters"
            className="absolute right-3.5 top-3 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-xs font-semibold"
          >
            Clear
          </button>
        )}
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white/50 dark:bg-stone-900/40 border border-dashed border-journal-200 dark:border-stone-800 rounded-3xl p-8">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-journal font-semibold text-stone-800 dark:text-stone-200 text-base">
              {searchQuery || filterDate ? 'No matching diary entries' : 'No diary entries yet'}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 max-w-xs mx-auto mt-1">
              {searchQuery || filterDate
                ? 'Try searching with different keywords or clearing the date filter.'
                : 'Complete your first daily check-in to begin your journal.'}
            </p>
          </div>
          {!searchQuery && !filterDate && (
            <button
              onClick={onAddMoreToToday}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-medium shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Write First Entry
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredEntries.map((entry) => {
            const isToday = entry.date === todayDate;
            const firstLine = entry.text.split('\n')[0] || '';

            return (
              <div
                key={entry.date}
                onClick={() => handleOpenEntry(entry)}
                className="group p-5 bg-white dark:bg-stone-900 border border-journal-200 dark:border-stone-800 hover:border-amber-300 dark:hover:border-stone-700 rounded-3xl shadow-soft hover:shadow-soft-lg cursor-pointer transition-all active:scale-[0.99]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                      {formatCardDate(entry.date)}
                    </span>
                    {isToday && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                        Today
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-journal-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                    <span>{entry.moodEmoji}</span>
                    <span>{entry.mood}</span>
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-journal font-semibold text-stone-800 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors mb-1.5">
                  {entry.title}
                </h3>

                <p className="text-xs sm:text-sm font-journal text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed">
                  {firstLine}
                </p>

                {entry.highlights && entry.highlights.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-journal-100 dark:border-stone-800/80 flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                      {entry.highlights[0]}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Full Day Reader Modal */}
      {selectedEntry && !isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="w-full max-w-xl bg-journal-50 dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 shadow-soft-lg text-stone-900 dark:text-stone-100 my-auto max-h-[92vh] flex flex-col relative select-text"
          >
            {/* Top Navigation & Controls */}
            <div className="flex items-center justify-between pb-3 border-b border-journal-200 dark:border-stone-800 flex-shrink-0">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleNavigateDay('prev')}
                  title="Previous Day"
                  className="p-1.5 rounded-xl hover:bg-journal-200 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleNavigateDay('next')}
                  title="Next Day"
                  className="p-1.5 rounded-xl hover:bg-journal-200 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 ml-1">
                  {formatCardDate(selectedEntry.date)}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleStartEdit}
                  title="Edit entry"
                  className="p-1.5 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 rounded-xl hover:bg-journal-200 dark:hover:bg-stone-800 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Delete entry"
                  className="p-1.5 text-stone-500 hover:text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedEntry(null)}
                  title="Close"
                  className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-xl ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Reader Content Body */}
            <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
              {/* Mood Pill */}
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40 dark:border-amber-800/40">
                  <span className="text-base leading-none">{selectedEntry.moodEmoji}</span>
                  <span>{selectedEntry.mood}</span>
                </span>
                <span className="text-[11px] text-stone-400 dark:text-stone-500">
                  Swipe left/right to browse days
                </span>
              </div>

              {/* Title */}
              <h2 className="text-2xl sm:text-3xl font-journal font-bold text-stone-800 dark:text-stone-100 leading-snug">
                {selectedEntry.title}
              </h2>

              {/* Highlights Section */}
              {selectedEntry.highlights && selectedEntry.highlights.length > 0 && (
                <div className="p-4 bg-journal-100/70 dark:bg-stone-800/60 rounded-2xl space-y-2 border border-journal-200/60 dark:border-stone-700/60">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 block mb-1">
                    Key Highlights
                  </span>
                  {selectedEntry.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-stone-700 dark:text-stone-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                      <span className="leading-relaxed">{h}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* First Person Narrative Text */}
              <div className="font-journal text-base text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-wrap space-y-4">
                {selectedEntry.text}
              </div>

              {/* If viewing today's entry: Option to Add More to Today */}
              {selectedEntry.date === todayDate && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setSelectedEntry(null);
                      onAddMoreToToday();
                    }}
                    className="w-full py-3 px-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/70 text-amber-800 dark:text-amber-300 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Add more reflections to today & regenerate</span>
                  </button>
                </div>
              )}

              {/* Raw Conversation Collapsible */}
              {selectedEntry.rawConversation && selectedEntry.rawConversation.length > 0 && (
                <div className="pt-2 border-t border-journal-200 dark:border-stone-800">
                  <button
                    onClick={() => setShowRawChat(!showRawChat)}
                    className="w-full py-2 flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-700 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      View raw conversation ({selectedEntry.rawConversation.length} messages)
                    </span>
                    <span>{showRawChat ? 'Hide' : 'Show'}</span>
                  </button>

                  {showRawChat && (
                    <div className="mt-2 space-y-2 max-h-52 overflow-y-auto p-3 bg-white dark:bg-stone-950 rounded-2xl border border-journal-200 dark:border-stone-800 text-xs">
                      {selectedEntry.rawConversation.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-xl ${
                            msg.role === 'ai'
                              ? 'bg-journal-50 dark:bg-stone-900 text-stone-700 dark:text-stone-300'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 font-medium'
                          }`}
                        >
                          <span className="text-[10px] font-semibold opacity-70 block mb-0.5">
                            {msg.role === 'ai' ? 'Dear Day' : 'You'}:
                          </span>
                          {msg.content}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Safe Bar */}
            <div className="pt-3 border-t border-journal-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 flex-shrink-0">
              <span>Saved in local storage</span>
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 text-stone-800 dark:text-stone-200 font-medium rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-journal-50 dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-3xl p-6 shadow-soft-lg text-stone-900 dark:text-stone-100 my-auto max-h-[92vh] flex flex-col">
            <h3 className="text-lg font-journal font-semibold mb-4">Edit Entry</h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-sm font-journal font-semibold"
                />
              </div>

              <div className="flex gap-2">
                <div className="w-16">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={editMoodEmoji}
                    onChange={(e) => setEditMoodEmoji(e.target.value)}
                    className="w-full text-center px-2 py-2 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-base"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                    Mood
                  </label>
                  <input
                    type="text"
                    value={editMood}
                    onChange={(e) => setEditMood(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-xl text-stone-800 dark:text-stone-100 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1">
                  Diary Text (First Person)
                </label>
                <textarea
                  rows={8}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-2xl text-stone-800 dark:text-stone-100 text-sm font-journal leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-journal-200 dark:border-stone-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-journal-50 dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-3xl p-6 text-stone-900 dark:text-stone-100 shadow-soft-lg space-y-4">
            <h3 className="text-lg font-journal font-semibold text-rose-600 dark:text-rose-400">
              Delete this entry?
            </h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              Are you sure you want to delete your entry for {selectedEntry && formatCardDate(selectedEntry.date)}? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
