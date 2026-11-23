import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateScore } from '../src/scoring.js';
import { analyzePrompt } from '../src/index.js';
test('grade boundaries', () => {
  for (const [points, grade] of [[0, 'Excellent'], [10, 'Excellent'], [11, 'Good'], [25, 'Good'], [26, 'Needs improvement'], [50, 'Needs improvement'], [51, 'Poor'], [100, 'Poor']]) {
    const result = calculateScore([{ ruleId: 'example', severity: 'warning' }], { warning: points });
    assert.equal(result.score, 100 - points);
    assert.equal(result.grade, grade);
  }
});
test('deducts once per rule even when multiple findings are reported', () => {
  const result = analyzePrompt('Build a good website');
  assert.equal(result.issues.length, 3);
  assert.equal(result.issuesFound, 2);
  assert.equal(result.deductions.length, 2);
  assert.equal(result.score, 70);
  assert.equal(result.totalDeduction, 30);
});
test('clamps to zero and allows zero weights', () => {
  const result = analyzePrompt('Build a good website. Return only JSON. Return only XML.', { weights: { warning: 100, error: 100 } });
  assert.equal(result.score, 0);
  assert.equal(result.totalDeduction, 300);
  assert.equal(analyzePrompt('Build a good website', { weights: { warning: 0 } }).score, 100);
  assert.equal(analyzePrompt('Translate hello into French').score, 100);
});
