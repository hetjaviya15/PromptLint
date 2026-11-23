import { createAIAnalyzer } from './aiAnalyzer.js';

export function createPromptImprover(improve = createAIAnalyzer(undefined, 'improve')) {
  return async function improvePrompt(prompt, options = {}) {
    return improve(prompt, options);
  };
}
export const improvePrompt = createPromptImprover();
