import { defineConfig } from 'vite';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function anthropicMiddleware() {
  return {
    name: 'anthropic-middleware',
    configureServer(server) {
      server.middlewares.use('/api/anthropic', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          next();
          return;
        }

        try {
          let raw = '';
          req.on('data', (chunk) => {
            raw += chunk;
          });

          req.on('end', async () => {
            try {
              const parsedBody = JSON.parse(raw || '{}');
              const bodyApiKey = typeof parsedBody.apiKey === 'string' ? parsedBody.apiKey : '';
              const headerApiKey = typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'] : '';
              const apiKey = (bodyApiKey || headerApiKey || '').trim();

              if (!apiKey) {
                json(res, 400, { error: 'Missing API key', message: 'Missing API key' });
                return;
              }

              if (!/^[\x20-\x7E]+$/.test(apiKey)) {
                json(res, 400, {
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
              res.statusCode = upstream.status;
              res.setHeader('content-type', 'application/json; charset=utf-8');
              res.end(text);
            } catch (err) {
              json(res, 500, { error: err.message || 'Proxy request failed', message: err.message || 'Proxy request failed' });
            }
          });
        } catch (err) {
          json(res, 500, { error: err.message || 'Proxy request failed', message: err.message || 'Proxy request failed' });
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [anthropicMiddleware()]
});
