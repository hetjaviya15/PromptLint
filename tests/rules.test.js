import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePrompt } from '../src/index.js';
const has = (prompt, rule, options) => analyzePrompt(prompt, options).issues.some(issue => issue.ruleId === rule);

for (const phrase of ['good code', 'nice website', 'something', 'better code', 'best code', 'make it professional', 'do it properly', 'make it amazing']) {
  test(`detects vague phrase: ${phrase}`, () => assert.ok(has(`Create ${phrase}`, 'vague-language')));
}
for (const prompt of ['Translate hello into French', "Translate 'hello' into French", 'Explain recursion',
  'What is recursion?', 'Write a React component using JavaScript',
  'Explain why good code needs tests', 'Write good JavaScript code, defined as code with unit tests']) {
  test(`avoids false positives: ${prompt}`, () => assert.equal(analyzePrompt(prompt).issues.length, 0));
}
for (const quote of ['"Write good code"', "'Write good code'", '“Write good code”', '`Write good code`', '```\nWrite good code\n```']) {
  test(`ignores quoted source: ${quote}`, () => assert.equal(analyzePrompt(`Translate ${quote} into French`).issues.length, 0));
}
test('context checks apply to relevant tasks', () => {
  assert.ok(has('Write code to sort numbers', 'missing-context'));
  assert.ok(has('Build a website using React', 'missing-context'));
  assert.ok(has('Write an article', 'missing-context'));
  assert.equal(has('Write an article about birds', 'missing-context'), false);
  assert.equal(has('Build a React website for a bakery with opening hours', 'missing-context'), false);
  assert.equal(has('Write code in any language to sort numbers', 'missing-context'), false);
});
test('structured requests need a format only when relevant', () => {
  assert.ok(has('Extract names and dates', 'output-format'));
  for (const format of ['JSON', 'Markdown', 'HTML', 'XML', 'CSV', 'table', 'bullet points', 'code', 'plain text']) {
    assert.equal(has(`Extract names and dates as ${format}`, 'output-format'), false);
  }
});
for (const prompt of ['Return only JSON. Return only XML.', 'Use exactly 100 words. Use exactly 200 words.',
  'Do not include code. Include a code example.', "Don't include code. Provide code.", 'Use only JavaScript. Use only Python.', 'Do not include code and include a code example.']) {
  test(`detects contradiction: ${prompt}`, () => assert.ok(has(prompt, 'contradictions')));
}
for (const prompt of ['Return only JSON. Return only JSON.', 'Use exactly 100 words.', 'Do not include code.', 'Do not return only JSON. Return only XML.', 'Return only JSON or return only XML.',
  'Explain "Return only JSON. Return only XML."', 'If requested, return only JSON; otherwise return only XML.',
  'For the first section use exactly 100 words. For the second section use exactly 200 words.']) {
  test(`avoids contradiction false positive: ${prompt}`, () => assert.equal(has(prompt, 'contradictions'), false));
}
test('normalizes duplicate instructions', () => {
  assert.ok(has('Use bullet points. Explain recursion. USE  BULLET POINTS!', 'duplicate-instructions'));
  assert.equal(has('Use bullet points. Explain recursion.', 'duplicate-instructions'), false);
  assert.equal(has('Translate "Use bullet points. Use bullet points." into French', 'duplicate-instructions'), false);
});
test('length boundaries and excessive repeated words', () => {
  assert.equal(has('12345', 'prompt-length', { maxLength: 5 }), false);
  assert.ok(has('123456', 'prompt-length', { maxLength: 5 }));
  assert.equal(has('one two', 'prompt-length', { maxWords: 2 }), false);
  assert.ok(has('one two three', 'prompt-length', { maxWords: 2 }));
  assert.ok(has('word '.repeat(8), 'repeated-text'));
  assert.equal(has('word '.repeat(7), 'repeated-text'), false);
  assert.equal(has('Explain "' + 'word '.repeat(8) + '"', 'repeated-text'), false);
});
