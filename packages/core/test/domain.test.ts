import { describe, expect, it } from 'vitest';
import {
  categorize, categoryMonthMatrix, change, detectCurrency, fmtDate, fxFees, makeCategoryOf, merchantOf, merchantTotals,
  money, moneyShort, monthLabel, monthsOf, monthTotal, prefersMonthFirst, recurringCharges, statementLabels, type Txn,
} from '@spend-lens/core';

const tx = (date: string, desc: string, amount: number, source = 's'): Txn => ({ date, desc, amount, source, merchant: merchantOf(desc) });
const catOf = makeCategoryOf(() => ({}));

describe('currency', () => {
  it('reads the billing currency from the statement', () => {
    expect(detectCurrency('Date,Description,Amount\n10/02/2026,STARBUCKS,-$5.40')).toBe('USD');
    expect(detectCurrency('Transaction Date,Description,Amount (AED)\n02/10/2026,CARREFOUR,123.50')).toBe('AED');
    expect(detectCurrency('Statement balance £1,204.33')).toBe('GBP');
    expect(detectCurrency('Date,Details,Debit\n02/10/2026,IMTIAZ,Rs. 4,500')).toBe('PKR');
    expect(detectCurrency('FACEBK USD Amount: 7.64 USD Conversion Rate: 277.75 Amount(PKR) 2,122.01')).toBe('PKR');
    expect(detectCurrency('Date,Description,Amount\n05/10/2026,SHOP,100')).toBeNull();
    expect(prefersMonthFirst('USD')).toBe(true);
    expect(prefersMonthFirst('PKR')).toBe(false);
  });
});

describe('categories and merchants', () => {
  it('matches keywords, most specific category first', () => {
    expect(categorize('NEEDZ SUPER MARKET, KARACHI')).toBe('Groceries');
    expect(categorize('GOOGLE ADS 123')).toBe('Advertising');
    expect(categorize('Google One, London')).toBe('Subscriptions');
    expect(categorize('PIA ')).toBe('Travel');
    expect(categorize('Something unknown')).toBe('Other');
  });

  it('applies the user\'s override per merchant, and credits are always payments', () => {
    const c = makeCategoryOf(() => ({ 'k-electric': 'Shopping' }));
    expect(c(tx('2026-10-01', 'K-ELECTRIC, KARACHI', 100))).toBe('Shopping');
    expect(c(tx('2026-10-01', 'REFUND', -100))).toBe('Payments & Refunds');
  });

  it('cleans merchant names', () => {
    expect(merchantOf('FACEBK *AGUV36A9T4, FACEBOOK.COM')).toBe('Facebook Ads');
    expect(merchantOf('NEEDZ SUPER MARKET, KARACHI')).toBe('Needz Super Market');
    expect(merchantOf('FED on Foreign Transaction Fee')).toBe('FED on Foreign Transaction Fee');
    expect(merchantOf('SPOTIFY P1A2B3C')).toBe('Spotify');
  });
});

describe('formatting', () => {
  it('formats rupees in lakh style and other currencies normally', () => {
    expect(money(156955)).toBe('Rs 1,56,955');
    expect(money(-500)).toBe('−Rs 500');
    expect(money(156955, 'PKR', true)).toBe('Rs 1.57 lac');
    expect(money(21000000, 'PKR', true)).toBe('Rs 2.1 cr');
    expect(moneyShort(45200)).toBe('45.2k');
    expect(money(1204, 'USD')).toBe('$1,204');
  });

  it('writes dates as DD MMM YY and months as MMM ’YY', () => {
    expect(fmtDate('2026-10-02')).toBe('02 Oct 26');
    expect(monthLabel('2026-10')).toBe('Oct ’26');
    expect(monthLabel('2026-10', true)).toBe('October 2026');
  });

  it('names statements by the months they cover', () => {
    const labels = statementLabels([
      { source: 'a', date: '2026-09-15' }, { source: 'a', date: '2026-10-15' },
      { source: 'b', date: '2026-11-03' },
      { source: 'c', date: '2025-12-20' }, { source: 'c', date: '2026-01-10' },
      { source: 'd', date: '2026-09-20' }, { source: 'd', date: '2026-10-01' },
      { source: 'Sample statement', date: '2026-08-01' }, { source: 'Sample statement', date: '2026-10-28' },
    ]);
    expect(labels).toMatchObject({ a: 'Sep–Oct 26', b: 'Nov 26', c: 'Dec 25–Jan 26', d: 'Sep–Oct 26 · 2', 'Sample statement': 'Aug–Oct 26 (sample)' });
  });
});

describe('analytics', () => {
  const data = [
    tx('2026-09-03', 'NETFLIX.COM', 1500), tx('2026-10-03', 'NETFLIX.COM', 1500),
    tx('2026-09-05', 'FOOD PANDA', 1000), tx('2026-10-05', 'FOOD PANDA', 4000), tx('2026-10-06', 'FOOD PANDA', 3000),
    tx('2026-10-07', 'FACEBK *X1Y2Z3, DUBLIN', 2000), tx('2026-10-08', 'Foreign Transaction Fee', 80), tx('2026-10-08', 'Advance Tax on Foreign Transaction', 10),
    tx('2026-10-09', 'Payment Received', -5000),
  ];
  const months = monthsOf(data);

  it('totals months and merchants', () => {
    expect(months).toEqual(['2026-09', '2026-10']);
    expect(monthTotal(data, '2026-10')).toBe(10590);
    expect(merchantTotals(data.filter(t => t.amount > 0), catOf)[0]).toEqual(['Foodpanda', { v: 8000, n: 3, cat: 'Food & Dining' }]);
  });

  it('finds charges that repeat every month at a steady amount', () => {
    expect(recurringCharges(data, months, catOf).map(r => r.name)).toEqual(['Netflix']);
    expect(recurringCharges(data, ['2026-10'], catOf)).toEqual([]);
  });

  it('adds up what paying abroad cost', () => {
    const f = fxFees(data.filter(t => t.amount > 0), catOf);
    expect(f.sum).toBe(90);
    expect(f.base).toBe(5000);
    expect(f.merchants).toEqual(['Netflix', 'Facebook Ads']);
  });

  it('compares categories month to month', () => {
    const m = categoryMonthMatrix(data, months, catOf);
    expect(m['Food & Dining']).toEqual({ '2026-09': 1000, '2026-10': 7000 });
    expect(change(7000, 1000)).toEqual({ a: 7000, b: 1000, d: 6000, p: 600 });
    expect(change(500, 0).p).toBeNull();
  });
});
