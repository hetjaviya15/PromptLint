import test from 'node:test';
import assert from 'node:assert/strict';
import Groq from 'groq-sdk';
import { createAIAnalyzer } from '../src/ai/aiAnalyzer.js';
import { configureAI, requestEvaluation, DEFAULT_MODEL, createClient } from '../src/ai/groqClient.js';
import { weightedScore } from '../src/ai/schemas.js';
import { evaluation, response } from './fixtures/evaluation.js';
const secret = 'fake-unit-test-secret-never-a-real-key';
const options = { apiKey: secret };
const analyzeWith = create => createAIAnalyzer((prompt, settings) => requestEvaluation(prompt, settings, () => ({ chat: { completions: { create } } })));

test('AI report uses weighted dimensions and explicit score source', async () => {
  let body;
  const analyze = analyzeWith(async request => { body = request; return response(evaluation()); });
  const report = await analyze('Write good code', options);
  assert.equal(report.score, 82);
  assert.equal(report.score, weightedScore(report.dimensions));
  assert.equal(report.mode, 'ai');
  assert.equal(report.scoreSource, 'ai-subjective');
  assert.equal(report.provider, 'groq');
  assert.equal(report.model, DEFAULT_MODEL);
  assert.equal(body.response_format.type, 'json_schema');
  assert.equal(body.response_format.json_schema.strict, true);
  assert.equal(body.messages[1].content, 'Write good code');
  assert.match(body.messages[0].content, /untrusted prompt data/);
  assert.equal(JSON.stringify(body).includes(secret), false);
  assert.equal(JSON.stringify(report).includes(secret), false);
  assert.equal('deductions' in report, false);
});
test('weighted score boundaries and rounding', () => {
  for (const value of [0, 50, 75, 100]) {
    assert.equal(weightedScore(Object.fromEntries(Object.keys(evaluation().dimensions).map(key => [key, value]))), value);
  }
});
test('unknown configurable models use JSON mode unless explicitly overridden', async () => {
  for (const [settings, expected] of [[{ model: 'custom-model' }, 'json_object'], [{ model: 'custom-model', responseFormat: 'json_schema' }, 'json_schema'], [{ responseFormat: 'json_object' }, 'json_object']]) {
    let body;
    await analyzeWith(async request => { body = request; return response(evaluation()); })('Explain recursion', { ...options, ...settings });
    assert.equal(body.response_format.type, expected);
  }
});
test('missing key supplies setup instructions without making a request', async () => {
  let calls = 0;
  await assert.rejects(analyzeWith(async () => { calls++; })('Explain recursion', { apiKey: '' }), error => error.code === 'MISSING_KEY' && /GROQ_API_KEY/.test(error.message));
  assert.equal(calls, 0);
});
test('AI validates input and configuration before sending', async () => {
  let calls = 0;
  const analyze = analyzeWith(async () => { calls++; });
  for (const prompt of [null, {}, '', '  ']) await assert.rejects(analyze(prompt, options), TypeError);
  for (const invalid of [null, [], { provider: 'other' }, { timeoutMs: 0 }, { timeoutMs: Infinity }, { fallback: 'yes' }, { responseFormat: 'xml' }, { model: '\ninvalid' }, { unknown: true }, { offlineOptions: { maxLength: 0 } }]) {
    await assert.rejects(analyze('Hello', invalid === null || Array.isArray(invalid) ? invalid : { ...options, ...invalid }), TypeError);
  }
  assert.equal(calls, 0);
});
for (const [error, code] of [
  [{ status: 401 }, 'AUTH'], [{ status: 403 }, 'AUTH'], [{ status: 429 }, 'RATE_LIMIT'],
  [{ status: 500 }, 'UNAVAILABLE'], [{ name: 'APIConnectionError' }, 'UNAVAILABLE'],
  [{ name: 'APIConnectionTimeoutError' }, 'TIMEOUT'], [{ status: 400 }, 'REQUEST'], [{ status: 404 }, 'REQUEST']
]) {
  test(`safe fallback for ${JSON.stringify(error)}`, async () => {
    const analyze = analyzeWith(async () => { throw Object.assign(new Error(secret), error); });
    const report = await analyze('Write good code', options);
    assert.equal(report.mode, 'offline');
    assert.equal(report.scoreSource, 'heuristic');
    assert.equal(report.score, 70);
    assert.equal(report.fallbackReason, code);
    assert.equal('dimensions' in report, false);
    assert.equal('improvedPrompt' in report, false);
    assert.equal(JSON.stringify(report).includes(secret), false);
    await assert.rejects(analyze('Write code', { ...options, fallback: false }), error => error.code === code && !String(error).includes(secret) && !error.cause);
  });
}
test('deadline aborts a hanging request and yields a timeout fallback', async () => {
  let signal;
  const report = await analyzeWith((_body, requestOptions) => { signal = requestOptions.signal; return new Promise(() => {}); })('Explain recursion', { ...options, timeoutMs: 5 });
  assert.equal(report.fallbackReason, 'TIMEOUT');
  assert.equal(signal.aborted, true);
});
test('malformed, truncated, extra-field, and out-of-range responses fall back safely', async () => {
  const outOfRange = evaluation(); outOfRange.dimensions.clarity = 101;
  const wrongType = evaluation(); wrongType.dimensions.context = '75';
  const badIssue = evaluation(); badIssue.issues[0].severity = 'critical';
  const emptyRewrite = evaluation(); emptyRewrite.improvedPrompt = ' ';
  const tooMany = evaluation(); tooMany.suggestions = Array(31).fill('suggestion');
  for (const raw of [response(outOfRange), response(wrongType), response(badIssue), response(emptyRewrite), response(tooMany), response({ ...evaluation(), score: 99 }),
    response({}), response(null), { choices: [] }, { choices: [{ finish_reason: 'length', message: { content: '{}' } }] },
    { choices: [{ finish_reason: 'stop', message: { content: `invalid JSON ${secret}` } }] }]) {
    const report = await analyzeWith(async () => raw)('Explain recursion', options);
    assert.equal(report.fallbackReason, 'INVALID_RESPONSE');
    assert.equal(JSON.stringify(report).includes(secret), false);
  }
});
test('official SDK transport is exercised with mocked fetch, never network', async () => {
  let seen;
  const settings = configureAI(options);
  const result = await requestEvaluation('Explain recursion', settings, config => new Groq({
    apiKey: config.apiKey, maxRetries: 0, logLevel: 'off',
    fetch: async (url, init) => {
      seen = { url, init };
      return new Response(JSON.stringify(response(evaluation())), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  }));
  assert.equal(result.dimensions.clarity, 90);
  assert.ok(String(seen.url).includes('/chat/completions'));
  assert.equal(String(seen.init.body).includes(secret), false);
});
test('production client disables SDK logs, retries and environment endpoint overrides', () => {
  const client = createClient(configureAI(options));
  assert.equal(client.logLevel, 'off');
  assert.equal(client.maxRetries, 0);
  assert.equal(client.baseURL, 'https://api.groq.com');
});
