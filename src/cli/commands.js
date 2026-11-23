import { readFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { analyzePrompt } from '../analyzer.js';
import { analyzePromptAI } from '../ai/aiAnalyzer.js';
import { improvePrompt } from '../ai/promptImprover.js';
import { formatReport } from '../formatter.js';
import { getAvailableRules } from '../rules/index.js';
import { interactivePrompt } from './prompts.js';
import { startProgress } from './progress.js';
import { copyToClipboard } from './clipboard.js';

export const help = `PromptLint AI — Analyze. Score. Improve.
Usage: promptlint-ai analyze "prompt" [--offline | --ai] [--json]
       promptlint-ai improve "prompt" [--copy] [--output PATH]
       promptlint-ai analyze --file prompt.txt [--ai]
       echo "Explain recursion" | promptlint-ai analyze --json
       promptlint-ai              Choose Offline / Online (TTY only)
       promptlint-ai rules

Options:
  --file PATH       Read a UTF-8 prompt file
  --ai              Send prompt to Groq for subjective AI evaluation
  --offline         Local heuristic analysis (default; no network)
  --model ID        Override the Groq model (AI only)
  --timeout MS      Request deadline, 1–300000 ms (AI only)
  --copy            Copy an AI-improved prompt to the clipboard
  --output PATH     Save an AI-improved prompt (new files only)
  --json            JSON only; no menu, spinner, or decorations
  --no-color        Disable ANSI colors
  --ascii           Use ASCII instead of Unicode UI
  --help            Show help
  --version         Show version
  --                End option parsing

Run npm start in this repository, or promptlint-ai after installation.
AI requires GROQ_API_KEY; the CLI loads local .env automatically.
Existing environment variables take precedence. Never paste a key into a prompt.
Press Enter to submit an interactive prompt. Use a file for multiline text.
Offline requires no key. AI failures return labeled offline results.
Exit codes: 0 analysis complete; 1 usage/input/setup error; 2 AI fallback
or requested export unavailable. No history is saved.`;

export function parseCommand(args) {
  let parsed;
  try {
    parsed = parseArgs({ args, options: {
      file: { type: 'string' }, ai: { type: 'boolean' }, offline: { type: 'boolean' },
      model: { type: 'string' }, timeout: { type: 'string' }, copy: { type: 'boolean' },
      output: { type: 'string' }, json: { type: 'boolean' }, 'no-color': { type: 'boolean' },
      ascii: { type: 'boolean' }, help: { type: 'boolean' }, version: { type: 'boolean' }
    }, allowPositionals: true, strict: true });
  } catch { throw new Error('Invalid arguments. Use --help for supported flags and required values.'); }
  const { values, positionals } = parsed;
  let command = 'analyze';
  if (['analyze', 'improve', 'rules'].includes(positionals[0])) command = positionals.shift();
  if (positionals.length > 1) throw new Error('Provide one quoted prompt argument.');
  if (values.file !== undefined && positionals.length) throw new Error('Choose either --file or a prompt argument.');
  if (values.ai && values.offline) throw new Error('Choose --ai or --offline, not both.');
  if (command === 'improve' && values.offline) throw new Error('Improvement requires AI mode; use analyze --offline for local recommendations.');
  const ai = command === 'improve' || values.ai === true;
  if (!ai && (values.model !== undefined || values.timeout !== undefined || values.copy || values.output !== undefined)) {
    throw new Error('--model, --timeout, --copy, and --output require AI mode.');
  }
  if (values.timeout !== undefined && (!/^\d+$/.test(values.timeout) || Number(values.timeout) < 1 || Number(values.timeout) > 300000)) throw new Error('--timeout must be an integer from 1 to 300000.');
  if (values.output === '' || values.file === '') throw new Error('File paths cannot be empty.');
  return { command, values, ai, prompt: positionals[0] };
}

// Dependencies are injectable internally for offline tests of CLI AI and export behavior.
export async function runCLI(args, dependencies = {}) {
  const input = dependencies.input ?? process.stdin;
  const output = dependencies.output ?? process.stdout;
  const errors = dependencies.errors ?? process.stderr;
  const analyzeAI = dependencies.analyzeAI ?? analyzePromptAI;
  const improve = dependencies.improve ?? improvePrompt;
  const copy = dependencies.copy ?? copyToClipboard;
  let { command, values, ai, prompt } = parseCommand(args);
  const print = value => output.write(value + '\n');
  if (values.help) { print(help); return 0; }
  if (values.version) {
    print(JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8')).version);
    return 0;
  }
  if (!args.length && input.isTTY && output.isTTY) {
    const selected = await interactivePrompt({ input, output });
    if (selected.command === 'cancel') return 0;
    if (selected.command === 'help') { print(help); return 0; }
    command = selected.command; ai = selected.ai; prompt = selected.prompt;
    values = { file: selected.file };
  }
  if (command === 'rules') {
    print(values.json ? JSON.stringify(getAvailableRules(), null, 2)
      : getAvailableRules().map(rule => `${rule.id} [${rule.severity}]\n  ${rule.description}`).join('\n\n'));
    return 0;
  }
  if (values.file !== undefined) {
    try { prompt = await readFile(values.file, 'utf8'); }
    catch { throw new Error('Cannot read the UTF-8 prompt file. Check its path and permissions.'); }
  } else if (prompt === undefined && !input.isTTY) {
    input.setEncoding('utf8'); prompt = '';
    for await (const chunk of input) prompt += chunk;
  } else if (prompt === undefined) throw new Error('Provide a prompt, --file PATH, or piped input. Use no arguments for the interactive menu.');
  const spinner = startProgress(ai && !values.json && Boolean(errors.isTTY) && process.env.TERM !== 'dumb'
    && process.env.NO_COLOR === undefined && !values['no-color']);
  let report;
  try {
    report = ai ? await (command === 'improve' ? improve : analyzeAI)(prompt, {
      ...(values.model === undefined ? {} : { model: values.model }),
      ...(values.timeout === undefined ? {} : { timeoutMs: Number(values.timeout) })
    }) : analyzePrompt(prompt);
  } finally { spinner.stop(); }
  let exitCode = report.requestedMode === 'ai' && report.mode === 'offline' ? 2 : 0;
  const warnings = [...(report.warnings ?? [])];
  if (values.copy || values.output !== undefined) {
    if (report.mode !== 'ai' || !report.improvedPrompt) {
      warnings.push('No AI-improved prompt is available to copy or save.'); exitCode = 2;
    } else {
      report = { ...report, exports: {} };
      if (values.output !== undefined) {
        try {
          await writeFile(values.output, report.improvedPrompt + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
          report.exports.saved = true;
        } catch {
          warnings.push('Cannot save output. Choose a new file path and check directory permissions. Existing files are never overwritten.');
          exitCode = 2;
        }
      }
      if (values.copy) {
        let copied = false;
        try { copied = await copy(report.improvedPrompt); } catch { /* no platform errors are exposed */ }
        report.exports.copied = copied;
        if (!copied) {
          warnings.push('Clipboard unavailable. Save the improved prompt with --output improved.txt, or copy it from this report.');
          exitCode = 2;
        }
      }
    }
  }
  report = { ...report, ...(warnings.length ? { warnings } : {}) };
  print(values.json ? JSON.stringify(report, null, 2) : formatReport(report, {
    color: !values['no-color'] && Boolean(output.isTTY),
    width: output.columns,
    ...(values.ascii ? { unicode: false } : {})
  }));
  if (!values.json && report.exports?.saved) print('Improved prompt saved.');
  if (!values.json && report.exports?.copied) print('Improved prompt copied.');
  return exitCode;
}
