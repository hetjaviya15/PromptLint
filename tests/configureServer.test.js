import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

test('configuration rejects placeholder URLs without changing the saved service', () => {
  const config = new URL('../src/ai/serviceConfig.js', import.meta.url);
  const original = readFileSync(config, 'utf8');
  for (const url of ['https://YOUR-SERVICE.onrender.com', 'https://your-app.onrender.com', 'https://example.com']) {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/configure-server.js', import.meta.url)), url], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /placeholder URL/);
    assert.equal(readFileSync(config, 'utf8'), original);
  }
});
