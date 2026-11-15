import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { CAT_ICON } from '@spend-lens/core';
import { Icon } from '@spend-lens/ui';
import { useApp, type Page } from '../state/store';
import { useView } from '../state/view';

/** Category glyph in a circle tinted with the category colour (Categories page style, used everywhere). */
export function CatBadge({ c, size }: { c: string; size?: 'sm' | 'lg' }) {
  const { catColor } = useView();
  return <span className="cat-ic" style={{ ['--cc' as string]: catColor(c) }}><Icon name={CAT_ICON[c] || 'other'} size={size} /></span>;
}

/** The one merchant marker: their category's glyph in a tinted circle. */
export function MerchIcon({ c }: { c: string }) {
  const { catColor } = useView();
  return <span className="cat-ic merch-ic" style={{ ['--cc' as string]: catColor(c) }} aria-hidden="true"><Icon name={CAT_ICON[c] || 'other'} /></span>;
}

export function CatSwatch({ c }: { c: string }) {
  const { catColor } = useView();
  return <i className="sw" style={{ ['--cc' as string]: catColor(c) }} />;
}

/** In-app link to another page (works on file:// and keeps history). */
export function PageLink({ page, className, children, ...rest }: { page: Page; className?: string; children: ReactNode; [k: string]: unknown }) {
  const go = useApp(s => s.go);
  return (
    <a href={'#/' + page} className={className} {...rest}
      onClick={e => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); go(page); }}>
      {children}
    </a>
  );
}

/** "All categories →" style link. */
export const More = ({ page, children }: { page: Page; children: ReactNode }) => (
  <PageLink page={page} className="more">{children}<Icon name="right" size="sm" /></PageLink>
);

/** Keyboard support for non-button elements that act like buttons. */
export const pressable = (onActivate: () => void) => ({
  tabIndex: 0,
  role: 'button',
  onClick: onActivate,
  onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(); } },
});

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** True for the one render right after an import / sample load: plays the entrance animations. */
export const AnimContext = createContext(false);

/** A money figure that counts up when the page appears right after an import / sample load. */
export function Count({ value, className, short }: { value: number; className?: string; short?: boolean }) {
  const { money, moneyShort } = useView();
  const format = short ? moneyShort : (n: number) => money(n);
  const anim = useContext(AnimContext), animSeq = useApp(s => s.animSeq);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!anim || !el || reduceMotion()) return;
    const t0 = performance.now(), dur = 900;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = format(value * e);
      if (p < 1) raf = requestAnimationFrame(step); else el.textContent = format(value);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); if (el) el.textContent = format(value); };
  }, [animSeq, anim]);
  return <span ref={ref} className={className}>{format(value)}</span>;
}
