import http from 'http';
import {
  calculateStreakInfo,
  formatLocalDate,
  shiftDate,
  getHeatmap30Days,
  MILESTONES,
} from '../src/services/streakService';
import {
  generateDemoReply,
  generateDemoSummary,
  checkCrisis,
  CRISIS_HELP_RESPONSE,
} from '../src/services/demoAi';
import type { DiaryEntry, MessageItem, UserSettings } from '../src/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log('--- 1. Testing Streak Calculation & Derivation ---');

  const today = formatLocalDate(new Date());
  const yest = shiftDate(today, -1);
  const twoDaysAgo = shiftDate(today, -2);
  const threeDaysAgo = shiftDate(today, -3);

  // Test 1: Empty entries -> streak = 0
  const emptyStreak = calculateStreakInfo([]);
  assert(emptyStreak.currentStreak === 0, 'Empty entries produce streak = 0');
  assert(emptyStreak.totalEntries === 0, 'Total entries is 0');
  assert(!emptyStreak.isTodayCompleted, 'Today is not completed');

  // Test 2: Only today completed -> streak = 1
  const todayEntry: DiaryEntry = {
    date: today,
    title: 'Hello',
    mood: 'Happy',
    moodEmoji: '☀️',
    highlights: ['One'],
    text: 'Some text',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const oneStreak = calculateStreakInfo([todayEntry]);
  assert(oneStreak.currentStreak === 1, 'Single entry today produces streak = 1');
  assert(oneStreak.isTodayCompleted, 'Today marked completed');

  // Test 3: Yesterday completed, today not yet completed -> streak is alive (1)
  const yestEntry: DiaryEntry = { ...todayEntry, date: yest };
  const aliveStreak = calculateStreakInfo([yestEntry]);
  assert(aliveStreak.currentStreak === 1, 'Streak is still alive from yesterday');
  assert(!aliveStreak.isTodayCompleted, 'Today is pending');
  assert(aliveStreak.isStreakAtRisk, 'Streak marked at risk until completed today');

  // Test 4: Consecutive days (today + yesterday + 2 days ago) -> streak = 3
  const twoDaysAgoEntry: DiaryEntry = { ...todayEntry, date: twoDaysAgo };
  const threeStreak = calculateStreakInfo([todayEntry, yestEntry, twoDaysAgoEntry]);
  assert(threeStreak.currentStreak === 3, '3 consecutive completed days produce streak = 3');
  assert(threeStreak.longestStreak === 3, 'Longest streak is 3');

  // Test 5: Missed day resets current streak to 0
  const gapEntry: DiaryEntry = { ...todayEntry, date: shiftDate(today, -5) };
  const brokenStreak = calculateStreakInfo([gapEntry]);
  assert(brokenStreak.currentStreak === 0, 'Older entry with gap resets current streak to 0');
  assert(brokenStreak.longestStreak === 1, 'Longest streak preserved');

  // Test 6: Streak freeze preserves 1 missed day
  const testSettings: UserSettings = {
    name: 'Tester',
    reminderTime: '20:00',
    voiceReplies: false,
    notificationsEnabled: false,
    streakFreezeUsedWeek: null,
    onboardingCompleted: true,
  };
  const freezeStreak = calculateStreakInfo([twoDaysAgoEntry, threeDaysAgo], testSettings);
  assert(
    freezeStreak.currentStreak >= 1,
    'Streak freeze protected the missed yesterday'
  );

  // Test 7: 30-day heatmap
  const heatmap = getHeatmap30Days({ [today]: true, [yest]: true });
  assert(heatmap.length === 30, 'Heatmap contains exactly 30 days');
  assert(heatmap[29].date === today, 'Last day in heatmap is today');
  assert(heatmap[29].completed === true, 'Today completed in heatmap');
  assert(heatmap[28].completed === true, 'Yesterday completed in heatmap');

  console.log('\n--- 2. Testing AI Demo Mode & Conversation Engine ---');

  // Test 8: Initial question
  const greeting = generateDemoReply('Elena', []);
  assert(greeting.reply.includes('Elena'), 'Greeting personalizes with user name');

  // Test 9: Empathetic response to rough day
  const roughMsg: MessageItem = {
    date: today,
    role: 'user',
    content: 'Work was awful and I felt completely exhausted and overwhelmed.',
    inputMode: 'typed',
    timestamp: Date.now(),
  };
  const empatheticReply = generateDemoReply('Elena', [roughMsg]);
  assert(
    empatheticReply.reply.toLowerCase().includes('sorry') ||
      empatheticReply.reply.toLowerCase().includes('heavy'),
    'Responds with empathy when user shares painful/rough day'
  );

  // Test 10: Safety check on crisis/self-harm keywords
  const crisisMsg: MessageItem = {
    date: today,
    role: 'user',
    content: 'I want to die, everything is too painful',
    inputMode: 'typed',
    timestamp: Date.now(),
  };
  const crisisReply = generateDemoReply('Elena', [crisisMsg]);
  assert(crisisReply.isCrisis === true, 'Flags crisis state');
  assert(crisisReply.shouldFinish === true, 'Halts normal diary questions');
  assert(crisisReply.reply.includes('988'), 'Provides emergency helpline 988');

  // Test 11: Summary generation produces valid first-person diary entry
  const conversation: MessageItem[] = [
    {
      date: today,
      role: 'user',
      content: 'I had coffee in the garden and watched the morning birds.',
      inputMode: 'typed',
      timestamp: Date.now(),
    },
    {
      date: today,
      role: 'user',
      content: 'My meeting went surprisingly well and the team gave positive feedback.',
      inputMode: 'typed',
      timestamp: Date.now(),
    },
    {
      date: today,
      role: 'user',
      content: 'I am grateful for my sister calling me tonight.',
      inputMode: 'typed',
      timestamp: Date.now(),
    },
  ];
  const summary = generateDemoSummary('Elena', conversation, today);
  assert(typeof summary.title === 'string' && summary.title.length > 0, 'Produces short title');
  assert(typeof summary.mood === 'string' && summary.mood.length > 0, 'Produces mood');
  assert(typeof summary.moodEmoji === 'string', 'Produces mood emoji');
  assert(summary.highlights.length === 3, 'Produces exactly 3 highlight bullets');
  assert(summary.text.includes('I') || summary.text.includes('my'), 'Entry is written in first person');
  const wordCount = summary.text.split(/\s+/).length;
  assert(wordCount >= 50, `Diary text generated has good length (${wordCount} words)`);

  console.log('\n--- Test Summary ---');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
