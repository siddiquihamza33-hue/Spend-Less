import type { ParseOptions, ParsedTxn } from '@spend-lens/core';
import type { BankAdapter, StatementInput } from './adapter';
import { genericPdf } from './generic-pdf';
import { genericTable } from './generic-table';
import { hblCreditCard } from './hbl';

/** All supported formats. Specific banks first; generic readers are the fallback. */
export const ADAPTERS: BankAdapter[] = [hblCreditCard, genericPdf, genericTable];

export interface ParsedStatement { bank: string; bankName: string; txns: ParsedTxn[] }

/** Picks the adapter that best recognises the statement and reads it. */
export function parseStatement(input: StatementInput, source: string, opts: ParseOptions = {}): ParsedStatement {
  const ranked = ADAPTERS.map(a => ({ a, score: a.detect(input) })).filter(x => x.score > 0).sort((x, y) => y.score - x.score);
  if (!ranked.length) throw new Error('This file type isn\'t supported');
  const { a } = ranked[0];
  return { bank: a.id, bankName: a.name, txns: a.parse(input, source, opts) };
}
