import { analyzePrompt, formatReport } from 'promptlint-lite';
console.log(formatReport(analyzePrompt('Write good code for a website')));
