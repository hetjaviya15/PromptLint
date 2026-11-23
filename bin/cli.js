#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { analyzePrompt, formatReport } from '../src/index.js';

const help = `PromptLint — offline heuristic prompt analysis
Usage: promptlint-lite [--json] "prompt"
       promptlint-lite --file prompt.txt [--json]
       echo "Explain recursion" | promptlint-lite [--json]

Options:
  --file PATH   Read a UTF-8 file
  --json        Print only JSON
  --help        Show help
  --version     Show version
  --            End options (for prompts starting with a dash)

Exit codes: 0 successful analysis (including findings), 1 input/usage error.`;

try {
  const { values, positionals } = parseArgs({ options: {
    file: { type: 'string' }, json: { type: 'boolean' },
    help: { type: 'boolean' }, version: { type: 'boolean' }
  }, allowPositionals: true, strict: true });
  if (values.help) console.log(help);
  else if (values.version) {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    console.log(pkg.version);
  } else {
    if (positionals.length > 1) throw new Error('Provide one quoted prompt argument.');
    if (values.file !== undefined && positionals.length) throw new Error('Choose either --file or a prompt argument.');
    let prompt;
    if (values.file !== undefined) prompt = await readFile(values.file, 'utf8');
    else if (positionals.length) prompt = positionals[0];
    else if (!process.stdin.isTTY) {
      process.stdin.setEncoding('utf8');
      prompt = '';
      for await (const chunk of process.stdin) prompt += chunk;
    } else throw new Error('Provide a prompt, --file PATH, or piped input. See --help.');
    const result = analyzePrompt(prompt);
    console.log(values.json ? JSON.stringify(result, null, 2) : formatReport(result));
  }
} catch (error) {
  console.error(`promptlint-lite: ${error.message}`);
  process.exitCode = 1;
}
