import type { CategoryOf, Txn } from '../model/types';

export interface Recurring { name: string; avg: number; cat: string }

/**
 * Merchants that charge about the same amount every month: seen in at least 2 months,
 * at most one extra charge beyond one per month, and the largest charge within 20% of the smallest.
 * Needs at least two months of data.
 */
export function recurringCharges(txns: Txn[], months: string[], catOf: CategoryOf): Recurring[] {
  if (months.length < 2) return [];
  const byM = new Map<string, Txn[]>();
  for (const t of txns) if (t.amount > 0) { const e = byM.get(t.merchant) || []; e.push(t); byM.set(t.merchant, e); }
  const out: Recurring[] = [];
  for (const [name, ts] of byM) {
    const mset = new Set(ts.map(t => t.date.slice(0, 7)));
    if (mset.size < 2 || ts.length > mset.size + 1) continue;
    const amts = ts.map(t => t.amount), mn = Math.min(...amts), mx = Math.max(...amts);
    if (mx / mn <= 1.2) out.push({ name, avg: amts.reduce((a, b) => a + b, 0) / amts.length, cat: catOf(ts[0]) });
  }
  return out.sort((a, b) => b.avg - a.avg);
}
