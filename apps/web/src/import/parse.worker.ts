/// <reference lib="webworker" />
// Runs the bank adapters off the main thread. Receives one statement, returns its transactions.
import { parseStatement, type StatementInput } from '@spend-lens/banks';
import type { ParseOptions } from '@spend-lens/core';

self.onmessage = (e: MessageEvent<{ id: number; input: StatementInput; source: string; opts: ParseOptions }>) => {
  const { id, input, source, opts } = e.data;
  try {
    const r = parseStatement(input, source, opts);
    (self as unknown as Worker).postMessage({ id, ok: true, result: r });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, ok: false, error: (err as Error).message });
  }
};
