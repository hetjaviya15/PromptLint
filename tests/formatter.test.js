import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzePrompt, formatReport } from '../src/index.js';
test('report includes findings, suggestions and transparent scoring', () => {
  const result = analyzePrompt('Write good code');
  const report = formatReport(result);
  assert.match(report, /PROMPTLINT/);
  assert.match(report, /70\/100 \(heuristic\)/);
  for (const issue of result.issues) {
    assert.ok(report.includes(issue.message));
    assert.ok(report.includes(issue.suggestion));
    assert.ok(report.includes(issue.ruleId));
  }
  assert.match(report, /Score deductions:/);
});
test('clean report and invalid input', () => {
  assert.match(formatReport(analyzePrompt('Explain recursion')), /Score deductions: none/);
  for (const value of [null, {}, 'text']) assert.throws(() => formatReport(value), TypeError);
});
