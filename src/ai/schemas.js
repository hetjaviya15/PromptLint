const text = { type: 'string', minLength: 1, maxLength: 20000 };
const strings = { type: 'array', maxItems: 30, items: text };
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const dimensionWeights = Object.freeze({ clarity: 25, context: 25, specificity: 20, outputFormat: 15, consistency: 15 });
export const evaluationSchema = object({
  dimensions: object(Object.fromEntries(Object.keys(dimensionWeights).map(key => [key, { type: 'number', minimum: 0, maximum: 100 }]))),
  issues: { type: 'array', maxItems: 30, items: object({
    severity: { type: 'string', enum: ['info', 'warning', 'error'] }, message: text, suggestion: text
  }) },
  suggestions: strings, summary: text, improvedPrompt: text, explanation: text,
  improvements: strings, clarificationQuestions: strings
});

// Small validator for precisely the schema constructs above, also used for JSON mode.
export function matchesSchema(value, schema) {
  if (schema.type === 'object') {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      && Object.keys(value).every(key => Object.hasOwn(schema.properties, key))
      && schema.required.every(key => Object.hasOwn(value, key) && matchesSchema(value[key], schema.properties[key]));
  }
  if (schema.type === 'array') return Array.isArray(value) && value.length <= schema.maxItems && value.every(item => matchesSchema(item, schema.items));
  if (schema.type === 'number') return typeof value === 'number' && Number.isFinite(value) && value >= schema.minimum && value <= schema.maximum;
  if (schema.type === 'string') return typeof value === 'string'
    && (schema.minLength === undefined || value.trim().length >= schema.minLength)
    && (schema.maxLength === undefined || value.length <= schema.maxLength)
    && (!schema.enum || schema.enum.includes(value));
  return false;
}
export function weightedScore(dimensions) {
  return Math.round(Object.entries(dimensionWeights).reduce((sum, [key, weight]) => sum + dimensions[key] * weight, 0) / 100);
}

export const analysisSchema = object(Object.fromEntries(
  ['dimensions', 'issues', 'suggestions', 'summary'].map(key => [key, evaluationSchema.properties[key]])
));
export const improvementSchema = object(Object.fromEntries(
  ['improvedPrompt', 'explanation', 'improvements', 'clarificationQuestions'].map(key => [key, evaluationSchema.properties[key]])
));
export function schemaForAction(action) {
  return action === 'analyze' ? analysisSchema : action === 'improve' ? improvementSchema : evaluationSchema;
}
export function selectResult(data, action) {
  const schema = schemaForAction(action);
  // Accept a complete legacy response during rolling backend upgrades, but expose only the chosen action.
  if (!matchesSchema(data, schema) && !matchesSchema(data, evaluationSchema)) throw new Error('Invalid response schema.');
  return Object.fromEntries(Object.keys(schema.properties).map(key => [key, data[key]]));
}
