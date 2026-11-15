import { PAGE_BREAK, detectDmy, normalizeSigns, parseAmount, parseDate, type ParseOptions, type ParsedTxn, type WorkingRow } from '@spend-lens/core';
import type { BankAdapter, StatementInput } from '../adapter';

const DATE_P = String.raw`(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?|\d{1,2}[\s\-]?[A-Za-z]{3,4}\.?(?:[\s\-,']+(?:\d{4}|\d{2}(?![\s\-]?[A-Za-z])))?|[A-Za-z]{3}\.?\s+\d{1,2}(?:,?\s+\d{4})?)`;
const AMT_P = String.raw`(\(?-?\s?(?:[A-Z]{2,3}\.?\s?)?[\d,]+\.\d{2}\)?(?:\s*(?:CR|Cr|cr|DR|Dr|-))?)`;
/** A transaction row: date, optional second (posting) date, optional description, amount at the end. */
export const PDF_LINE = new RegExp(`^${DATE_P}\\s+(?:${DATE_P}\\s+)?(?:(.+?)\\s+)?${AMT_P}\\s*$`);
const SUMMARY_RE = /\b(balance|total|minimum|previous|opening|closing|credit limit|available|due date|statement|payment due|sub-?total|reward|points)\b/i;
// Dated rows are transactions unless clearly balance lines ("Pay your bill through reward points" is a credit).
const ROW_SUMMARY_RE = /\b(previous balance|opening balance|closing balance|balance b\/?f|balance c\/?f|brought forward|carried forward|sub-?total|total due|minimum (amount )?due)\b|^total\b/i;
const TABLE_HEAD_RE = /(posting date|transaction date|trans\.? date|value date).*(description|details|particulars)|^description\b/i;
const NOT_DESC_RE = /^(\(?fcy\b|transaction amount|amount\s*\(|transaction$|supplementary|draC|card holder|card no|customer details|page \d|\d+\s*of\s*\d+$)/i;
const amountOnly = (s: string) => /^[\s(]*-?\s*(?:[A-Z]{2,3}\.?\s?)?[\d,]+\.\d{2}\)?\s*(?:cr|dr)?\s*$/i.test(s);

/** Strips foreign-currency notes from a description ("USD Amount: 3.97 USD Conversion PKR 1,100.00 Rate: 278.05"). */
export function cleanPdfDesc(s: string): string {
  return s
    .replace(/\b[A-Z]{3}\s+Amount:\s*[\d,]+(?:\.\d+)?/gi, ' ')
    .replace(/\b[A-Z]{3}\s+Conversion\b/gi, ' ')
    .replace(/\bRate:\s*[\d,]+(?:\.\d+)?/gi, ' ')
    .replace(/\b[A-Z]{3}\s?[\d,]+\.\d{2}\b/g, ' ')
    .replace(/\s+[\(\-]?[A-Z]{0,3}\.?\s?[\d,]+\.\d{2}\)?\s*$/, '')
    .replace(/^(?:[A-Z]{3}\s?[\d,]+\.\d{2}\s+)+/, '')
    .replace(/\s{2,}/g, ' ').replace(/[\s,\/]+$/, '').trim();
}

/**
 * Reads transactions from statement text lines.
 * Descriptions may wrap above and below the date row (HBL centres them vertically), so lines
 * between two rows are shared out: a row that took N lines above also takes N lines below.
 * Dates printed without a year use the statement's most common year, rolling December back
 * a year when a statement spans December–January.
 */
export function linesToTxns(lines: string[], source: string, opts: ParseOptions = {}): ParsedTxn[] {
  const years: Record<string, number> = {};
  lines.join(' ').replace(/(?<![\d,.])\b(20[0-4]\d)\b(?![.,]\d)/g, (_m, y: string) => { years[y] = (years[y] || 0) + 1; return ''; });
  const year = +(Object.entries(years).sort((a, b) => b[1] - a[1])[0]?.[0] || new Date().getFullYear());
  const dmy = detectDmy(lines.map(l => (l.match(PDF_LINE) || [])[1]).filter(Boolean), opts.preferMDY);

  interface Row { dateStr: string; mid: string; amt: string; above: string[]; below: string[]; needsBelow: number }
  const rows: Row[] = [];
  let inTable = false, orphans: string[] = [], prev: Row | null = null;
  const flushTo = (row: Row | null) => {
    if (prev && prev.needsBelow > 0) { while (prev.needsBelow > 0 && orphans.length) { prev.below.push(orphans.shift()!); prev.needsBelow--; } }
    if (row) { row.above = orphans.slice(); row.needsBelow = orphans.length; }
    orphans = [];
  };
  for (const raw of lines) {
    if (raw === PAGE_BREAK) { flushTo(null); prev = null; inTable = false; continue; }
    const line = raw.trim();
    if (!line) continue;
    if (TABLE_HEAD_RE.test(line)) { inTable = true; orphans = []; prev = null; continue; }
    const m = line.match(PDF_LINE);
    if (m) {
      const row: Row = { dateStr: m[1], mid: m[3] || '', amt: m[4], above: [], below: [], needsBelow: 0 };
      flushTo(row); rows.push(row); prev = row; inTable = true;
      continue;
    }
    if (inTable && /[a-z]/i.test(line) && !SUMMARY_RE.test(line) && !NOT_DESC_RE.test(line) && !amountOnly(line)) orphans.push(line);
  }
  flushTo(null);

  const out: WorkingRow[] = [];
  for (const r of rows) {
    const date = parseDate(r.dateStr, dmy, year);
    const desc = cleanPdfDesc([...r.above, r.mid, ...r.below].filter(Boolean).join(' '));
    const amount = parseAmount(r.amt);
    if (!date || !desc || !amount || ROW_SUMMARY_RE.test(desc) || !/[a-z]/i.test(desc)) continue;
    const ds = r.dateStr.trim();
    const noYear = !(/\d{4}/.test(ds) || /\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2}$/.test(ds) || /[A-Za-z]\.?[\s\-,']+\d{2}$/.test(ds));
    out.push({ date, desc, amount, source, single: true, noYear });
  }
  const months = new Set(out.map(t => +t.date.slice(5, 7)));
  if (months.has(12) && months.has(1)) out.forEach(t => { if (t.noYear && +t.date.slice(5, 7) >= 11 && t.date.startsWith(String(year))) t.date = year - 1 + t.date.slice(4); });
  out.forEach(t => delete t.noYear);
  return normalizeSigns(out);
}

/** Fallback for any text-based PDF statement with one transaction per dated line. */
export const genericPdf: BankAdapter = {
  id: 'generic-pdf',
  name: 'PDF statement',
  kind: 'pdf',
  detect: (input: StatementInput) => (input.kind === 'pdf' ? 1 : 0),
  parse: (input, source, opts) => {
    if (input.kind !== 'pdf') throw new Error('Not a PDF statement');
    return linesToTxns(input.lines, source, opts);
  },
};
