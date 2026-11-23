import { spawn } from 'node:child_process';

// No shell is involved: prompt text is written to stdin, never executed.
export async function copyToClipboard(text, { platform = process.platform, env = process.env, run = spawn } = {}) {
  const commands = platform === 'darwin' ? [['pbcopy', []]]
    : platform === 'win32' ? [['clip.exe', []]]
      : [...(env.WAYLAND_DISPLAY ? [['wl-copy', []]] : []), ['xclip', ['-selection', 'clipboard']], ['xsel', ['--clipboard', '--input']]];
  for (const [command, args] of commands) {
    const success = await new Promise(resolve => {
      let child;
      try { child = run(command, args, { stdio: ['pipe', 'ignore', 'ignore'], timeout: 3000 }); }
      catch { resolve(false); return; }
      child.once('error', () => resolve(false));
      child.once('close', code => resolve(code === 0));
      child.stdin.on('error', () => resolve(false));
      child.stdin.end(platform === 'win32' ? Buffer.from(text, 'utf16le') : text);
    });
    if (success) return true;
  }
  return false;
}
