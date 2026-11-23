import { createServer } from 'node:http';
import { requestEvaluation, DEFAULT_MODEL } from '../src/ai/groqClient.js';
import { selectResult } from '../src/ai/schemas.js';

// Small single-instance demo service. Quotas are shared by all users and reset on restart.
export function createSharedServer({ apiKey, evaluate = requestEvaluation, now = Date.now,
  perMinute = 10, perDay = 100, maxConcurrent = 2 } = {}) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw new Error('Set GROQ_API_KEY on the server before starting.');
  for (const value of [perMinute, perDay, maxConcurrent]) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error('Server limits must be positive integers.');
  }
  let minuteStart = now(), dayStart = now(), minuteCount = 0, dayCount = 0, active = 0;
  const send = (res, status, data, retryAfter) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
      'x-content-type-options': 'nosniff', ...(retryAfter ? { 'retry-after': String(retryAfter) } : {}) });
    res.end(JSON.stringify(data));
  };
  const server = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { status: 'ok' });
    if (req.url !== '/v1/evaluate') return send(res, 404, { error: 'Not found.' });
    if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });
    if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') return send(res, 415, { error: 'Use application/json.' });
    if (Number(req.headers['content-length']) > 32768) {
      req.resume(); return send(res, 413, { error: 'Prompt request is too large.' });
    }
    const action = req.headers['x-promptlint-action'];
    if (action !== undefined && !['analyze', 'improve'].includes(action)) return send(res, 400, { error: 'Unknown action.' });
    let body = '', size = 0;
    try {
      req.setEncoding('utf8');
      for await (const chunk of req) {
        size += Buffer.byteLength(chunk);
        if (size > 32768) { send(res, 413, { error: 'Prompt request is too large.' }); return; }
        body += chunk;
      }
      const payload = JSON.parse(body);
      if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).length !== 1
        || typeof payload.prompt !== 'string' || !payload.prompt.trim()) return send(res, 400, { error: 'Provide only a non-empty prompt string.' });
      if ([...payload.prompt].length > 8000) return send(res, 413, { error: 'Prompt exceeds 8000 characters.' });
      const time = now();
      if (time - minuteStart >= 60000) { minuteStart = time; minuteCount = 0; }
      if (time - dayStart >= 86400000) { dayStart = time; dayCount = 0; }
      if (dayCount >= perDay) return send(res, 429, { error: 'Shared daily limit reached.' }, Math.max(1, Math.ceil((dayStart + 86400000 - time) / 1000)));
      if (minuteCount >= perMinute || active >= maxConcurrent) return send(res, 429, { error: 'Shared service is busy. Try later.' }, 60);
      // Count attempts, including failures, so repeated errors cannot exhaust upstream usage.
      minuteCount++; dayCount++; active++;
      try {
        const data = await evaluate(payload.prompt, { apiKey: apiKey.trim(), model: DEFAULT_MODEL,
          action, timeoutMs: 30000, responseFormat: 'json_schema', maxCompletionTokens: 4096 });
        const evaluation = selectResult(data, action);
        send(res, 200, { evaluation, model: DEFAULT_MODEL });
      } catch {
        // Never return provider errors, credentials, or configuration to public callers.
        send(res, 503, { error: 'AI service temporarily unavailable. Use offline analysis or retry later.' });
      } finally { active--; }
    } catch { if (!res.headersSent) send(res, 400, { error: 'Invalid JSON request.' }); }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  server.maxHeadersCount = 30;
  return server;
}
