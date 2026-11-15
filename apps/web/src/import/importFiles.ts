import { detectCurrency, prefersMonthFirst, statementLabels, type ParsedTxn } from '@spend-lens/core';
import { useApp, type NoticeItem } from '../state/store';
import { plural } from '../state/view';
import { openStatementFile, type OpenOptions } from './readers';
import { parseInBackground } from './parseClient';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Says what went wrong with a file and what to do about it. */
export function explainError(name: string, msg: string): NoticeItem {
  const m = String(msg || '');
  let fix: string;
  if (/skipped/.test(m)) fix = 'It is password-protected and was skipped. Upload it again and enter its password.';
  else if (/no transactions/.test(m)) fix = 'No transactions were found in it. Try the CSV or Excel export from your bank instead.';
  else if (/columns/.test(m)) fix = "Date, description and amount columns weren't found. Check the file has a header row with these columns.";
  else if (/failed to load|network|fetch/i.test(m)) fix = "The file reader didn't load. Check your internet connection and try again.";
  else if (/Invalid PDF|corrupt/i.test(m)) fix = 'The PDF looks damaged. Download the statement again and re-upload it.';
  else fix = m + '. Try the CSV export from your bank instead.';
  return { name, fix };
}

let queue: Promise<void> = Promise.resolve();

/** Imports files one batch at a time (a second drop waits for the first to finish). */
export function importFiles(files: File[], opts: OpenOptions = {}) {
  queue = queue.then(() => runImport(files, opts), () => runImport(files, opts));
  return queue;
}

async function runImport(files: File[], opts: OpenOptions) {
  const app = useApp.getState;
  let total = 0;
  const problems: NoticeItem[] = [], addedIds: string[] = [];
  app().set({ importing: true });
  const t0 = performance.now();
  for (const f of files) {
    try {
      const sid = `${f.name}#${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const { inputs, rawText } = await openStatementFile(f, opts);
      app().set({ importing: true });                     // the password prompt hides the printer
      const found = detectCurrency(rawText);
      const parseOpts = { preferMDY: prefersMonthFirst(found) };
      const txns: ParsedTxn[] = [];
      let bank: string | null = null, lastErr: Error | null = null;
      for (const input of inputs) {
        try { const r = await parseInBackground(input, sid, parseOpts); txns.push(...r.txns); bank = r.bank; }
        catch (e) { lastErr = e as Error; }
      }
      if (!txns.length) throw lastErr && inputs.length === 1 ? lastErr : new Error('no transactions found');
      const counts: Record<string, number> = {};
      for (const t of app().txns) counts[t.cur || 'PKR'] = (counts[t.cur || 'PKR'] || 0) + 1;
      const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
      const cur = found || dominant || 'PKR';
      const n = app().addTxns(txns.map(t => ({ ...t, cur, curGuess: !found, file: f.name, bank: bank ?? undefined })));
      total += n;
      if (n) addedIds.push(sid);
      if (found) app().set({ viewCur: found });
    } catch (e) {
      problems.push(explainError(f.name, (e as Error).message));
    }
  }
  const wait = (reduceMotion() ? 0 : 1100) - (performance.now() - t0);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  app().set({ importing: false, animSeq: app().animSeq + 1 });
  app().refreshSavedPw();
  if (problems.length) {
    app().showNotice(total
      ? `Imported ${total} transactions. ${problems.length === 1 ? 'One file' : problems.length + ' files'} couldn't be read:`
      : `Couldn't read ${problems.length === 1 ? 'this file' : 'these files'}:`, problems);
  } else {
    app().set({ notice: null });
    const labels = statementLabels(app().txns), added = addedIds.map(id => labels[id] || id);
    app().toastMsg(total ? `Added ${added.length ? added.join(', ') + ' ' : ''}statement${added.length === 1 ? '' : 's'} · ${plural(total, 'new transaction')}` : 'Already added — no new transactions');
  }
}
