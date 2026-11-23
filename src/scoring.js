export const defaultWeights = Object.freeze({ info: 5, warning: 15, error: 30 });
export function calculateScore(issues, weights = defaultWeights) {
  const seen = new Set();
  const deductions = [];
  for (const { ruleId, severity } of issues) {
    if (seen.has(ruleId)) continue;
    seen.add(ruleId);
    deductions.push({ ruleId, severity, points: weights[severity] });
  }
  const totalDeduction = deductions.reduce((total, item) => total + item.points, 0);
  const score = Math.max(0, Math.min(100, 100 - totalDeduction));
  const grade = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 50 ? 'Needs improvement' : 'Poor';
  return { score, grade, deductions, totalDeduction };
}
