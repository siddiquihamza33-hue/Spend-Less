import type { ParseOptions, ParsedTxn } from '@spend-lens/core';

/** What a statement looks like once the file has been opened. */
export type StatementInput =
  | { kind: 'pdf'; lines: string[] }     // text lines from textItemsToLines (pages separated by PAGE_BREAK)
  | { kind: 'table'; rows: unknown[][] }; // CSV rows or one spreadsheet sheet

/**
 * One bank statement format. To support a new bank, add a folder with an adapter,
 * synthetic fixtures and tests, then register it in registry.ts. See docs/adding-a-bank.md.
 */
export interface BankAdapter {
  /** Stable id stored with each transaction, e.g. "hbl-credit-card" */
  id: string;
  /** Human name, e.g. "HBL credit card" */
  name: string;
  kind: StatementInput['kind'];
  /** How sure this adapter is that it can read the input: 0 = not mine, higher = better match. */
  detect(input: StatementInput): number;
  /** Reads transactions. Throws an Error with a plain message if it can't. */
  parse(input: StatementInput, source: string, opts?: ParseOptions): ParsedTxn[];
}
