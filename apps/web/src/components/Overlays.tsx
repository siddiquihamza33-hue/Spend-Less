import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@spend-lens/ui';
import { useApp } from '../state/store';

/** In-app tooltip (the browser's own title tooltips aren't used anywhere). */
export function Tooltip() {
  const tip = useApp(s => s.tip);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (!tip || !ref.current) return setPos(null);
    const w = ref.current.offsetWidth, h = ref.current.offsetHeight, r = tip.rect;
    if (tip.content.kind === 'chart') {
      const x = tip.x ?? r.right, y = tip.y ?? r.top;
      setPos({ left: x + 14 + w > innerWidth - 8 ? x - w - 14 : x + 14, top: Math.max(8, Math.min(innerHeight - h - 8, y - h / 2)) });
    } else {
      const x = tip.x ?? r.left + r.width / 2, y = r.bottom + 8;
      setPos({ left: Math.max(8, Math.min(innerWidth - w - 8, x - w / 2)), top: y + h > innerHeight - 8 ? r.top - h - 8 : y });
    }
  }, [tip]);
  if (!tip) return null;
  const c = tip.content;
  return (
    <div ref={ref} className={'tip' + (c.kind === 'text' ? ' text' : '')} role="tooltip"
      style={{ display: 'block', left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}>
      {c.kind === 'text' ? <div className="tt">{c.text}</div> : <>
        <div className="t"><span>{c.title}</span><span>{c.total}</span></div>
        {c.rows.map(r => <div className="row" key={r.label}><span><i className="key" style={{ background: r.color }} />{r.label}</span><b>{r.value}</b></div>)}
      </>}
    </div>
  );
}

/** Shows any element's data-tip text on hover and keyboard focus; hides on scroll. */
export function useDataTips() {
  useEffect(() => {
    const set = useApp.getState().set;
    const show = (el: HTMLElement, e?: PointerEvent) => set({ tip: { content: { kind: 'text', text: el.dataset.tip! }, x: e?.clientX ?? null, y: e?.clientY ?? null, rect: el.getBoundingClientRect() } });
    const move = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest) return;
      if (t.closest('.mchart .col')) return;                 // charts manage their own tooltip
      const d = t.closest<HTMLElement>('[data-tip]');
      if (d) return show(d, e);
      if (useApp.getState().tip) set({ tip: null });
    };
    const focus = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest || t.closest('.mchart .col')) return;
      const d = t.closest<HTMLElement>('[data-tip]');
      if (d) show(d); else if (useApp.getState().tip) set({ tip: null });
    };
    const scroll = () => { if (useApp.getState().tip) set({ tip: null }); };
    document.addEventListener('pointermove', move);
    document.addEventListener('focusin', focus);
    window.addEventListener('scroll', scroll, { passive: true });
    return () => { document.removeEventListener('pointermove', move); document.removeEventListener('focusin', focus); window.removeEventListener('scroll', scroll); };
  }, []);
}

export function Toast() {
  const toast = useApp(s => s.toast);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), 6000);
    return () => clearTimeout(t);
  }, [toast?.id]);
  return <div className={'toast' + (on ? ' on' : '')} role="status">{toast && <><Icon name={toast.icon} size="sm" />{toast.msg}</>}</div>;
}

/** Receipt-printer animation while statements are read (paused while a password is asked). */
export function Printer() {
  const importing = useApp(s => s.importing), asking = useApp(s => !!s.password);
  if (!importing || asking) return null;
  return (
    <div className="printing" role="status" aria-live="polite">
      <div className="printer">
        <div className="slot" />
        <div className="feed"><div className="slip">
          <div className="h">Spend Lens · Reading</div>
          {Array.from({ length: 6 }, (_, i) => <div className="l" key={i}><i /><i /></div>)}
          <div className="t">Sorting every line…</div>
        </div></div>
        <p>Reading your statement</p>
      </div>
    </div>
  );
}

export const DropOverlay = ({ on }: { on: boolean }) => (
  <div className={'dropping-overlay' + (on ? ' on' : '')}><div><Icon name="fileUp" size="lg" />Drop statements to import</div></div>
);
