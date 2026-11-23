import vagueLanguage from './vagueLanguage.js';
import missingContext from './missingContext.js';
import outputFormat from './outputFormat.js';
import contradictions from './contradictions.js';
import duplicateInstructions from './duplicateInstructions.js';
import { emptyPrompt, promptLength, repeatedText } from './promptLength.js';
export const rules = [emptyPrompt, vagueLanguage, missingContext, outputFormat, contradictions, duplicateInstructions, promptLength, repeatedText];
export function getAvailableRules() {
  return rules.map(({ id, name, description, severity }) => ({ id, name, description, severity }));
}
