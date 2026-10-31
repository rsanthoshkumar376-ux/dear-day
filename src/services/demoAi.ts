import type { DiaryEntry, MessageItem } from '../types';
import { isTamilText } from './speechService';

export const CRISIS_KEYWORDS = [
  /suicid/i,
  /kill\s+(my|one)?self/i,
  /want\s+to\s+die/i,
  /end\s+my\s+life/i,
  /hurt\s+myself/i,
  /cutting\s+myself/i,
  /don'?t\s+want\s+to\s+live/i,
  /better\s+off\s+dead/i,
  /harm\s+(other|someone|people)/i,
  /தற்கொலை/i,
  /சாக\s*வேண்டும்/i,
  /சாகணும்/i,
  /உயிரை\s*மாய்க்க/i,
  /வாழ\s*பிடிக்கல/i,
  /வாழ\s*விருப்பமில்லை/i,
];

export function checkCrisis(text: string): boolean {
  return CRISIS_KEYWORDS.some((regex) => regex.test(text));
}

export const CRISIS_HELP_RESPONSE_EN =
  "I hear how much pain you're carrying right now, and I care deeply about your safety. You don't have to carry this alone. Please connect with someone who can support you right now:\n\n" +
  "• If you're in the US or Canada: call or text 988 (Suicide & Crisis Lifeline, 24/7 free & confidential).\n" +
  "• Text HOME to 741741 for the Crisis Text Line.\n" +
  "• In India: call Sneha Helpline at 044-24640050 (24/7) or Vandrevala Foundation at 9999 666 555, or Tele-MANAS at 14416.\n" +
  "• In the UK: call 111 or text SHOUT to 85258.\n" +
  "• In Australia: call 13 11 14 (Lifeline).\n" +
  "• If you are elsewhere or in immediate danger, please reach out to your local emergency services (112 / 911).\n\n" +
  "I am pausing our diary questions today. Please take gentle care of yourself and reach out to one of these resources.";

export const CRISIS_HELP_RESPONSE_TA =
  "நீங்கள் மிகுந்த மனவேதனையில் இருப்பதை நான் உணர்கிறேன். உங்கள் பாதுகாப்பு மிகவும் முக்கியமானது. நீங்கள் தனியாக இல்லை. தயவுசெய்து உடனடி உதவிக்கு இந்த எண்களைத் தொடர்பு கொள்ளுங்கள்:\n\n" +
  "• சினேகா தற்கொலை தடுப்பு உதவி எண் (தமிழ்நாடு): 044-24640050 (24 மணி நேரமும் செயல்படுகிறது)\n• தமிழ்நாடு மனநல உதவி எண் (Tele-MANAS): 14416 / 104\n• வந்தேவாலா அறக்கட்டளை: 9999 666 555\n• தேசிய அவசர உதவி எண்: 112\n\n" +
  "இன்றைய நாட்குறிப்பு கேள்விகளை நான் இத்துடன் நிறுத்துகிறேன். தயவுசெய்து உங்கள் மீது அன்பு செலுத்தி உடனடியாக இந்த உதவியை நாடுங்கள்.";

export function getInitialGreeting(name: string, lang: 'en' | 'ta' = 'en'): string {
  const cleanName = name?.trim() || (lang === 'ta' ? 'நண்பா' : 'friend');
  if (lang === 'ta') {
    return `வணக்கம் ${cleanName}! இன்று என்ன நடந்தது, இப்போது என்ன செய்து கொண்டிருக்கிறீர்கள்?`;
  }
  return `Hey ${cleanName}! What happened today, and what are you doing right now?`;
}

interface DemoReplyResult {
  reply: string;
  isCrisis: boolean;
  shouldFinish: boolean;
}

export function generateDemoReply(
  userName: string,
  messages: MessageItem[],
  preferredLang: 'en' | 'ta' = 'en'
): DemoReplyResult {
  const userMessages = messages.filter((m) => m.role === 'user');

  // Detect if conversation or latest input is in Tamil
  const latestMessage = userMessages[userMessages.length - 1]?.content || '';
  const isTamil = preferredLang === 'ta' || isTamilText(latestMessage) || messages.some((m) => isTamilText(m.content));

  if (userMessages.length === 0) {
    return {
      reply: getInitialGreeting(userName, isTamil ? 'ta' : 'en'),
      isCrisis: false,
      shouldFinish: false,
    };
  }

  // Crisis detection
  if (checkCrisis(latestMessage)) {
    return {
      reply: isTamil ? CRISIS_HELP_RESPONSE_TA : CRISIS_HELP_RESPONSE_EN,
      isCrisis: true,
      shouldFinish: true,
    };
  }

  // Check if user asked to finish
  const finishPhrases = [
    /finish/i,
    /done/i,
    /that'?s all/i,
    /wrap up/i,
    /ready to save/i,
    /முடிந்தது/i,
    /போதும்/i,
    /முடித்து/i,
    /சேமி/i,
  ];
  if (finishPhrases.some((re) => re.test(latestMessage))) {
    const replyText = isTamil
      ? `உங்கள் நாளை என்னோடு பகிர்ந்ததற்கு மிக்க நன்றி, ${userName}. நீங்கள் தயாராக இருக்கும்போது, மேலே உள்ள நாட்குறிப்பு பொத்தானைத் தட்டி உங்கள் பதிவைச் சரிபாருங்கள்.`
      : `Thank you for sharing your day with me, ${userName}. Whenever you're ready, tap "Finish my day" above to review your diary entry.`;

    return {
      reply: replyText,
      isCrisis: false,
      shouldFinish: true,
    };
  }

  const turn = userMessages.length;
  const lower = latestMessage.toLowerCase();

  if (isTamil) {
    let acknowledgment = '';
    if (/கடினம்|சிரமம்|வலி|சோகம்|அழு|களைப்பு|களைப்பாக|அலுப்பு|பய|கோபம்|கவலை/i.test(latestMessage)) {
      acknowledgment = "இன்று உங்களுக்கு சற்று கடினமாக இருந்ததை நான் புரிந்து கொள்கிறேன். உங்கள் உணர்வை என்னோடு பகிர்ந்ததற்கு நன்றி.";
    } else if (/மகிழ்ச்சி|சந்தோஷம்|நன்று|நல்ல|அருமை|வெற்றி|அன்பு|கொண்டாட்டம்|புன்னகை/i.test(latestMessage)) {
      acknowledgment = "அதை கேட்கவே மிகவும் மகிழ்ச்சியாக இருக்கிறது. இத்தகைய தருணங்கள் மனதிற்கு உற்சாகம் அளிக்கின்றன.";
    } else if (/வேலை|ஆபீஸ்|பள்ளி|கல்லூரி|படிப்பு|திட்டம்|டெட்லைன்/i.test(latestMessage)) {
      acknowledgment = "வேலையும் கடமைகளும் மனதை அதிகம் ஆக்கிரமிக்கக்கூடியவை தான்.";
    } else if (/நண்பர்|அம்மா|அப்பா|குடும்பம்|மனைவி|கணவர்|குழந்தை|தம்பி|தங்கை/i.test(latestMessage)) {
      acknowledgment = "நம் அன்பானவர்களுடன் இணைந்திருப்பது நாளுக்கு கூடுதல் அர்த்தம் தருகிறது.";
    } else if (turn === 1) {
      acknowledgment = "இன்றைய உரையாடலைத் தொடங்கியதற்கு நன்றி.";
    } else {
      acknowledgment = "நான் கவனித்துக் கொண்டுதான் இருக்கிறேன்.";
    }

    let nextQuestion = '';
    switch (turn) {
      case 1:
        nextQuestion = "இன்று உங்களை மிகவும் மகிழ்ச்சிப்படுத்திய அல்லது முகத்தில் புன்னகை வரவழைத்த ஒரு தருணம் எது?";
        break;
      case 2:
        nextQuestion = "இன்றைய நாளில் ஏதேனும் சிரமமாகவோ அல்லது உங்கள் பொறுமையை சோதிக்கும்படியோ அமைந்ததா?";
        break;
      case 3:
        nextQuestion = "இன்று நாள் முழுவதும் உங்கள் மனநிலை எப்படி இருந்தது? மனதிற்குள் என்ன ஓடிக்கொண்டிருந்தது?";
        break;
      case 4:
        nextQuestion = "உங்களுக்கு பிடித்தமானவர்களுடன் நேரம் செலவிட்டீர்களா, அல்லது உங்களுக்காக ஒரு அமைதியான தனிமை நேரம் கிடைத்ததா?";
        break;
      case 5:
        nextQuestion = "இன்றைய நாளில் நீங்கள் மனதார நன்றி சொல்ல விரும்பும் ஒரு விஷயம் என்ன?";
        break;
      case 6:
        nextQuestion = "நாளைக்கு நீங்கள் ஆவலுடன் எதிர்பார்த்து காத்திருக்கும் அல்லது செய்ய விரும்பும் ஒரு விஷயம் என்ன?";
        break;
      default:
        return {
          reply: `${acknowledgment} இன்றைய நாளின் முக்கிய விஷயங்களை நாம் அழகாகப் பகிர்ந்துகொண்டோம். உங்கள் நாட்குறிப்பை உருவாக்க நீங்கள் தயாராக இருந்தால், மேலே உள்ள நாட்குறிப்பு பொத்தானைத் தட்டுங்கள்!`,
          isCrisis: false,
          shouldFinish: true,
        };
    }

    return {
      reply: `${acknowledgment} ${nextQuestion}`,
      isCrisis: false,
      shouldFinish: false,
    };
  }

  // English conversation flow
  let acknowledgment = '';
  if (/sad|cry|rough|exhausted|tired|drained|overwhelmed|stressed|hurt|angry|awful|hard/i.test(lower)) {
    acknowledgment = "I'm sorry it felt so heavy today. Thank you for being honest about it with me.";
  } else if (/happy|great|wonderful|love|excited|proud|fun|good|awesome|blessed/i.test(lower)) {
    acknowledgment = "It's so good to hear that. Those moments really lift the whole day.";
  } else if (/work|job|boss|meeting|project|deadline|school|study|exam/i.test(lower)) {
    acknowledgment = "Work and study can take up so much mental space.";
  } else if (/friend|family|mom|dad|sister|brother|partner|husband|wife|date/i.test(lower)) {
    acknowledgment = "Connecting with the people around us brings so much nuance to the day.";
  } else if (turn === 1) {
    acknowledgment = "Thank you for starting our check-in.";
  } else {
    acknowledgment = "I hear you.";
  }

  let nextQuestion = '';
  switch (turn) {
    case 1:
      nextQuestion = "What was the brightest moment or something that made you smile today?";
      break;
    case 2:
      nextQuestion = "Was there anything about today that felt difficult, frustrating, or tested your patience?";
      break;
    case 3:
      nextQuestion = "How were you feeling emotionally through all of that — what was your head space like?";
      break;
    case 4:
      nextQuestion = "Did you get time with anyone who mattered to you, or a quiet moment just for yourself?";
      break;
    case 5:
      nextQuestion = "Looking back, what is one small thing you feel genuinely grateful for today?";
      break;
    case 6:
      nextQuestion = "Is there anything you are hoping for or looking forward to tomorrow?";
      break;
    default:
      return {
        reply: `${acknowledgment} We've touched on the important parts of your day. Are you ready to see today's diary entry? Tap "Finish my day" when you're ready!`,
        isCrisis: false,
        shouldFinish: true,
      };
  }

  return {
    reply: `${acknowledgment} ${nextQuestion}`,
    isCrisis: false,
    shouldFinish: false,
  };
}

/**
 * Demo Mode Diary Summary Generator (Supports English and Tamil)
 */
export function generateDemoSummary(
  userName: string,
  messages: MessageItem[],
  dateStr: string,
  preferredLang: 'en' | 'ta' = 'en'
): Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'> {
  let userTexts = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content.trim())
    .filter(Boolean);

  // If user dictated a single continuous block, break into sentences for natural highlights
  if (userTexts.length === 1) {
    const sentences = userTexts[0]
      .split(/(?<=[.?!;:\n])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);
    if (sentences.length >= 2) {
      userTexts = sentences;
    }
  }

  const combinedUserText = userTexts.join(' ');
  const isTamil = preferredLang === 'ta' || isTamilText(combinedUserText);

  if (isTamil) {
    let mood = 'அமைதி';
    let moodEmoji = '🌿';

    if (/மகிழ்ச்சி|சந்தோஷம்|நன்று|இனிமை|வெற்றி/i.test(combinedUserText)) {
      mood = 'மகிழ்ச்சி';
      moodEmoji = '✨';
    } else if (/நன்றி|அன்பு|பாசம்|ஆசீர்வதிக்கப்பட்ட/i.test(combinedUserText)) {
      mood = 'நன்றியுணர்வு';
      moodEmoji = '🙏';
    } else if (/களைப்பு|அலுப்பு|தூக்கம்|ஓய்வு/i.test(combinedUserText)) {
      mood = 'களைப்பு';
      moodEmoji = '☕';
    } else if (/கவலை|கடினம்|சவால்|பாரம்/i.test(combinedUserText)) {
      mood = 'சவாலானது';
      moodEmoji = '🌧️';
    } else if (/நம்பிக்கை|நாளை|எதிர்பார்ப்பு/i.test(combinedUserText)) {
      mood = 'நம்பிக்கை';
      moodEmoji = '🌅';
    }

    let title = 'இன்றைய நாளின் நினைவுகள்';
    if (mood === 'மகிழ்ச்சி') title = 'இனிய தருணங்களும் மகிழ்வும்';
    else if (mood === 'நன்றியுணர்வு') title = 'நன்றியுணர்வும் மனநிறைவும்';
    else if (mood === 'களைப்பு') title = 'நீண்ட நாளுக்குப் பின் அமைதியான இரவு';
    else if (mood === 'சவாலானது') title = 'சவால்களைக் கடந்த அமைதி';
    else if (mood === 'நம்பிக்கை') title = 'புதிய நம்பிக்கையோடு நாளை';

    const highlights: string[] = [];
    if (userTexts[0]) {
      highlights.push(userTexts[0].length > 70 ? userTexts[0].slice(0, 67) + '...' : userTexts[0]);
    } else {
      highlights.push('இன்றைய நாளை மனநிறைவோடு திரும்பிப் பார்த்தேன்.');
    }

    if (userTexts[1]) {
      highlights.push(userTexts[1].length > 70 ? userTexts[1].slice(0, 67) + '...' : userTexts[1]);
    } else {
      highlights.push('மனதின் உணர்வுகளுக்கு மதிப்பளித்தேன்.');
    }

    if (userTexts[2]) {
      highlights.push(userTexts[2].length > 70 ? userTexts[2].slice(0, 67) + '...' : userTexts[2]);
    } else {
      highlights.push('அமைதியோடு இன்றைய நாளை நிறைவு செய்கிறேன்.');
    }

    const narrative: string[] = [];
    narrative.push(
      `இன்றைய நாள் என் வாழ்க்கையின் மற்றொரு மறக்க முடியாத பக்கமாக அமைந்தது. காலையில் இருந்து என் மனதில் நின்ற விஷயம்: ${
        userTexts[0] || 'என் சொந்த வேகத்தில் அமைதியாக நகர்ந்த தருணங்கள்'
      }. இது நாள் முழுவதும் எனக்குள் ஒரு தாக்கத்தை ஏற்படுத்தியது.`
    );

    if (userTexts[1] || userTexts[2]) {
      narrative.push(
        `நேரம் நகர நகர, பல உணர்வுகளின் சங்கமத்தை உணர்ந்தேன். ${
          userTexts[1] ? `இன்றைய நாளில் என்னை மிகவும் சிந்திக்க வைத்தது: ${userTexts[1]}.` : ''
        } ${
          userTexts[2] ? `இதன் வழியே நான் உணர்ந்தது: ${userTexts[2]}.` : ''
        } ஒவ்வொரு நாளும் புதிய பாடங்களையும், அனுபவங்களையும் கற்றுக்கொடுக்கிறது என்பதை இது நினைவூட்டியது.`
      );
    }

    if (userTexts[3] || userTexts[4] || userTexts[5]) {
      narrative.push(
        `இன்றைய நாளில் இருந்து நான் நெஞ்சார காத்துக்கொள்ள விரும்புவது: ${
          userTexts[3] || userTexts[4] || 'எனக்கான ஒரு அமைதியான நேரத்தை ஒதுக்கியது'
        }. ${
          userTexts[5]
            ? `நாளைக்கான என் எதிர்பார்ப்பு: ${userTexts[5]}.`
            : 'இப்போது மன அமைதியுடன் இந்த நாளை நிறைவு செய்து ஓய்வெடுக்கிறேன்.'
        }`
      );
    } else {
      narrative.push(
        `இவற்றை நாட்குறிப்பாக எழுதி வைப்பது என் எண்ணங்களுக்கு ஒரு தெளிவைத் தருகிறது. எத்தகைய சவால்கள் வந்தாலும் எனக்காக நான் நேரம் ஒதுக்கியது ஒரு நல்ல தொடக்கம்.`
      );
    }

    return {
      date: dateStr,
      title,
      mood,
      moodEmoji,
      highlights,
      text: narrative.join('\n\n'),
      rawConversation: messages,
    };
  }

  // English Summary
  let mood = 'Reflective';
  let moodEmoji = '🌱';

  const lower = combinedUserText.toLowerCase();
  if (/happy|joy|grateful|thankful|wonderful|great|laugh|smile|loved|warm/i.test(lower)) {
    mood = 'Grateful';
    moodEmoji = '✨';
  } else if (/tired|exhausted|drained|burnout|sleepy|heavy/i.test(lower)) {
    mood = 'Tired';
    moodEmoji = '☕';
  } else if (/peace|calm|quiet|relaxed|still|content|cozy/i.test(lower)) {
    mood = 'Peaceful';
    moodEmoji = '🌿';
  } else if (/stress|anxious|busy|rush|deadline|pressure/i.test(lower)) {
    mood = 'Overwhelmed';
    moodEmoji = '🌧️';
  } else if (/proud|accomplished|progress|finished|succeeded|worked/i.test(lower)) {
    mood = 'Accomplished';
    moodEmoji = '🌟';
  } else if (/hope|forward|tomorrow|new|plan|dream/i.test(lower)) {
    mood = 'Hopeful';
    moodEmoji = '🌅';
  }

  let title = 'Notes on Today';
  if (mood === 'Grateful') title = 'Small Gifts and Bright Moments';
  else if (mood === 'Tired') title = 'Winding Down After a Long Day';
  else if (mood === 'Peaceful') title = 'Finding Stillness in the Day';
  else if (mood === 'Overwhelmed') title = 'Navigating Through the Storm';
  else if (mood === 'Accomplished') title = 'Steps Forward and Lessons Learned';
  else if (mood === 'Hopeful') title = 'Looking Ahead to Tomorrow';

  const highlights: string[] = [];
  if (userTexts[0]) {
    highlights.push(userTexts[0].length > 70 ? userTexts[0].slice(0, 67) + '...' : userTexts[0]);
  } else {
    highlights.push('Checked in and made time for reflection.');
  }

  if (userTexts[1]) {
    highlights.push(userTexts[1].length > 70 ? userTexts[1].slice(0, 67) + '...' : userTexts[1]);
  } else {
    highlights.push('Honored how I was feeling throughout the day.');
  }

  if (userTexts[2]) {
    highlights.push(userTexts[2].length > 70 ? userTexts[2].slice(0, 67) + '...' : userTexts[2]);
  } else {
    highlights.push('Taking gentle space to close out the day.');
  }

  let narrativeParagraphs: string[] = [];
  narrativeParagraphs.push(
    `Today felt like a day to pause and take stock. Looking back, what started things off was ${userTexts[0] || 'moving through the day at my own pace'}. It was something that stayed on my mind as the hours unfolded.`
  );

  if (userTexts[1] || userTexts[2]) {
    narrativeParagraphs.push(
      `As things moved forward, I found myself noticing the contrast in moments. ${
        userTexts[1] ? `When I think about what stood out, ${userTexts[1]}.` : ''
      } ${userTexts[2] ? `Along with that came a feeling: ${userTexts[2]}.` : ''} It reminded me that every day holds both challenges and small, quiet spaces to breathe.`
    );
  }

  if (userTexts[3] || userTexts[4] || userTexts[5]) {
    narrativeParagraphs.push(
      `What I want to hold onto from today is simple: ${
        userTexts[3] || userTexts[4] || 'giving myself permission to reflect without judgment'
      }. ${
        userTexts[5]
          ? `Heading into tomorrow, I want to carry forward: ${userTexts[5]}.`
          : 'Now it feels good to close this chapter and rest.'
      }`
    );
  } else {
    narrativeParagraphs.push(
      `Writing this down gives me a chance to see today with clearer eyes. No matter how ordinary or winding the path was, I showed up for myself, and that counts.`
    );
  }

  return {
    date: dateStr,
    title,
    mood,
    moodEmoji,
    highlights,
    text: narrativeParagraphs.join('\n\n'),
    rawConversation: messages,
  };
}
