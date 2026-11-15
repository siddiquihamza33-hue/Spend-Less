import type { ParseOptions, ParsedTxn, WorkingRow } from '../model/types';
import { detectDmy, parseDate } from './dates';
import { looksLikeAmount, parseAmount } from './amounts';
import { normalizeSigns } from './normalize';

export interface ColumnMap { date: number; desc: number; amount: number; debit: number; credit: number; type: number }

/** Finds the date / description / amount (or debit+credit) columns from a header row. */
export function detectHeader(row: unknown[]): ColumnMap | null {
  const cells = row.map(c => String(c ?? '').toLowerCase().trim());
  const find = (re: RegExp, avoid: number[] = []) => cells.findIndex((c, i) => c && re.test(c) && !avoid.includes(i));
  let date = find(/^(trans(action)?\.?\s*date|txn\s*date|purchase date)/);
  if (date < 0) date = find(/date/);
  if (date < 0) return null;
  const used = [date];
  const desc = find(/desc|merchant|details|narration|particular|payee|memo|transaction\s*$|^name$|remarks/, used);
  if (desc < 0) return null;
  used.push(desc);
  const debit = find(/^(debit|withdrawal|dr\b|charges?|money out|paid out|spend)/, used);
  if (debit >= 0) used.push(debit);
  const credit = find(/^(credit|deposit|cr\b|payments?|money in|paid in)/, used);
  if (credit >= 0) used.push(credit);
  const amtCols = cells.map((c, i) => (/amount|amt|value|^pkr|^usd|^aed/.test(c) && !used.includes(i) ? i : -1)).filter(i => i >= 0);
  let amount = -1;
  if (amtCols.length) amount = amtCols.find(i => /bill|local|pkr|settle|posted/.test(cells[i])) ?? amtCols[amtCols.length - 1];
  if (amount < 0 && debit < 0 && credit < 0) return null;
  const type = find(/^(type|dr\/cr|cr\/dr|debit\/credit|transaction type)$/, used);
  return { date, desc, amount, debit, credit, type };
}

/** For files without a header row: picks columns by what their values look like. */
export function guessColumns(rows: unknown[][]): ColumnMap | null {
  const sample = rows.slice(0, 25);
  const ncol = Math.max(...sample.map(r => r.length));
  const best = { date: -1, desc: -1, amount: -1 };
  let dScore = 0, lScore = 0, aScore = 0;
  for (let c = 0; c < ncol; c++) {
    const vals = sample.map(r => r[c]);
    const ds = vals.filter(v => parseDate(v)).length;
    const as = vals.filter(v => String(v ?? '').trim() && looksLikeAmount(v) && !parseDate(v)).length;
    const ls = vals.reduce<number>((t, v) => t + (/[a-z]/i.test(String(v ?? '')) ? String(v).length : 0), 0) / vals.length;
    if (ds > dScore) { dScore = ds; best.date = c; }
    if (as >= aScore && as > sample.length * 0.4) { aScore = as; best.amount = c; }
    if (ls > lScore && ds < sample.length * 0.5) { lScore = ls; best.desc = c; }
  }
  if (best.date < 0 || best.desc < 0 || best.amount < 0) return null;
  return { ...best, debit: -1, credit: -1, type: -1 };
}

/** Turns CSV/XLSX rows into transactions. Throws when the needed columns can't be found. */
export function rowsToTxns(rawRows: unknown[][], source: string, opts: ParseOptions = {}): ParsedTxn[] {
  const rows = rawRows.filter(r => Array.isArray(r) && r.some(c => String(c ?? '').trim() !== ''));
  let hi = -1;
  let map: ColumnMap | null = null;
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const m = detectHeader(rows[i]);
    if (m) { hi = i; map = m; break; }
  }
  if (!map) map = guessColumns(rows);
  if (!map) throw new Error('Could not find date, description and amount columns');
  const cols = map;
  const body = rows.slice(hi + 1);
  const dmy = detectDmy(body.map(r => r[cols.date]), opts.preferMDY);
  const out: WorkingRow[] = [];
  for (const r of body) {
    const date = parseDate(r[cols.date], dmy);
    const desc = String(r[cols.desc] ?? '').replace(/\s+/g, ' ').trim();
    if (!date || !desc) continue;
    let amt: number | null = null;
    if (cols.debit >= 0 || cols.credit >= 0) {
      const d = cols.debit >= 0 ? parseAmount(r[cols.debit]) : null;
      const c = cols.credit >= 0 ? parseAmount(r[cols.credit]) : null;
      if (d || c) amt = Math.abs(d || 0) - Math.abs(c || 0);
      else if (cols.amount >= 0) amt = parseAmount(r[cols.amount]);
    } else amt = parseAmount(r[cols.amount]);
    if (amt == null || amt === 0) continue;
    let single = cols.debit < 0 && cols.credit < 0;
    if (cols.type >= 0) {
      const t = String(r[cols.type] ?? '').trim().toLowerCase();
      if (/^(cr|credit|payment|refund|return|reversal)\b/.test(t)) { amt = -Math.abs(amt); single = false; }
      else if (/^(dr|debit|charge|sale|purchase|fee|interest)\b/.test(t)) { amt = Math.abs(amt); single = false; }
    }
    out.push({ date, desc, amount: amt, source, single });
  }
  return normalizeSigns(out);
}
