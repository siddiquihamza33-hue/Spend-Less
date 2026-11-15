import { useEffect, type RefObject } from 'react';

/**
 * While `active`, keeps Tab / Shift+Tab inside the element, focuses `initial` (or the first control),
 * and gives focus back to whatever had it before when the dialog closes.
 */
export function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean, initial?: RefObject<HTMLElement>) {
  useEffect(() => {
    if (!active) return;
    const back = document.activeElement as HTMLElement | null;
    const focusables = () =>
      [...(ref.current?.querySelectorAll<HTMLElement>('button, input, select, [tabindex="0"]') ?? [])].filter(x => x.offsetParent && !(x as HTMLButtonElement).disabled);
    const t = setTimeout(() => (initial?.current ?? focusables()[0])?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !ref.current) return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (!ref.current.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      if (back && document.contains(back) && back.offsetParent) back.focus();
    };
  }, [active]);
}
