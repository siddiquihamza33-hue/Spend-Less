import type { BankAdapter, StatementInput } from '../adapter';
import { linesToTxns } from '../generic-pdf';

/**
 * HBL credit card statement (PDF, usually password-protected with the CNIC number).
 * Layout notes (handled by the shared line parser):
 * - Text is drawn many times on top of itself; textItemsToLines removes the copies.
 * - Columns: Transaction Date · Posting Date · Description · Transaction Amount (FCY or Equivalent PKR) · Amount (PKR).
 * - Descriptions wrap symmetrically above and below the date row ("QSTAR SERVICE STATION," / row / "KARACHI").
 * - Foreign purchases carry "USD Amount: … USD Conversion … Rate: …" notes; the billed PKR amount is last.
 * - Payments are negative ("Payment Received -20,000.00"); "Pay Your Bill through Reward Points" is a credit.
 */
export function looksLikeHbl(lines: string[]): number {
  const text = lines.slice(0, 200).join('\n');
  let score = 0;
  if (/\bHBL\b|hbl\.com|HBL Mobile/i.test(text)) score += 5;
  if (/Transaction Date\s+Posting Date\s+Description/i.test(text)) score += 3;
  if (/FCY or Equivalent PKR|Amount\s*\(PKR\)/i.test(text)) score += 2;
  return score >= 5 ? score : 0;
}

export const hblCreditCard: BankAdapter = {
  id: 'hbl-credit-card',
  name: 'HBL credit card',
  kind: 'pdf',
  detect: (input: StatementInput) => (input.kind === 'pdf' ? looksLikeHbl(input.lines) : 0),
  parse: (input, source, opts) => {
    if (input.kind !== 'pdf') throw new Error('Not a PDF statement');
    return linesToTxns(input.lines, source, opts);
  },
};
