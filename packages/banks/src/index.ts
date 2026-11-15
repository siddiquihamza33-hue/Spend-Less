/** @spend-lens/banks — one adapter per statement format, plus a registry that picks the right one. */
export type { BankAdapter, StatementInput } from './adapter';
export { ADAPTERS, parseStatement, type ParsedStatement } from './registry';
export { genericPdf, linesToTxns, cleanPdfDesc, PDF_LINE } from './generic-pdf';
export { genericTable } from './generic-table';
export { hblCreditCard, looksLikeHbl } from './hbl';
