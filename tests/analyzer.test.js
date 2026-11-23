import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePrompt, getAvailableRules } from '../src/index.js';

test('preserves original input, returns deterministic findings and consistent counts', () => {
  const prompt = '  Write good code for a website  ';
  const result = analyzePrompt(prompt);
  assert.deepEqual(result, analyzePrompt(prompt));
  assert.equal(result.prompt, prompt);
  assert.equal(result.rulesChecked, 8);
  assert.equal(result.issuesFound, new Set(result.issues.map(issue => issue.ruleId)).size);
  assert.deepEqual(result.suggestions, [...new Set(result.issues.map(issue => issue.suggestion))]);
  for (const issue of result.issues) {
    for (const key of ['ruleId', 'severity', 'message', 'suggestion']) assert.equal(typeof issue[key], 'string');
  }
});
test('empty and whitespace input produce only an empty-prompt finding', () => {
  for (const prompt of ['', ' \n\t']) {
    const result = analyzePrompt(prompt);
    assert.deepEqual(result.issues.map(issue => issue.ruleId), ['empty-prompt']);
    assert.equal(result.stats.words, 0);
  }
});
test('rejects non-string inputs', () => {
  for (const value of [null, undefined, 12, {}, [], new String('hello')]) assert.throws(() => analyzePrompt(value), TypeError);
});
test('validates all options and nested settings', () => {
  for (const options of [null, [], new Date(), { unknown: true }, { maxLength: 0 },
    { maxWords: 1.5 }, { maxLength: Infinity }, { rules: null }, { rules: [] },
    { rules: { typo: true } }, { rules: { contradictions: 'false' } },
    { weights: null }, { weights: { error: -1 } }, { weights: { error: 101 } },
    { weights: { warning: NaN } }, { weights: { typo: 2 } }]) {
    assert.throws(() => analyzePrompt('Hello', options), TypeError);
  }
});
test('disabled rules are not evaluated or penalized', () => {
  const rules = Object.fromEntries(getAvailableRules().map(rule => [rule.id, false]));
  const result = analyzePrompt('Write good code. Use only Python. Use only JavaScript.', { rules });
  assert.equal(result.rulesChecked, 0);
  assert.equal(result.score, 100);
  assert.deepEqual(result.issues, []);
});
test('partial configuration merges defaults without mutating options', () => {
  const options = { rules: { 'vague-language': false }, weights: { warning: 7 } };
  const before = structuredClone(options);
  const result = analyzePrompt('Write good code', options);
  assert.equal(result.score, 93);
  assert.equal(result.rulesChecked, 7);
  assert.deepEqual(options, before);
});
test('rule metadata is complete and independent of returned mutations', () => {
  const rules = getAvailableRules();
  assert.equal(rules.length, 8);
  assert.equal(new Set(rules.map(rule => rule.id)).size, 8);
  for (const rule of rules) for (const key of ['id', 'name', 'description', 'severity']) assert.ok(rule[key]);
  rules[0].id = 'changed';
  assert.equal(getAvailableRules()[0].id, 'empty-prompt');
});
test('counts Unicode code points and whitespace-delimited words', () => {
  assert.deepEqual(analyzePrompt('Hi 😀').stats, { characters: 4, words: 2 });
});
