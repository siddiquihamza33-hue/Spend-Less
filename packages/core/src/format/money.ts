const cache: Record<string, Intl.NumberFormat> = {};
const trimNum = (x: number, d: number) => String(+x.toFixed(d));

/**
 * Formats an amount in the statement's currency.
 * PKR uses local style: "Rs 1,56,955", compact "Rs 1.57 lac" / "Rs 2.1 cr" / "Rs 45.2k".
 * Other currencies use standard formatting: "$1,204", compact "$1.2K".
 */
export function money(n: number, currency = 'PKR', compact = false): string {
  const a = Math.abs(n), sign = n < 0 ? '−' : '';
  if (currency === 'PKR') {
    const s = compact
      ? a >= 1e7 ? trimNum(a / 1e7, 2) + ' cr' : a >= 1e5 ? trimNum(a / 1e5, 2) + ' lac' : a >= 1e3 ? trimNum(a / 1e3, 1) + 'k' : String(Math.round(a))
      : Math.round(a).toLocaleString('en-IN');
    return `${sign}Rs ${s}`;
  }
  const k = currency + compact;
  if (!cache[k]) {
    try {
      cache[k] = new Intl.NumberFormat('en', compact
        ? { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }
        : { style: 'currency', currency, maximumFractionDigits: 0 });
    } catch {
      cache[k] = new Intl.NumberFormat('en', { maximumFractionDigits: 0 });
    }
  }
  return cache[k].format(n);
}

/** Compact amount without the currency, for chart axes and bar labels ("1.57 lac", "45.2k"). */
export const moneyShort = (v: number, currency = 'PKR'): string => money(v, currency, true).replace(/^(?:[A-Z]{3}|Rs)\s?/, '');
