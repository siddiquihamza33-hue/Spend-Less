import type { Overrides, Txn } from '@spend-lens/core';

/**
 * Local storage for Spend Lens. Same keys and format as the single-file app (phase 1), so data
 * saved before the rebuild loads without re-uploading:
 *   - IndexedDB "spendlens" / store "kv" / key "state"  (main copy)
 *   - localStorage "spendlens.v1"                       (backup copy, read synchronously at start-up)
 * Whichever copy has the newer `savedAt` wins.
 */
export interface Saved {
  txns: Txn[];
  overrides: Overrides;
  viewCur: string | null;
  ui?: { view?: string; month?: string; category?: string | null };
  savedAt?: number;
  /** written by very old versions: the currency chosen in the old dropdown */
  currency?: string;
}

const STORE = 'spendlens.v1';
const IDB_NAME = 'spendlens', IDB_STORE = 'kv';
let idbPromise: Promise<IDBDatabase> | null = null;

function idb(): Promise<IDBDatabase> {
  if (!idbPromise) {
    idbPromise = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('IndexedDB unavailable'));
      const r = indexedDB.open(IDB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
      r.onblocked = () => rej(new Error('blocked'));
      // Chrome can leave the request unanswered for file:// pages — never wait on it for long.
      setTimeout(() => rej(new Error('IndexedDB did not answer')), 1500);
    });
    idbPromise.catch(() => { idbPromise = null; });
  }
  return idbPromise;
}
async function idbGet<T>(k: string): Promise<T | undefined> {
  const db = await idb();
  return new Promise((res, rej) => { const q = db.transaction(IDB_STORE).objectStore(IDB_STORE).get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
async function idbSet(k: string, v: unknown): Promise<void> {
  const db = await idb();
  return new Promise((res, rej) => { const tx = db.transaction(IDB_STORE, 'readwrite'); tx.objectStore(IDB_STORE).put(v, k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
}

/** savedAt of the data currently in memory; a load only replaces it if it is newer. */
let loadedAt = -1;

/** Fixes up data written by older versions. */
function normalize(d: Saved): Saved {
  const legacy = d.currency === 'PKR_INTL' || !d.currency ? 'PKR' : d.currency;
  const txns = (d.txns || []).map(t => (t.cur ? t : { ...t, cur: legacy }));
  return { txns, overrides: d.overrides || {}, viewCur: d.viewCur || null, ui: d.ui, savedAt: d.savedAt || 0 };
}

/** Synchronous: the backup copy in localStorage (lets the first paint show your data). */
export function loadQuick(): Saved | null {
  try {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null') as Saved | null;
    if (!d) return null;
    loadedAt = d.savedAt || 0;
    return normalize(d);
  } catch { return null; }
}

/** The main copy in IndexedDB, if it is newer than what's loaded. */
export async function loadDeep(): Promise<Saved | null> {
  try {
    const d = await idbGet<Saved>('state');
    if (d && (d.savedAt || 0) > loadedAt) { loadedAt = d.savedAt || 0; return normalize(d); }
  } catch { /* unavailable or slow: the backup copy is enough */ }
  return null;
}

/** Saves both copies. Calls `onBlocked` once if neither can be written. */
export function save(d: Omit<Saved, 'savedAt'>, onBlocked: () => void) {
  const full: Saved = { ...d, savedAt: Date.now() };
  loadedAt = full.savedAt!;
  let lsOk = true;
  try { localStorage.setItem(STORE, JSON.stringify(full)); } catch { lsOk = false; }
  idbSet('state', full).then(() => {}, () => { if (!lsOk) onBlocked(); });
}

export function requestPersistence() {
  try { (navigator.storage as any)?.persist?.(); } catch { /* optional */ }
}
