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
} from 'lucide-react';
import type { MessageItem, UserSettings } from '../types';
import { getNextAiQuestion } from '../services/aiService';
import { getInitialGreeting } from '../services/demoAi';
import {
  checkSpeechRecognitionSupport,
  SpeechInputController,
  speakAiText,
  stopSpeaking,
} from '../services/speechService';

interface ChatScreenProps {
  userSettings: UserSettings;
  todayDate: string;
  messages: MessageItem[];
  onSaveMessage: (message: Omit<MessageItem, 'id'>) => Promise<void>;
  onFinishDay: () => void;
  onNavigateToDiary: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  userSettings,
  todayDate,
  messages,
  onSaveMessage,
  onFinishDay,
  onNavigateToDiary,
}) => {
  const [inputText, setInputText] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechControllerRef = useRef<SpeechInputController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiThinking, liveTranscript]);

  // If no messages exist yet for today, send initial AI greeting
  useEffect(() => {
    if (messages.length === 0) {
      const greetingText = getInitialGreeting(userSettings.name);
      onSaveMessage({
        date: todayDate,
        role: 'ai',
        content: greetingText,
        inputMode: 'typed',
        timestamp: Date.now(),
      });

      if (userSettings.voiceReplies) {
        speakAiText(greetingText);
      }
    }
  }, [messages.length, todayDate, userSettings.name, userSettings.voiceReplies, onSaveMessage]);

  // Initialize SpeechRecognition Controller
  useEffect(() => {
    const support = checkSpeechRecognitionSupport();
    if (support.isSupported) {
      speechControllerRef.current = new SpeechInputController(
        (transcript, _isFinal) => {
          setLiveTranscript(transcript);
          // Auto-sync into text box so user can edit right away
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
        }
      );
    }

    return () => {
      speechControllerRef.current?.stop();
      stopSpeaking();
    };
  }, []);

  // Toggle Microphone
  const handleToggleMic = () => {
    setSpeechError(null);
    const support = checkSpeechRecognitionSupport();
    if (!support.isSupported) {
      setSpeechError(support.message || 'Voice input is not supported in this browser.');
      return;
    }

    if (isListening) {
      speechControllerRef.current?.stop();
    } else {
      const started = speechControllerRef.current?.start();
      if (!started) {
        setSpeechError('Could not start speech recognition. Please check microphone permissions.');
      }
    }
  };

  // Send User Message
  const handleSendMessage = async (mode: 'typed' | 'voice' = 'typed') => {
    const textToSend = (inputText || liveTranscript).trim();
    if (!textToSend || isAiThinking) return;

    // Stop microphone if on
    if (isListening) {
      speechControllerRef.current?.stop();
    }

    // Check for shortcut command: "show my diary" / "open my diary" / "view diary"
    const diaryTriggerRegex = /^(show|open|view|read|go to)\s+(my\s+)?(diary|journal)/i;
    if (diaryTriggerRegex.test(textToSend)) {
      onNavigateToDiary();
      return;
    }

    setInputText('');
    setLiveTranscript('');
    setApiError(null);
    setIsAiThinking(true);

    // Save user message to Dexie
    const userMessage: Omit<MessageItem, 'id'> = {
      date: todayDate,
      role: 'user',
      content: textToSend,
      inputMode: mode,
      timestamp: Date.now(),
    };
    await onSaveMessage(userMessage);

    // Get next AI response
    try {
      const conversationHistory = [...messages, userMessage as MessageItem];
      const aiResult = await getNextAiQuestion(userSettings.name, conversationHistory);

      const aiMessage: Omit<MessageItem, 'id'> = {
        date: todayDate,
        role: 'ai',
        content: aiResult.reply,
        inputMode: 'typed',
        timestamp: Date.now(),
      };
      await onSaveMessage(aiMessage);

      // Voice reply if enabled
      if (userSettings.voiceReplies && !aiResult.isCrisis) {
        speakAiText(aiResult.reply);
      }
    } catch (err: any) {
      console.error('Failed to get AI reply:', err);
      setApiError('Unable to get a response right now. Tap retry to try again.');
    } finally {
      setIsAiThinking(false);
    }
  };

  // Handle retry if AI request failed
  const handleRetry = async () => {
    setApiError(null);
    setIsAiThinking(true);
    try {
      const aiResult = await getNextAiQuestion(userSettings.name, messages);
      await onSaveMessage({
        date: todayDate,
        role: 'ai',
        content: aiResult.reply,
        inputMode: 'typed',
        timestamp: Date.now(),
      });
      if (userSettings.voiceReplies) {
        speakAiText(aiResult.reply);
      }
    } catch {
      setApiError('Retry failed. Please check your connection or continue in Demo Mode.');
    } finally {
      setIsAiThinking(false);
    }
  };

  // Speech synthesis toggle on individual messages
  const handleToggleSpeak = (msgIndex: number, text: string) => {
    if (speakingMessageId === msgIndex) {
      stopSpeaking();
      setSpeakingMessageId(null);
    } else {
      stopSpeaking();
      setSpeakingMessageId(msgIndex);
      speakAiText(text);
    }
  };

  const userMessagesCount = messages.filter((m) => m.role === 'user').length;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] max-w-2xl mx-auto pb-safe">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-journal-50/80 dark:bg-stone-900/80 border-b border-journal-200/60 dark:border-stone-800/60 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            Dear Day Companion
          </span>
          <span className="text-[11px] text-stone-400 dark:text-stone-500">
            ({userMessagesCount} shared)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateToDiary}
            title="Jump to Diary"
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-stone-600 dark:text-stone-300 hover:bg-journal-200/60 dark:hover:bg-stone-800 rounded-lg transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden sm:inline">Diary</span>
          </button>

          {/* Always Visible 'Finish my day' button */}
          <button
            onClick={onFinishDay}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Finish my day</span>
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

                  {/* Input mode indicator for user messages */}
                  {!isAi && message.inputMode === 'voice' && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-amber-200/90 font-medium">
                      <Mic className="w-2.5 h-2.5" /> Voice input
                    </span>
                  )}
                </div>

                {/* Speak button for AI messages */}
                {isAi && (
                  <button
                    onClick={() => handleToggleSpeak(index, message.content)}
                    className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-lg hover:bg-journal-200/50 dark:hover:bg-stone-800 transition-colors mb-1"
                    title={speakingMessageId === index ? 'Stop speaking' : 'Read aloud'}
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

        {/* API Error State with Retry Button */}
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

      {/* Speech Error Banner if any */}
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
                Listening... (tap mic to stop, or edit text below)
              </span>
            </div>
            <button
              onClick={() => speechControllerRef.current?.stop()}
              className="text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 font-medium"
            >
              Stop
            </button>
          </div>
          <p className="text-xs font-journal italic text-stone-700 dark:text-stone-300 leading-relaxed">
            "{liveTranscript || 'Listening for your voice...'}"
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
              placeholder={isListening ? 'Speaking...' : 'Type or speak about your day...'}
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
