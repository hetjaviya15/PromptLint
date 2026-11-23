import { createUI, cleanText } from './cli/ui.js';

const labels = { clarity: 'Clarity', context: 'Context', specificity: 'Specificity', outputFormat: 'Output format', consistency: 'Consistency' };

export function formatReport(result, options = {}) {
  if (!result || !Array.isArray(result.issues) || !Number.isFinite(result.score) || typeof result.grade !== 'string') {
    throw new TypeError('formatReport expects an analysis result.');
  }
  const { c, bar, panel, wrap, unicode, width, section, list, header } = createUI(options);
  const ai = result.mode === 'ai';
  const scoreColor = result.score >= 90 ? c.green : result.score >= 50 ? c.yellow : c.red;
  const separator = unicode ? ' · ' : ' | ';
  const source = ai ? 'AI subjective' : 'heuristic';
  const blocks = [header(),
    `${c.cyan.bold(ai ? 'GROQ AI' : 'OFFLINE')}${separator}${c.gray(ai ? `${cleanText(result.model)}${result.transport === 'shared' ? ' · shared service' : ''}` : 'Local analysis. No API required.')}`];
  if (result.warnings?.length) blocks.push(panel('SERVICE NOTICE', result.warnings.map(cleanText).join('\n\n'), 'yellow'));
  const overview = [
    `${scoreColor.bold(`${result.score}/100`)} (${source})${separator}${scoreColor(cleanText(result.grade))}`,
    '', `${bar(result.score, 28)}  ${result.score}%`, '',
    c.gray(ai ? `${result.issues.length} finding(s)${separator}5 scoring dimensions` : `${result.rulesChecked} checks${separator}${result.issuesFound} flagged rules`)
  ];
  blocks.push(panel('PROMPT QUALITY', overview.join('\n'), result.score >= 90 ? 'green' : result.score >= 50 ? 'yellow' : 'red'));
  if (ai) {
    blocks.push(section('SCORE BREAKDOWN'));
    blocks.push(Object.entries(result.dimensions).map(([key, value]) => {
      const label = labels[key] ?? cleanText(key);
      return width >= 48 ? `  ${label.padEnd(15)} ${bar(value, Math.min(24, width - 26))}  ${String(value).padStart(3)}`
        : `${label}  ${value}/100\n${bar(value, 16)}`;
    }).join('\n'));
  }
  if (result.issues.length) {
    blocks.push(section(`FINDINGS  ${String(result.issues.length).padStart(2, '0')}`));
    result.issues.forEach((issue, index) => {
      const accent = issue.severity === 'error' ? c.red : issue.severity === 'warning' ? c.yellow : c.cyan;
      const title = issue.ruleId === 'ai-evaluation' ? `Finding ${index + 1}` : cleanText(issue.ruleId);
      blocks.push(`${accent.bold(`[${issue.severity.toUpperCase()}]`)} ${c.bold(title)}\n`
        + wrap(cleanText(issue.message)) + '\n'
        + c.cyan('Suggestion: ') + wrap(cleanText(issue.suggestion), width - 12).split('\n').join('\n            '));
    });
  } else blocks.push(c.green(`${unicode ? '✓' : 'OK'} No issues detected by this analysis.`));
  // Findings already show their recommendations; only show additional suggestions here.
  const shown = new Set(result.issues.map(issue => issue.suggestion.trim()));
  const additional = result.suggestions.filter(item => !shown.has(item.trim()));
  if (additional.length) blocks.push(section(ai ? 'AI SUGGESTIONS' : 'RECOMMENDATIONS'), list(additional));
  if (ai) {
    blocks.push(panel('YOUR IMPROVED PROMPT', cleanText(result.improvedPrompt), 'green'));
    blocks.push(section('WHY THIS CHANGED'), wrap(cleanText(result.explanation)));
    if (result.improvements.length) blocks.push(list(result.improvements, '+'));
    if (result.clarificationQuestions.length) blocks.push(section('DETAILS TO CLARIFY'), list(result.clarificationQuestions, '?'));
    blocks.push(c.gray('Review the rewrite before using it. AI can introduce assumptions.'));
  } else blocks.push(c.gray(`Score deductions: ${result.deductions.map(item => `${item.ruleId} -${item.points}`).join(', ') || 'none'}`));
  blocks.push(section('SUMMARY'), wrap(cleanText(result.summary)),
    c.green(`${unicode ? '✓' : 'OK'} Analysis complete.`) + separator + c.gray(ai ? 'Subjective estimates, not guarantees.' : 'Heuristic scores, not guarantees.'));
  return wrap(blocks.join('\n\n'));
}
