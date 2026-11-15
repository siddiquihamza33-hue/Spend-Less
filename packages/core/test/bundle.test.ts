import { describe, expect, it } from 'vitest';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../../../', import.meta.url));

// Builds the browser bundle in memory and runs it like a classic <script> on a file:// page.
async function loadBundle() {
  const res = await build({
    entryPoints: [root + 'scripts/browser-entry.ts'], bundle: true, format: 'iife', globalName: 'SpendLensCore',
    platform: 'browser', tsconfig: root + 'tsconfig.json', write: false, logLevel: 'silent',
  });
  const sandbox: Record<string, unknown> = {};
  vm.runInNewContext(res.outputFiles[0].text + ';this.SpendLensCore = SpendLensCore;', sandbox);
  return sandbox.SpendLensCore as any;
}

describe('browser bundle', () => {
  it('exposes the API index.html uses on window.SpendLensCore', async () => {
    const SL = await loadBundle();
    for (const name of ['parseDate', 'parseAmount', 'detectCurrency', 'categorize', 'makeCategoryOf', 'merchantOf', 'money', 'moneyShort',
      'fmtDate', 'monthLabel', 'monthName', 'statementLabels', 'textItemsToLines', 'sumBy', 'recurringCharges', 'merchantTotals', 'fxFees', 'keyOf', 'ymd'])
      expect(typeof SL.core[name], name).toBe('function');
    expect(typeof SL.banks.parseStatement).toBe('function');
    expect(SL.core.CAT_NAMES).toContain('Groceries');
  });

  it('reads the synthetic HBL statement end to end', async () => {
    const SL = await loadBundle();
    const fx = JSON.parse(readFileSync(root + 'packages/banks/fixtures/hbl-credit-card.synthetic.json', 'utf8'));
    const res = SL.banks.parseStatement({ kind: 'pdf', lines: fx.lines }, 'x');
    expect(res.bank).toBe('hbl-credit-card');
    expect(res.txns).toHaveLength(fx.expected.count);
  });
});
