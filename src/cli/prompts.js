import { createInterface } from 'node:readline';
import { createUI } from './ui.js';

export async function interactivePrompt({ input = process.stdin, output = process.stdout } = {}) {
  const { c, header, wrap } = createUI({ color: Boolean(output.isTTY), width: output.columns });
  const rl = createInterface({ input, crlfDelay: Infinity, terminal: false });
  const lines = rl[Symbol.asyncIterator]();
  const ask = async question => {
    output.write(question);
    const answer = await lines.next();
    return answer.done ? null : answer.value;
  };
  const menu = async (title, choices, defaultChoice = '1') => {
    output.write('\n' + c.bold(title) + '\n\n');
    output.write(wrap(choices.map(([number, label, detail]) =>
      `  ${c.cyan.bold(number + ')')} ${c.bold(label)}\n     ${c.gray(detail)}`).join('\n\n')) + '\n\n');
    while (true) {
      const answer = await ask(c.cyan(`Choose [${defaultChoice}]: `));
      if (answer === null) return null;
      const choice = answer.trim() || defaultChoice;
      if (choices.some(([number]) => number === choice)) return choice;
      output.write(c.yellow('Please choose one of the numbers shown above.') + '\n');
    }
  };
  const readPrompt = async result => {
    output.write('\n' + c.bold('Enter your prompt') + '\n');
    output.write(wrap(`Press Enter to ${result.command === 'improve' ? 'improve' : 'analyze'}. For a multiline prompt, enter :file PATH to read a text file.`) + '\n\n');
    while (true) {
      const prompt = await ask(c.cyan('Prompt: '));
      if (prompt === null) return { command: 'cancel' };
      if (!prompt.trim()) {
        output.write('Please enter a prompt.\n');
        continue;
      }
      if (prompt.startsWith(':file ')) {
        const file = prompt.slice(6).trim();
        if (!file) { output.write('Enter a file path after :file.\n'); continue; }
        return { ...result, file };
      }
      return { ...result, prompt };
    }
  };

  try {
    output.write(header() + '\n');
    while (true) {
      const mode = await menu('Choose your mode', [
        ['1', 'Offline', 'Instant local checks. No key or internet needed.'],
        ['2', 'Online · Groq AI', 'Detailed evaluation and prompt improvement.'],
        ['0', 'Exit', 'Close PromptLint.']
      ]);
      if (mode === null || mode === '0') return { command: 'cancel' };
      if (mode === '1') return await readPrompt({ command: 'analyze', ai: false });
      while (true) {
        output.write('\n' + c.gray('Online actions send your prompt to the configured shared service and Groq, or directly to Groq when using your own key.') + '\n');
        const action = await menu('What would you like to do online?', [
          ['1', 'Analyze a prompt', 'Get scores, findings, and recommendations.'],
          ['2', 'Improve a prompt', 'Get a rewrite, explanation, and clarification questions.'],
          ['3', 'Analyze a text file', 'Evaluate a prompt from a UTF-8 file.'],
          ['4', 'Improve a text file', 'Generate a revised prompt from a UTF-8 file.'],
          ['5', 'Connection & help', 'Shared access and connection troubleshooting.'],
          ['0', 'Back', 'Return to Offline / Online.']
        ]);
        if (action === null) return { command: 'cancel' };
        if (action === '0') break;
        if (action === '5') {
          output.write('\n' + wrap('Shared mode uses the service URL included by the package owner; no personal API key is required. If a free server is sleeping, the first request can take about a minute. Service limits apply to all users. For a custom service, set PROMPTLINT_SERVICE_URL. Optional direct mode uses your own GROQ_API_KEY. Never paste keys into prompts.') + '\n');
          continue;
        }
        const result = { command: ['2', '4'].includes(action) ? 'improve' : 'analyze', ai: true };
        if (['3', '4'].includes(action)) {
          while (true) {
            const file = await ask('\nUTF-8 file path (0 to go back): ');
            if (file === null) return { command: 'cancel' };
            if (file.trim() === '0') break;
            if (file.trim()) return { ...result, file: file.trim() };
            output.write('Please enter a file path.\n');
          }
        } else return await readPrompt(result);
      }
    }
  } finally { rl.close(); }
}
