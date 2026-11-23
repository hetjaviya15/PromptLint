import { AIError } from './groqClient.js';
import { evaluationSchema, matchesSchema } from './schemas.js';

export function validateServiceUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new TypeError('serviceUrl must be an HTTPS URL (HTTP is allowed only for localhost).'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new TypeError('serviceUrl must be an HTTPS origin without credentials, query, or path. HTTP is allowed only for localhost.');
  }
  return url.origin;
}

export async function requestSharedEvaluation(prompt, settings, fetchRequest = fetch) {
  try {
    const response = await fetchRequest(`${settings.serviceUrl}/v1/evaluate`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      // Never forward credentials, model overrides, environment data, or SDK options.
      body: JSON.stringify({ prompt }), signal: AbortSignal.timeout(settings.timeoutMs), redirect: 'error'
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 429) throw new AIError('RATE_LIMIT', 'The shared AI service has reached its usage limit. Try again later or use Offline mode.');
      if (response.status === 400 || response.status === 413) throw new AIError('REQUEST', 'The shared AI service rejected the prompt. Use a non-empty prompt of at most 8000 characters.');
      throw new AIError('UNAVAILABLE', 'The shared AI service is unavailable. Try again later or use Offline mode.');
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Missing response');
    let size = 0;
    const chunks = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 250000) throw new Error('Oversized response');
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!matchesSchema(result.evaluation, evaluationSchema) || typeof result.model !== 'string'
      || !/^[a-zA-Z0-9][a-zA-Z0-9/_.-]{0,149}$/.test(result.model)) throw new Error('Invalid evaluation');
    return { evaluation: result.evaluation, model: result.model };
  } catch (error) {
    if (error instanceof AIError) throw error;
    if (['TimeoutError', 'AbortError'].includes(error?.name)) throw new AIError('TIMEOUT', 'The shared AI service timed out. A sleeping free server may need a minute to wake; retry shortly.');
    throw new AIError('UNAVAILABLE', 'The shared AI service could not return a valid evaluation. Try again later or use Offline mode.');
  }
}
