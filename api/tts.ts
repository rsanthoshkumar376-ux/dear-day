import https from 'https';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const text = req.query.text;
  const lang = req.query.lang || 'ta';

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Text query parameter is required' });
  }

  // Clean text and limit single chunk to 200 chars for Google TTS
  const cleanText = text
    .replace(/[*_#~`>•\-_]/g, ' ')
    .replace(/[()[\]{}"'“”‘’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);

  const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${encodeURIComponent(lang)}&client=tw-ob`;

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
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        googleRes.pipe(res);
      }
    );

    audioRequest.on('error', (err) => {
      console.error('[Dear Day TTS API] Error:', err);
      res.status(500).json({ error: 'TTS audio streaming error' });
    });
  } catch (err: any) {
    console.error('[Dear Day TTS API] Internal Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
