import type { ReactNode } from 'react';
import { fxFees, monthName, sumBy, type Txn } from '@spend-lens/core';
import { Icon } from '@spend-lens/ui';
import { plural, type View } from '../state/view';
import { CatBadge, Count } from '../components/bits';

type Insight = [icon: string, body: ReactNode];

/** Plain-words observations about the spending. */
export function computeInsights(v: View, ms: string[], spend: Txn[]): Insight[] {
  const { money, catOf } = v;
  const out: Insight[] = [];
  const tops = v.merchantTotals(spend);
  if (tops.length) out.push(['cat:' + tops[0][1].cat, <><b>{tops[0][0]}</b> got {money(tops[0][1].v)} of your money, more than any other merchant ({plural(tops[0][1].n, 'purchase')}).</>]);
  const rec = v.recurring(ms);
  if (rec.length) {
    const sum = rec.reduce((a, r) => a + r.avg, 0);
    out.push(['repeat', <><b>{rec.length === 1 ? 'One thing bills' : `${rec.length} things bill`} you every month</b>, about {money(sum)} in total. The biggest is {rec[0].name} at {money(rec[0].avg)}.</>]);
  }
  if (ms.length >= 2) {
    const all = v.tx.filter(t => t.amount > 0);
    const last = ms[ms.length - 1], prev = ms.slice(0, -1);
    const lastBy = sumBy(all.filter(t => t.date.startsWith(last)), catOf);
    const prevBy = sumBy(all.filter(t => prev.some(p => t.date.startsWith(p))), catOf);
    const avgMonth = all.reduce((s, t) => s + t.amount, 0) / ms.length;
    const changes: { c: string; a: number; b: number; p: number }[] = [];
    for (const c of new Set([...lastBy.keys(), ...prevBy.keys()])) {
      const a = lastBy.get(c) || 0, b = (prevBy.get(c) || 0) / prev.length;
      if (b > 0 && Math.abs(a - b) > 0.03 * avgMonth) changes.push({ c, a, b, p: (a - b) / b * 100 });
    }
    changes.sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b));
    for (const ch of changes.slice(0, 3)) {
      const up = ch.p > 0, verb = ch.a === 0 ? 'stopped completely' : up ? (ch.p > 50 ? 'jumped' : 'went up') : ch.p < -50 ? 'fell sharply' : 'went down';
      out.push(['cat:' + ch.c, <><b>{ch.c}</b> {verb} in {monthName(last)} <span className={'pill ' + (up ? 'up' : 'down')}>{up ? '+' : '−'}{Math.abs(ch.p).toFixed(0)}%</span>: {money(ch.a)} against a usual {money(ch.b)}.</>]);
    }
  }
  if (spend.length > 10) {
    const wk = spend.filter(t => { const d = new Date(t.date + 'T00:00').getDay(); return d === 0 || d === 6; }).reduce((a, t) => a + t.amount, 0);
    const tot = spend.reduce((a, t) => a + t.amount, 0) || 1;
    out.push(['calendar', <><b>{(wk / tot * 100).toFixed(0)}%</b> of your spending lands on weekends, which are just 2 days of the week.</>]);
  }
  const fees = spend.filter(t => catOf(t) === 'Fees & Charges').reduce((a, t) => a + t.amount, 0);
  if (fees > 0) out.push(['cat:Fees & Charges', <><b>{money(fees)}</b> went to card fees, taxes and charges in total.</>]);
  return out;
}

function FxNote({ v, spend }: { v: View; spend: Txn[] }) {
  const { sum, base, merchants: names } = fxFees(spend, v.catOf);
  if (!sum) return null;
  return (
    <div className="fx"><div className="lbl">Foreign transaction fees</div><Count className="v" value={sum} />
      <p>went to bank fees and taxes on foreign-currency payments{names.length ? <> like {names.map((n, i) => <span key={n}>{i ? ', ' : ''}<b>{n}</b></span>)}</> : null}.
        {base ? <> That's an extra <b>{(sum / base * 100).toFixed(1)}%</b> on top of the {v.money(base)} you spent with them.</> : null}</p>
    </div>
  );
}

const InsightBadge = ({ i }: { i: string }) => i.startsWith('cat:')
  ? <CatBadge c={i.slice(4)} />
  : <span className="cat-ic" style={{ ['--cc' as string]: 'var(--ink-2)' }}><Icon name={i} /></span>;

/** Insights list, with the foreign-fee note first when there is one. */
export function Notes({ v, spend, ms, max, compact }: { v: View; spend: Txn[]; ms: string[]; max: number; compact: boolean }) {
  const hasFx = fxFees(spend, v.catOf).sum > 0;
  let ins = computeInsights(v, ms, spend);
  if (hasFx && compact) ins = ins.filter(x => x[0] !== 'cat:Fees & Charges');
  ins = ins.slice(0, hasFx && compact ? max - 1 : max);
  if (!hasFx && !ins.length) return <div className="empty-mini">Upload two or more months to see what changed.</div>;
  return <>
    <FxNote v={v} spend={spend} />
    {ins.map(([i, h], k) => <div className="insight" key={k}><InsightBadge i={i} /><div className="txt">{h}</div></div>)}
  </>;
}
