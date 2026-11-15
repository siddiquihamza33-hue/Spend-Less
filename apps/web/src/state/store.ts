import { create } from 'zustand';
import { keyOf, merchantOf, type Overrides, type Txn } from '@spend-lens/core';
import { savedPasswords } from './passwords';

export type Page = 'overview' | 'categories' | 'trends' | 'merchants' | 'insights' | 'transactions';
export const PAGES: Record<Page, string> = { overview: 'Overview', categories: 'Categories', trends: 'Trends', merchants: 'Merchants', insights: 'Insights', transactions: 'Transactions' };
export const pageFromHash = (): Page | null => { const h = (location.hash || '').replace(/^#\/?/, ''); return h in PAGES ? (h as Page) : null; };

export type SortKey = 'date' | 'merchant' | 'category' | 'amount';
export type TxType = 'spend' | 'credit' | 'all';
export interface NoticeItem { name: string; fix: string }
export type TipContent =
  | { kind: 'text'; text: string }
  | { kind: 'chart'; title: string; total: string; rows: { label: string; color: string; value: string }[] };
export interface Tip { content: TipContent; x: number | null; y: number | null; rect: DOMRect }

interface ConfirmReq { title: string; body: string; ok: string; resolve: (v: boolean) => void }
interface PasswordReq { name: string; wrong: boolean; resolve: (v: { pw: string; remember: boolean } | null) => void }

export interface AppState {
  // ---- saved data
  txns: Txn[];
  overrides: Overrides;
  viewCur: string | null;
  // ---- saved screen
  view: Page;
  month: string;               // 'all' or 'YYYY-MM'
  category: string | null;
  // ---- transactions page
  search: string;
  type: TxType;
  sort: { k: SortKey; dir: 1 | -1 };
  page: number;
  // ---- transient
  importing: boolean;
  notice: { title: string; items: NoticeItem[] } | null;
  toast: { msg: string; icon: string; id: number } | null;
  animSeq: number;              // bumps after an import/sample load: replays entrance animations once
  confirm: ConfirmReq | null;
  password: PasswordReq | null;
  upload: File[] | null;        // open upload dialog with these files
  tip: Tip | null;
  savedPw: number;

  set: (p: Partial<AppState>) => void;
  go: (page: Page, push?: boolean) => void;
  addTxns: (list: Omit<Txn, 'merchant'>[] & Partial<Txn>[]) => number;
  setOverride: (merchant: string, category: string) => void;
  removeSource: (source: string) => void;
  clearAll: () => void;
  toastMsg: (msg: string, icon?: string) => void;
  showNotice: (title: string, items: NoticeItem[]) => void;
  askConfirm: (o: { title: string; body: string; ok: string }) => Promise<boolean>;
  askPassword: (name: string, wrong: boolean) => Promise<{ pw: string; remember: boolean } | null>;
  openUpload: (files?: File[]) => void;
  refreshSavedPw: () => void;
}

export const useApp = create<AppState>((set, get) => ({
  txns: [], overrides: {}, viewCur: null,
  view: 'overview', month: 'all', category: null,
  search: '', type: 'spend', sort: { k: 'date', dir: -1 }, page: 0,
  importing: false, notice: null, toast: null, animSeq: 1, confirm: null, password: null, upload: null, tip: null,
  savedPw: savedPasswords().length,

  set: p => set(p),

  go: (page, push = true) => {
    const changed = get().view !== page;
    if (push && changed) {
      try { history.pushState(null, '', '#/' + page); } catch { try { location.hash = '#/' + page; } catch { /* ignore */ } }
    }
    set({ view: page, tip: null });
    if (changed) window.scrollTo(0, 0);
  },

  // Adds parsed rows, skipping ones already imported (the same statement uploaded twice).
  addTxns: list => {
    const existing = get().txns, seen = new Map<string, number>();
    existing.forEach(t => seen.set(keyOf(t), (seen.get(keyOf(t)) || 0) + 1));
    const incoming = new Map<string, number>(), add: Txn[] = [];
    for (const t of list) {
      const k = keyOf(t);
      const n = (incoming.get(k) || 0) + 1;
      incoming.set(k, n);
      if (n <= (seen.get(k) || 0)) continue;
      add.push({ ...t, id: Math.random().toString(36).slice(2, 10), merchant: merchantOf(t.desc) } as Txn);
    }
    if (add.length) set({ txns: [...existing, ...add] });
    return add.length;
  },

  setOverride: (merchant, category) => set({ overrides: { ...get().overrides, [merchant]: category } }),
  removeSource: source => set({ txns: get().txns.filter(t => t.source !== source) }),
  clearAll: () => set({ txns: [], category: null, search: '', month: 'all' }),

  toastMsg: (msg, icon = 'check') => set({ toast: { msg, icon, id: Date.now() } }),
  showNotice: (title, items) => set({ notice: { title, items } }),

  askConfirm: o => new Promise(resolve => set({ confirm: { ...o, resolve: v => { set({ confirm: null }); resolve(v); } } })),
  askPassword: (name, wrong) => new Promise(resolve => set({ password: { name, wrong, resolve: v => { set({ password: null }); resolve(v); } } })),
  openUpload: (files = []) => {
    const cur = get().upload;
    if (!cur) return set({ upload: dedupeFiles([], files) });
    set({ upload: dedupeFiles(cur, files) });
  },
  refreshSavedPw: () => set({ savedPw: savedPasswords().length }),
}));

export const dedupeFiles = (cur: File[], add: File[]) => {
  const out = cur.slice();
  for (const f of add) if (!out.some(u => u.name === f.name && u.size === f.size)) out.push(f);
  return out;
};
