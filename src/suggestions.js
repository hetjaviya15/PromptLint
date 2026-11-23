export function getSuggestions(issues) {
  return [...new Set(issues.map(issue => issue.suggestion))];
}
