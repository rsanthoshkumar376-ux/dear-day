export default function handler(req: any, res: any) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const model = process.env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-sonnet-20241022';

  res.status(200).json({
    status: 'ok',
    hasApiKey: !!apiKey,
    model: model,
    mode: apiKey ? 'live' : 'demo',
  });
}
