import { createContext, useContext } from 'react';
import {
  makeCategoryOf, merchantTotals as mt, money as fmtMoney, moneyShort as fmtShort, monthsOf, monthTotal as mTotal,
  recurringCharges as recur, statementLabels, sumBy, type CategoryOf, type Recurring, type Txn,
} from '@spend-lens/core';
import type { AppState } from './store';

/** Fixed colour per category (colour follows the entity, never its rank). */
const CAT_COLOR: Record<string, string> = {
  'Food & Dining': 'var(--c-food)', 'Groceries': 'var(--c-groc)', 'Transport & Fuel': 'var(--c-trans)', 'Shopping': 'var(--c-shop)',
  'Bills & Utilities': 'var(--c-bills)', 'Subscriptions': 'var(--c-subs)', 'Advertising': 'var(--c-ads)', 'Fees & Charges': 'var(--c-fees)',
};

export const plural = (n: number, w: string, many?: string) => `${n} ${n === 1 ? w : many || w + 's'}`;

/** Everything the pages derive from the saved data and the current filters, computed once per change. */
export interface View {
  has: boolean;
  curs: string[];
  activeCur: string;
  /** transactions in the currency being viewed */
  tx: Txn[];
  catOf: CategoryOf;
  catColor: (c: string) => string;
  months: string[];
  month: string;                  // effective month filter
  category: string | null;        // effective category filter
  period: Txn[];
  spend: Txn[];
  credits: Txn[];
  total: number;
  byCat: [string, number][];
  nMonths: number;
  files: string[];
  fileInfo: Record<string, { c: string; g: boolean; name: string }>;
  labels: Record<string, string>;
  money: (n: number, compact?: boolean) => string;
  moneyShort: (n: number) => string;
  monthTotal: (m: string) => number;
  recurring: (ms: string[]) => Recurring[];
  merchantTotals: (list: Txn[]) => ReturnType<typeof mt>;
}

export function computeView(s: Pick<AppState, 'txns' | 'overrides' | 'viewCur' | 'month' | 'category'>): View {
  const counts: Record<string, number> = {};
  for (const t of s.txns) { const c = t.cur || 'PKR'; counts[c] = (counts[c] || 0) + 1; }
  const curs = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const activeCur = s.viewCur && curs.includes(s.viewCur) ? s.viewCur : curs[0] || 'PKR';
  const tx = curs.length > 1 ? s.txns.filter(t => (t.cur || 'PKR') === activeCur) : s.txns;
  const catOf = makeCategoryOf(() => s.overrides);

  // Preferred colours stay put; colours of categories absent from the data go to the largest uncoloured ones.
  const present = new Map<string, number>();
  for (const t of tx) if (t.amount > 0) { const c = catOf(t); present.set(c, (present.get(c) || 0) + t.amount); }
  const colorMap: Record<string, string> = {}, free: string[] = [];
  for (const [c, col] of Object.entries(CAT_COLOR)) { if (present.has(c)) colorMap[c] = col; else free.push(col); }
  for (const [c] of [...present].filter(([c]) => !colorMap[c] && c !== 'Other').sort((a, b) => b[1] - a[1])) { if (!free.length) break; colorMap[c] = free.shift()!; }

  const months = monthsOf(tx);
  const month = s.month !== 'all' && !months.includes(s.month) ? 'all' : s.month;
  const category = s.category && tx.some(t => catOf(t) === s.category) ? s.category : null;
  const period = tx.filter(t => month === 'all' || t.date.startsWith(month));
  const spend = period.filter(t => t.amount > 0);
  const credits = period.filter(t => t.amount < 0);
  const files = [...new Set(s.txns.map(t => t.source))];
  const fileInfo: View['fileInfo'] = {};
  for (const t of s.txns) if (!fileInfo[t.source]) fileInfo[t.source] = { c: t.cur || 'PKR', g: !!t.curGuess, name: t.file || t.source };

  return {
    has: s.txns.length > 0, curs, activeCur, tx, catOf,
    catColor: c => colorMap[c] || 'var(--c-grey)',
    months, month, category, period, spend, credits,
    total: spend.reduce((a, t) => a + t.amount, 0),
    byCat: [...sumBy(spend, catOf)].sort((a, b) => b[1] - a[1]),
    nMonths: month === 'all' ? months.length : 1,
    files, fileInfo, labels: statementLabels(s.txns),
    money: (n, compact = false) => fmtMoney(n, activeCur, compact),
    moneyShort: n => fmtShort(n, activeCur),
    monthTotal: m => mTotal(tx, m),
    recurring: ms => recur(tx, ms, catOf),
    merchantTotals: list => mt(list, catOf),
  };
}

export const ViewContext = createContext<View | null>(null);
export const useView = () => useContext(ViewContext)!;
