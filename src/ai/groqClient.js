import Groq from 'groq-sdk';
import { DEFAULT_SERVICE_URL } from './serviceConfig.js';
import { validateServiceUrl } from './sharedClient.js';
import { evaluationSchema, matchesSchema } from './schemas.js';
import { aiInstructions } from './aiInstructions.js';

export const DEFAULT_MODEL = 'openai/gpt-oss-20b';
const strictModels = new Set(['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'meta-models/muse-spark-open']);
export class AIError extends Error {
  constructor(code, message) { super(message); this.name = 'AIError'; this.code = code; }
}
export function safeAIError(error) {
  if (error instanceof AIError) return error;
  if (error?.status === 401 || error?.status === 403) return new AIError('AUTH', 'Groq authentication failed. Check GROQ_API_KEY and account permissions.');
  if (error?.status === 429) return new AIError('RATE_LIMIT', 'Groq rate limit reached. Wait before retrying or review your account limits.');
  if (error?.name === 'APIConnectionTimeoutError' || error?.name === 'AbortError') return new AIError('TIMEOUT', 'Groq request timed out. Retry later or increase timeoutMs.');
  if (error?.status === 400 || error?.status === 404) return new AIError('REQUEST', 'Groq rejected the request. Check model availability, output mode, and prompt size.');
  return new AIError('UNAVAILABLE', 'Groq is unavailable. Check your network connection and retry later.');
}
export function configureAI(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options) || ![Object.prototype, null].includes(Object.getPrototypeOf(options))) throw new TypeError('AI options must be a plain object.');
  const allowed = ['apiKey', 'provider', 'model', 'timeoutMs', 'fallback', 'offlineOptions', 'responseFormat', 'serviceUrl'];
  if (Object.keys(options).some(key => !allowed.includes(key))) throw new TypeError('Unknown AI option.');
  if (options.provider !== undefined && options.provider !== 'groq') throw new TypeError('Only the groq provider is supported.');
  const model = options.model ?? DEFAULT_MODEL;
  if (typeof model !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9/_.-]{0,149}$/.test(model)) throw new TypeError('model must be a valid model identifier.');
  const endpoint = options.serviceUrl ?? (options.apiKey !== undefined ? '' : (process.env.PROMPTLINT_SERVICE_URL ?? DEFAULT_SERVICE_URL));
  const serviceUrl = endpoint ? validateServiceUrl(endpoint) : '';
  if (serviceUrl && options.apiKey !== undefined) throw new TypeError('Choose serviceUrl or apiKey, not both.');
  if (serviceUrl && (options.model !== undefined || options.responseFormat !== undefined)) throw new TypeError('The shared service controls its model and response format.');
  const timeoutMs = options.timeoutMs ?? (serviceUrl ? 120000 : 30000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300000) throw new TypeError('timeoutMs must be an integer from 1 to 300000.');
  if (options.fallback !== undefined && typeof options.fallback !== 'boolean') throw new TypeError('fallback must be boolean.');
  const responseFormat = options.responseFormat ?? 'auto';
  if (!['auto', 'json_schema', 'json_object'].includes(responseFormat)) throw new TypeError('Invalid responseFormat.');
  if (serviceUrl) return { serviceUrl, timeoutMs, fallback: options.fallback ?? true, offlineOptions: options.offlineOptions };
  const apiKey = options.apiKey ?? process.env.GROQ_API_KEY;
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw new AIError('MISSING_KEY', 'AI mode requires GROQ_API_KEY. Set it in your environment, or pass apiKey in trusted server-side JavaScript. Use --offline without a key.');
  return { model, timeoutMs, responseFormat, apiKey: apiKey.trim(), fallback: options.fallback ?? true, offlineOptions: options.offlineOptions };
}
export function createClient(settings) {
  const noop = () => {};
  return new Groq({ apiKey: settings.apiKey, baseURL: 'https://api.groq.com', timeout: settings.timeoutMs,
    maxRetries: 0, logLevel: 'off', logger: { debug: noop, info: noop, warn: noop, error: noop } });
}
export async function requestEvaluation(prompt, settings, clientFactory = createClient) {
  let timer;
  const controller = new AbortController();
  try {
    const useSchema = settings.responseFormat === 'json_schema'
      || (settings.responseFormat === 'auto' && strictModels.has(settings.model));
    const client = clientFactory(settings);
    const request = client.chat.completions.create({
      model: settings.model,
      messages: [{ role: 'system', content: `${aiInstructions}\nJSON schema: ${JSON.stringify(evaluationSchema)}` },
        { role: 'user', content: prompt }],
      response_format: useSchema ? { type: 'json_schema', json_schema: { name: 'prompt_evaluation', strict: true, schema: evaluationSchema } }
        : { type: 'json_object' },
      max_completion_tokens: settings.maxCompletionTokens ?? 8192
    }, { signal: controller.signal });
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new AIError('TIMEOUT', 'Groq request timed out. Retry later or increase timeoutMs.'));
        controller.abort();
      }, settings.timeoutMs);
    });
    const response = await Promise.race([request, deadline]);
    const choice = response?.choices?.[0];
    if (choice?.finish_reason !== 'stop' || typeof choice.message?.content !== 'string' || choice.message.content.length > 200000) {
      throw new AIError('INVALID_RESPONSE', 'Groq returned an incomplete or invalid evaluation. Please retry.');
    }
    let data;
    try { data = JSON.parse(choice.message.content); } catch { /* handled by validation below */ }
    if (!matchesSchema(data, evaluationSchema)) throw new AIError('INVALID_RESPONSE', 'Groq returned an evaluation that did not match the expected schema. Please retry.');
    return data;
  } catch (error) {
    throw safeAIError(error);
  } finally { clearTimeout(timer); }
}
