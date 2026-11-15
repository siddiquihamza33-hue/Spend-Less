export const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Dates everywhere in the product: DD MMM YY ("2026-10-02" → "02 Oct 26"). */
export const fmtDate = (d: string): string => `${d.slice(8, 10)} ${MON3[+d.slice(5, 7) - 1]} ${d.slice(2, 4)}`;

/**
 * A month on its own ("2026-10"): short "Oct ’26" (the apostrophe stops it reading as 26 Oct),
 * long "October 2026".
 */
export const monthLabel = (m: string, long = false): string =>
  long
    ? new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' })
    : `${MON3[+m.slice(5, 7) - 1]} ’${m.slice(2, 4)}`;

/** Full month name ("2026-10" → "October"). */
export const monthName = (m: string): string => new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString('en', { month: 'long' });
