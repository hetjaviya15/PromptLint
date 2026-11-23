import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EventEmitter } from 'node:events';
import { runCLI } from '../src/cli/commands.js';
import { interactivePrompt } from '../src/cli/prompts.js';
import { copyToClipboard } from '../src/cli/clipboard.js';
import { analyzePrompt } from '../src/analyzer.js';
import { evaluation } from './fixtures/evaluation.js';
function streams(text = '') {
  const input = Readable.from([text]);
  let content = '';
  const output = new Writable({ write(chunk, _encoding, done) { content += chunk; done(); } });
  return { input, output, content: () => content };
}
const aiReport = () => ({ ...evaluation(), mode: 'ai', provider: 'groq', scoreSource: 'ai-subjective', score: 82, grade: 'Good', model: 'mock', prompt: 'Write code' });
test('mode-first menu routes offline, online, file, help/back, and EOF', async () => {
  for (const [text, expected] of [
    ['1\nExplain recursion\n', { command: 'analyze', ai: false, prompt: 'Explain recursion' }],
    ['2\n4\nprompt.txt\n', { command: 'improve', ai: true, file: 'prompt.txt' }],
    ['2\n3\nprompt.txt\n', { command: 'analyze', ai: true, file: 'prompt.txt' }],
    ['2\n1\nExplain recursion\n', { command: 'analyze', ai: true, prompt: 'Explain recursion' }],
    ['2\n2\nWrite code\n', { command: 'improve', ai: true, prompt: 'Write code' }],
    ['1\n:file prompt.txt\n', { command: 'analyze', ai: false, file: 'prompt.txt' }],
    ['2\n5\n0\n1\nExplain recursion\n', { command: 'analyze', ai: false, prompt: 'Explain recursion' }],
    ['9\n1\nExplain recursion\n', { command: 'analyze', ai: false, prompt: 'Explain recursion' }],
    ['0\n', { command: 'cancel' }], ['', { command: 'cancel' }]
  ]) {
    assert.deepEqual(await interactivePrompt(streams(text)), expected);
  }
});
test('no-argument TTY launches menu while non-TTY reads stdin', async () => {
  const io = streams('1\nExplain recursion\n');
  io.input.isTTY = true; io.output.isTTY = true;
  assert.equal(await runCLI([], io), 0);
  assert.match(io.content(), /Choose/);
  const pipe = streams('Explain recursion');
  assert.equal(await runCLI(['--json'], pipe), 0);
  assert.equal(JSON.parse(pipe.content()).mode, 'offline');
});
test('CLI saves exactly the improved prompt, reports copy failure, and refuses overwrite', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'promptlint-export-'));
  try {
    const path = join(directory, 'improved.txt');
    const io = streams();
    let copied;
    const code = await runCLI(['improve', 'Write code', '--json', '--copy', '--output', path], {
      ...io, improve: async () => aiReport(), copy: async text => { copied = text; return false; }
    });
    assert.equal(code, 2);
    const report = JSON.parse(io.content());
    assert.equal(report.exports.saved, true);
    assert.equal(report.exports.copied, false);
    assert.match(report.warnings[0], /--output/);
    assert.equal(copied, evaluation().improvedPrompt);
    assert.equal(await readFile(path, 'utf8'), copied + '\n');
    await writeFile(path, 'preserve existing content');
    const second = streams();
    assert.equal(await runCLI(['improve', 'Write code', '--json', '--output', path], { ...second, improve: async () => aiReport() }), 2);
    assert.equal(await readFile(path, 'utf8'), 'preserve existing content');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('CLI AI fallback is pure JSON, returns exit 2, and never exports a false rewrite', async () => {
  const io = streams(); let copied = false;
  const report = { ...analyzePrompt('Write code'), requestedMode: 'ai', fallbackReason: 'AUTH', warnings: ['Authentication failed. Offline analysis only.'] };
  const code = await runCLI(['improve', 'Write code', '--json', '--copy'], {
    ...io, improve: async () => report, copy: async () => { copied = true; }
  });
  assert.equal(code, 2);
  assert.equal(JSON.parse(io.content()).mode, 'offline');
  assert.equal(copied, false);
});
test('CLI AI success remains pure JSON and passes explicit model and timeout', async () => {
  const io = streams();
  const code = await runCLI(['analyze', 'Write code', '--ai', '--json', '--model', 'custom', '--timeout', '100'], {
    ...io, analyzeAI: async (prompt, options) => {
      assert.equal(prompt, 'Write code');
      assert.deepEqual(options, { model: 'custom', timeoutMs: 100 });
      return aiReport();
    }
  });
  assert.equal(code, 0);
  assert.equal(JSON.parse(io.content()).score, 82);
});
test('clipboard uses stdin without a shell, and gracefully tries Linux alternatives', async () => {
  const calls = [];
  const run = (command, args, options) => {
    const child = new EventEmitter();
    child.stdin = new Writable({ write(chunk, _encoding, done) { calls.push({ command, args, options, text: chunk.toString() }); done(); } });
    queueMicrotask(() => child.emit('close', command === 'xsel' ? 0 : 1));
    return child;
  };
  assert.equal(await copyToClipboard('$(untrusted) `text`', { platform: 'linux', env: {}, run }), true);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].text, '$(untrusted) `text`');
  assert.equal(calls[0].options.shell, undefined);
});
