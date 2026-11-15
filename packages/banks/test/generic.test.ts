import { describe, expect, it } from 'vitest';
import { parseStatement, linesToTxns } from '@spend-lens/banks';

const csv = (text: string) => ({ kind: 'table' as const, rows: text.trim().split('\n').map(l => l.split(',')) });

describe('generic table (CSV / Excel)', () => {
  it('reads a simple statement and makes purchases positive', () => {
    const { bank, txns } = parseStatement(csv(`
Transaction Date,Description,Amount
02/10/2026,STARBUCKS,-540.00
05/10/2026,NAHEED SUPERMARKET,-2400.00
09/10/2026,PAYMENT THANK YOU,2940.00`), 'a');
    expect(bank).toBe('generic-table');
    expect(txns.map(t => t.amount)).toEqual([540, 2400, -2940]);
  });

  it('uses separate debit and credit columns', () => {
    const { txns } = parseStatement(csv(`
Date,Details,Debit,Credit
01/10/2026,IMTIAZ,1500,
03/10/2026,REFUND IMTIAZ,,200`), 'b');
    expect(txns.map(t => t.amount)).toEqual([1500, -200]);
  });

  it('reads a Type column: sales are purchases even when negative', () => {
    const { txns } = parseStatement(csv(`
Transaction Date,Post Date,Description,Category,Type,Amount
10/02/2026,10/03/2026,STARBUCKS,Food,Sale,-5.40
10/09/2026,10/09/2026,Payment Thank You,,Payment,29.39`), 'c', { preferMDY: true });
    expect(txns.map(t => [t.date, t.amount])).toEqual([['2026-10-02', 5.4], ['2026-10-09', -29.39]]);
  });

  it('explains when it cannot find the columns', () => {
    expect(() => parseStatement(csv('hello,world\nnothing,here'), 'd')).toThrow(/columns/);
  });
});

describe('generic PDF lines', () => {
  it('rolls December back a year only for dates printed without one', () => {
    const noYear = linesToTxns(['Statement date 10 Jan 2026', 'Transaction Date Description Amount', '28 Dec SHOP B 200.00', '05 Jan SHOP C 300.00'], 'x');
    expect(noYear.map(t => t.date)).toEqual(['2025-12-28', '2026-01-05']);
    const printed = linesToTxns(['Transaction Date Description Amount', '15/12/2025 SHOP A 100.00', '05/01/2026 SHOP C 300.00', 'Statement 2025 2025 2025'], 'y');
    expect(printed.map(t => t.date)).toEqual(['2025-12-15', '2026-01-05']);
  });

  it('skips balance and total lines', () => {
    const t = linesToTxns(['Transaction Date Description Amount', '01/10/2026 Previous Balance 5,000.00', '02/10/2026 SHOP 100.00', '31/10/2026 Closing Balance 5,100.00'], 'z');
    expect(t.map(x => x.desc)).toEqual(['SHOP']);
  });
});
