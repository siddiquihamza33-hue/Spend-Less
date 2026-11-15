import { monthLabel, sumBy } from '@spend-lens/core';
import { useApp } from '../state/store';
import { useView } from '../state/view';

const niceStep = (raw: number) => {
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1))), n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
};

const toggleMonth = (m: string) => {
  const s = useApp.getState();
  s.set({ month: s.month === m ? 'all' : m, page: 0, tip: null });
};

/** Stacked monthly bars: top 5 categories, the rest in Other. Click a month to focus the app on it. */
export function StackedChart({ months, small }: { months: string[]; small?: boolean }) {
  const v = useView(), set = useApp(s => s.set);
  const spend = v.tx.filter(t => t.amount > 0);
  const top = [...sumBy(spend, v.catOf)].sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]);
  const series = top.map(c => ({ c, color: v.catColor(c) }));
  if (spend.some(t => !top.includes(v.catOf(t)))) series.push({ c: 'Other', color: 'var(--c-grey)' });
  const data = months.map(m => {
    const vals = series.map(() => 0);
    for (const t of spend) if (t.date.startsWith(m)) { let i = top.indexOf(v.catOf(t)); if (i < 0) i = series.length - 1; vals[i] += t.amount; }
    return { m, vals, total: vals.reduce((a, b) => a + b, 0) };
  });
  const max = Math.max(...data.map(d => d.total), 1);
  const step = niceStep(max / 4), ceil = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let x = 0; x <= ceil + 1e-9; x += step) ticks.push(x);

  const showTip = (d: (typeof data)[number], el: HTMLElement, e?: React.PointerEvent) => set({
    tip: {
      content: { kind: 'chart', title: monthLabel(d.m, true), total: v.money(d.total), rows: series.map((s, i) => ({ label: s.c, color: s.color, value: v.money(d.vals[i]), n: d.vals[i] })).filter(r => r.n).map(({ n: _n, ...r }) => r) },
      x: e?.clientX || null, y: e?.clientY || null, rect: el.getBoundingClientRect(),
    },
  });

  return <>
    <div className={'mchart' + (small ? ' sm' : '')}>
      {ticks.map(x => {
        const y = 100 - x / ceil * 100;
        return [<div key={'g' + x} className={'gridline' + (x === 0 ? ' base' : '')} style={{ top: y + '%' }} />, <div key={'t' + x} className="tick" style={{ top: y + '%' }}>{v.moneyShort(x)}</div>];
      })}
      <div className="cols">
        {data.map(d => {
          const nz = d.vals.map((x, i) => [x, i] as const).filter(x => x[0] > 0);
          return (
            <div key={d.m} className={'col' + (v.month !== 'all' && v.month !== d.m ? ' dim' : '')} tabIndex={0} role="button" aria-label={`${monthLabel(d.m, true)} ${v.money(d.total)}`}
              onPointerMove={e => showTip(d, e.currentTarget, e)} onFocus={e => showTip(d, e.currentTarget)}
              onClick={() => toggleMonth(d.m)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMonth(d.m); } }}>
              {nz.map(([x, i], k) => <div key={i} className={'seg' + (k === nz.length - 1 ? ' seg-top' : '')} style={{ height: `max(1px, calc(${(x / ceil * 100).toFixed(3)}% - 2px))`, background: series[i].color }} />)}
            </div>
          );
        })}
      </div>
    </div>
    <div className="mlabels">{data.map(d => <div key={d.m} className={v.month === d.m ? 'on' : undefined}>{monthLabel(d.m)}</div>)}</div>
    <div className="legend">{series.map(s => <span key={s.c}><i style={{ background: s.color }} />{s.c}</span>)}</div>
  </>;
}

/** Single-series month bars with direct labels. */
export function MiniBars({ months, vals, small, color }: { months: string[]; vals: number[]; small?: boolean; color?: string }) {
  const v = useView();
  const mx = Math.max(...vals, 1);
  return <>
    <div className={'mini-bars' + (small ? ' sm' : '')} style={color ? { ['--cc' as string]: color } : undefined}>
      {months.map((m, i) => (
        <button key={m} className={'mb' + (v.month === m ? ' on' : '')} onClick={() => toggleMonth(m)}
          aria-label={`${monthLabel(m, true)}: ${v.money(vals[i])}${v.month === m ? ', selected' : ''}`}>
          <b>{v.moneyShort(vals[i])}</b><i style={{ height: Math.max(2, vals[i] / mx * 100).toFixed(1) + '%' }} />
        </button>
      ))}
    </div>
    <div className="mini-labels">{months.map(m => <div key={m}>{monthLabel(m)}</div>)}</div>
  </>;
}

export { toggleMonth };
