export const emptyPrompt = {
  id: 'empty-prompt', name: 'Empty prompt', severity: 'error',
  description: 'Detects empty or whitespace-only input.',
  check(_text, { prompt }) {
    return prompt.trim() ? [] : [{ message: 'The prompt is empty.', suggestion: 'Add a specific question or task.' }];
  }
};
export const promptLength = {
  id: 'prompt-length', name: 'Prompt length', severity: 'info',
  description: 'Checks configurable character and word limits; short prompts are allowed.',
  check(_text, { stats, options }) {
    return stats.characters > options.maxLength || stats.words > options.maxWords
      ? [{ message: `The prompt exceeds the configured limits (${options.maxLength} characters or ${options.maxWords} words).`,
        suggestion: 'Review whether all included material is necessary; adjust the limits if the detail is intentional.' }] : [];
  }
};
export const repeatedText = {
  id: 'repeated-text', name: 'Repeated text', severity: 'warning',
  description: 'Detects a word repeated at least eight times consecutively.',
  check(text) {
    return /\b([\p{L}\p{N}]+)(?:\s+\1){7,}\b/iu.test(text)
      ? [{ message: 'A word repeats at least eight times consecutively.',
        suggestion: 'Remove accidental repeated words or place intentional source text inside quotes.' }] : [];
  }
};
