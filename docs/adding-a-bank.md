# Adding a bank

Each statement format is a small adapter in `packages/banks/src/<bank>/`. The generic readers already handle most CSV/Excel files and simple PDFs, so add an adapter only when a bank's layout needs something special or you want it recognised by name.

## 1. Look at the text

Run the local check on a real statement to see how it parses today:

```bash
STATEMENT_PDF=~/Desktop/statement.pdf STATEMENT_PASSWORD=… pnpm check:real-hbl
```

If it already reconciles, you may only need detection (step 3). If not, note what's different: column order, how descriptions wrap, how credits are marked, extra notes on foreign purchases, date format.

## 2. Make a synthetic fixture

Create `packages/banks/fixtures/<bank>.synthetic.json` with the same shape as `hbl-credit-card.synthetic.json`:

- `lines`: the statement text as lines (pages separated by `"\f"`), copying the **layout** of the real statement but with invented names, card number, merchants and amounts.
- `expected`: the rows you expect, plus `previousBalance`, `purchases`, `credits` and `statementTotal` so the test can reconcile.

Never paste real statement text.

## 3. Write the adapter

```ts
// packages/banks/src/meezan/index.ts
import type { BankAdapter } from '../adapter';
import { linesToTxns } from '../generic-pdf';

export const meezanCreditCard: BankAdapter = {
  id: 'meezan-credit-card',
  name: 'Meezan credit card',
  kind: 'pdf',
  detect: input => (input.kind === 'pdf' && /Meezan Bank/i.test(input.lines.slice(0, 200).join('\n')) ? 6 : 0),
  parse: (input, source, opts) => {
    if (input.kind !== 'pdf') throw new Error('Not a PDF statement');
    return linesToTxns(input.lines, source, opts);   // or bank-specific parsing
  },
};
```

`detect` returns 0 when the statement isn't this bank's, and a higher number the more certain it is. The generic readers return 1, so any positive score above that wins.

## 4. Register and test

1. Add the adapter to `ADAPTERS` in `packages/banks/src/registry.ts` (specific banks before the generic ones) and export it from `packages/banks/src/index.ts`.
2. Add `packages/banks/test/<bank>.test.ts` modelled on `hbl.test.ts`: detection, every row, reconciliation, wrapped descriptions, credits.
3. Run `pnpm check`. It runs the tests and rebuilds `lib/spendlens-core.js`, so the app picks up the new bank.
