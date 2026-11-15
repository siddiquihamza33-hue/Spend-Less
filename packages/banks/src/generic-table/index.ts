import { rowsToTxns } from '@spend-lens/core';
import type { BankAdapter, StatementInput } from '../adapter';

/** Any CSV or spreadsheet with date, description and amount (or debit/credit) columns. */
export const genericTable: BankAdapter = {
  id: 'generic-table',
  name: 'CSV / Excel statement',
  kind: 'table',
  detect: (input: StatementInput) => (input.kind === 'table' ? 1 : 0),
  parse: (input, source, opts) => {
    if (input.kind !== 'table') throw new Error('Not a table');
    return rowsToTxns(input.rows, source, opts);
  },
};
