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

  constructor(
    onTranscriptUpdate: (transcript: string, isFinal: boolean) => void,
    onError: (errorMsg: string) => void,
    onStateChange: (listening: boolean) => void
  ) {
    this.onTranscriptUpdate = onTranscriptUpdate;
    this.onError = onError;
    this.onStateChange = onStateChange;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

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
          // No speech detected, quietly ignore or allow user to try again
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

  public start(): boolean {
    if (!this.recognition) {
      this.onError('Speech recognition is not available in this browser.');
      return false;
    }
    try {
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

// Speech Synthesis (AI voice replies)
export function speakAiText(text: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    // Cancel any previous speech
    window.speechSynthesis.cancel();

    // Clean text of symbols or bullets for natural reading
    const cleanText = text.replace(/[*_#•]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95; // Warm, unhurried pace
    utterance.pitch = 1.0;

    // Pick a warm voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        (v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google'))) ||
        v.lang === 'en-US'
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
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
