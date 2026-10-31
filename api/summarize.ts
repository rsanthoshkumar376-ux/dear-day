import Anthropic from '@anthropic-ai/sdk';

function isTamil(text: string): boolean {
  return /[\u0B80-\u0BFF]/.test(text);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userName = 'friend', conversation = [], language = 'en' } = req.body || {};

    if (!Array.isArray(conversation) || conversation.length === 0) {
      return res.status(400).json({ error: 'Conversation array is required' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    const model = process.env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-sonnet-20241022';

    if (!apiKey) {
      return res.status(200).json({
        summary: null,
        mode: 'demo',
        message: 'No Anthropic API key configured. Use client demo generator.',
      });
    }

    const anthropic = new Anthropic({ apiKey });

    const userStatements = conversation
      .filter((m: { role: string }) => m.role === 'user')
      .map((m: { content: string }) => m.content)
      .join('\n');

    const wantsTamil = language === 'ta' || isTamil(userStatements);

    const systemPrompt = `You are the personal diary writer for ${userName}.
Transform the user's spoken or typed thoughts into an authentic, beautiful diary entry written in the FIRST PERSON ("I", "my" or in Tamil "நான்", "எனக்கு", "என்").
${wantsTamil ? 'LANGUAGE REQUIREMENT: You MUST output all text, title, mood, and highlights in natural, eloquent TAMIL (தமிழ்).' : 'LANGUAGE: English.'}

CRITICAL RULES:
1. Write strictly in the FIRST PERSON from ${userName}'s perspective.
2. Word count: between 150 and 300 words.
3. Use ONLY details, events, and feelings that the user explicitly mentioned. NEVER invent facts, names, or events not present in the user's words.
4. Capture their genuine voice, emotional nuance, and reflections.
5. You MUST return ONLY valid JSON in the exact structure below, with NO markdown ticks around it:
{
  "title": "A short, poignant 3-6 word title for the day",
  "mood": "One word mood description (e.g. Grateful, Exhausted, Hopeful, or in Tamil நன்றியுணர்வு, அமைதி, மகிழ்ச்சி)",
  "moodEmoji": "A single fitting emoji matching the mood (e.g. 🌿, ☕, 🌅, 🌧️, ✨, 😌, 🙏)",
  "highlights": [
    "First concrete highlight bullet (1 concise sentence)",
    "Second concrete highlight bullet (1 concise sentence)",
    "Third concrete highlight bullet (1 concise sentence)"
  ],
  "text": "The 150-300 word diary entry written in first person..."
}`;

    const promptMessage = `Here is everything ${userName} shared about their day:\n\n${userStatements}\n\nPlease craft the first-person diary entry JSON now.`;

    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 1000,
      temperature: 0.6,
      system: systemPrompt,
      messages: [{ role: 'user', content: promptMessage }],
    });

    const rawText = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const cleanedJson = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleanedJson);

    return res.status(200).json({
      summary: parsed,
    });
  } catch (error: any) {
    console.error('[Vercel Summarize API] Error:', error?.message || error);
    return res.status(500).json({
      error: 'Failed to generate diary summary from Claude API',
      details: error?.message,
      fallbackToDemo: true,
    });
  }
}
