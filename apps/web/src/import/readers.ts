import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
// pdf.js normally runs in its own Worker loaded from a URL, which Chrome blocks on file:// pages.
// Registering the worker code as `pdfjsWorker` makes pdf.js run it in-page instead (its "fake worker").
import * as pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.js';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { textItemsToLines, type TextItem } from '@spend-lens/core';
import type { StatementInput } from '@spend-lens/banks';
import { rememberPassword, savedPasswords } from '../state/passwords';
import { useApp } from '../state/store';

(globalThis as any).pdfjsWorker = pdfWorker;

export interface OpenOptions { password?: string | null; remember?: boolean }
export interface OpenedFile { inputs: StatementInput[]; rawText: string }

/**
 * Opens a PDF, trying in order: the password typed in the upload dialog, no password,
 * remembered passwords, then asking (until the person skips).
 */
async function openPdf(file: File, opts: OpenOptions) {
  const buf = await file.arrayBuffer();
  const attempt = (pw?: string) => pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)), password: pw }).promise;
  const isPw = (e: any) => e && e.name === 'PasswordException';
  if (opts.password) {
    try { const pdf = await attempt(opts.password); if (opts.remember) rememberPassword(opts.password); return pdf; }
    catch (e) { if (!isPw(e)) throw e; }
  }
  try { return await attempt(undefined); } catch (e) { if (!isPw(e)) throw e; }
  for (const pw of savedPasswords()) {
    try { return await attempt(pw); } catch (e) { if (!isPw(e)) throw e; }
  }
  let wrong = false;
  for (;;) {
    const ans = await useApp.getState().askPassword(file.name, wrong);
    if (!ans) throw new Error('skipped (password protected)');
    try {
      const pdf = await attempt(ans.pw);
      if (ans.remember) rememberPassword(ans.pw);
      return pdf;
    } catch (e) { if (!isPw(e)) throw e; wrong = true; }
  }
}

/** Reads a statement file into what the bank adapters understand, plus its text for currency detection. */
export async function openStatementFile(f: File, opts: OpenOptions): Promise<OpenedFile> {
  const ext = f.name.split('.').pop()!.toLowerCase();
  if (ext === 'pdf') {
    const pdf = await openPdf(f, opts);
    const pages: TextItem[][] = [];
    for (let p = 1; p <= pdf.numPages; p++) pages.push((await (await pdf.getPage(p)).getTextContent()).items as TextItem[]);
    try { await pdf.destroy(); } catch { /* ignore */ }
    const lines = textItemsToLines(pages);
    return { inputs: [{ kind: 'pdf', lines }], rawText: lines.join('\n') };
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true });
    const sheets = wb.SheetNames.map(sn => XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sn], { header: 1, raw: true, defval: '' }));
    return { inputs: sheets.map(rows => ({ kind: 'table' as const, rows })), rawText: sheets.map(rows => rows.slice(0, 400).map(r => r.join(' ')).join('\n')).join('\n') };
  }
  const text = await f.text();
  const res = Papa.parse<unknown[]>(text.replace(/^﻿/, ''), { skipEmptyLines: true });
  return { inputs: [{ kind: 'table', rows: res.data }], rawText: text };
}

/** Builds the categorised CSV export (cells that look like formulas are escaped so Excel won't run them). */
export function exportCsv(rows: unknown[][]) {
  return Papa.unparse(rows, { escapeFormulae: true });
}
