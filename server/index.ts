import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'https';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

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

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!apiKey,
    model: model,
    mode: apiKey ? 'live' : 'demo',
  });
});

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
  /தற்கொலை/i,
  /சாக\s*வேண்டும்/i,
  /சாகணும்/i,
  /உயிரை\s*மாய்க்க/i,
  /வாழ\s*பிடிக்கல/i,
];

function checkCrisis(text: string): boolean {
  return CRISIS_KEYWORDS.some((regex) => regex.test(text));
}

function isTamil(text: string): boolean {
  return /[\u0B80-\u0BFF]/.test(text);
}

const CRISIS_RESPONSE_EN =
  "I hear how much pain you're carrying right now, and I care deeply about your safety. You don't have to carry this alone. Please connect with someone who can support you right now:\n\n" +
  "• If you're in the US or Canada, call or text 988 (Suicide & Crisis Lifeline, free & confidential 24/7).\n" +
  "• Text HOME to 741741 to connect with Crisis Text Line.\n" +
  "• In India: call Sneha Helpline at 044-24640050 (24/7) or Vandrevala Foundation at 9999 666 555.\n" +
  "• In the UK, call 111 or text SHOUT to 85258.\n" +
  "• In Australia, call 13 11 14 (Lifeline).\n" +
  "• If you are elsewhere or in immediate danger, please reach out to your local emergency services (112 / 911).\n\n" +
  "I am pausing our diary questions today. Please take gentle care of yourself and reach out to one of these resources.";

const CRISIS_RESPONSE_TA =
  "நீங்கள் மிகுந்த மனவேதனையில் இருப்பதை நான் உணர்கிறேன். உங்கள் பாதுகாப்பு மிகவும் முக்கியமானது. நீங்கள் தனியாக இல்லை. தயவுசெய்து உடனடி உதவிக்கு இந்த எண்களைத் தொடர்பு கொள்ளுங்கள்:\n\n" +
  "• சினேகா தற்கொலை தடுப்பு உதவி எண் (தமிழ்நாடு): 044-24640050 (24 மணி நேரமும் செயல்படுகிறது)\n• தமிழ்நாடு மனநல உதவி எண்: 104 / 14416\n• வந்தேவாலா அறக்கட்டளை: 9999 666 555\n• தேசிய அவசர உதவி எண்: 112\n\n" +
  "இன்றைய நாட்குறிப்பு கேள்விகளை நான் நிறுத்துகிறேன். தயவுசெய்து உங்கள் மீது அன்பு செலுத்தி உடனடியாக இந்த உதவியை நாடுங்கள்.";

app.post('/api/chat', async (req, res) => {
  try {
    const { userName = 'friend', messages = [], language = 'en' } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const latestUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    const wantsTamil = language === 'ta' || isTamil(latestUserMessage);

    if (checkCrisis(latestUserMessage)) {
      return res.json({
        reply: wantsTamil ? CRISIS_RESPONSE_TA : CRISIS_RESPONSE_EN,
        isCrisis: true,
        shouldFinish: true,
      });
    }

    if (!anthropicClient) {
      return res.json({
        reply: null,
        mode: 'demo',
        message: 'No Anthropic API key configured on server. Switching to local demo mode.',
      });
    }

    const systemPrompt = `You are "Dear Day", a warm, empathetic, thoughtful personal diary companion.
You are chatting with ${userName}.
${wantsTamil ? 'LANGUAGE REQUIREMENT: The user wants to communicate in TAMIL (தமிழ்). Formulate your entire response in clear, warm, conversational Tamil script.' : 'LANGUAGE: English.'}

Guidelines:
1. Warm, friendly, non-judgmental tone.
2. Ask ONE question at a time.
3. Keep replies concise: 1 to 2 warm sentences acknowledging what they shared, followed by your single next question.
4. If they share something difficult or painful, respond with empathy first before asking anything.
5. Base your follow-up questions strictly on what ${userName} actually said.
6. Never invent facts or assumptions not stated by the user.
7. Wrap up naturally after ~5-8 questions.
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

app.post('/api/summarize', async (req, res) => {
  try {
    const { userName = 'friend', conversation = [], language = 'en' } = req.body;

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

    const wantsTamil = language === 'ta' || isTamil(userStatements);

    const systemPrompt = `You are the personal diary writer for ${userName}.
Transform the user's spoken or typed thoughts into an authentic, beautiful diary entry written in the FIRST PERSON ("I", "my" or in Tamil "நான்", "என்", "எனக்கு").
${wantsTamil ? 'LANGUAGE REQUIREMENT: You MUST output all text, title, mood, and highlights in natural, warm TAMIL (தமிழ்).' : 'LANGUAGE: English.'}

CRITICAL RULES:
1. Write strictly in the FIRST PERSON from ${userName}'s perspective.
2. Word count: between 150 and 300 words.
3. Use ONLY details, events, and feelings that the user explicitly mentioned. NEVER invent facts or events not present in the user's words.
4. Capture their genuine voice, emotional nuance, and reflections.
5. You MUST return ONLY valid JSON in the exact structure below, with NO markdown ticks around it:
{
  "title": "A short, poignant 3-6 word title for the day",
  "mood": "One word mood description (e.g. Grateful, Exhausted, or in Tamil நன்றியுணர்வு, அமைதி, மகிழ்ச்சி)",
  "moodEmoji": "A single fitting emoji matching the mood (e.g. 🌿, ☕, 🌅, 🌧️, ✨, 😌, 🙏)",
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

app.post('/api/correct-sentence', async (req, res) => {
  try {
    const { sentence = '', language = 'en', userName = 'friend' } = req.body || {};

    if (!sentence || typeof sentence !== 'string' || !sentence.trim()) {
      return res.status(400).json({ error: 'Sentence string is required' });
    }

    if (!anthropicClient) {
      return res.json({
        corrected: null,
        mode: 'demo',
        message: 'No Anthropic API key configured.',
      });
    }

    const wantsTamil = language === 'ta' || isTamil(sentence);

    const systemPrompt = `You are an expert personal diary sentence editor for ${userName}.
The user spoke a sentence into their voice diary. Their spoken words may contain small grammar mistakes, wrong tenses, repeated words, filler words, or spoken slips.
Your job:
1. Fix all grammar errors, tenses, and sentence structure into a single, natural, beautifully written FIRST-PERSON diary sentence ("I..." or in Tamil "நான்...").
2. NEVER invent new facts or remove the user's core actions.
3. Keep the user's exact meaning.
4. Output ONLY the single corrected sentence. Do NOT include quotes, explanations, markdown, or questions.
${wantsTamil ? 'LANGUAGE: Write strictly in pure, natural TAMIL (தமிழ்).' : 'LANGUAGE: English.'}`;

    const response = await anthropicClient.messages.create({
      model: model,
      max_tokens: 300,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: sentence.trim() }],
    });

    const rawText = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const cleaned = rawText.trim().replace(/^["']|["']$/g, '');

    res.json({ corrected: cleaned });
  } catch (error: any) {
    console.error('[Dear Day Server] Correct-Sentence API error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

app.get('/api/tts', (req, res) => {
  const text = req.query.text;
  const lang = req.query.lang || 'ta';

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text query parameter is required' });
  }

  const cleanText = text
    .replace(/[*_#~`>•\-_]/g, ' ')
    .replace(/[()[\]{}"'“”‘’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);

  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${encodeURIComponent(String(lang))}&client=tw-ob`;

  try {
    const audioRequest = https.get(
      ttsUrl,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://translate.google.com/',
        },
      },
      (googleRes) => {
        if (googleRes.statusCode !== 200) {
          return res.status(googleRes.statusCode || 500).json({
            error: 'Failed to retrieve audio from TTS provider',
          });
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        googleRes.pipe(res);
      }
    );

    audioRequest.on('error', (err) => {
      console.error('[Dear Day Server] TTS error:', err);
      res.status(500).json({ error: 'TTS audio streaming error' });
    });
  } catch (err: any) {
    console.error('[Dear Day Server] TTS Internal Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`[Dear Day Server] Proxy listening on http://localhost:${PORT}`);
});
