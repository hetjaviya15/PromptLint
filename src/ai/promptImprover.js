import { analyzePromptAI } from './aiAnalyzer.js';

export function createPromptImprover(analyze = analyzePromptAI) {
  return async function improvePrompt(prompt, options = {}) {
    // One evaluation request returns the rewrite, its rationale, and any missing details.
    return analyze(prompt, options);
  };
}
export const improvePrompt = createPromptImprover();
