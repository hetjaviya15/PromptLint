import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createSharedServer } from '../server/app.js';
import { analyzePromptAI } from '../src/ai/aiAnalyzer.js';
import { configureAI } from '../src/ai/groqClient.js';
import { requestSharedEvaluation, validateServiceUrl } from '../src/ai/sharedClient.js';
import { evaluation } from './fixtures/evaluation.js';

async function service(t, options = {}) {
  const server = createSharedServer({ apiKey: 'fake-server-only-secret', evaluate: async () => evaluation(), ...options });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { origin, post: (body, headers = {}) => fetch(origin + '/v1/evaluate', {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body)
  }) };
}
test('shared AI works without a user key and calculates its own weighted score', async t => {
  const { origin } = await service(t, { evaluate: async (prompt, settings) => {
    assert.equal(prompt, 'Write code');
    assert.equal(settings.apiKey, 'fake-server-only-secret');
    assert.equal(settings.maxCompletionTokens, 4096);
    return evaluation();
  } });
  const result = await analyzePromptAI('Write code', { serviceUrl: origin });
  assert.equal(result.mode, 'ai');
  assert.equal(result.transport, 'shared');
  assert.equal(result.score, 82);
  assert.equal(JSON.stringify(result).includes('fake-server-only-secret'), false);
});
test('health, invalid input, prompt limits, and model override rejection', async t => {
  let calls = 0;
  const { origin, post } = await service(t, { evaluate: async () => { calls++; return evaluation(); } });
  assert.equal((await fetch(origin + '/health')).status, 200);
  assert.equal((await fetch(origin + '/absent')).status, 404);
  assert.equal((await fetch(origin + '/v1/evaluate')).status, 405);
  for (const body of [{}, { prompt: '' }, { prompt: 5 }, { prompt: 'test', model: 'expensive-model' }, { prompt: 'test', apiKey: 'do-not-forward' }]) {
    assert.equal((await post(body)).status, 400);
  }
  assert.equal((await post({ prompt: 'x'.repeat(8001) })).status, 413);
  assert.equal((await post({ prompt: 'x'.repeat(40000) })).status, 413);
  assert.equal((await post({ prompt: 'test' }, { 'content-type': 'text/plain' })).status, 415);
  assert.equal(calls, 0);
});
test('global quota cannot be bypassed using forwarded client headers', async t => {
  const { post } = await service(t, { perMinute: 1 });
  assert.equal((await post({ prompt: 'test' })).status, 200);
  const denied = await post({ prompt: 'test' }, { 'x-forwarded-for': '1.2.3.4' });
  assert.equal(denied.status, 429);
  assert.ok(denied.headers.get('retry-after'));
});
test('daily quota remains after minute rollover and resets after 24 hours', async t => {
  let time = 0;
  const { post } = await service(t, { perDay: 1, now: () => time });
  assert.equal((await post({ prompt: 'test' })).status, 200);
  time = 60001;
  assert.equal((await post({ prompt: 'test' })).status, 429);
  time = 86400001;
  assert.equal((await post({ prompt: 'test' })).status, 200);
});
test('concurrency is bounded and released when evaluation finishes', async t => {
  let release, started;
  const ready = new Promise(resolve => { started = resolve; });
  const { post } = await service(t, { maxConcurrent: 1, evaluate: async () => {
    started(); await new Promise(resolve => { release = resolve; }); return evaluation();
  } });
  const first = post({ prompt: 'test' });
  await ready;
  assert.equal((await post({ prompt: 'test' })).status, 429);
  release(); assert.equal((await first).status, 200);
});
test('provider errors are hidden and shared fallback is labeled offline', async t => {
  const { origin, post } = await service(t, { evaluate: async () => { throw new Error('fake-server-only-secret'); } });
  const response = await post({ prompt: 'test' });
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes('fake-server-only-secret'), false);
  const result = await analyzePromptAI('Write good code', { serviceUrl: origin });
  assert.equal(result.mode, 'offline');
  assert.equal(result.requestedMode, 'ai');
  assert.equal(result.score, 70);
});
test('service URLs cannot carry credentials or use insecure remote HTTP', () => {
  for (const url of ['http://remote.example', 'https://user:secret@example.com', 'https://example.com/?key=secret', 'https://example.com/path', 'file:///etc/passwd']) {
    assert.throws(() => validateServiceUrl(url), TypeError);
  }
  assert.equal(validateServiceUrl('https://example.com/'), 'https://example.com');
  assert.throws(() => configureAI({ serviceUrl: 'https://example.com', apiKey: 'secret' }), TypeError);
  assert.throws(() => configureAI({ serviceUrl: 'https://example.com', model: 'override' }), TypeError);
  assert.equal(configureAI({ serviceUrl: 'https://example.com' }).timeoutMs, 120000);
});
test('shared transport sends only prompt and rejects malformed or excessive responses', async () => {
  const settings = { serviceUrl: 'https://example.com', timeoutMs: 100 };
  for (const body of ['not json', JSON.stringify({ evaluation: {}, model: 'model' }), 'x'.repeat(250001)]) {
    await assert.rejects(requestSharedEvaluation('test', settings, async (_url, request) => {
      assert.deepEqual(JSON.parse(request.body), { prompt: 'test' });
      assert.equal(request.redirect, 'error');
      assert.equal('authorization' in request.headers, false);
      return new Response(body);
    }), error => error.code === 'UNAVAILABLE');
  }
});
