import React, { useState } from 'react';
import { Lock, Delete } from 'lucide-react';
import { verifyPin } from '../services/exportImportService';

interface PinLockScreenProps {
  pinHash: string;
  onUnlock: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ pinHash, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleDigit = async (digit: string) => {
    if (pin.length >= 4 || isVerifying) return;

    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      setIsVerifying(true);
      const isValid = await verifyPin(newPin, pinHash);
      if (isValid) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setIsVerifying(false);
        }, 500);
      }
    }
  };

  const handleBackspace = () => {
    if (isVerifying) return;
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleClear = () => {
    if (isVerifying) return;
    setPin('');
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-journal-50 dark:bg-stone-950 text-stone-800 dark:text-stone-100 animate-fade-in select-none">
      <div className="w-full max-w-xs flex flex-col items-center">
        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 shadow-inner">
          <Lock className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-journal font-semibold mb-1">Dear Day is Locked</h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-8 text-center">
          Enter your 4-digit PIN to open your diary
        </p>

        {/* PIN Dots with Shake Animation on Error */}
        <div className={`flex items-center gap-4 mb-10 ${error ? 'animate-bounce text-red-500' : ''}`}>
          {[0, 1, 2, 3].map((index) => {
            const filled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  filled
                    ? error
                      ? 'bg-rose-500 scale-110'
                      : 'bg-amber-600 dark:bg-amber-500 scale-110'
                    : 'border-2 border-stone-300 dark:border-stone-700 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <p className="text-xs text-rose-500 font-medium -mt-6 mb-6 animate-pulse">
            Incorrect PIN. Try again.
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-4 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-16 rounded-2xl bg-white dark:bg-stone-900 border border-journal-200 dark:border-stone-800 text-xl font-semibold text-stone-800 dark:text-stone-100 shadow-sm active:scale-95 active:bg-amber-50 dark:active:bg-stone-800 transition-all flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-16 rounded-2xl text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 hover:text-stone-600 active:scale-95 transition-all flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-16 rounded-2xl bg-white dark:bg-stone-900 border border-journal-200 dark:border-stone-800 text-xl font-semibold text-stone-800 dark:text-stone-100 shadow-sm active:scale-95 active:bg-amber-50 dark:active:bg-stone-800 transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Backspace"
            className="h-16 rounded-2xl text-stone-500 dark:text-stone-400 hover:text-stone-700 active:scale-95 transition-all flex items-center justify-center"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
