import type { ReactNode } from 'react';
import { fmtDate, monthLabel, monthName, sumBy } from '@spend-lens/core';
import { Icon } from '@spend-lens/ui';
import { useApp, type Page } from '../state/store';
import { plural, useView, type View } from '../state/view';
import { CatBadge, Count, MerchIcon, More, pressable } from '../components/bits';
import { StackedChart } from '../components/Charts';
import { Notes } from './insights';

const goCat = (c: string) => { const s = useApp.getState(); s.set({ category: c }); s.go('categories'); };

function storySentence(v: View): ReactNode {
  const { months: ms, month, spend, total, byCat, money } = v;
  const when = month === 'all' ? (ms.length > 1 ? `these ${ms.length} months` : monthName(ms[0])) : monthName(month);
  if (!spend.length) return `No purchases in ${when}, only payments and refunds.`;
  const big = <Count className="hl" value={total} />;
  const top = byCat[0];
  const share = top && total ? Math.round(top[1] / total * 100) : 0;
  const topTxt = top ? <> <b>{top[0]}</b> took the biggest share, {share}%.</> : null;
  if (month === 'all') {
    if (ms.length > 1) return <>Over {ms.length} months you spent {big}, about {money(total / ms.length)} a month.{topTxt}</>;
    return <>In {monthName(ms[0])} you spent {big} across {plural(spend.length, 'purchase')}.{topTxt}</>;
  }
  const i = ms.indexOf(month), prevM = ms[i - 1];
  const prev = prevM ? v.monthTotal(prevM) : 0;
  if (!prev) return <>In {monthName(month)} you spent {big} across {plural(spend.length, 'purchase')}.{topTxt}</>;
  const p = Math.round((total - prev) / prev * 100);
  const cmp = p === 0 ? <>, about the same as {monthName(prevM)}.</>
    : <>, <span className={p > 0 ? 'up' : 'down'}>{Math.abs(p)}% {p > 0 ? 'more' : 'less'}</span> than {monthName(prevM)}.</>;
  const cur = sumBy(spend, v.catOf), old = sumBy(v.tx.filter(t => t.amount > 0 && t.date.startsWith(prevM)), v.catOf);
  let best: { c: string; d: number } | null = null;
  for (const c of new Set([...cur.keys(), ...old.keys()])) {
    const d = (cur.get(c) || 0) - (old.get(c) || 0);
    if (!best || (p > 0 ? d > best.d : d < best.d)) best = { c, d };
  }
  const why = p !== 0 && best && Math.sign(best.d) === Math.sign(total - prev)
    ? <> Most of the {p > 0 ? 'increase' : 'drop'} came from <b>{best.c}</b> ({best.d > 0 ? '+' : '−'}{money(Math.abs(best.d))}).</> : null;
  return <>In {monthName(month)} you spent {big}{cmp}{why}</>;
}

function Story() {
  const v = useView(), s = useApp.getState();
  const { months: ms, month, spend, credits, total, nMonths, money } = v;
  const period = month === 'all' ? (ms.length > 1 ? `${monthLabel(ms[0], true)} – ${monthLabel(ms[ms.length - 1], true)}` : monthLabel(ms[0], true)) : monthLabel(month, true);
  const biggest = spend.slice().sort((a, b) => b.amount - a.amount)[0];
  const rec = v.recurring(ms), recSum = rec.reduce((a, r) => a + r.avg, 0);
  const cr = -credits.reduce((a, t) => a + t.amount, 0);
  const toTx = (p: Partial<ReturnType<typeof useApp.getState>>) => () => { s.set(p); s.go('transactions'); };
  const figs: [string, number, string, () => void][] = [
    [nMonths > 1 ? 'Avg per month' : 'Avg per day', total / (nMonths > 1 ? nMonths : 30), plural(spend.length, 'purchase'), () => s.go('transactions')],
    ['Largest purchase', biggest ? biggest.amount : 0, biggest ? biggest.merchant : '—', toTx({ sort: { k: 'amount', dir: -1 }, category: null, type: 'spend' })],
    ['Recurring', recSum, rec.length ? `${plural(rec.length, 'charge')} a month` : 'Needs 2+ months', () => s.go('insights' as Page)],
    ['Payments & refunds', cr, plural(credits.length, 'credit'), toTx({ type: 'credit', category: null })],
  ];
  const remove = async (f: string) => {
    const l = v.labels[f], n = s.txns.filter(t => t.source === f).length;
    const st = useApp.getState();
    if (!(await st.askConfirm({ title: `Remove the ${l} statement?`, body: `This removes its ${plural(n, 'transaction')} from Spend Lens. You can upload the file again at any time.`, ok: 'Remove statement' }))) return;
    st.removeSource(f);
    st.toastMsg(`Removed the ${l} statement`, 'trash');
  };
  return (
    <section className="story">
      <div className="eyebrow"><span className="dot" />Statement of spending<span id="stPeriod" className="hidden">{period}</span></div>
      <h2 className="story-text">{storySentence(v)}</h2>
      <div className="figures">
        {figs.map(([l, val, n, act]) => <button key={l} className="fig" onClick={act}><span className="lbl">{l}</span><Count className="v" value={val} /><span className="n">{n}</span></button>)}
      </div>
      <div className="stmts">
        <span>Statements</span>
        {v.files.map(f => {
          const info = v.fileInfo[f];
          return (
            <span key={f} className="chip" data-tip={`${info.name}${info.g ? ` — no currency found in this file, assumed ${info.c}` : ` — amounts in ${info.c}`}`}>
              <Icon name="file" size="sm" /><span>{v.labels[f]}</span><span className="cur">{info.c}{info.g ? '?' : ''}</span>
              <button aria-label={`Remove ${v.labels[f]} statement`} onClick={() => remove(f)}><Icon name="x" size="sm" /></button>
            </span>
          );
        })}
      </div>
    </section>
  );
}

function Where() {
  const { byCat, total, money, catColor } = useView();
  if (!total) return <><div className="spectrum" /><div className="ledger"><div className="empty-mini">No purchases in this period.</div></div></>;
  const segs: [string, number, number | ''][] = [];
  let other = 0;
  byCat.forEach(([c, x], i) => { if (x / total < 0.025) other += x; else segs.push([c, x, i + 1]); });
  if (other) segs.push(['', other, '']);
  const lbl = (c: string) => c || 'Smaller categories';
  return <>
    <div className="spectrum">
      <div className="spec-labels" aria-hidden="true">
        {segs.map(([c, x, n]) => <span key={c || '~'} style={{ flex: x }}>{n ? <span className="rkn">{n}</span> : null}{x / total >= 0.09 ? <>{c || 'Other'}<b>{Math.round(x / total * 100)}%</b></> : null}</span>)}
      </div>
      <div className="spec-bar">
        {segs.map(([c, x]) => (
          <button key={c || '~'} className="seg" style={{ flex: x, background: c ? catColor(c) : 'var(--c-grey)' }}
            onClick={() => (c ? goCat(c) : useApp.getState().go('categories'))}
            data-tip={`${lbl(c)}: ${money(x)} (${(x / total * 100).toFixed(1)}%)`} aria-label={`${lbl(c)} ${money(x)}`} />
        ))}
      </div>
    </div>
    <div className="ledger">
      {byCat.map(([c, x], i) => (
        <div key={c} className="lrow" {...pressable(() => goCat(c))} aria-label={`${i + 1}. ${c}, ${money(x)}, ${(x / total * 100).toFixed(1)} percent`}>
          <span className="rk">{i + 1}</span><CatBadge c={c} size="sm" /><span className="nm">{c}</span><span className="dots" />
          <span className="amt">{money(x)}</span><span className="pct">{(x / total * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  </>;
}

function MonthsWidget() {
  const v = useView();
  const last = v.months.slice(-6), vals = last.map(v.monthTotal);
  let foot: ReactNode;
  if (last.length > 1) {
    const a = vals[vals.length - 1], b = vals[vals.length - 2], p = b ? (a - b) / b * 100 : 0;
    foot = !b
      ? <div className="foot-note">Nothing was spent in {monthName(last[last.length - 2])}. Select a month to focus on it.</div>
      : <div className="foot-note"><span className={'pill ' + (p > 0 ? 'up' : 'down')}>{p > 0 ? '+' : '−'}{Math.abs(p).toFixed(0)}%</span>{monthName(last[last.length - 1])} vs {monthName(last[last.length - 2])}. Select a month to focus on it.</div>;
  } else foot = <div className="foot-note">Upload more months to compare them.</div>;
  return <div>{<StackedChart months={last} small />}{foot}</div>;
}

function MerchWidget() {
  const v = useView();
  return (
    <ul className="list compact">
      {v.merchantTotals(v.spend).slice(0, 6).map(([name, e]) => (
        <li key={name}><MerchIcon c={e.cat} /><div className="l"><div>{name}</div><small>{e.cat} · {plural(e.n, 'purchase')}</small></div><div className="r">{v.money(e.v)}</div></li>
      ))}
    </ul>
  );
}

function Receipt() {
  const { period, money } = useView();
  const recent = period.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, 8);
  return (
    <section className="receipt">
      <div className="r-head"><b>Recent transactions</b><span>{recent.length ? `${fmtDate(recent[recent.length - 1].date)} – ${fmtDate(recent[0].date)}` : ''}</span></div>
      <div>
        {recent.map(t => (
          <div className="rline" key={t.id}>
            <span className="d">{fmtDate(t.date)}</span><span className="nm">{t.merchant}</span><span className="dots" />
            <span className={'amt' + (t.amount < 0 ? ' cr' : '')}>{money(Math.abs(t.amount))}{t.amount < 0 ? ' CR' : ''}</span>
          </div>
        ))}
      </div>
      <div className="r-foot"><span>{recent.length} of {plural(period.length, 'transaction')}</span><More page="transactions">View all</More></div>
    </section>
  );
}

export function Overview() {
  const v = useView();
  return (
    <div>
      <Story />
      <section className="sheet" style={{ marginBottom: 22 }}>
        <div className="sec-h"><span className="num">01</span><h3>Spending by category</h3><More page="categories">All categories</More></div>
        <Where />
      </section>
      <div className="split">
        <section className="sheet">
          <div className="sec-h"><span className="num">02</span><h3>Monthly spending</h3><More page="trends">Trends</More></div>
          <MonthsWidget />
        </section>
        <section className="sheet">
          <div className="sec-h"><span className="num">03</span><h3>Top merchants</h3><More page="merchants">All merchants</More></div>
          <MerchWidget />
        </section>
      </div>
      <div className="split wide-left">
        <section className="sheet">
          <div className="sec-h"><span className="num">04</span><h3>Insights</h3><More page="insights">All insights</More></div>
          <div><Notes v={v} spend={v.spend} ms={v.months} max={4} compact /></div>
        </section>
        <Receipt />
      </div>
    </div>
  );
}
