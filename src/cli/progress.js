import ora from 'ora';
export function startProgress(enabled) {
  const spinner = enabled ? ora({ text: 'Analyzing with Groq…', color: 'cyan', stream: process.stderr }).start() : null;
  return { stop: () => spinner?.stop() };
}
