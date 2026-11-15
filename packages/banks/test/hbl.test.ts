import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { detectCurrency, makeCategoryOf, merchantOf } from '@spend-lens/core';
import { hblCreditCard, parseStatement } from '@spend-lens/banks';

const fx = JSON.parse(readFileSync(fileURLToPath(new URL('../fixtures/hbl-credit-card.synthetic.json', import.meta.url)), 'utf8'));
const input = { kind: 'pdf' as const, lines: fx.lines as string[] };

describe('HBL credit card (synthetic fixture)', () => {
  const { bank, txns } = parseStatement(input, 'hbl.pdf');

  it('is recognised as HBL, not the generic PDF reader', () => {
    expect(bank).toBe('hbl-credit-card');
    expect(hblCreditCard.detect(input)).toBeGreaterThan(1);
  });

  it('reads every transaction with the right date, description and amount', () => {
    expect(txns.map(t => [t.date, t.desc, t.amount])).toEqual(fx.expected.rows);
  });

  it('reconciles: previous balance + purchases + credits = statement total', () => {
    const purchases = txns.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0);
    const credits = txns.filter(t => t.amount < 0).reduce((a, t) => a + t.amount, 0);
    expect(purchases).toBeCloseTo(fx.expected.purchases, 2);
    expect(credits).toBeCloseTo(fx.expected.credits, 2);
    expect(fx.expected.previousBalance + purchases + credits).toBeCloseTo(fx.expected.statementTotal, 2);
  });

  it('joins descriptions that wrap above and below the date row', () => {
    expect(txns.find(t => t.amount === 6000)?.desc).toBe('SKYLINE SERVICE STATION, KARACHI');
    expect(txns.find(t => t.amount === 421.68)?.desc).toBe('SRB Sales Tax on Advertising Services');
  });

  it('keeps the billed PKR amount and drops the foreign-currency notes', () => {
    const fb = txns.find(t => t.desc.startsWith('FACEBK'))!;
    expect(fb.amount).toBe(2811.2);
    expect(fb.desc).not.toMatch(/USD|Rate|Conversion/);
  });

  it('treats a card-paid bill as a purchase and reward points as a credit', () => {
    expect(txns.find(t => /PTCL/.test(t.desc))?.amount).toBe(3200);
    expect(txns.find(t => /Reward Points/.test(t.desc))?.amount).toBe(-1500);
  });

  it('detects PKR even though foreign notes mention USD', () => {
    expect(detectCurrency(fx.lines.join('\n'))).toBe('PKR');
  });

  it('categorises the rows sensibly', () => {
    const catOf = makeCategoryOf(() => ({}));
    const cats = Object.fromEntries(txns.map(t => [t.desc, catOf({ ...t, merchant: merchantOf(t.desc) })]));
    expect(cats['FRESH SUPER MARKET, KARACHI']).toBe('Groceries');
    expect(cats['SKYLINE SERVICE STATION, KARACHI']).toBe('Transport & Fuel');
    expect(cats['FACEBK *ZZ11YY22XX, FACEBOOK.COM']).toBe('Advertising');
    expect(cats['Foreign Transaction Fee']).toBe('Fees & Charges');
    expect(cats['K-ELECTRIC, KARACHI']).toBe('Bills & Utilities');
    expect(cats['Payment Received']).toBe('Payments & Refunds');
  });
});
