export default {
  id: 'output-format', name: 'Output format', severity: 'info',
  description: 'Suggests a format for extraction and structured data requests.',
  check(text) {
    const structured = /\b(extract|structured output|structured data|dataset|machine.readable)\b/i.test(text);
    const explicit = /\b(json|markdown|html|xml|csv|tables?|bullet(?:ed)?(?: points)?|code|plain text)\b/i.test(text);
    return structured && !explicit ? [{ message: 'This structured-data request does not specify an output format.',
      suggestion: 'Choose a suitable format, such as JSON, CSV, or a table, and state the fields to include.' }] : [];
  }
};
