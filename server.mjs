import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const ANTHROPIC_SERVER_API_KEY = (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '').trim();

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-api-key'
  });
  res.end(JSON.stringify(body));
}

function serveIndex(res) {
  const filePath = path.join(__dirname, 'index.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 500, { error: 'Failed to load index.html' });
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: 'Invalid request URL' });
    return;
  }

  const { method } = req;
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/anthropic' && method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type, x-api-key'
    });
    res.end();
    return;
  }

  if (url.pathname === '/api/anthropic' && method === 'POST') {
    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += chunk;
    });

    req.on('end', async () => {
      try {
        const parsedBody = JSON.parse(rawBody || '{}');
        const bodyApiKey = typeof parsedBody.apiKey === 'string' ? parsedBody.apiKey : '';
        const headerApiKey = typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'] : '';
        const apiKey = (bodyApiKey || headerApiKey || ANTHROPIC_SERVER_API_KEY || '').trim();
        if (!apiKey) {
          sendJson(res, 400, {
            error: 'Missing API key',
            message: 'Missing API key. Set ANTHROPIC_API_KEY on the server or pass apiKey in the request.'
          });
          return;
        }
        if (!/^[\x20-\x7E]+$/.test(apiKey)) {
          sendJson(res, 400, {
            error: 'Invalid API key encoding',
            message:
              'API key contains unsupported characters. Re-paste the key from Anthropic exactly (ASCII characters only).'
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
        res.writeHead(upstream.status, {
          'content-type': 'application/json; charset=utf-8',
          'access-control-allow-origin': '*'
        });
        res.end(text);
      } catch (err) {
        sendJson(res, 500, { error: err.message || 'Proxy request failed' });
      }
    });
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    serveIndex(res);
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Outwit running at http://localhost:${PORT}`);
});
