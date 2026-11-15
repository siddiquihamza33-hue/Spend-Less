/**
 * Reads an amount as a bank prints it. Negative when it carries CR, brackets or a minus:
 * "1,250.00" → 1250, "-5,000.00" → -5000, "(300.00)" → -300, "2,500.00 CR" → -2500, "Rs. 4,500" → 4500.
 */
export function parseAmount(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  let neg = false;
  if (/\bcr\.?$|\bcr\b/i.test(s)) neg = true;
  if (/^\(.*\)$/.test(s)) neg = true;
  if (/^-|^[A-Za-z.$€£₨\s]*-\s*\d|\d-$/.test(s)) neg = true;
  const m = s.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return neg ? -n : n;
}

/** True when a cell looks like an amount (used to guess columns in files without headers). */
export const looksLikeAmount = (v: unknown): boolean =>
  typeof v === 'number' ||
  /^[\s(]*-?\s*(?:[A-Za-z]{2,3}\.?\s?|[$€£₨]\s?)?-?[\d,]+(?:\.\d{1,2})?\s*\)?\s*(?:cr|dr|-)?\s*$/i.test(String(v ?? ''));
