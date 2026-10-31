import type { DiaryEntry, MessageItem } from '../types';

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
];

export function checkCrisis(text: string): boolean {
  return CRISIS_KEYWORDS.some((regex) => regex.test(text));
}

export const CRISIS_HELP_RESPONSE =
  "I hear how much pain you're carrying right now, and I care deeply about your safety. You don't have to carry this alone. Please connect with someone who can support you right now:\n\n" +
  "• If you're in the US or Canada: call or text 988 (Suicide & Crisis Lifeline, 24/7 free & confidential).\n" +
  "• Text HOME to 741741 for the Crisis Text Line.\n" +
  "• In the UK: call 111 or text SHOUT to 85258.\n" +
  "• In Australia: call 13 11 14 (Lifeline).\n" +
  "• If you are elsewhere or in immediate danger, please reach out to your local emergency services.\n\n" +
  "I am pausing our diary questions today. Please take gentle care of yourself and reach out to one of these resources.";

export function getInitialGreeting(name: string): string {
  const cleanName = name?.trim() || 'friend';
  return `How was your day, ${cleanName}?`;
}

interface DemoReplyResult {
  reply: string;
  isCrisis: boolean;
  shouldFinish: boolean;
}

export function generateDemoReply(userName: string, messages: MessageItem[]): DemoReplyResult {
  const userMessages = messages.filter((m) => m.role === 'user');
  
  if (userMessages.length === 0) {
    return {
      reply: getInitialGreeting(userName),
      isCrisis: false,
      shouldFinish: false,
    };
  }

  const latestMessage = userMessages[userMessages.length - 1]?.content || '';

  // Crisis detection
  if (checkCrisis(latestMessage)) {
    return {
      reply: CRISIS_HELP_RESPONSE,
      isCrisis: true,
      shouldFinish: true,
    };
  }

  // Check if user explicitly asked to finish
  const finishPhrases = [/finish/i, /done/i, /that'?s all/i, /wrap up/i, /ready to save/i, /go to sleep/i];
  if (finishPhrases.some((re) => re.test(latestMessage))) {
    return {
      reply: `Thank you for sharing your day with me, ${userName}. Whenever you're ready, tap "Finish my day" above to review your diary entry.`,
      isCrisis: false,
      shouldFinish: true,
    };
  }

  // Count turns
  const turn = userMessages.length;
  const lower = latestMessage.toLowerCase();

  // Empathy prefixes
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

  // Follow-up question sequence
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
 * Demo Mode Diary Summary Generator
 * Converts user's spoken/typed conversation into 150-300 words in FIRST PERSON,
 * using ONLY the user's shared thoughts.
 */
export function generateDemoSummary(
  userName: string,
  messages: MessageItem[],
  dateStr: string
): Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'> {
  const userTexts = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content.trim())
    .filter(Boolean);

  const combinedUserText = userTexts.join(' ');

  // Determine mood & emoji
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

  // Titles based on mood and keywords
  let title = 'Notes on Today';
  if (mood === 'Grateful') title = 'Small Gifts and Bright Moments';
  else if (mood === 'Tired') title = 'Winding Down After a Long Day';
  else if (mood === 'Peaceful') title = 'Finding Stillness in the Day';
  else if (mood === 'Overwhelmed') title = 'Navigating Through the Storm';
  else if (mood === 'Accomplished') title = 'Steps Forward and Lessons Learned';
  else if (mood === 'Hopeful') title = 'Looking Ahead to Tomorrow';

  // Generate 3 highlight bullets based on actual user statements
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

  // Synthesize 150 to 300 words first-person diary entry using ONLY user input
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

  const text = narrativeParagraphs.join('\n\n');

  return {
    date: dateStr,
    title,
    mood,
    moodEmoji,
    highlights,
    text,
    rawConversation: messages,
  };
}
