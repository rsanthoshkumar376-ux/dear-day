// Web Speech API Voice Input and SpeechSynthesis Voice Output

// Type declaration for browser SpeechRecognition
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

export class SpeechInputController {
  private recognition: any = null;
  private isListening: boolean = false;
  private onTranscriptUpdate: (transcript: string, isFinal: boolean) => void;
  private onError: (errorMsg: string) => void;
  private onStateChange: (listening: boolean) => void;
  private currentLang: string = 'en-US';

  constructor(
    onTranscriptUpdate: (transcript: string, isFinal: boolean) => void,
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
        this.onTranscriptUpdate(combined, finalTranscript.length > 0);
      };

      this.recognition.onerror = (event: any) => {
        let message = 'Speech recognition error occurred.';
        if (event.error === 'not-allowed') {
          message = 'Microphone permission was denied. Please allow microphone access in your browser settings.';
        } else if (event.error === 'no-speech') {
          return;
        } else if (event.error === 'network') {
          message = 'Speech recognition network error. Please check your internet connection.';
        }
        this.onError(message);
        this.stop();
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onStateChange(false);
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
      this.recognition.lang = this.currentLang;
      this.recognition.start();
      return true;
    } catch (err: any) {
      console.warn('Speech recognition start error:', err);
      return false;
    }
  }

  public stop(): void {
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

  public get active(): boolean {
    return this.isListening;
  }
}

// Helper to test if text has Tamil characters
export function isTamilText(text: string): boolean {
  return /[\u0B80-\u0BFF]/.test(text);
}

// Speech Synthesis (AI voice replies)
export function speakAiText(text: string, preferredLang?: 'en' | 'ta'): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel();

    const cleanText = text.replace(/[*_#•]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const isTamil = preferredLang === 'ta' || isTamilText(text);

    if (isTamil) {
      utterance.lang = 'ta-IN';
      utterance.rate = 0.92; // Gentle, clear Tamil cadence
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const tamilVoice = voices.find(
        (v) =>
          v.lang.startsWith('ta') ||
          v.name.toLowerCase().includes('tamil') ||
          v.name.includes('Valluvar')
      );
      if (tamilVoice) {
        utterance.voice = tamilVoice;
      }
    } else {
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          (v.lang.startsWith('en') &&
            (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google'))) ||
          v.lang === 'en-US'
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
