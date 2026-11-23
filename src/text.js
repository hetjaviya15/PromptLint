// Mask quoted source material while preserving line boundaries and apostrophes.
export function instructionText(prompt) {
  return prompt.replace(/```[\s\S]*?```|`[^`]*`|"[^"\n]*"|“[^”\n]*”|(?<![\p{L}\p{N}])'[^'\n]*'(?![\p{L}\p{N}])|‘[^’\n]*’/gu,
    match => match.replace(/[^\n]/g, ' '));
}

export function instructions(text) {
  return text.split(/[.!?;\n]+/u)
    .map(part => part.toLowerCase().replace(/^\s*(?:[-*]|\d+[.)])\s*/u, '')
      .replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/gu, ' ').trim())
    .filter(Boolean);
}
