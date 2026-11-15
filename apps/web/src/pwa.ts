/**
 * Installable app + offline (phase 3). Only when Spend Lens is served from a web address:
 * service workers and manifests don't exist for a double-clicked file (file://), and adding the
 * manifest link there would only log an error. So the links are added here, at run time.
 */
export function setupPwa() {
  if (location.protocol !== 'https:' && location.protocol !== 'http:') return;
  const link = (rel: string, href: string, extra: Record<string, string> = {}) => {
    const l = document.createElement('link');
    l.rel = rel; l.href = href;
    Object.entries(extra).forEach(([k, v]) => l.setAttribute(k, v));
    document.head.appendChild(l);
  };
  link('manifest', 'manifest.webmanifest');
  link('icon', 'icons/favicon-64.png', { type: 'image/png' });
  link('apple-touch-icon', 'icons/apple-touch-icon.png');
  if ('serviceWorker' in navigator) {
    addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* still works online */ }); });
  }
}
