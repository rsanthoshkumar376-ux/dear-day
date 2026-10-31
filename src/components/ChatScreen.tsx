import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  BookOpen,
  Globe,
} from 'lucide-react';
import type { MessageItem, UserSettings } from '../types';
import { getNextAiQuestion } from '../services/aiService';
import { getInitialGreeting } from '../services/demoAi';
import {
  checkSpeechRecognitionSupport,
  SpeechInputController,
  speakAiText,
  stopSpeaking,
  isTamilText,
} from '../services/speechService';

interface ChatScreenProps {
  userSettings: UserSettings;
  todayDate: string;
  messages: MessageItem[];
  onSaveMessage: (message: Omit<MessageItem, 'id'>) => Promise<void>;
  onFinishDay: () => void;
  onNavigateToDiary: () => void;
  onUpdateLanguage?: (lang: 'en' | 'ta') => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  userSettings,
  todayDate,
  messages,
  onSaveMessage,
  onFinishDay,
  onNavigateToDiary,
  onUpdateLanguage,
}) => {
  const [inputText, setInputText] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);
  const [currentLang, setCurrentLang] = useState<'en' | 'ta'>(userSettings.language || 'en');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechControllerRef = useRef<SpeechInputController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isTamil = currentLang === 'ta';

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiThinking, liveTranscript]);

  // Sync language with userSettings
  useEffect(() => {
    if (userSettings.language && userSettings.language !== currentLang) {
      setCurrentLang(userSettings.language);
      speechControllerRef.current?.setLanguage(userSettings.language);
    }
  }, [userSettings.language]);

  // If no messages exist yet for today, send initial AI greeting in chosen language
  useEffect(() => {
    if (messages.length === 0) {
      const greetingText = getInitialGreeting(userSettings.name, currentLang);
      onSaveMessage({
        date: todayDate,
        role: 'ai',
        content: greetingText,
        inputMode: 'typed',
        timestamp: Date.now(),
      });

      if (userSettings.voiceReplies) {
        speakAiText(greetingText, currentLang);
      }
    }
  }, [messages.length, todayDate, userSettings.name, userSettings.voiceReplies, currentLang, onSaveMessage]);

  // Initialize SpeechRecognition Controller with current language
  useEffect(() => {
    const support = checkSpeechRecognitionSupport();
    if (support.isSupported) {
      speechControllerRef.current = new SpeechInputController(
        (transcript, _isFinal) => {
          setLiveTranscript(transcript);
          setInputText(transcript);
        },
        (errorMsg) => {
          setSpeechError(errorMsg);
          setIsListening(false);
        },
        (listening) => {
          setIsListening(listening);
          if (!listening) {
            setLiveTranscript('');
          }
        },
        currentLang
      );
    }

    return () => {
      speechControllerRef.current?.stop();
      stopSpeaking();
    };
  }, []);

  // Language switch handler
  const handleChangeLanguage = (lang: 'en' | 'ta') => {
    setCurrentLang(lang);
    speechControllerRef.current?.setLanguage(lang);
    if (onUpdateLanguage) {
      onUpdateLanguage(lang);
    }
  };

  // Toggle Microphone
  const handleToggleMic = () => {
    setSpeechError(null);
    const support = checkSpeechRecognitionSupport();
    if (!support.isSupported) {
      setSpeechError(
        isTamil
          ? 'இந்த உலாவியில் பேச்சு அறிதல் (Speech Recognition) ஆதரிக்கப்படவில்லை. தயவுசெய்து தட்டச்சு செய்யவும்.'
          : support.message || 'Voice input is not supported in this browser.'
      );
      return;
    }

    if (isListening) {
      speechControllerRef.current?.stop();
    } else {
      speechControllerRef.current?.setLanguage(currentLang);
      const started = speechControllerRef.current?.start();
      if (!started) {
        setSpeechError(
          isTamil
            ? 'மைக்ரோஃபோன் அணுகலை தொடங்க முடியவில்லை. பிரவுசர் அனுமதியை சரிபார்க்கவும்.'
            : 'Could not start speech recognition. Please check microphone permissions.'
        );
      }
    }
  };

  // Send User Message
  const handleSendMessage = async (mode: 'typed' | 'voice' = 'typed') => {
    const textToSend = (inputText || liveTranscript).trim();
    if (!textToSend || isAiThinking) return;

    if (isListening) {
      speechControllerRef.current?.stop();
    }

    // Auto-detect Tamil in user text
    const textIsTamil = isTamilText(textToSend);
    const activeLang = textIsTamil ? 'ta' : currentLang;

    // Shortcut commands: "show my diary" / "நாட்குறிப்பு காட்டு"
    const diaryTriggerRegex = /^(show|open|view|read|go to)\s+(my\s+)?(diary|journal)|நாட்குறிப்பு|டைரி/i;
    if (diaryTriggerRegex.test(textToSend)) {
      onNavigateToDiary();
      return;
    }

    setInputText('');
    setLiveTranscript('');
    setApiError(null);
    setIsAiThinking(true);

    const userMessage: Omit<MessageItem, 'id'> = {
      date: todayDate,
      role: 'user',
      content: textToSend,
      inputMode: mode,
      timestamp: Date.now(),
    };
    await onSaveMessage(userMessage);

    try {
      const conversationHistory = [...messages, userMessage as MessageItem];
      const aiResult = await getNextAiQuestion(userSettings.name, conversationHistory, activeLang);

      const aiMessage: Omit<MessageItem, 'id'> = {
        date: todayDate,
        role: 'ai',
        content: aiResult.reply,
        inputMode: 'typed',
        timestamp: Date.now(),
      };
      await onSaveMessage(aiMessage);

      if (userSettings.voiceReplies && !aiResult.isCrisis) {
        speakAiText(aiResult.reply, activeLang);
      }
    } catch (err: any) {
      console.error('Failed to get AI reply:', err);
      setApiError(
        isTamil
          ? 'பதில் பெறுவதில் சிரமம் ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.'
          : 'Unable to get a response right now. Tap retry to try again.'
      );
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleRetry = async () => {
    setApiError(null);
    setIsAiThinking(true);
    try {
      const aiResult = await getNextAiQuestion(userSettings.name, messages, currentLang);
      await onSaveMessage({
        date: todayDate,
        role: 'ai',
        content: aiResult.reply,
        inputMode: 'typed',
        timestamp: Date.now(),
      });
      if (userSettings.voiceReplies) {
        speakAiText(aiResult.reply, currentLang);
      }
    } catch {
      setApiError('Retry failed. Please check connection.');
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleToggleSpeak = (msgIndex: number, text: string) => {
    if (speakingMessageId === msgIndex) {
      stopSpeaking();
      setSpeakingMessageId(null);
    } else {
      stopSpeaking();
      setSpeakingMessageId(msgIndex);
      speakAiText(text, isTamilText(text) ? 'ta' : currentLang);
    }
  };

  const userMessagesCount = messages.filter((m) => m.role === 'user').length;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-2xl mx-auto pb-safe">
      {/* Top Action Bar with Language Switcher */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-journal-50/80 dark:bg-stone-900/80 border-b border-journal-200/60 dark:border-stone-800/60 backdrop-blur-sm z-10 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 truncate">
            {isTamil ? 'டியர் டே' : 'Dear Day'}
          </span>
          <span className="text-[11px] text-stone-400 dark:text-stone-500 hidden sm:inline">
            ({userMessagesCount} {isTamil ? 'பகிர்வுகள்' : 'shared'})
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Language Switcher Pill [English | தமிழ்] */}
          <div className="flex items-center rounded-xl bg-white dark:bg-stone-800 p-0.5 border border-journal-200 dark:border-stone-700 shadow-sm">
            <button
              type="button"
              onClick={() => handleChangeLanguage('en')}
              className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                currentLang === 'en'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => handleChangeLanguage('ta')}
              className={`px-2 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                currentLang === 'ta'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              தமிழ்
            </button>
          </div>

          <button
            onClick={onNavigateToDiary}
            title="Jump to Diary"
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-stone-600 dark:text-stone-300 hover:bg-journal-200/60 dark:hover:bg-stone-800 rounded-lg transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden sm:inline">{isTamil ? 'நாட்குறிப்பு' : 'Diary'}</span>
          </button>

          {/* Always Visible 'Finish my day' button */}
          <button
            onClick={onFinishDay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{isTamil ? 'முடிக்கவும்' : 'Finish day'}</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message, index) => {
          const isAi = message.role === 'ai';

          return (
            <div
              key={message.id || index}
              className={`flex flex-col ${isAi ? 'items-start' : 'items-end'} animate-fade-in`}
            >
              <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                {isAi && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white text-xs font-journal font-bold flex-shrink-0 shadow-sm mb-1">
                    D
                  </div>
                )}

                <div
                  className={`p-3.5 sm:p-4 rounded-2xl relative text-sm leading-relaxed ${
                    isAi
                      ? 'bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 text-stone-800 dark:text-stone-100 rounded-bl-sm shadow-sm'
                      : 'bg-gradient-to-tr from-amber-600 to-amber-700 text-white rounded-br-sm shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>

                  {!isAi && message.inputMode === 'voice' && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-amber-200/90 font-medium">
                      <Mic className="w-2.5 h-2.5" /> {isTamil ? 'குரல் பதிவு' : 'Voice input'}
                    </span>
                  )}
                </div>

                {isAi && (
                  <button
                    onClick={() => handleToggleSpeak(index, message.content)}
                    className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-journal-200/50 dark:hover:bg-stone-800 transition-colors mb-1"
                    title={speakingMessageId === index ? 'Stop' : 'Read aloud'}
                  >
                    {speakingMessageId === index ? (
                      <VolumeX className="w-4 h-4 text-amber-600 animate-pulse" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              <span className="text-[10px] text-stone-400 dark:text-stone-500 mt-1 px-1">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {/* AI Typing Indicator */}
        {isAiThinking && (
          <div className="flex items-end gap-2 animate-fade-in">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-white text-xs font-journal font-bold flex-shrink-0 shadow-sm mb-1">
              D
            </div>
            <div className="px-4 py-3 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 typing-dot-1" />
              <span className="w-2 h-2 rounded-full bg-amber-500 typing-dot-2" />
              <span className="w-2 h-2 rounded-full bg-amber-500 typing-dot-3" />
            </div>
          </div>
        )}

        {/* API Error State */}
        {apiError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center justify-between text-xs text-rose-800 dark:text-rose-200 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>{apiError}</span>
            </div>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-300 hover:underline px-2 py-1"
            >
              <RotateCcw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Speech Error Banner */}
      {speechError && (
        <div className="mx-4 mb-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{speechError}</span>
          </div>
          <button
            onClick={() => setSpeechError(null)}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Live Transcript Preview when Mic is active */}
      {isListening && (
        <div className="mx-4 mb-2 p-3 bg-amber-50 dark:bg-stone-800 border border-amber-300 dark:border-amber-700 rounded-2xl shadow-sm animate-fade-in">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                {isTamil ? 'தமிழ் பேச்சு கேட்கிறது... (நிறுத்த மைக்கை அழுத்தவும்)' : 'Listening in English... (tap mic to stop, or edit text below)'}
              </span>
            </div>
            <button
              onClick={() => speechControllerRef.current?.stop()}
              className="text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 font-medium"
            >
              {isTamil ? 'நிறுத்து' : 'Stop'}
            </button>
          </div>
          <p className="text-xs font-journal italic text-stone-700 dark:text-stone-300 leading-relaxed">
            "{liveTranscript || (isTamil ? 'உங்கள் குரலுக்காக காத்திருக்கிறது...' : 'Listening for your voice...')}"
          </p>
        </div>
      )}

      {/* Bottom Input Bar */}
      <div className="p-3 bg-journal-50/95 dark:bg-stone-900/95 border-t border-journal-200 dark:border-stone-800 mb-16">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(isListening || liveTranscript ? 'voice' : 'typed');
          }}
          className="flex items-end gap-2"
        >
          {/* Mic Button */}
          <button
            type="button"
            onClick={handleToggleMic}
            aria-label={isListening ? 'Stop recording voice' : 'Start voice input'}
            title={isTamil ? 'தமிழில் பேச அழுத்தவும்' : 'Speak to Dear Day'}
            className={`p-3 rounded-2xl transition-all flex items-center justify-center flex-shrink-0 ${
              isListening
                ? 'bg-red-500 text-white animate-pulse-mic'
                : 'bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-journal-100 dark:hover:bg-stone-700'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input Area */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage('typed');
                }
              }}
              placeholder={
                isListening
                  ? isTamil ? 'பேசுங்கள்...' : 'Speaking...'
                  : isTamil
                  ? 'தமிழில் பேசலாம் அல்லது தட்டச்சு செய்யலாம்...'
                  : 'Type or speak about your day...'
              }
              className="w-full px-4 py-3 bg-white dark:bg-stone-800 border border-journal-200 dark:border-stone-700 rounded-2xl text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm resize-none max-h-32 transition-all"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!inputText.trim() && !liveTranscript.trim()) || isAiThinking}
            aria-label="Send message"
            className="p-3 bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white rounded-2xl shadow-sm transition-all flex items-center justify-center flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
