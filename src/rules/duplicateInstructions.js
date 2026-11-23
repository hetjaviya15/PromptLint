import { instructions } from '../text.js';
export default {
  id: 'duplicate-instructions', name: 'Duplicate instructions', severity: 'info',
  description: 'Detects repeated instructions after case and punctuation normalization.',
  check(text) {
    const seen = new Set();
    const repeated = new Set();
    for (const instruction of instructions(text)) {
      if (instruction.split(' ').length < 2) continue;
      if (seen.has(instruction)) repeated.add(instruction);
      seen.add(instruction);
    }
    return repeated.size ? [{ message: `${repeated.size} instruction(s) are repeated.`,
      suggestion: 'Keep one copy of each repeated instruction.' }] : [];
  }
};
