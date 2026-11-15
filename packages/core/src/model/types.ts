/** A transaction straight out of a parser, before the app adds ids and merchant names. */
export interface ParsedTxn {
  /** ISO date, YYYY-MM-DD */
  date: string;
  desc: string;
  /** Positive = purchase/charge, negative = payment/refund/credit */
  amount: number;
  /** Id of the import this row came from (one per uploaded file) */
  source: string;
}

/** A stored transaction, as the app keeps it. */
export interface Txn extends ParsedTxn {
  id?: string;
  merchant: string;
  /** ISO currency code detected from the statement */
  cur?: string;
  /** True when no currency was found in the file and one was assumed */
  curGuess?: boolean;
  /** Original file name, for display */
  file?: string;
  /** Bank adapter that read the statement */
  bank?: string;
}

/** Intermediate row used by the parsers to decide signs. */
export interface WorkingRow extends ParsedTxn {
  /** Sign comes from a single amount column, so "most rows are purchases" may flip it */
  single?: boolean;
  /** PDF date had no year printed (eligible for Dec→Jan rollover) */
  noYear?: boolean;
}

/** Category name → user override, keyed by lower-cased merchant name. */
export type Overrides = Record<string, string>;

export type CategoryOf = (t: Pick<Txn, 'amount' | 'merchant' | 'desc'>) => string;

export interface ParseOptions {
  /** Prefer month-first dates when a date like 10/02 is ambiguous (USD/CAD statements). */
  preferMDY?: boolean;
}
