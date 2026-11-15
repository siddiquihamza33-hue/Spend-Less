/**
 * @spend-lens/core — the product's logic with no DOM and no network.
 * Used by the browser app (via the built bundle) and by tests.
 */
export * from './model/types';

export { ymd, parseDate, detectDmy } from './parse/dates';
export { parseAmount, looksLikeAmount } from './parse/amounts';
export { CREDIT_RE, normalizeSigns, keyOf } from './parse/normalize';
export { detectHeader, guessColumns, rowsToTxns, type ColumnMap } from './parse/table';
export { PAGE_BREAK, textItemsToLines, type TextItem } from './parse/pdf';

export { detectCurrency, prefersMonthFirst } from './currency/detect';

export { CATEGORIES, CAT_NAMES, CAT_ICON, CREDIT_CAT } from './categorize/rules';
export { categorize, makeCategoryOf } from './categorize/engine';
export { merchantOf, MERCHANT_ALIASES } from './categorize/merchants';

export { money, moneyShort } from './format/money';
export { MON3, fmtDate, monthLabel, monthName } from './format/dates';
export { statementLabels, SAMPLE_SOURCE } from './format/statement-label';

export { sumBy, monthsOf, monthTotal, merchantTotals, type MerchantTotal } from './analytics/totals';
export { recurringCharges, type Recurring } from './analytics/recurring';
export { fxFees, FX_RE, FOREIGN_RE, type FxFees } from './analytics/fx-fees';
export { categoryMonthMatrix, change, type CategoryChange } from './analytics/comparison';
