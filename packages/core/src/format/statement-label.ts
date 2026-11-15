import { MON3 } from './dates';

export const SAMPLE_SOURCE = 'Sample statement';

/**
 * Names each statement by the months it covers: "Sep–Oct 26", "Oct 26", "Dec 25–Jan 26".
 * Two statements covering the same months become "Sep–Oct 26" and "Sep–Oct 26 · 2".
 * Returns a map from statement source id to label.
 */
export function statementLabels(txns: { source: string; date: string }[]): Record<string, string> {
  const by: Record<string, [string, string]> = {};
  for (const t of txns) {
    const r = by[t.source] || (by[t.source] = [t.date, t.date]);
    if (t.date < r[0]) r[0] = t.date;
    if (t.date > r[1]) r[1] = t.date;
  }
  const out: Record<string, string> = {}, seen: Record<string, number> = {};
  for (const [src, [a, b]] of Object.entries(by).sort((x, y) => (x[1][0] < y[1][0] ? -1 : 1))) {
    const ma = MON3[+a.slice(5, 7) - 1], mb = MON3[+b.slice(5, 7) - 1], ya = a.slice(2, 4), yb = b.slice(2, 4);
    let l = a.slice(0, 7) === b.slice(0, 7) ? `${ma} ${ya}` : ya === yb ? `${ma}–${mb} ${yb}` : `${ma} ${ya}–${mb} ${yb}`;
    if (src === SAMPLE_SOURCE) l += ' (sample)';
    seen[l] = (seen[l] || 0) + 1;
    out[src] = seen[l] > 1 ? `${l} · ${seen[l]}` : l;
  }
  return out;
}
