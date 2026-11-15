# Development guide

## Setup

```bash
pnpm install
```

## Everyday commands

| Command | What it does |
|---|---|
| `pnpm test` | Runs all unit tests (Vitest) |
| `pnpm test:watch` | Re-runs tests as you edit |
| `pnpm typecheck` | Strict TypeScript check of `packages/` and `scripts/` |
| `pnpm build` | Rebuilds `lib/spendlens-core.js` (add `--watch` to rebuild on save) |
| `pnpm check` | Typecheck + tests + build — run before you're done |
| `pnpm check:real-hbl` | Reads a **real** statement locally and reconciles its totals (see below) |

## How the pieces fit

- **`packages/core`** — pure TypeScript, no DOM, no network: dates, amounts, sign rules, CSV/XLSX column detection, PDF text → lines, currency detection, categories and merchant names, money/date formatting, statement names, totals, recurring charges, foreign-fee totals, category × month comparison.
- **`packages/banks`** — one adapter per statement format and a registry that picks the best match (`parseStatement`). Today: `hbl-credit-card`, `generic-pdf`, `generic-table`.
- **`lib/spendlens-core.js`** — both packages bundled as a classic script that sets `window.SpendLensCore` (Chrome blocks ES modules on `file://` pages, so a classic script is what keeps "open index.html" working). It is generated; never edit it by hand.
- **`index.html`** — the UI, storage, import flow and dialogs. It calls the bundle through thin wrappers (`money`, `catOf`, `readStatement`, …) so the UI code reads the same as before.

When you change anything in `packages/`, run `pnpm check` so `lib/spendlens-core.js` is rebuilt.

## Tests and data safety

- Unit tests live in `packages/*/test`. Bank fixtures live in `packages/banks/fixtures` and are **synthetic**: they copy a bank's layout with invented merchants, card numbers and amounts, and include a reconciliation check (previous balance + purchases + credits = statement total).
- **Never commit real statements or passwords.** `.gitignore` blocks PDF and Excel files outside the fixtures folder.
- To check a real statement on your own machine, run it from the terminal; nothing is stored or sent:

```bash
STATEMENT_PDF=~/Desktop/statement.pdf STATEMENT_PASSWORD=your-pdf-password pnpm check:real-hbl
```

It prints the reader used, the number of transactions, and whether the totals reconcile with the statement.

## Adding a bank

See [adding-a-bank.md](adding-a-bank.md).
