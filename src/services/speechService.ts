// Web Speech API Voice Input and SpeechSynthesis Voice Output

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export interface SpeechRecognitionSupport {
  isSupported: boolean;
  message?: string;
}

export function checkSpeechRecognitionSupport(): SpeechRecognitionSupport {
  const isSupported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!isSupported) {
    return {
      isSupported: false,
      message: 'Speech recognition is not supported in this browser. Please type your thoughts or try Chrome / Safari / Edge.',
    };
  }
  return { isSupported: true };
}

// Global cached voices and listener
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const updateVoices = () => {
    try {
      cachedVoices = window.speechSynthesis.getVoices();
    } catch {}
  };
  updateVoices();
  window.speechSynthesis.onvoiceschanged = updateVoices;
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
  return cachedVoices;
}

export class SpeechInputController {
  private recognition: any = null;
  private isListening: boolean = false;
  private shouldStayActive: boolean = false;
  private onTranscriptUpdate: (transcript: string, isFinal: boolean, finalChunk?: string) => void;
  private onError: (errorMsg: string) => void;
  private onStateChange: (listening: boolean) => void;
  private currentLang: string = 'en-US';
  private restartTimeout: any = null;

  constructor(
    onTranscriptUpdate: (transcript: string, isFinal: boolean, finalChunk?: string) => void,
    onError: (errorMsg: string) => void,
    onStateChange: (listening: boolean) => void,
    initialLang: 'en' | 'ta' = 'en'
  ) {
    this.onTranscriptUpdate = onTranscriptUpdate;
    this.onError = onError;
    this.onStateChange = onStateChange;
    this.currentLang = initialLang === 'ta' ? 'ta-IN' : 'en-US';

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.currentLang;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.onStateChange(true);
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const isFinal = finalTranscript.trim().length > 0;
        this.onTranscriptUpdate(
          interimTranscript.trim(),
          isFinal,
          finalTranscript.trim()
        );
      };

      this.recognition.onerror = (event: any) => {
        let message = 'Speech recognition error occurred.';
        if (event.error === 'not-allowed') {
          message = 'Microphone permission was denied. Please allow microphone access in your browser settings.';
          this.shouldStayActive = false;
        } else if (event.error === 'no-speech') {
          return;
        } else if (event.error === 'network') {
          message = 'Speech recognition network error. Please check your internet connection.';
          this.shouldStayActive = false;
        }
        this.onError(message);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.shouldStayActive) {
          clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.shouldStayActive && this.recognition) {
              try {
                this.recognition.start();
              } catch {
                this.isListening = false;
                this.onStateChange(false);
              }
            }
          }, 200);
        } else {
          this.onStateChange(false);
        }
      };
    }
  }

  public setLanguage(lang: 'en' | 'ta'): void {
    this.currentLang = lang === 'ta' ? 'ta-IN' : 'en-US';
    if (this.recognition) {
      this.recognition.lang = this.currentLang;
      if (this.isListening && this.shouldStayActive) {
        try {
          this.recognition.stop();
        } catch {}
      }
    }
  }

  public start(): boolean {
    if (!this.recognition) {
      this.onError('Speech recognition is not available in this browser.');
      return false;
    }
    try {
      this.shouldStayActive = true;
      this.recognition.lang = this.currentLang;
      this.recognition.start();
      return true;
    } catch (err: any) {
      console.warn('Speech recognition start error:', err);
      return false;
    }
  }

  public stop(): void {
    this.shouldStayActive = false;
    clearTimeout(this.restartTimeout);
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn('Speech recognition stop error:', err);
      }
    }
    this.isListening = false;
    this.onStateChange(false);
  }

  public toggle(): boolean {
    if (this.isListening) {
      this.stop();
      return false;
    } else {
      return this.start();
    }
  }

  public getIsListening(): boolean {
    return this.isListening;
  }
}

// Helper to test if text has Tamil characters
export function isTamilText(text: string): boolean {
  return /[\u0B80-\u0BFF]/.test(text);
}

/**
 * Clean text for high-fidelity TTS pronunciation.
 * Strips emojis, markdown, symbols, and replaces mixed foreign words.
 */
export function sanitizeTextForSpeech(text: string, isTamil: boolean): string {
  let cleaned = text;

  // 1. Strip all unicode emojis completely (which cause TTS to pronounce emoji names or choke)
  cleaned = cleaned.replace(
    /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1FA70}-\u{1FAFF}\u{1F900}-\u{1F9FF}]/gu,
    ''
  );

  // 2. Remove markdown formatting (*bold*, _italic_, # header, etc.)
  cleaned = cleaned.replace(/[*_#~`>•\-_]/g, ' ');

  // 3. For Tamil speech, replace English control words with natural Tamil words
  if (isTamil) {
    cleaned = cleaned.replace(/finish\s+my\s+day/gi, 'நாட்குறிப்பு முடிக்க');
    cleaned = cleaned.replace(/finish\s+day/gi, 'நாட்குறிப்பு முடிக்க');
    cleaned = cleaned.replace(/diary\s+entry/gi, 'நாட்குறிப்பு');
    cleaned = cleaned.replace(/diary/gi, 'நாட்குறிப்பு');
    cleaned = cleaned.replace(/dear\s+day/gi, 'டியர் டே');
  }

  // 4. Remove brackets and quotes
  cleaned = cleaned.replace(/[()[\]{}"'“”‘’]/g, ' ');

  // 5. Normalize multiple whitespace and dots
  cleaned = cleaned.replace(/\.{2,}/g, '.');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

export interface FemaleVoicePreset {
  id: string;
  name: string;
  gender: 'female';
  lang: 'en' | 'ta';
  badge: string;
  description: string;
  pitch: number;
  rate: number;
  preferredVoices: string[];
}

export const FEMALE_VOICE_PRESETS: FemaleVoicePreset[] = [
  {
    id: 'maya',
    name: 'Maya',
    gender: 'female',
    lang: 'en',
    badge: '🌸 Maya',
    description: 'Warm, friendly & conversational female voice',
    pitch: 1.15,
    rate: 0.94,
    preferredVoices: ['Jenny', 'Samantha', 'Google US English', 'Natural', 'Victoria', 'Zira'],
  },
  {
    id: 'priya',
    name: 'Priya',
    gender: 'female',
    lang: 'en',
    badge: '✨ Priya',
    description: 'Soft, gentle & soothing calming voice',
    pitch: 1.05,
    rate: 0.88,
    preferredVoices: ['Aria', 'Victoria', 'Google UK English Female', 'Karen', 'Samantha'],
  },
  {
    id: 'sarah',
    name: 'Sarah',
    gender: 'female',
    lang: 'en',
    badge: '🌿 Sarah',
    description: 'Bright, cheerful & expressive clear voice',
    pitch: 1.22,
    rate: 0.96,
    preferredVoices: ['Zira', 'Microsoft Jenny', 'Samantha', 'Google'],
  },
  {
    id: 'ananya',
    name: 'Ananya',
    gender: 'female',
    lang: 'ta',
    badge: '🌸 அனன்யா (Ananya)',
    description: 'இனிமையான தமிழ் பெண் குரல் (Sweet Tamil Female)',
    pitch: 1.15,
    rate: 0.88,
    preferredVoices: ['Pallavi', 'Tamil', 'Google தமிழ்', 'Valluvar', 'Heera'],
  },
  {
    id: 'nila',
    name: 'Nila',
    gender: 'female',
    lang: 'ta',
    badge: '🌿 நிலா (Nila)',
    description: 'அமைதியான மெல்லிய தமிழ் பெண் குரல் (Soft Tamil Female)',
    pitch: 1.05,
    rate: 0.84,
    preferredVoices: ['Tamil', 'Google தமிழ்', 'Pallavi', 'Valluvar'],
  },
];

/**
 * Speech Synthesis (AI voice replies)
 * Resolves appropriate voices, cleans text, and splits into sentence chunks
 * so no words are cut off, muffled, or garbled.
 */
export function speakAiText(text: string, preferredLang?: 'en' | 'ta', voicePresetId?: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel();

    const isTamil = preferredLang === 'ta' || isTamilText(text);
    const cleanText = sanitizeTextForSpeech(text, isTamil);
    if (!cleanText) return;

    const voices = getAvailableVoices();

    const defaultId = isTamil ? 'ananya' : 'maya';
    const activePreset =
      FEMALE_VOICE_PRESETS.find((p) => p.id === (voicePresetId || defaultId)) ||
      FEMALE_VOICE_PRESETS.find((p) => p.lang === (isTamil ? 'ta' : 'en')) ||
      FEMALE_VOICE_PRESETS[0];

    let selectedVoice: SpeechSynthesisVoice | undefined;

    if (isTamil) {
      // Find Tamil female voice
      for (const pref of activePreset.preferredVoices) {
        selectedVoice = voices.find(
          (v) =>
            (v.lang.startsWith('ta') || v.name.toLowerCase().includes('tamil')) &&
            v.name.toLowerCase().includes(pref.toLowerCase())
        );
        if (selectedVoice) break;
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(
          (v) =>
            v.lang === 'ta-IN' ||
            v.lang === 'ta_IN' ||
            v.lang.startsWith('ta') ||
            v.name.toLowerCase().includes('tamil') ||
            v.name.includes('Valluvar')
        );
      }
    } else {
      // Find English female voice
      for (const pref of activePreset.preferredVoices) {
        selectedVoice = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            v.name.toLowerCase().includes(pref.toLowerCase())
        );
        if (selectedVoice) break;
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Samantha') ||
              v.name.includes('Jenny') ||
              v.name.includes('Aria') ||
              v.name.includes('Zira') ||
              v.name.includes('Google') ||
              v.name.includes('Victoria'))
        );
      }
    }

    // Split text into natural sentence chunks so speech doesn't timeout or drop words
    const sentenceChunks = cleanText
      .split(/(?<=[.?!,;:\n])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const chunksToSpeak = sentenceChunks.length > 0 ? sentenceChunks : [cleanText];

    chunksToSpeak.forEach((sentence) => {
      const utterance = new SpeechSynthesisUtterance(sentence);

      if (isTamil) {
        utterance.lang = selectedVoice?.lang || 'ta-IN';
        utterance.rate = activePreset.rate;
        utterance.pitch = activePreset.pitch;
      } else {
        utterance.lang = selectedVoice?.lang || 'en-US';
        utterance.rate = activePreset.rate;
        utterance.pitch = activePreset.pitch;
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      window.speechSynthesis.speak(utterance);
    });
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

/**
 * Preview Voice Sample
 */
export function previewVoiceSample(presetId: string, lang: 'en' | 'ta'): void {
  const isTamil = lang === 'ta';
  const sampleText = isTamil
    ? (presetId === 'nila'
        ? 'வணக்கம்! நான் நிலா. அமைதியான குரலில் உங்கள் நாளைக் கேட்கிறேன்.'
        : 'வணக்கம்! நான் அனன்யா. இன்று என்ன நடந்தது, இப்போது என்ன செய்து கொண்டிருக்கிறீர்கள்?')
    : (presetId === 'priya'
        ? "Hello! I'm Priya. Tell me what happened today, and how you are feeling."
        : presetId === 'sarah'
        ? "Hi there! I'm Sarah! What happened today, and what are you doing right now?"
        : "Hello! I'm Maya. What happened today, and what are you doing right now?");

  speakAiText(sampleText, lang, presetId);
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
