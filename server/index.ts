import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Validate Anthropic configuration
const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
const model = process.env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-sonnet-20241022';

let anthropicClient: Anthropic | null = null;
if (apiKey) {
  try {
    anthropicClient = new Anthropic({ apiKey });
    console.log(`[Dear Day Server] Anthropic client initialized with model: ${model}`);
  } catch (err) {
    console.warn('[Dear Day Server] Failed to initialize Anthropic client:', err);
  }
} else {
  console.log('[Dear Day Server] Running in Demo Mode (ANTHROPIC_API_KEY not provided)');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!apiKey,
    model: model,
    mode: apiKey ? 'live' : 'demo',
  });
});

// Self-harm / crisis detection regex for extra safety
const CRISIS_KEYWORDS = [
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

function checkCrisis(text: string): boolean {
  return CRISIS_KEYWORDS.some((regex) => regex.test(text));
}

const CRISIS_RESPONSE =
  "I hear how much pain you're carrying right now, and I care deeply about your safety. You don't have to carry this alone. Please connect with someone who can support you right now:\n\n" +
  "• If you're in the US or Canada, call or text 988 (Suicide & Crisis Lifeline, free & confidential 24/7).\n" +
  "• Text HOME to 741741 to connect with Crisis Text Line.\n" +
  "• In the UK, call 111 or text SHOUT to 85258.\n" +
  "• In Australia, call 13 11 14 (Lifeline).\n" +
  "• If you are elsewhere or in immediate danger, please reach out to your local emergency services.\n\n" +
  "I am pausing our diary questions today. Please take gentle care of yourself and reach out to one of these resources.";

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { userName = 'friend', messages = [] } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';

    // Safety check on user input
    if (checkCrisis(latestUserMessage)) {
      return res.json({
        reply: CRISIS_RESPONSE,
        isCrisis: true,
        shouldFinish: true,
      });
    }

    // If no API key is provided, indicate client to use client demo logic
    // or provide fallback reply from server
    if (!anthropicClient) {
      return res.json({
        reply: null,
        mode: 'demo',
        message: 'No Anthropic API key configured on server. Switching to local demo mode.',
      });
    }

    const systemPrompt = `You are "Dear Day", a warm, empathetic, thoughtful personal diary companion.
You are chatting with ${userName}.

Guidelines:
1. Warm, friendly, non-judgmental tone.
2. Ask ONE question at a time.
3. Keep replies concise: 1 to 2 warm sentences acknowledging what they shared, followed by your single next question.
4. If they share something difficult or painful, respond with empathy first before asking anything.
5. Base your follow-up questions strictly on what ${userName} actually said. Explore moments, how they felt, who they were with, what brought relief or gratitude, or hopes for tomorrow.
6. Never invent facts or assumptions not stated by the user. Never lecture or give unsolicited life advice.
7. If the conversation has reached 5-8 questions, or if the user seems ready to wrap up, warmly ask if they are ready to save today's diary entry.
8. SAFETY: If the user indicates self-harm or hurting others, respond with immediate empathy and helpline resources, and stop normal journaling questions.`;

    const formattedMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'ai' ? 'assistant' : m.role,
      content: m.content,
    }));

    const response = await anthropicClient.messages.create({
      model: model,
      max_tokens: 300,
      temperature: 0.7,
      system: systemPrompt,
      messages: formattedMessages as any,
    });

    const reply = response.content[0]?.type === 'text' ? response.content[0].text : '';

    res.json({
      reply: reply.trim(),
      isCrisis: checkCrisis(reply),
    });
  } catch (error: any) {
    console.error('[Dear Day Server] Chat API error:', error?.message || error);
    res.status(500).json({
      error: 'Failed to communicate with Claude API',
      details: error?.message,
      fallbackToDemo: true,
    });
  }
});

// Summarize endpoint: turns conversation into 1st person diary entry
app.post('/api/summarize', async (req, res) => {
  try {
    const { userName = 'friend', conversation = [] } = req.body;

    if (!Array.isArray(conversation) || conversation.length === 0) {
      return res.status(400).json({ error: 'Conversation array is required' });
    }

    if (!anthropicClient) {
      return res.json({
        summary: null,
        mode: 'demo',
        message: 'No Anthropic API key configured. Use client demo generator.',
      });
    }

    const userStatements = conversation
      .filter((m: { role: string }) => m.role === 'user')
      .map((m: { content: string }) => m.content)
      .join('\n');

    const systemPrompt = `You are the personal diary writer for ${userName}.
Transform the user's spoken or typed thoughts into an authentic, beautiful diary entry written in the FIRST PERSON ("I", "my", "we").
CRITICAL RULES:
1. Write strictly in the FIRST PERSON from ${userName}'s perspective.
2. Word count: between 150 and 300 words.
3. Use ONLY details, events, and feelings that the user explicitly mentioned. NEVER invent facts, names, or events not present in the user's words.
4. Capture their genuine voice, emotional nuance, and reflections.
5. You MUST return ONLY valid JSON in the exact structure below, with NO markdown ticks around it:
{
  "title": "A short, poignant 3-6 word title for the day",
  "mood": "One word mood description (e.g. Grateful, Exhausted, Hopeful, Peaceful, Reflective, Energized)",
  "moodEmoji": "A single fitting emoji matching the mood (e.g. 🌿, ☕, 🌅, 🌧️, ✨, 😌)",
  "highlights": [
    "First concrete highlight bullet (1 concise sentence)",
    "Second concrete highlight bullet (1 concise sentence)",
    "Third concrete highlight bullet (1 concise sentence)"
  ],
  "text": "The 150-300 word diary entry written in first person..."
}`;

    const promptMessage = `Here is everything ${userName} shared about their day:\n\n${userStatements}\n\nPlease craft the first-person diary entry JSON now.`;

    const response = await anthropicClient.messages.create({
      model: model,
      max_tokens: 1000,
      temperature: 0.6,
      system: systemPrompt,
      messages: [{ role: 'user', content: promptMessage }],
    });

    const rawText = response.content[0]?.type === 'text' ? response.content[0].text : '';
    
    // Clean potential markdown ticks
    const cleanedJson = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleanedJson);

    res.json({
      summary: parsed,
    });
  } catch (error: any) {
    console.error('[Dear Day Server] Summarize API error:', error?.message || error);
    res.status(500).json({
      error: 'Failed to generate diary summary from Claude API',
      details: error?.message,
      fallbackToDemo: true,
    });
  }
});

app.listen(PORT, () => {
  console.log(`[Dear Day Server] Proxy listening on http://localhost:${PORT}`);
});
