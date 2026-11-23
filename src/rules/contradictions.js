export default {
  id: 'contradictions', name: 'Contradictions', severity: 'error',
  description: 'Finds a limited set of conflicting exclusive instructions.',
  check(text) {
    // Avoid interpreting alternatives, examples, or explicitly scoped branches as global demands.
    if (/\b(if|otherwise|either|or|instead|example prompt)\b|\b(?:first|second) (?:section|part|task)\b/i.test(text)) return [];
    const findings = [];
    const directives = text.split(/[.!?;\n]+/u)
      .filter(clause => !/\b(do not|don't|never)\b/i.test(clause)).join('. ');
    const exclusive = (pattern, label) => {
      const values = [...directives.matchAll(pattern)].map(match => match[1].toLowerCase());
      if (new Set(values).size > 1) findings.push({ message: `Conflicting ${label}: ${[...new Set(values)].join(' and ')}.`,
        suggestion: `Choose one ${label} requirement, or explicitly scope each requirement to a separate part.` });
    };
    exclusive(/\b(?:return|output|respond with) only (json|xml|csv|html|markdown|plain text)\b/gi, 'exclusive output format');
    exclusive(/\b(?:use|write|return) exactly (\d+) words\b/gi, 'exact word count');
    exclusive(/\buse only (javascript|python|java|rust|ruby|go)\b/gi, 'exclusive programming language');
    const clauses = text.split(/[.!?;\n]+|\band\b/iu).map(value => value.trim());
    const forbidden = /\b(?:do not|don't|never) include (?:any )?code\b/i.test(text);
    const required = clauses.some(clause => /^(?:and\s+)?(?:include|provide|add) (?:a |an )?code(?: example)?\b/i.test(clause));
    if (forbidden && required) findings.push({ message: 'Code is both forbidden and explicitly requested.',
      suggestion: 'Clarify whether the response should include code.' });
    return findings;
  }
};
