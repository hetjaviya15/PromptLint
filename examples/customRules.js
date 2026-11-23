import { analyzePrompt } from 'promptlint-lite';
console.log(analyzePrompt('Extract names and dates from the supplied text.', {
  rules: { 'contradictions': false }, maxLength: 3000, maxWords: 600,
  weights: { info: 3, warning: 12, error: 25 }
}));
