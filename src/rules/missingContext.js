export default {
  id: 'missing-context', name: 'Missing context', severity: 'warning',
  description: 'Checks relevant programming, website, and content requirements.',
  check(text) {
    const findings = [];
    const request = /\b(write|create|build|implement|develop|generate)\b/i.test(text);
    const programming = request && /\b(code|function|script|program|component|api|app|website)\b/i.test(text);
    const technology = /\b(javascript|typescript|python|java|c\+\+|c#|c|ruby|rust|go|golang|php|swift|kotlin|sql|bash|shell|html|css|react|vue|angular|svelte|node(?:\.js)?|next(?:\.js)?|django|flask|rails|pseudocode)\b/i.test(text);
    if (programming && !technology && !/\b(any language|language agnostic)\b/i.test(text)) {
      findings.push({ message: 'The programming request does not specify a language or framework.',
        suggestion: 'Specify a language or framework, or explicitly allow any language.' });
    }
    if (request && /\bwebsite\b/i.test(text) && !/\b(with|that|for|including|featuring|requirements)\b/i.test(text)) {
      findings.push({ message: 'The website request does not state its purpose or functionality.',
        suggestion: 'Describe the website’s purpose and required pages or functionality.' });
    }
    if (request && /\b(article|blog post|essay|story|email|content)\b/i.test(text)
        && !/\b(about|on|for|to|regarding|announcing)\b|:/i.test(text)) {
      findings.push({ message: 'The content request does not clearly state a subject or purpose.',
        suggestion: 'State the subject or purpose of the requested content.' });
    }
    return findings;
  }
};
