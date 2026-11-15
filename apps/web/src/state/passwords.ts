/**
 * PDF passwords the person chose to remember. Kept only in this browser's storage (same key as
 * before the rebuild). "Remember" is on by default by the user's decision; the dialogs say where it's stored.
 */
const PW_STORE = 'spendlens.pdfpw';

export function savedPasswords(): string[] {
  try { return JSON.parse(localStorage.getItem(PW_STORE) || '[]'); } catch { return []; }
}
export function rememberPassword(pw: string) {
  try { const l = savedPasswords().filter(p => p !== pw); l.unshift(pw); localStorage.setItem(PW_STORE, JSON.stringify(l.slice(0, 5))); } catch { /* storage blocked */ }
}
export function forgetPasswords() {
  try { localStorage.removeItem(PW_STORE); } catch { /* storage blocked */ }
}
