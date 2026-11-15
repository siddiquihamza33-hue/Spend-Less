import { CAT_NAMES, monthLabel } from '@spend-lens/core';
import { Icon } from '@spend-lens/ui';
import { forgetPasswords } from '../state/passwords';
import { PAGES, useApp, type Page } from '../state/store';
import { plural, useView } from '../state/view';
import { exportCsv } from '../import/readers';
import { CatSwatch, PageLink } from './bits';

const NAV: Page[] = ['overview', 'categories', 'trends', 'merchants', 'insights', 'transactions'];

export function Sidebar() {
  const { has } = useView();
  const view = useApp(s => s.view), savedPw = useApp(s => s.savedPw);
  const { refreshSavedPw, toastMsg } = useApp.getState();
  return (
    <aside className="side">
      <div className="logo"><span className="word">Spend <em>Lens</em></span><span className="sub">Personal statement reader</span></div>
      <nav className="nav">
        <div className="lbl">Contents</div>
        {NAV.map((p, i) => (
          <PageLink key={p} page={p} className={[has && view === p ? 'on' : '', !has && p !== 'overview' ? 'disabled' : ''].join(' ').trim() || undefined}>
            <span className="n">{String(i + 1).padStart(2, '0')}</span>{PAGES[p]}
          </PageLink>
        ))}
      </nav>
      <div className="privacy-card">
        <b><Icon name="lock" size="sm" />Private by design</b>
        Statements are read in this browser. Nothing is uploaded anywhere.
        {savedPw > 0 && (
          <button className="link-btn" onClick={() => { forgetPasswords(); refreshSavedPw(); toastMsg('Saved PDF passwords removed from this browser', 'key'); }}>
            <Icon name="key" size="sm" />Forget saved PDF passwords
          </button>
        )}
      </div>
    </aside>
  );
}

export function Header() {
  const v = useView();
  const s = useApp();
  const page = v.has ? s.view : 'overview';
  const range = v.month !== 'all' ? monthLabel(v.month, true)
    : v.months.length > 1 ? `${monthLabel(v.months[0], true)} – ${monthLabel(v.months[v.months.length - 1], true)}` : v.months[0] ? monthLabel(v.months[0], true) : '';

  const exportData = () => {
    const rows: unknown[][] = [['Date', 'Merchant', 'Description', 'Category', 'Amount', 'Currency', 'Statement']];
    s.txns.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).forEach(t => rows.push([t.date, t.merchant, t.desc, v.catOf(t), t.amount, t.cur || 'PKR', v.labels[t.source] || t.source]));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportCsv(rows)], { type: 'text/csv' }));
    a.download = 'categorized-transactions.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const clear = async () => {
    const n = s.txns.length, f = new Set(s.txns.map(t => t.source)).size;
    const ok = await s.askConfirm({ title: 'Remove all data?', body: `This removes ${plural(n, 'transaction')} from ${plural(f, 'statement')} stored in this browser. Your category corrections are kept. You can upload the statements again at any time.`, ok: 'Remove all data' });
    if (!ok) return;
    s.clearAll();
    s.toastMsg('All transactions removed', 'trash');
  };

  return (
    <header className="top">
      <div className="logo mobile-logo"><span className="word">Spend <em>Lens</em></span></div>
      <div className="title">
        <h1>{v.has ? PAGES[page] : 'Spend Lens'}</h1>
        <p>{v.has ? `${range} · ${plural(v.files.length, 'statement')} · ${v.activeCur}${v.curs.length > 1 ? ` (${v.curs.length} currencies)` : ''}` : 'Personal statement reader'}</p>
      </div>
      {v.has && (
        <label className="select"><Icon name="calendar" size="sm" />
          <select aria-label="Period" value={v.month} onChange={e => s.set({ month: e.target.value, page: 0 })}>
            <option value="all">All time</option>
            {v.months.slice().reverse().map(m => <option key={m} value={m}>{monthLabel(m, true)}</option>)}
          </select>
        </label>
      )}
      {v.curs.length > 1 && (
        <div className="cur-switch" role="group" aria-label="Currency">
          {v.curs.map(c => <button key={c} className={c === v.activeCur ? 'on' : ''} onClick={() => s.set({ viewCur: c, month: 'all', category: null, animSeq: s.animSeq + 1 })}>{c}</button>)}
        </div>
      )}
      {v.has && <>
        <button className="btn icon" data-tip="Export categorized CSV" aria-label="Export categorized CSV" onClick={exportData}><Icon name="download" size="sm" /></button>
        <button className="btn icon" data-tip="Remove all data" aria-label="Remove all data" onClick={clear}><Icon name="trash" size="sm" /></button>
      </>}
      <button className="btn primary" onClick={() => s.openUpload()}><Icon name="upload" size="sm" /><span className="txt">Upload statement</span></button>
    </header>
  );
}

export function Notice() {
  const notice = useApp(s => s.notice), set = useApp(s => s.set);
  if (!notice) return null;
  return (
    <div className="notice" role="alert">
      <Icon name="alert" />
      <div className="notice-body"><b>{notice.title}</b><ul>{notice.items.map((i, k) => <li key={k}><b>{i.name}</b> — {i.fix}</li>)}</ul></div>
      <button className="btn icon" aria-label="Dismiss message" onClick={() => set({ notice: null })}><Icon name="x" size="sm" /></button>
    </div>
  );
}

/** Active category filter shown on list pages. */
export function Filters() {
  const v = useView(), view = useApp(s => s.view), set = useApp(s => s.set);
  if (!v.category || (view !== 'transactions' && view !== 'merchants')) return null;
  return (
    <div className="filters">
      <span className="chip active"><CatSwatch c={v.category} /><span>{v.category}</span>
        <button aria-label="Clear category filter" onClick={() => set({ category: null, page: 0 })}><Icon name="x" size="sm" /></button>
      </span>
    </div>
  );
}

export function TabBar() {
  const { has } = useView(), view = useApp(s => s.view);
  if (!has) return null;
  const tabs: [Page, string, string][] = [['overview', 'layout', 'Overview'], ['categories', 'pie', 'Categories'], ['trends', 'bars', 'Trends'], ['merchants', 'store', 'Merchants'], ['transactions', 'list', 'Transactions']];
  return (
    <nav className="tabbar" aria-label="Pages">
      {tabs.map(([p, ic, label]) => <PageLink key={p} page={p} className={view === p ? 'on' : undefined}><Icon name={ic} />{label}</PageLink>)}
    </nav>
  );
}

export { CAT_NAMES };
