import { analyzePrompt } from '../analyzer.js';
import { configureAI, requestEvaluation, safeAIError } from './groqClient.js';
import { requestSharedEvaluation } from './sharedClient.js';
import { weightedScore } from './schemas.js';

// Internal injection point keeps automated tests independent of a live service.
export function createAIAnalyzer(request = requestEvaluation) {
  return async function analyzePromptAI(prompt, options = {}) {
    if (typeof prompt !== 'string') throw new TypeError('prompt must be a string.');
    if (!prompt.trim()) throw new TypeError('AI analysis requires a non-empty prompt.');
    const settings = configureAI(options);
    const offline = analyzePrompt(prompt, settings.offlineOptions);
    try {
      const response = settings.serviceUrl
        ? await requestSharedEvaluation(prompt, settings)
        : { evaluation: await request(prompt, settings), model: settings.model };
      const data = response.evaluation;
      const score = weightedScore(data.dimensions);
      const grade = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 50 ? 'Needs improvement' : 'Poor';
      return { mode: 'ai', scoreSource: 'ai-subjective', provider: 'groq', model: response.model, transport: settings.serviceUrl ? 'shared' : 'direct',
        prompt, originalPrompt: prompt, score, grade, ...data,
        issues: data.issues.map(issue => ({ ruleId: 'ai-evaluation', ...issue })), issuesFound: data.issues.length };
    } catch (error) {
      const safe = safeAIError(error);
      if (!settings.fallback) throw safe;
      return { ...offline, requestedMode: 'ai', fallbackReason: safe.code,
        warnings: [`${safe.message} Showing offline heuristic analysis; no AI score or improved prompt was generated.`] };
    }
  };
}
export const analyzePromptAI = createAIAnalyzer();
