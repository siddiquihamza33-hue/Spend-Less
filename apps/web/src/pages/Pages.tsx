import { useEffect } from 'react';
import { CAT_ICON, CAT_NAMES, CREDIT_CAT, MON3, categoryMonthMatrix, fmtDate, monthLabel, monthName, sumBy, type Txn } from '@spend-lens/core';
import { Icon } from '@spend-lens/ui';
import { useApp, type SortKey, type TxType } from '../state/store';
import { plural, useView } from '../state/view';
import { CatBadge, MerchIcon, pressable } from '../components/bits';
import { MiniBars, StackedChart, toggleMonth } from '../components/Charts';
import { Notes } from './insights';

const goCat = (c: string) => { const s = useApp.getState(); s.set({ category: c }); s.go('categories'); };

/* ---------------- 02 Categories ---------------- */
export function Categories() {
  const v = useView(), set = useApp(s => s.set);
  const { byCat, total, money, catColor } = v;
  const max = byCat[0]?.[1] || 1;
  const sel = byCat.some(([c]) => c === v.category) ? v.category! : byCat[0]?.[0];
  return (
    <div className="detail-grid">
      <section className="card">
        <div className="card-h"><div className="grow"><h2>All categories</h2><p>{money(total)} across {plural(byCat.length, 'category', 'categories')}. Select one for details.</p></div></div>
        <div>
          {byCat.map(([c, x]) => (
            <div key={c} className={'cat-row' + (sel === c ? ' sel' : '')} {...pressable(() => set({ category: c }))} aria-label={`${c} ${money(x)}`} style={{ ['--cc' as string]: catColor(c) }}>
              <CatBadge c={c} />
              <span className="name">{c}</span>
              <span className="track"><span className="bar" style={{ width: (x / max * 100).toFixed(2) + '%' }} /></span>
              <span className="amt">{money(x)}<small>{(x / total * 100).toFixed(1)}%</small></span>
            </div>
          ))}
          {!byCat.length && <div className="empty-mini">No purchases in this period.</div>}
        </div>
      </section>
      <section className="card cat-detail">{sel ? <CatDetail sel={sel} /> : <div className="empty-mini">No purchases in this period.</div>}</section>
    </div>
  );
}

function CatDetail({ sel }: { sel: string }) {
  const v = useView();
  const { money, catColor, months: ms } = v;
  const list = v.spend.filter(t => v.catOf(t) === sel);
  const x = list.reduce((a, t) => a + t.amount, 0);
  const activeMonths = v.month === 'all' ? ms.length : 1;
  const all = v.tx.filter(t => t.amount > 0 && v.catOf(t) === sel);
  const last = ms.slice(-6), vals = last.map(mm => all.reduce((a, t) => a + (t.date.startsWith(mm) ? t.amount : 0), 0));
  const toTx = () => { const s = useApp.getState(); s.set({ category: sel, type: 'spend', page: 0, search: '' }); s.go('transactions'); };
  return <>
    <div className="cd-head" style={{ ['--cc' as string]: catColor(sel) }}>
      <span className="cd-ic"><Icon name={CAT_ICON[sel] || 'other'} size="lg" /></span>
      <div><div className="cd-name">{sel}</div><div className="cd-total">{money(x)}</div></div>
    </div>
    <div className="kv">
      <div><b>{(x / (v.total || 1) * 100).toFixed(1)}%</b><span>of spending</span></div>
      <div><b>{list.length}</b><span>purchases</span></div>
      <div><b>{money(x / activeMonths)}</b><span>{activeMonths > 1 ? 'per month' : 'this month'}</span></div>
    </div>
    {ms.length > 1 && <><div className="section-title">Last {plural(last.length, 'month')}</div><MiniBars months={last} vals={vals} small color={catColor(sel)} /></>}
    <div className="section-title">Where it went</div>
    <ul className="list compact">
      {v.merchantTotals(list).slice(0, 6).map(([name, e]) => (
        <li key={name}><MerchIcon c={sel} /><div className="l"><div>{name}</div><small>{plural(e.n, 'purchase')}</small></div><div className="r">{money(e.v)}<small>{(e.v / (x || 1) * 100).toFixed(0)}%</small></div></li>
      ))}
    </ul>
    <button className="btn ink block" onClick={toTx}><Icon name="list" size="sm" />View {plural(list.length, 'transaction')}</button>
  </>;
}

/* ---------------- 03 Trends ---------------- */
const mon3 = (m: string) => MON3[+m.slice(5, 7) - 1];
interface Chg { a: number; b: number; d: number; p: number | null }

function CatMonthTable() {
  const v = useView();
  const { money, catColor } = v;
  const last = v.months.slice(-6), spend = v.tx.filter(t => t.amount > 0);
  const cur = last[last.length - 1], prev = last[last.length - 2];
  const val = categoryMonthMatrix(spend, last, v.catOf);
  const get = (c: string, m: string) => (val[c] && val[c][m]) || 0;
  const cats = Object.keys(val).sort((x, y) => get(y, cur) - get(x, cur) || get(y, prev) - get(x, prev));
  const change = (c: string): Chg | null => {
    if (!prev) return null;
    const a = get(c, cur), b = get(c, prev), d = a - b;
    return { a, b, d, p: b ? d / b * 100 : null };
  };
  const Chg = ({ ch }: { ch: Chg | null }) => {
    if (!ch) return null;
    if (ch.b === 0 && ch.a > 0) return <span className="cm-chg"><span className="pill">New</span><small>wasn't in {mon3(prev)}</small></span>;
    if (ch.a === 0 && ch.b > 0) return <span className="cm-chg"><Icon name="trendDown" size="sm" /><b>−{money(ch.b)}</b><small>none in {mon3(cur)}</small></span>;
    if (Math.abs(ch.d) < 1) return <span className="cm-chg"><b>No change</b></span>;
    return <span className="cm-chg"><Icon name={ch.d > 0 ? 'trend' : 'trendDown'} size="sm" /><b>{ch.d > 0 ? '+' : '−'}{money(Math.abs(ch.d))}</b><small>{ch.d > 0 ? '+' : '−'}{Math.abs(ch.p!).toFixed(0)}%</small></span>;
  };
  let summary = null;
  if (prev) {
    const ch = cats.map(c => ({ c, ...change(c)! }));
    const up = ch.filter(x => x.d > 0).sort((x, y) => y.d - x.d)[0], down = ch.filter(x => x.d < 0).sort((x, y) => x.d - y.d)[0];
    summary = <>
      {up && <div className="cm-pt"><CatBadge c={up.c} size="sm" /><span><b>{up.c}</b> rose the most: <b>+{money(up.d)}</b>{up.p != null ? ` (+${up.p.toFixed(0)}%)` : ' (new this month)'}</span></div>}
      {down && <div className="cm-pt"><CatBadge c={down.c} size="sm" /><span><b>{down.c}</b> fell the most: <b>−{money(-down.d)}</b> ({down.a ? `−${Math.abs(down.p!).toFixed(0)}%` : 'none this month'})</span></div>}
    </>;
  }
  const tot = (m: string) => cats.reduce((a, c) => a + get(c, m), 0);
  const tch: Chg | null = prev ? { a: tot(cur), b: tot(prev), d: tot(cur) - tot(prev), p: tot(prev) ? (tot(cur) - tot(prev)) / tot(prev) * 100 : null } : null;
  return (
    <section className="card" style={{ marginBottom: 22 }}>
      <div className="card-h"><div className="grow"><h2>Category comparison</h2><p>{prev ? `${monthName(cur)} compared with ${monthName(prev)}, and every month side by side` : 'Upload another month to compare categories month to month'}</p></div></div>
      <div className="cm-summary">{summary}</div>
      <div className="tbl-wrap"><table className="cm">
        <thead><tr><th>Category</th>{last.map(m => <th key={m} className={'num' + (m === cur ? ' cur' : '')}>{monthLabel(m)}</th>)}{prev && <th className="num">Change vs {mon3(prev)}</th>}<th className="num">Monthly avg</th></tr></thead>
        <tbody>
          {cats.map(c => {
            const mx = Math.max(...last.map(m => get(c, m)), 1);
            const avg = last.reduce((a, m) => a + get(c, m), 0) / last.length;
            return (
              <tr key={c} className="clickable" {...pressable(() => goCat(c))} role={undefined} aria-label={`${c}: ${last.map(m => `${monthLabel(m, true)} ${money(get(c, m))}`).join(', ')}`}>
                <td><span className="catcell"><CatBadge c={c} size="sm" /><span>{c}</span></span></td>
                {last.map(m => { const x = get(c, m); return <td key={m} className={'num cm-cell' + (m === cur ? ' cur' : '')}>{x ? <><span className="cm-v">{money(x)}</span><span className="cm-bar"><i style={{ width: (x / mx * 100).toFixed(1) + '%', background: catColor(c) }} /></span></> : <span className="cm-none">—</span>}</td>; })}
                {prev && <td className="num"><Chg ch={change(c)} /></td>}
                <td className="num cm-avg">{money(avg)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot><tr><td>Total</td>{last.map(m => <td key={m} className={'num' + (m === cur ? ' cur' : '')}>{money(tot(m))}</td>)}{prev && <td className="num"><Chg ch={tch} /></td>}<td className="num">{money(last.reduce((a, m) => a + tot(m), 0) / last.length)}</td></tr></tfoot>
      </table></div>
      <div className="hint"><Icon name="lightbulb" size="sm" />Each bar compares a category with its own highest month. Select a row to open that category.</div>
    </section>
  );
}

function MonthTable() {
  const v = useView();
  const rev = v.months.slice().reverse();
  return (
    <section className="card">
      <div className="card-h"><div className="grow"><h2>Monthly totals</h2><p>Totals and the change from the month before</p></div></div>
      <div className="tbl-wrap"><table><thead><tr><th>Month</th><th className="num">Spent</th><th className="num">Purchases</th><th className="num">Change</th><th>Top category</th></tr></thead>
        <tbody>
          {rev.map((m, i) => {
            const list = v.tx.filter(t => t.amount > 0 && t.date.startsWith(m));
            const x = list.reduce((a, t) => a + t.amount, 0);
            const prevM = rev[i + 1], prev = prevM ? v.monthTotal(prevM) : 0;
            const p = prev ? (x - prev) / prev * 100 : null;
            const topC = [...sumBy(list, v.catOf)].sort((a, b) => b[1] - a[1])[0];
            const on = v.month === m;
            return (
              <tr key={m} className={'clickable' + (on ? ' on' : '')} {...pressable(() => toggleMonth(m))} aria-pressed={on}
                aria-label={`${monthLabel(m, true)}: ${v.money(x)}. ${on ? 'Selected. Select again to show all time' : 'Focus the app on this month'}`}>
                <td>{monthLabel(m, true)}</td><td className="num">{v.money(x)}</td><td className="num">{list.length}</td>
                <td className="num">{p == null ? <span style={{ color: 'var(--muted)' }}>—</span> : <span className={'pill ' + (p > 0 ? 'up' : 'down')}>{p > 0 ? '+' : '−'}{Math.abs(p).toFixed(0)}%</span>}</td>
                <td>{topC ? <span className="catcell"><CatBadge c={topC[0]} size="sm" />{topC[0]}</span> : '—'}</td>
              </tr>
            );
          })}
        </tbody></table></div>
    </section>
  );
}

export function Trends() {
  const v = useView();
  return (
    <div>
      <section className="card" style={{ marginBottom: 22 }}>
        <div className="card-h"><div className="grow"><h2>Monthly spending</h2><p>Top 5 categories, the rest in Other. Click a month to focus the whole app on it.</p></div></div>
        <StackedChart months={v.months} />
      </section>
      <CatMonthTable />
      <MonthTable />
    </div>
  );
}

/* ---------------- 04 Merchants ---------------- */
export function Merchants() {
  const v = useView();
  const { money, catColor } = v;
  const list = v.category ? v.spend.filter(t => v.catOf(t) === v.category) : v.spend;
  const total = list.reduce((a, t) => a + t.amount, 0) || 1;
  const rows = v.merchantTotals(list);
  const max = rows[0]?.[1].v || 1;
  const open = (name: string) => { const s = useApp.getState(); s.set({ search: name, type: 'spend', page: 0 }); s.go('transactions'); };
  return (
    <div>
      <section className="card">
        <div className="card-h"><div className="grow"><h2>All merchants</h2><p>{plural(rows.length, 'merchant')}{v.category ? ` in ${v.category}` : ''}, ranked by total spent</p></div></div>
        <ul className="mlist">
          {rows.map(([name, e], i) => (
            <li key={name}>
              <button className="mrow" onClick={() => open(name)} aria-label={`${name}, ${money(e.v)}, ${(e.v / total * 100).toFixed(1)} percent of spending. Show transactions`}>
                <span className="rank">{String(i + 1).padStart(2, '0')}</span>
                <MerchIcon c={e.cat} />
                <span className="m-main">
                  <span className="m-name">{name}</span>
                  <span className="m-meta">{e.cat} · {plural(e.n, 'purchase')} · avg {money(e.v / e.n)}</span>
                  <span className="m-bar" aria-hidden="true"><i style={{ width: Math.max(1.5, e.v / max * 100).toFixed(1) + '%', background: catColor(e.cat) }} /></span>
                </span>
                <span className="m-amt"><span className="m-val">{money(e.v)}</span><span className="m-share">{(e.v / total * 100).toFixed(1)}% of spending</span></span>
                <span className="m-go" aria-hidden="true"><Icon name="right" size="sm" /></span>
              </button>
            </li>
          ))}
          {!rows.length && <li className="empty-mini" style={{ display: 'block' }}>Nothing here yet.</li>}
        </ul>
      </section>
    </div>
  );
}

/* ---------------- 05 Insights ---------------- */
export function Insights() {
  const v = useView();
  const rec = v.recurring(v.months), sum = rec.reduce((a, r) => a + r.avg, 0);
  return (
    <div className="detail-grid">
      <section className="card">
        <div className="card-h"><div className="grow"><h2>All insights</h2><p>What changed, what repeats, and what it cost</p></div></div>
        <div><Notes v={v} spend={v.spend} ms={v.months} max={99} compact={false} /></div>
      </section>
      <section className="card">
        <div className="card-h"><div className="grow"><h2>Recurring charges</h2><p>{rec.length ? `${plural(rec.length, 'charge')}, about ${v.money(sum)} a month` : 'Merchants that charge about the same amount every month'}</p></div></div>
        <ul className="list">
          {rec.map(r => <li key={r.name}><MerchIcon c={r.cat} /><div className="l"><div>{r.name}</div><small>{r.cat}</small></div><div className="r">{v.money(r.avg)}<small>per month</small></div></li>)}
          {!rec.length && <li className="empty-mini" style={{ display: 'block' }}>{v.months.length < 2 ? 'Upload two or more months to find recurring charges.' : 'No recurring charges found.'}</li>}
        </ul>
      </section>
    </div>
  );
}

/* ---------------- 06 Transactions ---------------- */
const PAGE = 25;
const COLS: [SortKey, string][] = [['date', 'Date'], ['merchant', 'Merchant'], ['category', 'Category'], ['amount', 'Amount']];

export function Transactions() {
  const v = useView();
  const s = useApp();
  const { money, catOf } = v;
  const q = s.search.toLowerCase();
  const rows = v.period.filter(t =>
    (s.type === 'all' || (s.type === 'spend' ? t.amount > 0 : t.amount < 0)) &&
    (!v.category || catOf(t) === v.category) &&
    (!q || t.desc.toLowerCase().includes(q) || t.merchant.toLowerCase().includes(q)));
  const { k, dir } = s.sort;
  const key = (t: Txn) => (k === 'category' ? catOf(t) : t[k]);
  rows.sort((a, b) => { const va = key(a), vb = key(b); return (va < vb ? -1 : va > vb ? 1 : 0) * dir; });
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const page = Math.min(s.page, pages - 1);
  useEffect(() => { if (page !== s.page) s.set({ page }); }, [page, s.page]);
  const slice = rows.slice(page * PAGE, page * PAGE + PAGE);
  const tot = rows.reduce((a, t) => a + t.amount, 0);
  const sortBy = (key: SortKey) => s.set({ sort: { k: key, dir: s.sort.k === key ? (-s.sort.dir as 1 | -1) : key === 'date' || key === 'amount' ? -1 : 1 } });
  const recat = (t: Txn, c: string) => {
    const m = t.merchant.toLowerCase();
    s.setOverride(m, c);
    s.toastMsg(`All “${m}” purchases moved to ${c}`, 'tag');
  };
  return (
    <div>
      <section className="card" id="transactions">
        <div className="card-h">
          <div className="grow"><h2>All transactions</h2><p>{plural(rows.length, 'transaction')} · {money(Math.abs(tot))}</p></div>
          <div className="tbl-tools">
            <label className="search"><Icon name="search" size="sm" /><input type="search" placeholder="Search merchants" aria-label="Search transactions" value={s.search} onChange={e => s.set({ search: e.target.value, page: 0 })} /></label>
            <select aria-label="Type" value={s.type} onChange={e => s.set({ type: e.target.value as TxType, page: 0 })}>
              <option value="spend">Purchases</option>
              <option value="credit">Payments &amp; refunds</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead><tr>
              {COLS.map(([key, label]) => (
                <th key={key} className={key === 'amount' ? 'num' : undefined} {...pressable(() => sortBy(key))}
                  aria-sort={s.sort.k === key ? (s.sort.dir > 0 ? 'ascending' : 'descending') : 'none'}>
                  {label}{s.sort.k === key ? (s.sort.dir > 0 ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr></thead>
            <tbody>
              {slice.map(t => {
                const c = catOf(t);
                return (
                  <tr key={t.id} className={t.amount < 0 ? 'credit' : undefined}>
                    <td className="date">{fmtDate(t.date)}</td>
                    <td className="desc"><div className="m"><MerchIcon c={c} /><div><div className="nm">{t.merchant}</div><small>{t.desc}</small></div></div></td>
                    <td>{t.amount < 0
                      ? <span className="credit-tag"><Icon name="refund" size="sm" />{CREDIT_CAT}</span>
                      : <div className="catcell"><select value={c} aria-label={`Category for ${t.merchant}`} onChange={e => recat(t, e.target.value)}>{CAT_NAMES.map(n => <option key={n}>{n}</option>)}</select></div>}</td>
                    <td className="num">{t.amount < 0 ? '+' : ''}{money(Math.abs(t.amount))}</td>
                  </tr>
                );
              })}
              {!slice.length && <tr><td colSpan={4}><div className="empty-mini">No transactions match.</div></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="pager"><span>Page {page + 1} of {pages}</span><span className="btns">
          <button className="btn" disabled={page === 0} onClick={() => s.set({ page: page - 1 })}><Icon name="left" size="sm" />Previous</button>
          <button className="btn" disabled={page >= pages - 1} onClick={() => s.set({ page: page + 1 })}>Next<Icon name="right" size="sm" /></button>
        </span></div>
        <div className="hint"><Icon name="lightbulb" size="sm" />Changing a category moves every purchase from that merchant and is remembered for future uploads.</div>
      </section>
    </div>
  );
}
