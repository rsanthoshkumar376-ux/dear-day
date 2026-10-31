import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  VolumeX,
  Check,
  RotateCcw,
  BookOpen,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Save,
  Smile,
  ChevronDown,
  Trash2,
  PhoneCall,
  Edit3,
  MessageCircle,
  Play,
  Heart,
  Bot,
} from 'lucide-react';
import type { DiaryEntry, MessageItem, UserSettings } from '../types';
import {
  checkSpeechRecognitionSupport,
  SpeechInputController,
  speakAiText,
  stopSpeaking,
  isTamilText,
  FEMALE_VOICE_PRESETS,
  previewVoiceSample,
  type FemaleVoicePreset,
} from '../services/speechService';
import {
  formatAndPolishDiaryText,
  getNextAiQuestion,
  generateDiaryEntry,
} from '../services/aiService';
import {
  checkCrisis,
  getInitialGreeting,
  CRISIS_HELP_RESPONSE_EN,
  CRISIS_HELP_RESPONSE_TA,
} from '../services/demoAi';
import {
  correctAndFormatSentence,
  mergeCorrectedSentenceIntoDiary,
} from '../services/sentenceCorrectionService';

interface VoiceDiaryWriterProps {
  userSettings: UserSettings;
  todayDate: string;
  todayEntry?: DiaryEntry;
  onSaveEntry: (entry: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onNavigateToDiary: () => void;
  onUpdateLanguage?: (lang: 'en' | 'ta') => void;
  onUpdateVoicePersona?: (voiceId: string) => void;
}

const COMMON_MOODS_EN = [
  { mood: 'Grateful', emoji: '✨' },
  { mood: 'Peaceful', emoji: '🌿' },
  { mood: 'Accomplished', emoji: '🌟' },
  { mood: 'Tired', emoji: '☕' },
  { mood: 'Overwhelmed', emoji: '🌧️' },
  { mood: 'Hopeful', emoji: '🌅' },
  { mood: 'Content', emoji: '😌' },
  { mood: 'Reflective', emoji: '🌱' },
];

const COMMON_MOODS_TA = [
  { mood: 'நன்றியுணர்வு', emoji: '🙏' },
  { mood: 'மகிழ்ச்சி', emoji: '✨' },
  { mood: 'அமைதி', emoji: '🌿' },
  { mood: 'களைப்பு', emoji: '☕' },
  { mood: 'சவாலானது', emoji: '🌧️' },
  { mood: 'நம்பிக்கை', emoji: '🌅' },
  { mood: 'மனநிறைவு', emoji: '😌' },
  { mood: 'வெற்றி', emoji: '🌟' },
];

export const VoiceDiaryWriter: React.FC<VoiceDiaryWriterProps> = ({
  userSettings,
  todayDate,
  todayEntry,
  onSaveEntry,
  onNavigateToDiary,
  onUpdateLanguage,
  onUpdateVoicePersona,
}) => {
  const [currentLang, setCurrentLang] = useState<'en' | 'ta'>(userSettings.language || 'en');
  const isTamil = currentLang === 'ta';

  // Mode: Direct Write Diary vs Interactive Talk with AI
  const [activeMode, setActiveMode] = useState<'write' | 'talk'>('write');

  // Female Voice Selection
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(
    userSettings.voicePersona || (isTamil ? 'ananya' : 'maya')
  );
  const [showVoiceDropdown, setShowVoiceDropdown] = useState(false);

  // Diary Fields in the middle
  const [title, setTitle] = useState(todayEntry?.title || '');
  const [mood, setMood] = useState(todayEntry?.mood || (isTamil ? 'அமைதி' : 'Peaceful'));
  const [moodEmoji, setMoodEmoji] = useState(todayEntry?.moodEmoji || '🌿');
  const [highlights, setHighlights] = useState<string[]>(
    todayEntry?.highlights || ['', '', '']
  );
  const [diaryText, setDiaryText] = useState(todayEntry?.text || '');
  const [rawBackupText, setRawBackupText] = useState<string | null>(null);

  // Voice & UI state
  const [isListening, setIsListening] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [showMoodDropdown, setShowMoodDropdown] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [crisisAlert, setCrisisAlert] = useState<string | null>(null);

  // Interactive Talk Conversation State
  const [talkMessages, setTalkMessages] = useState<MessageItem[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const speechControllerRef = useRef<SpeechInputController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const talkEndRef = useRef<HTMLDivElement>(null);

  const activeMoods = isTamil ? COMMON_MOODS_TA : COMMON_MOODS_EN;
  const filteredVoicePresets = FEMALE_VOICE_PRESETS.filter(
    (p) => p.lang === currentLang || p.lang === (isTamil ? 'ta' : 'en')
  );
  const currentVoicePreset =
    FEMALE_VOICE_PRESETS.find((p) => p.id === selectedVoiceId) ||
    FEMALE_VOICE_PRESETS.find((p) => p.lang === (isTamil ? 'ta' : 'en')) ||
    FEMALE_VOICE_PRESETS[0];

  // Sync with userSettings language
  useEffect(() => {
    if (userSettings.language && userSettings.language !== currentLang) {
      setCurrentLang(userSettings.language);
      speechControllerRef.current?.setLanguage(userSettings.language);
      setSelectedVoiceId(userSettings.language === 'ta' ? 'ananya' : 'maya');
    }
  }, [userSettings.language]);

  // Sync userSettings voicePersona
  useEffect(() => {
    if (userSettings.voicePersona && userSettings.voicePersona !== selectedVoiceId) {
      setSelectedVoiceId(userSettings.voicePersona);
    }
  }, [userSettings.voicePersona]);

  // If todayEntry updates from parent
  useEffect(() => {
    if (todayEntry) {
      setTitle(todayEntry.title);
      setMood(todayEntry.mood);
      setMoodEmoji(todayEntry.moodEmoji);
      setHighlights(todayEntry.highlights.length >= 3 ? todayEntry.highlights : [...todayEntry.highlights, '', ''].slice(0, 3));
      setDiaryText(todayEntry.text);
    }
  }, [todayEntry]);

  // Initialize SpeechInputController
  useEffect(() => {
    const support = checkSpeechRecognitionSupport();
    if (support.isSupported) {
      speechControllerRef.current = new SpeechInputController(
        (interimText, isFinal, finalChunk) => {
          if (isFinal && finalChunk) {
            // Apply immediate smart sentence correction
            const corrected = correctAndFormatSentence(finalChunk, currentLang);

            if (activeMode === 'write') {
              if (corrected) {
                setDiaryText((prev) => mergeCorrectedSentenceIntoDiary(prev, corrected));
              }
            } else if (activeMode === 'talk') {
              // In Talk mode, user spoken reply is sent to AI companion
              if (corrected) {
                handleUserSpokenTalk(corrected);
              }
            }
            setInterimSpeech('');

            // Check for crisis in spoken words
            if (checkCrisis(finalChunk)) {
              setCrisisAlert(isTamil ? CRISIS_HELP_RESPONSE_TA : CRISIS_HELP_RESPONSE_EN);
            }
          } else {
            setInterimSpeech(interimText);
          }
        },
        (errorMsg) => {
          setSpeechError(errorMsg);
          setIsListening(false);
        },
        (listening) => {
          setIsListening(listening);
          if (!listening) {
            setInterimSpeech('');
          }
        },
        currentLang
      );
    }

    return () => {
      speechControllerRef.current?.stop();
      stopSpeaking();
    };
  }, [currentLang, isTamil, activeMode, talkMessages]);

  // Handle Initial Greeting when entering Talk Mode
  useEffect(() => {
    if (activeMode === 'talk' && talkMessages.length === 0) {
      const initialQuestion = getInitialGreeting(userSettings.name, currentLang);
      const greetingMsg: MessageItem = {
        date: todayDate,
        role: 'ai',
        content: initialQuestion,
        inputMode: 'typed',
        timestamp: Date.now(),
      };
      setTalkMessages([greetingMsg]);

      // Speak aloud in selected female voice!
      speakAiText(initialQuestion, currentLang, selectedVoiceId);
    }
  }, [activeMode, talkMessages.length, userSettings.name, currentLang, selectedVoiceId, todayDate]);

  // Scroll to bottom of talk conversation
  useEffect(() => {
    if (activeMode === 'talk') {
      talkEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [talkMessages, isAiThinking, interimSpeech, activeMode]);

  // Handle User Spoken input in Talk Mode
  const handleUserSpokenTalk = async (userText: string) => {
    if (!userText.trim()) return;

    const userMsg: MessageItem = {
      date: todayDate,
      role: 'user',
      content: userText,
      inputMode: 'voice',
      timestamp: Date.now(),
    };

    const updated = [...talkMessages, userMsg];
    setTalkMessages(updated);
    setIsAiThinking(true);

    try {
      const response = await getNextAiQuestion(userSettings.name, updated, currentLang);
      const aiMsg: MessageItem = {
        date: todayDate,
        role: 'ai',
        content: response.reply,
        inputMode: 'typed',
        timestamp: Date.now(),
      };

      setTalkMessages((prev) => [...prev, aiMsg]);

      // Talk aloud in chosen female voice
      if (!response.isCrisis) {
        speakAiText(response.reply, currentLang, selectedVoiceId);
      }
    } catch (err) {
      console.warn('Talk AI reply error:', err);
    } finally {
      setIsAiThinking(false);
    }
  };

  // Convert Talk Conversation to Diary Entry
  const handleConvertTalkToDiary = async () => {
    if (talkMessages.filter((m) => m.role === 'user').length === 0) {
      setSpeechError(
        isTamil
          ? 'நாட்குறிப்பாக மாற்ற முதலில் உங்கள் நாளைப் பற்றி சற்று பேசுங்கள்.'
          : 'Please speak a little about your day first before creating the diary entry.'
      );
      return;
    }

    setIsPolishing(true);
    try {
      const generated = await generateDiaryEntry(
        userSettings.name,
        talkMessages,
        todayDate,
        currentLang
      );

      setTitle(generated.title);
      setMood(generated.mood);
      setMoodEmoji(generated.moodEmoji);
      setHighlights(
        generated.highlights.length >= 3
          ? generated.highlights.slice(0, 3)
          : [...generated.highlights, '', ''].slice(0, 3)
      );
      setDiaryText(generated.text);

      // Switch to write mode to view and save!
      setActiveMode('write');
      setSaveSuccessMsg(
        isTamil
          ? 'உங்கள் உரையாடலில் இருந்து நாட்குறிப்பு உருவாக்கப்பட்டது! சரிபார்த்து சேமிக்கவும்.'
          : 'Diary entry crafted from your voice talk! Review and tap Save.'
      );
    } catch (err) {
      console.warn('Failed to convert talk to diary:', err);
    } finally {
      setIsPolishing(false);
    }
  };

  // Select Voice Persona
  const handleSelectVoicePersona = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    setShowVoiceDropdown(false);
    if (onUpdateVoicePersona) {
      onUpdateVoicePersona(voiceId);
    }
    // Play quick voice preview sample so user hears the selected female voice
    previewVoiceSample(voiceId, currentLang);
  };

  // Language switch
  const handleChangeLanguage = (lang: 'en' | 'ta') => {
    setCurrentLang(lang);
    speechControllerRef.current?.setLanguage(lang);
    const newDefaultVoice = lang === 'ta' ? 'ananya' : 'maya';
    setSelectedVoiceId(newDefaultVoice);
    if (onUpdateLanguage) {
      onUpdateLanguage(lang);
    }
    if (onUpdateVoicePersona) {
      onUpdateVoicePersona(newDefaultVoice);
    }
  };

  // Toggle Mic
  const handleToggleMic = () => {
    setSpeechError(null);
    const support = checkSpeechRecognitionSupport();
    if (!support.isSupported) {
      setSpeechError(
        isTamil
          ? 'இந்த உலாவியில் பேச்சு அறிதல் (Speech Recognition) ஆதரிக்கப்படவில்லை. நீங்கள் தட்டச்சு செய்யலாம்.'
          : support.message || 'Voice input is not supported in this browser. You can type directly.'
      );
      return;
    }

    if (isListening) {
      speechControllerRef.current?.stop();
      setIsListening(false);
      // Auto-correct and commit any remaining unfinalized spoken words
      if (interimSpeech.trim()) {
        const leftoverCorrected = correctAndFormatSentence(interimSpeech, currentLang);
        if (leftoverCorrected) {
          if (activeMode === 'write') {
            setDiaryText((prev) => mergeCorrectedSentenceIntoDiary(prev, leftoverCorrected));
          } else {
            handleUserSpokenTalk(leftoverCorrected);
          }
        }
      }
      setInterimSpeech('');
    } else {
      speechControllerRef.current?.setLanguage(currentLang);
      const started = speechControllerRef.current?.start();
      if (!started) {
        setSpeechError(
          isTamil
            ? 'மைக்ரோஃபோன் அணுகலை தொடங்க முடியவில்லை. பிரவுசர் அமைப்பில் மைக்கை அனுமதிக்கவும்.'
            : 'Could not access microphone. Please check browser permissions.'
        );
      }
    }
  };

  // Format and Polish Diary with AI in Write Mode
  const handlePolishDiary = async () => {
    const textToPolish = (diaryText + (interimSpeech ? ' ' + interimSpeech : '')).trim();
    if (!textToPolish) return;

    if (isListening) {
      speechControllerRef.current?.stop();
      setIsListening(false);
      setInterimSpeech('');
    }

    setIsPolishing(true);
    setRawBackupText(textToPolish);
    setSpeechError(null);

    try {
      const polished = await formatAndPolishDiaryText(
        userSettings.name,
        textToPolish,
        todayDate,
        currentLang
      );

      setTitle(polished.title);
      setMood(polished.mood);
      setMoodEmoji(polished.moodEmoji);
      setHighlights(
        polished.highlights.length >= 3
          ? polished.highlights.slice(0, 3)
          : [...polished.highlights, '', ''].slice(0, 3)
      );
      setDiaryText(polished.text);

      if (checkCrisis(textToPolish)) {
        setCrisisAlert(isTamil ? CRISIS_HELP_RESPONSE_TA : CRISIS_HELP_RESPONSE_EN);
      }
    } catch (err) {
      console.warn('Polish failed:', err);
      setSpeechError(
        isTamil
          ? 'எழுத்தைச் சீரமைப்பதில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.'
          : 'Unable to polish text right now. You can edit directly.'
      );
    } finally {
      setIsPolishing(false);
    }
  };

  // Undo AI polish
  const handleUndoPolish = () => {
    if (rawBackupText !== null) {
      setDiaryText(rawBackupText);
      setRawBackupText(null);
    }
  };

  // Read Aloud using selected female voice
  const handleToggleReadAloud = () => {
    if (isSpeakingAudio) {
      stopSpeaking();
      setIsSpeakingAudio(false);
    } else {
      const textToRead = (title ? title + '. ' : '') + diaryText;
      if (!textToRead.trim()) return;

      setIsSpeakingAudio(true);
      speakAiText(textToRead, currentLang, selectedVoiceId);

      const wordCount = textToRead.split(/\s+/).length;
      const estimatedMs = Math.max(3000, (wordCount / 2.2) * 1000);
      setTimeout(() => {
        setIsSpeakingAudio(false);
      }, estimatedMs);
    }
  };

  // Save to Diary
  const handleSave = async () => {
    const fullText = (diaryText + (interimSpeech ? ' ' + interimSpeech : '')).trim();
    if (!fullText) {
      setSpeechError(
        isTamil
          ? 'நாட்குறிப்பில் எழுத ஏதாவது பேசுங்கள் அல்லது தட்டச்சு செய்யுங்கள்.'
          : 'Please speak or write something in your diary before saving.'
      );
      return;
    }

    if (isListening) {
      speechControllerRef.current?.stop();
      setIsListening(false);
      setInterimSpeech('');
    }

    const finalTitle = title.trim() || (isTamil ? 'இன்றைய நாட்குறிப்பு' : 'Notes on Today');
    const cleanHighlights = highlights.map((h) => h.trim()).filter(Boolean);

    await onSaveEntry({
      date: todayDate,
      title: finalTitle,
      mood,
      moodEmoji,
      highlights: cleanHighlights.length > 0 ? cleanHighlights : [finalTitle],
      text: fullText,
      rawConversation: talkMessages.length > 0 ? talkMessages : undefined,
    });

    setSaveSuccessMsg(
      isTamil
        ? 'இன்றைய நாட்குறிப்பு வெற்றிகரமாக சேமிக்கப்பட்டது! உங்கள் தொடர் நாள் நீட்டிக்கப்பட்டது.'
        : 'Today\'s diary saved successfully! Your streak has been extended.'
    );

    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 4500);
  };

  const formattedDisplayDate = new Intl.DateTimeFormat(
    isTamil ? 'ta-IN' : 'en-US',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }
  ).format(new Date());

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-28 space-y-4 animate-fade-in">
      {/* Top Banner: Date, Language, and Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-journal-200/80 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs sm:text-sm font-semibold text-stone-700 dark:text-stone-300">
            {formattedDisplayDate}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Language Switcher */}
          <div className="flex items-center bg-journal-100 dark:bg-stone-800 rounded-full p-0.5 border border-journal-200 dark:border-stone-700">
            <button
              onClick={() => handleChangeLanguage('en')}
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full transition-all ${
                currentLang === 'en'
                  ? 'bg-white dark:bg-stone-700 text-amber-700 dark:text-amber-300 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => handleChangeLanguage('ta')}
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full transition-all ${
                currentLang === 'ta'
                  ? 'bg-white dark:bg-stone-700 text-amber-700 dark:text-amber-300 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              தமிழ்
            </button>
          </div>

          {/* Privacy Pill */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isTamil ? 'உள்ளூர் சேமிப்பு' : 'On-Device'}</span>
          </div>
        </div>
      </div>

      {/* MODE SWITCHER: Write Diary vs Talk with AI */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-journal-100 dark:bg-stone-800/80 rounded-2xl border border-journal-200/80 dark:border-stone-700">
        <button
          type="button"
          onClick={() => {
            setActiveMode('write');
            stopSpeaking();
          }}
          className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeMode === 'write'
              ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>{isTamil ? 'நாட்குறிப்பு எழுத' : 'Write Diary'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMode('talk');
            stopSpeaking();
          }}
          className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeMode === 'talk'
              ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
              : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
          }`}
        >
          <MessageCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>{isTamil ? 'AI யுடன் பேச (பெண் குரல்)' : 'Talk with AI (Female Voice)'}</span>
        </button>
      </div>

      {/* FEMALE VOICE SELECTOR BAR */}
      <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>{isTamil ? 'AI பெண் குரல்:' : 'AI Female Voice:'}</span>
          </span>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowVoiceDropdown(!showVoiceDropdown)}
              className="px-2.5 py-1 bg-white dark:bg-stone-800 hover:bg-journal-50 dark:hover:bg-stone-700 border border-amber-300 dark:border-amber-700/60 rounded-xl text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <span>{currentVoicePreset.badge}</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {showVoiceDropdown && (
              <div className="absolute left-0 top-full mt-1.5 w-60 bg-white dark:bg-stone-900 border border-journal-200 dark:border-stone-700 rounded-2xl p-1.5 shadow-lg z-30 animate-fade-in space-y-1">
                {filteredVoicePresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectVoicePersona(preset.id)}
                    className={`w-full text-left p-2 rounded-xl text-xs transition-colors flex items-center justify-between ${
                      selectedVoiceId === preset.id
                        ? 'bg-amber-100/70 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 font-semibold'
                        : 'text-stone-700 dark:text-stone-300 hover:bg-journal-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{preset.badge}</p>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">{preset.description}</p>
                    </div>
                    {selectedVoiceId === preset.id && <Check className="w-3.5 h-3.5 text-amber-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Listen sample audio button */}
        <button
          type="button"
          onClick={() => previewVoiceSample(selectedVoiceId, currentLang)}
          className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-stone-800 hover:bg-journal-100 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-medium text-amber-800 dark:text-amber-300 transition-all active:scale-95 shadow-2xs"
          title="Play voice preview sample"
        >
          <Play className="w-3 h-3 fill-amber-600 text-amber-600" />
          <span>{isTamil ? 'குரலைக் கேட்க' : 'Listen Sample'}</span>
        </button>
      </div>

      {/* Crisis / Support Banner */}
      {crisisAlert && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-2xl flex items-start gap-3 animate-fade-in shadow-xs">
          <PhoneCall className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-rose-900 dark:text-rose-200 leading-relaxed whitespace-pre-line">
            {crisisAlert}
          </div>
        </div>
      )}

      {/* Save Success Toast */}
      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200 text-xs animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="font-medium">{saveSuccessMsg}</span>
          </div>
          <button
            onClick={onNavigateToDiary}
            className="font-semibold underline underline-offset-2 hover:text-emerald-700 flex-shrink-0"
          >
            {isTamil ? 'நாட்குறிப்பைக் காண்க' : 'View Diary'}
          </button>
        </div>
      )}

      {/* Speech / Permission Error */}
      {speechError && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span>{speechError}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 1: WRITE DIARY (Direct Diary In The Middle) */}
      {/* ============================================================== */}
      {activeMode === 'write' && (
        <>
          <div className="bg-white dark:bg-stone-900 border border-journal-200/90 dark:border-stone-800 rounded-3xl p-5 sm:p-7 shadow-soft transition-all relative overflow-hidden">
            {/* Corner paper fold */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-100/60 dark:from-stone-800/60 to-transparent pointer-events-none rounded-bl-3xl" />

            {/* Diary Title & Mood Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-journal-100 dark:border-stone-800/80">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isTamil ? 'இன்றைய தலைப்பு (எ.கா: அமைதியான மாலை)...' : 'Title for today (e.g., A Peaceful Saturday)...'}
                className="flex-1 bg-transparent font-journal font-bold text-xl sm:text-2xl text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none"
              />

              {/* Interactive Mood Selector Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMoodDropdown(!showMoodDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-journal-100 dark:bg-stone-800 hover:bg-journal-200/80 dark:hover:bg-stone-700/80 border border-journal-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-200 transition-all active:scale-95"
                >
                  <span className="text-base leading-none">{moodEmoji}</span>
                  <span>{mood}</span>
                  <ChevronDown className="w-3 h-3 text-stone-400 ml-0.5" />
                </button>

                {showMoodDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-stone-900 border border-journal-200 dark:border-stone-700 rounded-2xl p-1.5 shadow-lg z-20 animate-fade-in grid grid-cols-1 gap-1">
                    {activeMoods.map((m) => (
                      <button
                        key={m.mood}
                        type="button"
                        onClick={() => {
                          setMood(m.mood);
                          setMoodEmoji(m.emoji);
                          setShowMoodDropdown(false);
                        }}
                        className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-xl text-xs text-left transition-colors ${
                          mood === m.mood
                            ? 'bg-amber-50 dark:bg-amber-950/60 font-semibold text-amber-700 dark:text-amber-300'
                            : 'text-stone-700 dark:text-stone-300 hover:bg-journal-100 dark:hover:bg-stone-800'
                        }`}
                      >
                        <span>{m.emoji}</span>
                        <span>{m.mood}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* DIARY BODY WRITING AREA (IN THE MIDDLE) */}
            <div className="relative min-h-[220px] sm:min-h-[280px] flex flex-col">
              <textarea
                ref={textareaRef}
                value={diaryText}
                onChange={(e) => setDiaryText(e.target.value)}
                placeholder={
                  isTamil
                    ? 'உங்கள் குரலால் பேசுங்கள் அல்லது இங்கே தட்டச்சு செய்யுங்கள்...\n\nநீங்கள் சொல்வதைக் கேட்டு, சொற்களை தானாக சீரமைத்து நாட்குறிப்பில் நடுவே எழுதும்.'
                    : 'Speak freely or type your thoughts here...\n\nDear Day hears your voice, auto-corrects sentences, and writes them cleanly into your diary.'
                }
                className="w-full flex-1 bg-transparent font-serif text-stone-800 dark:text-stone-200 text-base sm:text-lg leading-relaxed placeholder:text-stone-400/80 dark:placeholder:text-stone-500 focus:outline-none resize-none min-h-[180px] sm:min-h-[240px]"
              />

              {/* Live Spoken Words Indicator */}
              {interimSpeech && (
                <div className="mt-2 p-2.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/50 rounded-xl text-stone-700 dark:text-stone-300 text-sm italic font-serif flex items-center gap-2 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0 animate-ping" />
                  <span>{interimSpeech}</span>
                </div>
              )}

              {/* Polishing Spinner */}
              {isPolishing && (
                <div className="absolute inset-0 bg-white/80 dark:bg-stone-900/80 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center gap-2 z-10 animate-fade-in">
                  <Sparkles className="w-8 h-8 text-amber-600 animate-spin" />
                  <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    {isTamil ? 'நாட்குறிப்பைச் சீரமைக்கிறது...' : 'Formatting & polishing your diary...'}
                  </p>
                </div>
              )}
            </div>

            {/* 3 Highlights Section */}
            <div className="mt-4 pt-4 border-t border-journal-100 dark:border-stone-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider uppercase text-stone-400 dark:text-stone-500">
                  {isTamil ? 'முக்கிய நிகழ்வுகள் (3 Highlights)' : 'Highlights of the Day'}
                </span>
              </div>

              <div className="space-y-1.5">
                {highlights.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    <input
                      type="text"
                      value={h}
                      onChange={(e) => {
                        const updated = [...highlights];
                        updated[idx] = e.target.value;
                        setHighlights(updated);
                      }}
                      placeholder={
                        isTamil
                          ? `${idx + 1}-வது முக்கிய விஷயம்...`
                          : `Highlight ${idx + 1}...`
                      }
                      className="flex-1 bg-transparent text-xs sm:text-sm text-stone-700 dark:text-stone-300 placeholder:text-stone-400 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Undo AI Polish Bar */}
          {rawBackupText !== null && (
            <div className="flex items-center justify-between px-3 py-2 bg-journal-100 dark:bg-stone-800/70 rounded-2xl text-xs text-stone-600 dark:text-stone-400 animate-fade-in">
              <span>{isTamil ? 'எழுத்து AI மூலம் சீரமைக்கப்பட்டது.' : 'Diary polished by AI.'}</span>
              <button
                onClick={handleUndoPolish}
                className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400 hover:underline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isTamil ? 'முந்தையதை மீட்டெடு' : 'Revert to raw words'}</span>
              </button>
            </div>
          )}

          {/* WRITE CONTROLS: Voice Mic Button | Polish | Read Aloud | Save */}
          <div className="bg-white dark:bg-stone-900 border border-journal-200/90 dark:border-stone-800 rounded-3xl p-4 sm:p-5 shadow-soft space-y-4">
            <div className="flex flex-col items-center justify-center text-center gap-2.5">
              <button
                type="button"
                onClick={handleToggleMic}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${
                  isListening
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30 ring-4 ring-rose-200 dark:ring-rose-950 animate-pulse'
                    : 'bg-gradient-to-tr from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-amber-500/20 hover:scale-105'
                }`}
                title={isListening ? 'Stop listening' : 'Start speaking'}
              >
                {isListening ? (
                  <MicOff className="w-8 h-8" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>

              <div>
                <p className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-100">
                  {isListening
                    ? isTamil
                      ? '🔴 குரலைக் கேட்கிறது... (நிறுத்த தட்டவும்)'
                      : '🔴 Listening... (Tap to stop)'
                    : isTamil
                    ? '🎙️ பேசத் தட்டவும் (நேரடி நாட்குறிப்பு)'
                    : '🎙️ Tap to Speak (Direct to Diary)'}
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  {isListening
                    ? isTamil
                      ? 'தவறுகள் இருந்தாலும் சரியான வாக்கியமாக நாட்குறிப்பில் நடுவே சேரும்'
                      : 'Speaks directly into the diary with smart grammar correction'
                    : isTamil
                    ? 'கேள்விகள் இன்றி உங்கள் எண்ணங்களை நேரடியாக நாட்குறிப்பில் எழுதுங்கள்'
                    : 'Speak freely — small mistakes are automatically corrected'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-journal-100 dark:border-stone-800/80">
              <button
                type="button"
                onClick={handlePolishDiary}
                disabled={isPolishing || (!diaryText.trim() && !interimSpeech.trim())}
                className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300/50 dark:border-amber-800/50 text-amber-800 dark:text-amber-200 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-98"
                title="Format spoken words into elegant diary sentences"
              >
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{isTamil ? '✨ எழுத்தைச் சீரமைக்க' : '✨ Polish with AI'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleReadAloud}
                disabled={!diaryText.trim()}
                className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-journal-100 dark:bg-stone-800 hover:bg-journal-200/80 dark:hover:bg-stone-700/80 border border-journal-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-98"
                title="Listen to your diary in selected female voice"
              >
                {isSpeakingAudio ? (
                  <>
                    <VolumeX className="w-4 h-4 text-rose-500" />
                    <span>{isTamil ? 'நிறுத்து' : 'Stop Audio'}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-stone-500" />
                    <span>{isTamil ? '🔊 வாசிக்க (பெண் குரல்)' : `🔊 Read (${currentVoicePreset.name})`}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!diaryText.trim() && !interimSpeech.trim()}
                className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-98"
                title="Save entry and update streak"
              >
                <Save className="w-4 h-4" />
                <span>{isTamil ? '💾 நாட்குறிப்பில் சேமி' : '💾 Save to Diary'}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* MODE 2: TALK WITH AI (Interactive Female Voice Companion) */}
      {/* ============================================================== */}
      {activeMode === 'talk' && (
        <div className="bg-white dark:bg-stone-900 border border-journal-200/90 dark:border-stone-800 rounded-3xl p-5 sm:p-6 shadow-soft space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-journal-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {isTamil ? `உரையாடல் துணை (${currentVoicePreset.name})` : `Talking with ${currentVoicePreset.name}`}
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  {isTamil ? 'உங்கள் நாளைப் பற்றி பேசி உரையாடுங்கள்' : 'Talk about what happened and what you are doing'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => previewVoiceSample(selectedVoiceId, currentLang)}
              className="p-1.5 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-stone-800 rounded-xl"
              title="Test voice sample"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {/* Conversation Stream */}
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {talkMessages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                {msg.role === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0 text-xs mt-1">
                    🌸
                  </div>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-amber-600 text-white rounded-br-xs shadow-xs font-sans'
                      : 'bg-journal-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-bl-xs font-serif'
                  }`}
                >
                  <p>{msg.content}</p>
                </div>
              </div>
            ))}

            {/* Interim user speech live in chat */}
            {interimSpeech && (
              <div className="flex justify-end animate-pulse">
                <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-amber-600/70 text-white text-xs italic">
                  <span>{interimSpeech}...</span>
                </div>
              </div>
            )}

            {/* AI Thinking typing bubble */}
            {isAiThinking && (
              <div className="flex gap-2 items-center text-xs text-stone-400">
                <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0 text-xs">
                  🌸
                </div>
                <div className="px-3 py-2 bg-journal-100 dark:bg-stone-800 rounded-2xl flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={talkEndRef} />
          </div>

          {/* Talk Mode Mic & Actions */}
          <div className="pt-3 border-t border-journal-100 dark:border-stone-800 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleToggleMic}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 ${
                isListening
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30 ring-4 ring-rose-200 dark:ring-rose-950 animate-pulse'
                  : 'bg-gradient-to-tr from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white shadow-amber-500/20 hover:scale-105'
              }`}
            >
              {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>

            <div className="text-center">
              <p className="text-xs font-semibold text-stone-800 dark:text-stone-100">
                {isListening
                  ? isTamil
                    ? '🔴 பேசவும்... (நிறுத்த தட்டவும்)'
                    : '🔴 Listening... (Tap to pause)'
                  : isTamil
                  ? `🎙️ ${currentVoicePreset.name} யிடம் பேச தட்டவும்`
                  : `🎙️ Tap to talk with ${currentVoicePreset.name}`}
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                {isTamil
                  ? 'இன்று என்ன நடந்தது, என்ன செய்கிறீர்கள் என்பதை சொல்லுங்கள்'
                  : 'Tell what happened today and what you are doing'}
              </p>
            </div>

            {/* Convert to Diary Button */}
            <button
              type="button"
              onClick={handleConvertTalkToDiary}
              disabled={talkMessages.filter((m) => m.role === 'user').length === 0}
              className="w-full mt-2 py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-soft transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isTamil
                  ? '✨ உரையாடலை நாட்குறிப்பாக மாற்றிச் சேமிக்க'
                  : '✨ Create Diary Entry from our Talk'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
