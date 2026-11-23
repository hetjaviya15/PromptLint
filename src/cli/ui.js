import { Chalk } from 'chalk';
import boxen from 'boxen';
import wrapAnsi from 'wrap-ansi';
import stringWidth from 'string-width';
import { stripVTControlCharacters } from 'node:util';

export const cleanText = value => stripVTControlCharacters(String(value))
  .replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/gu, '').replace(/\t/g, '  ');

export function createUI(options = {}) {
  const requestedWidth = options.width ?? process.stdout.columns ?? 80;
  const width = Math.max(10, Math.min(88, Number.isFinite(requestedWidth) ? Math.floor(requestedWidth) : 80));
  const color = options.color ?? (Boolean(process.stdout.isTTY) && process.env.TERM !== 'dumb');
  const unicode = options.unicode ?? (process.env.TERM !== 'dumb' && process.platform !== 'win32');
  const c = new Chalk({ level: color && process.env.NO_COLOR === undefined ? 1 : 0 });
  const wrap = (text, columns = width) => wrapAnsi(text, Math.max(1, columns), { hard: true, trim: false });
  const bar = (score, size = 20) => {
    size = Math.max(3, Math.min(size, width - 12));
    const filled = Math.round(Math.max(0, Math.min(100, score)) / 100 * size);
    return c.cyan((unicode ? '━' : '#').repeat(filled)) + c.gray((unicode ? '─' : '-').repeat(size - filled));
  };
  const panel = (title, content, borderColor = 'cyan') => {
    if (width < 40 || !unicode) return `${c.bold(title)}\n${wrap(content)}`;
    return boxen(wrap(content, width - 6), {
      title: c.bold(title), titleAlignment: 'left', width,
      padding: { top: 1, bottom: 1, left: 2, right: 2 }, borderStyle: 'round',
      ...(c.level ? { borderColor } : {})
    });
  };
  const section = title => {
    const label = c.bold(title);
    const remaining = Math.max(0, width - stringWidth(title) - 3);
    return `${label} ${c.gray((unicode ? '─' : '-').repeat(remaining))}`;
  };
  const list = (items, marker = unicode ? '›' : '>') => items.map(item => {
    const lines = wrap(cleanText(item), width - 4).split('\n');
    return `  ${c.cyan(marker)} ${lines.join('\n    ')}`;
  }).join('\n');
  const header = () => panel('PROMPTLINT', `${c.cyan.bold('Analyze. Score. Improve.')}\n${c.gray('A clearer prompt starts here.')}`);
  return { c, bar, panel, wrap, unicode, width, section, list, header };
}
