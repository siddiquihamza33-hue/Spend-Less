import type { ParsedTxn, WorkingRow } from '../model/types';

/** Descriptions that mean money coming back to the card. */
export const CREDIT_RE = /\b(payment received|payment - thank|thank you|payment thank|refund|reversal|reversed|cash ?back|credit adj|credit voucher|chargeback|payment rcvd)\b/i;

/**
 * Banks disagree on sign. Purchases are the majority of rows, so when most single-column
 * amounts are negative, flip them. Then anything that reads like a payment or refund is a credit.
 */
export function normalizeSigns(rows: WorkingRow[]): ParsedTxn[] {
  const single = rows.filter(t => t.single);
  const neg = single.filter(t => t.amount < 0).length;
  if (single.length && neg > single.length / 2) single.forEach(t => (t.amount = -t.amount));
  rows.forEach(t => {
    delete t.single;
    if (t.amount > 0 && CREDIT_RE.test(t.desc) && !/fee|charge/i.test(t.desc)) t.amount = -t.amount;
  });
  return rows;
}

/** Identity of a transaction for de-duplication (same statement uploaded twice). */
export const keyOf = (t: Pick<ParsedTxn, 'date' | 'desc' | 'amount'>): string =>
  `${t.date}|${t.desc.toLowerCase()}|${t.amount.toFixed(2)}`;
