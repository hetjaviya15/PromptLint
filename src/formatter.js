export function formatReport(result) {
  if (!result || typeof result !== 'object' || !Array.isArray(result.issues)
      || typeof result.score !== 'number' || typeof result.grade !== 'string') {
    throw new TypeError('formatReport expects an analyzePrompt result.');
  }
  return ['PROMPTLINT', `Prompt Quality: ${result.score}/100 (heuristic)`, `Grade: ${result.grade}`,
    `Rules checked: ${result.rulesChecked}`, `Rules reporting issues: ${result.issuesFound}`, '',
    ...result.issues.flatMap(issue => [`[${issue.severity.toUpperCase()}] ${issue.ruleId}`, issue.message,
      `Suggestion: ${issue.suggestion}`, '']),
    `Score deductions: ${result.deductions.map(item => `${item.ruleId} -${item.points}`).join(', ') || 'none'}`,
    result.summary].join('\n');
}
