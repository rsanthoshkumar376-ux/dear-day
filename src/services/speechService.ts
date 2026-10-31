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

        const combined = (finalTranscript + ' ' + interimTranscript).trim();
        this.onTranscriptUpdate(combined, finalTranscript.length > 0, finalTranscript.trim());
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

/**
 * Speech Synthesis (AI voice replies)
 * Resolves appropriate voices, cleans text, and splits into sentence chunks
 * so no words are cut off, muffled, or garbled.
 */
export function speakAiText(text: string, preferredLang?: 'en' | 'ta'): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel();

    const isTamil = preferredLang === 'ta' || isTamilText(text);
    const cleanText = sanitizeTextForSpeech(text, isTamil);
    if (!cleanText) return;

    const voices = getAvailableVoices();

    let selectedVoice: SpeechSynthesisVoice | undefined;

    if (isTamil) {
      // Find Tamil voice: check exact tag, startsWith, or name
      selectedVoice = voices.find(
        (v) =>
          v.lang === 'ta-IN' ||
          v.lang === 'ta_IN' ||
          v.lang.startsWith('ta') ||
          v.name.toLowerCase().includes('tamil') ||
          v.name.includes('Valluvar')
      );
    } else {
      // Find English voice
      selectedVoice = voices.find(
        (v) =>
          (v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Samantha') ||
              v.name.includes('Google') ||
              v.name.includes('Jenny') ||
              v.name.includes('Guy'))) ||
          v.lang === 'en-US'
      );
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
        // 0.88 rate is the sweet spot for clear Tamil consonant and vowel cluster pronunciation
        utterance.rate = 0.88;
        utterance.pitch = 1.0;
      } else {
        utterance.lang = selectedVoice?.lang || 'en-US';
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
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

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
