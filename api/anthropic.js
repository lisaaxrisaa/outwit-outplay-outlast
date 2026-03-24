export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const parsedBody = req.body && typeof req.body === 'object' ? req.body : {};
    const bodyApiKey = typeof parsedBody.apiKey === 'string' ? parsedBody.apiKey : '';
    const headerApiKey = typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'] : '';
    const envApiKey = (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '').trim();
    const apiKey = (bodyApiKey || headerApiKey || envApiKey || '').trim();

    if (!apiKey) {
      res.status(400).json({
        error: 'Missing API key',
        message: 'Missing API key. Set ANTHROPIC_API_KEY on the server or pass apiKey in the request.'
      });
      return;
    }

    if (!/^[\x20-\x7E]+$/.test(apiKey)) {
      res.status(400).json({
        error: 'Invalid API key encoding',
        message: 'API key contains unsupported characters. Re-paste the key from Anthropic exactly (ASCII characters only).'
      });
      return;
    }

    const { apiKey: _discardedKey, ...upstreamBody } = parsedBody;
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(upstreamBody)
    });

    const text = await upstream.text();
    res.status(upstream.status).setHeader('content-type', 'application/json; charset=utf-8').send(text);
  } catch (err) {
    res.status(500).json({ error: err?.message || 'Proxy request failed' });
  }
}
