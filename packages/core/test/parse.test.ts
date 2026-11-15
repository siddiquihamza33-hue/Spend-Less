import { describe, expect, it } from 'vitest';
import { detectDmy, keyOf, normalizeSigns, parseAmount, parseDate, textItemsToLines, PAGE_BREAK, ymd } from '@spend-lens/core';

describe('dates', () => {
  it('reads the formats banks print', () => {
    expect(parseDate('2026-10-02')).toBe('2026-10-02');
    expect(parseDate('02/10/2026')).toBe('2026-10-02');
    expect(parseDate('02/10/2026', false)).toBe('2026-02-10');
    expect(parseDate('2 Oct 2026')).toBe('2026-10-02');
    expect(parseDate('Oct 2, 2026')).toBe('2026-10-02');
    expect(parseDate('02-Oct-26')).toBe('2026-10-02');
    expect(parseDate('02 Oct', true, 2025)).toBe('2025-10-02');
  });

  it('rejects impossible dates', () => {
    expect(parseDate('31/02/2025')).toBeNull();
    expect(ymd(2026, 13, 1)).toBeNull();
    expect(parseDate('')).toBeNull();
  });

  it('decides day-first vs month-first from the whole column', () => {
    expect(detectDmy(['25/10/2026', '02/10/2026'])).toBe(true);
    expect(detectDmy(['10/25/2026', '10/02/2026'])).toBe(false);
    expect(detectDmy(['02/10/2026'])).toBe(true);
    expect(detectDmy(['02/10/2026'], true)).toBe(false);
  });
});

describe('amounts', () => {
  it('reads signs the ways banks write them', () => {
    expect(parseAmount('1,250.00')).toBe(1250);
    expect(parseAmount('-5,000.00')).toBe(-5000);
    expect(parseAmount('(300.00)')).toBe(-300);
    expect(parseAmount('2,500.00 CR')).toBe(-2500);
    expect(parseAmount('Rs. 4,500')).toBe(4500);
    expect(parseAmount('-$5.40')).toBe(-5.4);
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount(12.5)).toBe(12.5);
  });
});

describe('sign normalisation', () => {
  it('flips when most single-column amounts are negative, then marks payments as credits', () => {
    const rows = normalizeSigns([
      { date: '2026-10-01', desc: 'SHOP', amount: -10, source: 's', single: true },
      { date: '2026-10-02', desc: 'SHOP 2', amount: -20, source: 's', single: true },
      { date: '2026-10-03', desc: 'PAYMENT THANK YOU', amount: 30, source: 's', single: true },
    ]);
    expect(rows.map(r => r.amount)).toEqual([10, 20, -30]);
  });

  it('keeps a card-paid bill as a purchase', () => {
    expect(normalizeSigns([{ date: '2026-10-01', desc: 'ONLINE PAYMENT K-ELECTRIC', amount: 9622, source: 's', single: true }])[0].amount).toBe(9622);
  });

  it('builds the same dedupe key for the same row', () => {
    expect(keyOf({ date: '2026-10-01', desc: 'Shop', amount: 10 })).toBe(keyOf({ date: '2026-10-01', desc: 'SHOP', amount: 10.0 }));
  });
});

describe('PDF text to lines', () => {
  const item = (str: string, x: number, y: number, width = str.length * 5) => ({ str, transform: [1, 0, 0, 1, x, y], width });

  it('orders lines top to bottom and words left to right, one page at a time', () => {
    const lines = textItemsToLines([[item('second', 10, 100), item('first', 10, 200), item('B', 300, 200)]]);
    expect(lines).toEqual(['first   B', 'second', PAGE_BREAK]);
  });

  it('drops text drawn again at the same spot (HBL draws words many times)', () => {
    const dup = Array.from({ length: 11 }, () => item('Sep 15, 2026', 58, 358.4));
    expect(textItemsToLines([dup])).toEqual(['Sep 15, 2026', PAGE_BREAK]);
  });
});
