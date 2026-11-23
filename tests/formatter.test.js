import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePrompt, formatReport } from '../src/index.js';
test('report includes findings, suggestions and transparent scoring', () => {
  const result = analyzePrompt('Write good code');
  const report = formatReport(result, { unicode: false, width: 100 });
  assert.match(report, /PROMPTLINT/);
  assert.match(report, /70\/100 \(heuristic\)/);
  for (const issue of result.issues) {
    assert.ok(report.includes(issue.message));
    assert.ok(report.replace(/\s/g, '').includes(issue.suggestion.replace(/\s/g, '')));
    assert.ok(report.includes(issue.ruleId));
  }
  assert.match(report, /Score deductions:/);
});
test('clean report and invalid input', () => {
  assert.match(formatReport(analyzePrompt('Explain recursion')), /Score deductions: none/);
  for (const value of [null, {}, 'text']) assert.throws(() => formatReport(value), TypeError);
});

test('narrow and ASCII reports stay within width and strip terminal control injection', () => {
  const result = analyzePrompt('Write good code');
  result.issues[0].message = '\x1b[31mInjected\x1b[0m\x1b]0;bad title\x07' + 'x'.repeat(200);
  for (const width of [10, 20, 32, 50, 80]) {
    const report = formatReport(result, { width, color: false, unicode: false });
    assert.equal(report.includes('\x1b'), false);
    assert.ok(report.split('\n').every(line => [...line].length <= width));
    assert.equal(/[╭╰█░✓]/u.test(report), false);
  }
});
