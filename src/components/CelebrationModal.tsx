import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Flame, Sparkles, X } from 'lucide-react';

interface CelebrationModalProps {
  milestoneDays: number;
  onClose: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({ milestoneDays, onClose }) => {
  useEffect(() => {
    // Fire festive confetti
    try {
      const end = Date.now() + 1500;
      const colors = ['#f59e0b', '#d97706', '#10b981', '#f43f5e', '#6366f1'];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    } catch (err) {
      console.warn('Confetti error:', err);
    }
  }, [milestoneDays]);

  let quote = "Every day you check in is an act of care for your future self.";
  if (milestoneDays === 3) quote = "Three days in a row! You're planting a lasting habit.";
  else if (milestoneDays === 7) quote = "A full week of reflecting. What a meaningful milestone!";
  else if (milestoneDays === 14) quote = "Two weeks strong. Your story is unfolding beautifully.";
  else if (milestoneDays === 30) quote = "30 days of Dear Day. A full month of memories captured forever.";
  else if (milestoneDays === 100) quote = "100 days! An extraordinary journey of self-reflection.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-journal-50 dark:bg-stone-900 border border-journal-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 text-center shadow-soft-lg text-stone-900 dark:text-stone-100">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Milestone Icon */}
        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-3xl flex items-center justify-center text-white shadow-lg animate-bounce">
          <Flame className="w-10 h-10 fill-white" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-full mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Milestone Unlocked
        </div>

        <h2 className="text-3xl font-journal font-bold text-stone-800 dark:text-stone-100 mb-2">
          {milestoneDays} Day Streak!
        </h2>

        <p className="text-sm font-journal italic text-stone-600 dark:text-stone-300 mb-6 px-2">
          "{quote}"
        </p>

        <button
          onClick={onClose}
          className="w-full py-3.5 px-6 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-medium rounded-xl shadow-md transition-all"
        >
          Keep It Going
        </button>
      </div>
    </div>
  );
};
