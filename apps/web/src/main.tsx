import { createRoot } from 'react-dom/client';
import '@spend-lens/ui/styles.css';
import { App } from './App';
import { PAGES, pageFromHash, useApp, type AppState, type Page } from './state/store';
import { loadDeep, loadQuick, requestPersistence, save, type Saved } from './state/persist';

/** Puts saved data (and the saved screen, unless the URL names a page) into the store. */
function apply(d: Saved) {
  const ui = d.ui || {};
  const hashPage = pageFromHash();
  useApp.getState().set({
    txns: d.txns, overrides: d.overrides, viewCur: d.viewCur,
    month: ui.month || 'all', category: ui.category || null,
    view: hashPage || (ui.view && ui.view in PAGES ? (ui.view as Page) : 'overview'),
  });
}

// Start-up: draw immediately from the backup copy, then refresh from the main copy if it's newer.
try { const d = loadQuick(); if (d) apply(d); } catch { /* start empty */ }
const hp = pageFromHash();
if (hp) useApp.getState().set({ view: hp });
requestPersistence();
document.documentElement.removeAttribute('data-theme');   // appearance follows the system setting

createRoot(document.getElementById('root')!).render(<App />);

let ready = false;
loadDeep().then(d => { if (d) apply(d); ready = true; }, () => { ready = true; });
setTimeout(() => { ready = true; }, 1600);

// Save whenever saved data or the saved screen changes.
let warned = false;
const pick = (s: AppState) => [s.txns, s.overrides, s.viewCur, s.view, s.month, s.category] as const;
let last = pick(useApp.getState());
useApp.subscribe(s => {
  const now = pick(s);
  if (now.every((x, i) => x === last[i])) return;
  last = now;
  if (!ready && !s.txns.length) return;    // don't overwrite saved data with an empty start-up state
  save({ txns: s.txns, overrides: s.overrides, viewCur: s.viewCur, ui: { view: s.view, month: s.month, category: s.category } }, () => {
    if (warned || !useApp.getState().txns.length) return;
    warned = true;
    useApp.getState().showNotice('Your statements can\'t be saved in this browser.', [{ name: 'Storage blocked', fix: 'They will disappear when you refresh. Allow site data for local files in your browser settings, or open Spend Lens in Chrome.' }]);
  });
});

addEventListener('popstate', () => useApp.getState().go(pageFromHash() || 'overview', false));
