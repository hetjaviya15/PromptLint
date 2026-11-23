#!/usr/bin/env node
import { runCLI } from '../src/cli/commands.js';
import { cleanText } from '../src/cli/ui.js';

try {
  // CLI convenience only: library imports never read local environment files.
  try { process.loadEnvFile(); }
  catch (error) {
    if (error.code !== 'ENOENT') throw new Error('Cannot read the local .env file. Check its permissions.');
  }
  process.exitCode = await runCLI(process.argv.slice(2));
} catch (error) {
  // All known failures have fixed, credential-free messages. Never print SDK stacks.
  const safe = error?.name === 'AIError' || error?.constructor === Error || error?.constructor === TypeError;
  const message = safe ? cleanText(error.message) : 'Unable to complete the command. Check input and configuration.';
  console.error(`promptlint-ai: ${message}`);
  process.exitCode = 1;
}
