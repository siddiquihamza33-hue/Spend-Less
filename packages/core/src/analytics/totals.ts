import type { CategoryOf, Txn } from '../model/types';

type Amounted = { amount: number };

/** Sums amounts grouped by a key ("by category", "by merchant" …). */
export function sumBy<T extends Amounted>(list: T[], fn: (t: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of list) { const k = fn(t); m.set(k, (m.get(k) || 0) + t.amount); }
  return m;
}

/** Months present in the data, oldest first ("2026-09", "2026-10"). */
export const monthsOf = (txns: { date: string }[]): string[] => [...new Set(txns.map(t => t.date.slice(0, 7)))].sort();

/** Total purchases (positive amounts) in one month. */
export const monthTotal = (txns: Txn[], m: string): number =>
  txns.reduce((a, t) => a + (t.amount > 0 && t.date.startsWith(m) ? t.amount : 0), 0);

export interface MerchantTotal { v: number; n: number; cat: string }

/** Merchants ranked by money spent, with purchase count and category. */
export function merchantTotals(list: Txn[], catOf: CategoryOf): [string, MerchantTotal][] {
  const m = new Map<string, MerchantTotal>();
  for (const t of list) {
    const e = m.get(t.merchant) || { v: 0, n: 0, cat: catOf(t) };
    e.v += t.amount; e.n++;
    m.set(t.merchant, e);
  }
  return [...m].sort((a, b) => b[1].v - a[1].v);
}
