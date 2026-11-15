import type { CategoryOf, Txn } from '../model/types';
import { merchantTotals } from './totals';

/** Fee and tax lines banks add to foreign-currency payments. */
export const FX_RE = /foreign|advance tax|\bsrb\b|\bfcy\b|cross.?border/i;
/** Purchases that look foreign (billed abroad or by well-known overseas services). */
export const FOREIGN_RE = /\b(london|dublin|singapore|amsterdam|east sussex|san francisco|usa)\b|\.com\b|facebk|facebook|google|netflix|spotify|anthropic|openai|apple\.com|amazon|aws|adobe|figma|notion|canva|steam/i;

export interface FxFees {
  /** Total fees and taxes on foreign payments */
  sum: number;
  /** Total spent with foreign merchants */
  base: number;
  /** Top foreign merchants by spend */
  merchants: string[];
}

/** What paying abroad cost in bank fees and taxes. `sum` is 0 when there were none. */
export function fxFees(spend: Txn[], catOf: CategoryOf): FxFees {
  const sum = spend.filter(t => catOf(t) === 'Fees & Charges' && FX_RE.test(t.desc)).reduce((a, t) => a + t.amount, 0);
  const foreign = spend.filter(t => catOf(t) !== 'Fees & Charges' && FOREIGN_RE.test(t.desc));
  return {
    sum,
    base: foreign.reduce((a, t) => a + t.amount, 0),
    merchants: merchantTotals(foreign, catOf).slice(0, 3).map(([n]) => n),
  };
}
