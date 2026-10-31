import Anthropic from '@anthropic-ai/sdk';

function isTamil(text: string): boolean {
  return /[\u0B80-\u0BFF]/.test(text);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sentence = '', language = 'en', userName = 'friend' } = req.body || {};

    if (!sentence || typeof sentence !== 'string' || !sentence.trim()) {
      return res.status(400).json({ error: 'Sentence string is required' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    const model = process.env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-sonnet-20241022';

    if (!apiKey) {
      return res.status(200).json({
        corrected: null,
        mode: 'demo',
        message: 'No Anthropic API key configured. Client local rule-based corrector is used.',
      });
    }

    const anthropic = new Anthropic({ apiKey });
    const wantsTamil = language === 'ta' || isTamil(sentence);

    const systemPrompt = `You are an expert personal diary sentence editor for ${userName}.
The user spoke a sentence into their voice diary. Their spoken words may contain small grammar mistakes, wrong tenses, repeated words, filler words, or spoken slips.
Your job:
1. Fix all grammar errors, tenses, and sentence structure into a single, natural, beautifully written FIRST-PERSON diary sentence ("I..." or in Tamil "நான்...").
2. NEVER invent new facts or remove the user's core actions.
3. Keep the user's exact meaning.
4. Output ONLY the single corrected sentence. Do NOT include quotes, explanations, markdown, or questions.
${wantsTamil ? 'LANGUAGE: Write strictly in pure, natural TAMIL (தமிழ்).' : 'LANGUAGE: English.'}`;

    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 300,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: sentence.trim() }],
    });

    const rawText = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const cleaned = rawText.trim().replace(/^["']|["']$/g, '');

    return res.status(200).json({
      corrected: cleaned,
    });
  } catch (error: any) {
    console.error('[Vercel Correct-Sentence API] Error:', error?.message || error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
