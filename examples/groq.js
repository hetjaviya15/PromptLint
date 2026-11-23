import { analyzePromptAI, improvePrompt, formatReport } from 'promptlint-ai';
// Explicit AI calls send this prompt to Groq. Requires GROQ_API_KEY.
const prompt = 'Write good code for a website';
try {
  const result = await analyzePromptAI(prompt);
  console.log(formatReport(result));
  // For a rewrite instead of a scoring report, call improvePrompt.
  // const improved = await improvePrompt(prompt, { provider: 'groq' });
  // if (improved.mode === 'ai') console.log(improved.improvedPrompt);
} catch (error) { console.error(error.message); process.exitCode = 1; }
