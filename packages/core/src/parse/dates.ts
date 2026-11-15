const MON: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n: number) => String(n).padStart(2, '0');
const fixY = (y: number) => (y < 100 ? 2000 + y : y);

/** Builds YYYY-MM-DD, or null for impossible dates (month 13, 31 Feb …). */
export function ymd(y: number, m: number, d: number): string | null {
  if (!y || m < 1 || m > 12 || d < 1 || d > new Date(y, m, 0).getDate()) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * Reads the date formats banks use: 2026-10-02, 02/10/2026, 02-10-26, 2 Oct 2026,
 * Oct 2, 2026, 02 Oct (year taken from `fallbackYear`), 02/10 …
 * `dmy` decides whether 02/10 means 2 October (true) or 10 February (false).
 */
export function parseDate(v: unknown, dmy = true, fallbackYear = new Date().getFullYear()): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return ymd(v.getFullYear(), v.getMonth() + 1, v.getDate());
  const s = String(v ?? '').trim();
  if (!s) return null;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/))) return ymd(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})\b/))) {
    const a = +m[1], b = +m[2], y = fixY(+m[3]);
    return dmy ? ymd(y, b, a) : ymd(y, a, b);
  }
  if ((m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[-\s\/.]?([A-Za-z]{3,9})\.?(?:[-\s\/.,']+(\d{2,4}))?\b/))) {
    const mo = MON[m[2].toLowerCase().slice(0, 3)];
    if (mo) return ymd(m[3] ? fixY(+m[3]) : fallbackYear, mo, +m[1]);
  }
  if ((m = s.match(/^([A-Za-z]{3,9})\.?[-\s]+(\d{1,2})(?:st|nd|rd|th)?,?(?:[-\s,']+(\d{2,4}))?\b/))) {
    const mo = MON[m[1].toLowerCase().slice(0, 3)];
    if (mo) return ymd(m[3] ? fixY(+m[3]) : fallbackYear, mo, +m[2]);
  }
  if ((m = s.match(/^(\d{1,2})[-\/](\d{1,2})$/))) {
    const a = +m[1], b = +m[2];
    return dmy ? ymd(fallbackYear, b, a) : ymd(fallbackYear, a, b);
  }
  return null;
}

/**
 * Looks at all numeric dates in a statement and decides day-first vs month-first.
 * A value like 25/10 settles it; when every date is ambiguous, day-first wins unless
 * `preferMDY` (the statement is in USD/CAD).
 */
export function detectDmy(values: unknown[], preferMDY = false): boolean {
  let dmy = 0, mdy = 0;
  for (const v of values) {
    const m = String(v ?? '').trim().match(/^(\d{1,2})[-\/.](\d{1,2})(?:[-\/.]\d{2,4})?\b/);
    if (!m) continue;
    if (+m[1] > 12) dmy++;
    else if (+m[2] > 12) mdy++;
  }
  if (mdy !== dmy) return dmy > mdy;
  return !preferMDY;
}
