import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const cli = fileURLToPath(new URL('../bin/cli.js', import.meta.url));
const run = (args, input = '') => spawnSync(process.execPath, [cli, ...args], { input, encoding: 'utf8', timeout: 10000 });
test('CLI human and JSON output', () => {
  const human = run(['Write good code']);
  assert.equal(human.status, 0);
  assert.match(human.stdout, /PROMPTLINT/);
  const json = run(['--json', 'Explain recursion']);
  assert.equal(json.status, 0);
  assert.equal(json.stderr, '');
  assert.equal(JSON.parse(json.stdout).score, 100);
});
test('CLI stdin, empty input, UTF-8 file and dash-prefixed positional', () => {
  assert.equal(JSON.parse(run(['--json'], 'Translate café into French').stdout).prompt, 'Translate café into French');
  assert.equal(JSON.parse(run(['--json', '']).stdout).issues[0].ruleId, 'empty-prompt');
  assert.equal(JSON.parse(run(['--json', '--', '--example']).stdout).prompt, '--example');
  const directory = mkdtempSync(join(tmpdir(), 'promptlint-test-'));
  try {
    const path = join(directory, 'prompt with spaces.txt');
    writeFileSync(path, 'Explain café culture 😀', 'utf8');
    const result = run(['--file', path, '--json']);
    assert.equal(result.status, 0);
    assert.equal(JSON.parse(result.stdout).prompt, 'Explain café culture 😀');
    assert.equal(run(['--file', directory]).status, 1);
    assert.equal(run(['--file', join(directory, 'absent')]).status, 1);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('CLI help and version', () => {
  assert.match(run(['--help']).stdout, /Usage: promptlint-lite/);
  assert.equal(run(['--version']).stdout.trim(), '1.0.0');
});
test('CLI rejects invalid and conflicting arguments with stderr only', () => {
  for (const args of [['--unknown'], ['--file'], ['two', 'arguments'], ['--file', 'prompt.txt', 'prompt'], ['--json=yes']]) {
    const result = run(args);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /promptlint-lite:/);
  }
});
