import { rules } from './rules/index.js';
import { calculateScore, defaultWeights } from './scoring.js';
import { getSuggestions } from './suggestions.js';
import { instructionText } from './text.js';

function object(value, name) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError(`${name} must be a plain object.`);
  }
}
function configure(options) {
  object(options, 'options');
  for (const key of Object.keys(options)) {
    if (!['rules', 'maxLength', 'maxWords', 'weights'].includes(key)) throw new TypeError(`Unknown option: ${key}`);
  }
  const settings = { maxLength: 10000, maxWords: 2000, ...options };
  for (const key of ['maxLength', 'maxWords']) {
    if (!Number.isSafeInteger(settings[key]) || settings[key] < 1) throw new TypeError(`${key} must be a positive safe integer.`);
  }
  settings.rules = options.rules ?? {};
  settings.weights = { ...defaultWeights };
  if ('rules' in options) object(options.rules, 'rules');
  if ('weights' in options) object(options.weights, 'weights');
  for (const [id, enabled] of Object.entries(settings.rules)) {
    if (!rules.some(rule => rule.id === id)) throw new TypeError(`Unknown rule: ${id}`);
    if (typeof enabled !== 'boolean') throw new TypeError(`Rule ${id} must be boolean.`);
  }
  for (const [severity, weight] of Object.entries(options.weights ?? {})) {
    if (!Object.hasOwn(defaultWeights, severity) || !Number.isInteger(weight) || weight < 0 || weight > 100) {
      throw new TypeError('Weights must use info, warning, or error and integer values from 0 to 100.');
    }
    settings.weights[severity] = weight;
  }
  return settings;
}

export function analyzePrompt(prompt, options = {}) {
  if (typeof prompt !== 'string') throw new TypeError('prompt must be a string.');
  const settings = configure(options);
  const stats = { characters: [...prompt].length, words: prompt.trim() ? prompt.trim().split(/\s+/u).length : 0 };
  const text = instructionText(prompt.normalize('NFC'));
  const enabled = rules.filter(rule => settings.rules[rule.id] !== false);
  const issues = enabled.flatMap(rule => {
    // Empty input has no instructions for contextual rules to inspect.
    if (!prompt.trim() && rule.id !== 'empty-prompt') return [];
    return rule.check(text, { prompt, stats, options: settings })
      .map(finding => ({ ruleId: rule.id, severity: rule.severity, ...finding }));
  });
  const issuesFound = new Set(issues.map(issue => issue.ruleId)).size;
  return { mode: 'offline', scoreSource: 'heuristic', prompt, ...calculateScore(issues, settings.weights), issues, suggestions: getSuggestions(issues),
    summary: issuesFound ? `${issuesFound} rule(s) reported potential issues. Review the suggestions for clarity.`
      : 'No issues detected by the enabled heuristic rules.',
    rulesChecked: enabled.length, issuesFound, stats };
}
