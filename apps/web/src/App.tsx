import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useApp, dedupeFiles } from './state/store';
import { computeView, ViewContext } from './state/view';
import { importFiles } from './import/importFiles';
import { AnimContext } from './components/bits';
import { Filters, Header, Notice, Sidebar, TabBar } from './components/Shell';
import { ConfirmDialog, PasswordDialog, UploadDialog } from './components/Dialogs';
import { DropOverlay, Printer, Toast, Tooltip, useDataTips } from './components/Overlays';
import { Welcome } from './pages/Welcome';
import { Overview } from './pages/Overview';
import { Categories, Insights, Merchants, Transactions, Trends } from './pages/Pages';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Drag statements anywhere on the page. PDFs may be locked, so they open the upload dialog first. */
function useDropAnywhere() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let depth = 0;
    const enter = (e: DragEvent) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { depth++; setOn(true); } };
    const leave = () => { if (--depth <= 0) { depth = 0; setOn(false); } };
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault(); depth = 0; setOn(false);
      const fs = [...(e.dataTransfer?.files || [])];
      if (!fs.length) return;
      const s = useApp.getState();
      if (s.upload) s.set({ upload: dedupeFiles(s.upload, fs) });
      else if (fs.some(f => /\.pdf$/i.test(f.name))) s.openUpload(fs);
      else importFiles(fs);
    };
    addEventListener('dragenter', enter); addEventListener('dragleave', leave); addEventListener('dragover', over); addEventListener('drop', drop);
    return () => { removeEventListener('dragenter', enter); removeEventListener('dragleave', leave); removeEventListener('dragover', over); removeEventListener('drop', drop); };
  }, []);
  return on;
}

export function App() {
  const txns = useApp(s => s.txns), overrides = useApp(s => s.overrides), viewCur = useApp(s => s.viewCur);
  const month = useApp(s => s.month), category = useApp(s => s.category), view = useApp(s => s.view), animSeq = useApp(s => s.animSeq);
  const v = useMemo(() => computeView({ txns, overrides, viewCur, month, category }), [txns, overrides, viewCur, month, category]);
  const dragging = useDropAnywhere();
  useDataTips();

  // Keep the saved filters in step with the data (a month or category that no longer exists resets).
  useEffect(() => {
    if (v.month !== month || v.category !== category) useApp.getState().set({ month: v.month, category: v.category });
  }, [v.month, v.category, month, category]);

  // Entrance animation: once, on the first render after an import or sample load.
  const played = useRef(0);
  const anim = v.has && played.current !== animSeq && !reduceMotion();
  const dash = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!v.has) return;
    played.current = animSeq;
    if (!anim || !dash.current) return;
    const el = dash.current;
    el.classList.remove('animate'); void el.offsetWidth; el.classList.add('animate');
    const t = setTimeout(() => el.classList.remove('animate'), 1300);
    return () => clearTimeout(t);
  }, [animSeq, v.has]);

  const page = v.has ? view : 'overview';
  return (
    <ViewContext.Provider value={v}>
      <AnimContext.Provider value={anim}>
        <div className="app">
          <Sidebar />
          <div className="main">
            <Header />
            <Notice />
            {!v.has ? <Welcome dragging={dragging} /> : (
              <main id="dash" ref={dash}>
                <Filters />
                {page === 'overview' && <Overview />}
                {page === 'categories' && <Categories />}
                {page === 'trends' && <Trends />}
                {page === 'merchants' && <Merchants />}
                {page === 'insights' && <Insights />}
                {page === 'transactions' && <Transactions />}
              </main>
            )}
          </div>
        </div>
        <TabBar />
        <Printer />
        <ConfirmDialog />
        <UploadDialog />
        <PasswordDialog />
        <Tooltip />
        <Toast />
        <DropOverlay on={dragging} />
      </AnimContext.Provider>
    </ViewContext.Provider>
  );
}
