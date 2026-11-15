import type { CategoryOf, Overrides } from '../model/types';
import { CATEGORIES, CREDIT_CAT } from './rules';

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const CAT_RES: [string, RegExp][] = CATEGORIES.filter(c => c[2].length).map(([name, , kws]) => {
  const parts = kws.map(k => {
    const t = k.trim(), e = escRe(t);
    return t.length <= 4 ? `\\b${e}\\b` : `\\b${e}`;
  });
  return [name, new RegExp(parts.join('|'), 'i')];
});

/** The category a description falls into from the keyword rules alone ("Other" when nothing matches). */
export function categorize(desc: string): string {
  for (const [name, re] of CAT_RES) if (re.test(desc)) return name;
  return 'Other';
}

/**
 * Builds the app's category function: credits are always "Payments & Refunds"; a purchase uses
 * the user's override for its merchant if there is one, otherwise the keyword rules.
 */
export function makeCategoryOf(getOverrides: () => Overrides): CategoryOf {
  return t => (t.amount < 0 ? CREDIT_CAT : getOverrides()[t.merchant.toLowerCase()] || categorize(t.desc));
}
