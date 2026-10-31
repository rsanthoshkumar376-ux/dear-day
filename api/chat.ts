import Anthropic from '@anthropic-ai/sdk';

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

function isTamil(text: string): boolean {
  return /[\u0B80-\u0BFF]/.test(text);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userName = 'friend', messages = [], language = 'en' } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const latestUserMessage = [...messages].reverse().find((m: any) => m.role === 'user')?.content || '';
    const wantsTamil = language === 'ta' || isTamil(latestUserMessage);

    // Safety check on user input
    if (checkCrisis(latestUserMessage)) {
      return res.status(200).json({
        reply: wantsTamil ? CRISIS_RESPONSE_TA : CRISIS_RESPONSE_EN,
        isCrisis: true,
        shouldFinish: true,
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    const model = process.env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-sonnet-20241022';

    if (!apiKey) {
      return res.status(200).json({
        reply: null,
        mode: 'demo',
        message: 'No Anthropic API key configured on server. Switching to local demo mode.',
      });
    }

    const anthropic = new Anthropic({ apiKey });

    const systemPrompt = `You are "Dear Day", a warm, empathetic, thoughtful personal diary companion.
You are chatting with ${userName}.
${wantsTamil ? 'LANGUAGE REQUIREMENT: The user wants to communicate in TAMIL (தமிழ்). You MUST formulate your entire response in clear, warm, conversational Tamil script.' : 'LANGUAGE: English.'}

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

    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 300,
      temperature: 0.7,
      system: systemPrompt,
      messages: formattedMessages as any,
    });

    const reply = response.content[0]?.type === 'text' ? response.content[0].text : '';

    return res.status(200).json({
      reply: reply.trim(),
      isCrisis: checkCrisis(reply),
    });
  } catch (error: any) {
    console.error('[Vercel Chat API] Error:', error?.message || error);
    return res.status(500).json({
      error: 'Failed to communicate with Claude API',
      details: error?.message,
      fallbackToDemo: true,
    });
  }
}
