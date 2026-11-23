import test from 'node:test';
import assert from 'node:assert/strict';
import { createPromptImprover } from '../src/ai/promptImprover.js';
import { createAIAnalyzer } from '../src/ai/aiAnalyzer.js';
import { requestEvaluation } from '../src/ai/groqClient.js';
import { evaluation, response } from './fixtures/evaluation.js';
const makeImprover = create => createPromptImprover(createAIAnalyzer((prompt, settings) => requestEvaluation(prompt, settings, () => ({ chat: { completions: { create } } }))));
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
