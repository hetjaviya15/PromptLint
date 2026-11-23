export default {
  id: 'vague-language', name: 'Vague language', severity: 'warning',
  description: 'Flags vague requests without nearby explicit criteria.',
  check(text) {
    const findings = [];
    for (const clause of text.split(/[.!?;\n]+/u)) {
      if (!/\b(write|create|build|make|give|choose|select|improve|do|provide|generate)\b/i.test(clause)) continue;
      if (/\b(defined as|meaning|means|measured by|according to|by using)\b|\b(?:with|using)\b.{0,60}\b(?:tests|contrast|latency|headings|tone|layout|criteria)\b/i.test(clause)) continue;
      const matches = clause.match(/\b(?:make it professional|do it properly|make it amazing|good|nice|better|best|something)\b/gi);
      if (matches) findings.push(...matches.map(value => value.toLowerCase()));
    }
    return findings.length ? [{ message: `Potentially vague wording: ${[...new Set(findings)].join(', ')}.`,
      suggestion: 'Replace subjective wording with concrete requirements or measurable acceptance criteria.' }] : [];
  }
};
