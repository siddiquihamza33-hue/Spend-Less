import { parseStatement, type ParsedStatement, type StatementInput } from '@spend-lens/banks';
import type { ParseOptions } from '@spend-lens/core';
import ParseWorker from './parse.worker?worker&inline';

/**
 * Parses a statement in a background worker, so a big statement never freezes the page.
 * If the browser won't start a worker (some file:// setups) or it doesn't answer, parses in-page instead.
 */
let worker: Worker | null = null, broken = false, seq = 0;
const pending = new Map<number, { resolve: (r: ParsedStatement) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (broken) return null;
  if (worker) return worker;
  try {
    worker = new ParseWorker();
    worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result?: ParsedStatement; error?: string }>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      e.data.ok ? p.resolve(e.data.result!) : p.reject(new Error(e.data.error));
    };
    worker.onerror = () => { broken = true; worker = null; };
    return worker;
  } catch {
    broken = true;
    return null;
  }
}

export function parseInBackground(input: StatementInput, source: string, opts: ParseOptions): Promise<ParsedStatement> {
  const w = getWorker();
  if (!w) return Promise.resolve().then(() => parseStatement(input, source, opts));
  const id = ++seq;
  return new Promise<ParsedStatement>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const t = setTimeout(() => {           // worker silent: fall back to in-page parsing
      if (!pending.has(id)) return;
      pending.delete(id);
      broken = true;
      try { resolve(parseStatement(input, source, opts)); } catch (e) { reject(e as Error); }
    }, 5000);
    pending.set(id, { resolve: r => { clearTimeout(t); resolve(r); }, reject: e => { clearTimeout(t); reject(e); } });
    w.postMessage({ id, input, source, opts });
  });
}
