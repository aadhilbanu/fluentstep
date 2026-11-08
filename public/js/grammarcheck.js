// Free grammar checking with the public LanguageTool API (https://languagetool.org).
// Called from the learner's browser, once per answer they submit, so each learner
// uses their own small quota. The public API requires a visible link back to
// LanguageTool, which feedback cards show whenever this check runs.
const ENDPOINT = 'https://api.languagetool.org/v2/check';
const SKIP_SPOKEN = new Set(['CASING', 'PUNCTUATION', 'TYPOGRAPHY', 'WHITESPACE']);
const SKIP_ALWAYS = new Set(['STYLE', 'REDUNDANCY', 'PLAIN_ENGLISH']);

export const LT_CREDIT = '<a href="https://languagetool.org" target="_blank" rel="noopener">LanguageTool</a>';

/** Returns { corrected, mistakes } or null if the service is unavailable. */
export async function checkGrammar(text, { spoken = false } = {}) {
  if (!text || text.length > 5000) return null;
  try {
    const body = new URLSearchParams({ text, language: 'en-GB', motherTongue: 'ta' });
    const res = await fetch(ENDPOINT, { method: 'POST', body, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const { matches = [] } = await res.json();
    const used = matches.filter((m) => {
      const cat = m.rule?.category?.id;
      const wrong = text.slice(m.offset, m.offset + m.length);
      if (!m.replacements?.length || SKIP_ALWAYS.has(cat)) return false;
      if (spoken && SKIP_SPOKEN.has(cat)) return false;
      // Names of people and places (Madurai, Priya) are not spelling mistakes.
      if (cat === 'TYPOS' && /^[A-Z]/.test(wrong)) return false;
      return true;
    });
    let corrected = text;
    for (const m of [...used].sort((a, b) => b.offset - a.offset)) {
      corrected = corrected.slice(0, m.offset) + m.replacements[0].value + corrected.slice(m.offset + m.length);
    }
    const mistakes = used.map((m) => ({
      type: m.rule.category.id === 'TYPOS' ? 'Spelling' : m.shortMessage || m.rule.category.name || 'Grammar',
      wrong: text.slice(m.offset, m.offset + m.length),
      right: m.replacements[0].value,
      why: m.message,
    }));
    return { corrected, mistakes };
  } catch {
    return null;
  }
}
