export function evaluation() {
  return {
    dimensions: { clarity: 90, context: 75, specificity: 80, outputFormat: 85, consistency: 80 },
    issues: [{ severity: 'warning', message: 'Technology is unspecified.', suggestion: 'Specify a technology or allow any language.' }],
    suggestions: ['Specify a technology or allow any language.'],
    summary: 'The task needs technical details.',
    improvedPrompt: 'Write code for [website purpose] using [technology], with [required features].',
    explanation: 'Added placeholders for missing details without selecting technologies.',
    improvements: ['Made missing requirements explicit.'],
    clarificationQuestions: ['What should the website do?']
  };
}
export const response = data => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(data) } }] });
