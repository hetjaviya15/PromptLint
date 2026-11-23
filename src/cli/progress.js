import ora from 'ora';
export function startProgress(enabled, action = 'analyze') {
  const spinner = enabled ? ora({ text: action === 'improve' ? 'Improving with Groq…' : 'Analyzing with Groq…', color: 'cyan', stream: process.stderr }).start() : null;
  return { stop: () => spinner?.stop() };
}
