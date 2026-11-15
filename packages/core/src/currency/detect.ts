const CUR_CODES = 'PKR|USD|AED|GBP|EUR|SAR|INR|CAD|AUD|QAR|OMR|KWD|BHD|MYR|SGD|NZD|TRY|BDT|LKR|CNY|JPY|CHF|ZAR';

/**
 * Reads the billing currency from the statement itself. Column headers and balance lines
 * ("Amount (PKR)", "Current Balance: PKR 1,34,453") count most; codes or symbols next to
 * amounts count a little. Foreign-purchase notes ("USD Amount: 3.97 … Rate: 277.9") are ignored.
 * Returns an ISO code, or null when the file names no currency.
 */
export function detectCurrency(text: string): string | null {
  const t = String(text)
    .replace(new RegExp(`\\b(?:${CUR_CODES})\\s+Amount:\\s*[\\d,.]+`, 'gi'), ' ')
    .replace(new RegExp(`\\b(?:${CUR_CODES})\\s+Conversion\\b`, 'gi'), ' ')
    .replace(/\bRate:\s*[\d.,]+/gi, ' ')
    .replace(/\bFCY\b[^)\n]*/gi, ' ');
  const score: Record<string, number> = {};
  const add = (c: string, w: number) => { c = c.toUpperCase(); score[c] = (score[c] || 0) + w; };
  for (const m of t.matchAll(new RegExp(`(amount|amt|balance|limit|due|total|debit|credit|billing|payment|value)[^\\n\\d]{0,24}?[(\\[:\\s]\\s*(${CUR_CODES})\\b`, 'gi'))) add(m[2], 10);
  for (const m of t.matchAll(new RegExp(`\\((${CUR_CODES})\\)`, 'gi'))) add(m[1], 8);
  for (const m of t.matchAll(new RegExp(`\\b(${CUR_CODES})\\s?-?[\\d]`, 'g'))) add(m[1], 1);
  const sym: [RegExp, string][] = [[/\bRs\.?\s?\d/g, 'PKR'], [/₨\s?\d/g, 'PKR'], [/\$\s?\d/g, 'USD'], [/£\s?\d/g, 'GBP'], [/€\s?\d/g, 'EUR'], [/₹\s?\d/g, 'INR'], [/د\.إ/g, 'AED'], [/﷼/g, 'SAR']];
  for (const [re, c] of sym) { const n = (t.match(re) || []).length; if (n) add(c, n); }
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}

/** Statements in these currencies usually write dates month-first. */
export const prefersMonthFirst = (cur: string | null): boolean => cur === 'USD' || cur === 'CAD';
