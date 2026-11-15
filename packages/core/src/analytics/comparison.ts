import type { CategoryOf, Txn } from '../model/types';

export interface CategoryChange {
  /** Spend in the latest month */
  a: number;
  /** Spend in the month before */
  b: number;
  /** a − b */
  d: number;
  /** Percentage change, or null when the month before was 0 */
  p: number | null;
}

/** Category × month spend for the given months: matrix[category][month] = total. */
export function categoryMonthMatrix(spend: Txn[], months: string[], catOf: CategoryOf): Record<string, Record<string, number>> {
  const val: Record<string, Record<string, number>> = {};
  for (const t of spend) {
    if (t.amount <= 0) continue;
    const m = t.date.slice(0, 7);
    if (!months.includes(m)) continue;
    const c = catOf(t);
    (val[c] = val[c] || {})[m] = (val[c][m] || 0) + t.amount;
  }
  return val;
}

/** Change between two values, with the percentage when it can be computed. */
export function change(current: number, previous: number): CategoryChange {
  const d = current - previous;
  return { a: current, b: previous, d, p: previous ? (d / previous) * 100 : null };
}
