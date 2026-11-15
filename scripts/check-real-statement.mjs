// Local-only check of a REAL statement against the built core. Nothing is saved or sent anywhere.
//
//   STATEMENT_PDF=~/Desktop/statement.pdf STATEMENT_PASSWORD=xxxxxxxxxxxxx pnpm check:real-hbl
//
// Prints which bank reader matched, how many transactions were read, and — when the statement
// prints "Previous Balance" and "TOTAL" lines — whether previous balance + net = total.
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const file = process.env.STATEMENT_PDF;
if (!file) { console.error('Set STATEMENT_PDF to the statement path (and STATEMENT_PASSWORD if it is locked).'); process.exit(2); }

const ctx = {};
vm.runInNewContext(fs.readFileSync(new URL('../lib/spendlens-core.js', import.meta.url), 'utf8') + ';this.SL = SpendLensCore;', ctx);
const { core, banks } = ctx.SL;

const doc = await pdfjsLib.getDocument({ data: new Uint8Array(fs.readFileSync(file)), password: process.env.STATEMENT_PASSWORD, verbosity: 0 }).promise;
const pages = [];
for (let p = 1; p <= doc.numPages; p++) pages.push((await (await doc.getPage(p)).getTextContent()).items);
const lines = core.textItemsToLines(pages);
const cur = core.detectCurrency(lines.join('\n'));
const { bank, txns } = banks.parseStatement({ kind: 'pdf', lines }, 'check', { preferMDY: core.prefersMonthFirst(cur) });
const purchases = txns.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0);
const credits = txns.filter(t => t.amount < 0).reduce((a, t) => a + t.amount, 0);
console.log(`Reader: ${bank} · currency: ${cur} · transactions: ${txns.length}`);
console.log(`Purchases: ${purchases.toFixed(2)} · credits: ${credits.toFixed(2)} · ${txns[0]?.date} → ${txns.at(-1)?.date}`);
const num = re => { const l = lines.find(x => re.test(x)); const m = l && l.match(/-?[\d,]+\.\d{2}\s*$/); return m ? parseFloat(m[0].replace(/,/g, '')) : null; };
// "TOTAL   134,453.86" — the statement total line itself, not "Total Credit Limit …"
const prev = num(/^Previous Balance\s+-?[\d,]+\.\d{2}\s*$/i), total = num(/^TOTAL\s+-?[\d,]+\.\d{2}\s*$/);
if (prev != null && total != null) {
  const ok = Math.abs(prev + purchases + credits - total) < 0.01;
  console.log(`Reconciliation: ${prev.toFixed(2)} + ${(purchases + credits).toFixed(2)} = ${(prev + purchases + credits).toFixed(2)} vs statement total ${total.toFixed(2)} → ${ok ? 'MATCHES' : 'DOES NOT MATCH'}`);
  process.exit(ok ? 0 : 1);
} else console.log('No "Previous Balance" / "TOTAL" lines found, so totals were not reconciled.');
