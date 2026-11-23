import test from 'node:test';
import assert from 'node:assert/strict';
import { createPromptImprover } from '../src/ai/promptImprover.js';
import { createAIAnalyzer } from '../src/ai/aiAnalyzer.js';
import { requestEvaluation } from '../src/ai/groqClient.js';
import { evaluation, response } from './fixtures/evaluation.js';
const makeImprover = create => createPromptImprover(createAIAnalyzer((prompt, settings) => requestEvaluation(prompt, settings, () => ({ chat: { completions: { create } } })), 'improve'));
test('improvement parses a validated rewrite, rationale, changes and clarification questions', async () => {
  const result = await makeImprover(async () => response(evaluation()))('Write good code', { apiKey: 'fake-test-key' });
  assert.equal(result.originalPrompt, 'Write good code');
  assert.match(result.improvedPrompt, /\[technology\]/);
  assert.ok(result.explanation);
  assert.ok(result.improvements.length);
  assert.ok(result.clarificationQuestions.length);
});
test('improvement never invents a local rewrite on API failure', async () => {
  const result = await makeImprover(async () => { throw new Error('fake-secret'); })('Write code', { apiKey: 'fake-test-key' });
  assert.equal(result.mode, 'offline');
  assert.equal('improvedPrompt' in result, false);
  assert.match(result.warnings[0], /no AI score or improved prompt/);
});

test('improve requests only a rewrite and returns no scoring report', async () => {
  const full = evaluation();
  const improvement = Object.fromEntries(['improvedPrompt', 'explanation', 'improvements', 'clarificationQuestions'].map(key => [key, full[key]]));
  const result = await makeImprover(async body => {
    assert.equal('dimensions' in body.response_format.json_schema.schema.properties, false);
    assert.match(body.messages[0].content, /Improve ONLY/);
    return response(improvement);
  })('Write code', { apiKey: 'fake-test-key' });
  assert.equal(result.action, 'improve');
  for (const field of ['score', 'grade', 'dimensions', 'issues', 'suggestions']) assert.equal(field in result, false);
});
