import type { DiaryEntry, MessageItem } from '../types';
import {
  generateDemoReply,
  generateDemoSummary,
  checkCrisis,
  CRISIS_HELP_RESPONSE_EN,
  CRISIS_HELP_RESPONSE_TA,
} from './demoAi';
import { isTamilText } from './speechService';

export interface AiStatus {
  isConfigured: boolean;
  model: string;
  isOnline: boolean;
  mode: 'live' | 'demo';
}

let cachedStatus: AiStatus = {
  isConfigured: false,
  model: 'claude-3-5-sonnet-20241022',
  isOnline: navigator.onLine,
  mode: 'demo',
};

export async function checkAiHealth(): Promise<AiStatus> {
  if (!navigator.onLine) {
    cachedStatus = {
      isConfigured: false,
      model: 'Demo Local Engine',
      isOnline: false,
      mode: 'demo',
    };
    return cachedStatus;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch('/api/health', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      cachedStatus = {
        isConfigured: !!data.hasApiKey,
        model: data.model || 'claude-3-5-sonnet-20241022',
        isOnline: true,
        mode: data.hasApiKey ? 'live' : 'demo',
      };
    } else {
      cachedStatus.mode = 'demo';
    }
  } catch {
    cachedStatus = {
      isConfigured: false,
      model: 'Demo Local Engine',
      isOnline: true,
      mode: 'demo',
    };
  }

  return cachedStatus;
}

export function getCachedAiStatus(): AiStatus {
  return cachedStatus;
}

export interface ChatResponse {
  reply: string;
  isCrisis?: boolean;
  shouldFinish?: boolean;
  usedFallback?: boolean;
}

export async function getNextAiQuestion(
  userName: string,
  messages: MessageItem[],
  preferredLang: 'en' | 'ta' = 'en'
): Promise<ChatResponse> {
  const latestMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
  const isTamil = preferredLang === 'ta' || isTamilText(latestMessage);

  // Immediate client-side crisis safety guard
  if (checkCrisis(latestMessage)) {
    return {
      reply: isTamil ? CRISIS_HELP_RESPONSE_TA : CRISIS_HELP_RESPONSE_EN,
      isCrisis: true,
      shouldFinish: true,
    };
  }

  // If offline, use local demo generator immediately
  if (!navigator.onLine) {
    const demo = generateDemoReply(userName, messages, preferredLang);
    return { ...demo, usedFallback: true };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, messages, language: preferredLang }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.reply) {
        return {
          reply: data.reply,
          isCrisis: data.isCrisis,
          shouldFinish: data.shouldFinish,
        };
      }
    }
  } catch (err) {
    console.warn('[Dear Day] Chat API call fell back to local demo logic:', err);
  }

  // Seamless fallback to demo logic
  const demoResult = generateDemoReply(userName, messages, preferredLang);
  return { ...demoResult, usedFallback: true };
}

export async function generateDiaryEntry(
  userName: string,
  messages: MessageItem[],
  dateStr: string,
  preferredLang: 'en' | 'ta' = 'en'
): Promise<Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>> {
  if (navigator.onLine) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, conversation: messages, language: preferredLang }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.summary && data.summary.text) {
          return {
            date: dateStr,
            title: data.summary.title || (preferredLang === 'ta' ? 'இன்றைய நாட்குறிப்பு' : 'Today\'s Story'),
            mood: data.summary.mood || (preferredLang === 'ta' ? 'அமைதி' : 'Reflective'),
            moodEmoji: data.summary.moodEmoji || '🌿',
            highlights: Array.isArray(data.summary.highlights) ? data.summary.highlights : [],
            text: data.summary.text,
            rawConversation: messages,
          };
        }
      }
    } catch (err) {
      console.warn('[Dear Day] Summary API fell back to local demo summary:', err);
    }
  }

  // Fallback to high-quality local generator
  return generateDemoSummary(userName, messages, dateStr, preferredLang);
}

/**
 * Format and Polish Spoken or Typed Diary Text directly into a proper diary entry
 * strictly WITHOUT asking questions.
 */
export async function formatAndPolishDiaryText(
  userName: string,
  rawText: string,
  dateStr: string,
  preferredLang: 'en' | 'ta' = 'en'
): Promise<Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>> {
  const messages: MessageItem[] = [
    {
      date: dateStr,
      role: 'user',
      content: rawText,
      inputMode: 'voice',
      timestamp: Date.now(),
    },
  ];
  return generateDiaryEntry(userName, messages, dateStr, preferredLang);
}
