import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import type { Plugin } from 'vite';

/** Writes dist/sw.js with a version taken from the built page, so every new build replaces the old cache. */
const serviceWorker = (): Plugin => ({
  name: 'spendlens-sw',
  apply: 'build',
  closeBundle() {
    const dist = fileURLToPath(new URL('./dist/', import.meta.url));
    const version = createHash('sha256').update(readFileSync(dist + 'index.html')).digest('hex').slice(0, 10);
    const sw = readFileSync(fileURLToPath(new URL('./src/sw.template.js', import.meta.url)), 'utf8').replace('__VERSION__', version);
    writeFileSync(dist + 'sw.js', sw);
  },
});

const pkg = (p: string) => fileURLToPath(new URL(`../../packages/${p}/src/index.ts`, import.meta.url));

// Builds ONE self-contained HTML file (all JS/CSS inlined). That's what lets people keep opening
// Spend Lens by double-clicking index.html: Chrome refuses to load separate module files on file://.
export default defineConfig({
  plugins: [react(), viteSingleFile(), serviceWorker()],
  resolve: {
    alias: [
      { find: '@spend-lens/ui/fonts.css', replacement: fileURLToPath(new URL('../../packages/ui/src/fonts.css', import.meta.url)) },
      { find: '@spend-lens/ui/styles.css', replacement: fileURLToPath(new URL('../../packages/ui/src/styles.css', import.meta.url)) },
      { find: '@spend-lens/core', replacement: pkg('core') },
      { find: '@spend-lens/banks', replacement: pkg('banks') },
      { find: '@spend-lens/ui', replacement: pkg('ui') },
    ],
  },
  worker: { format: 'iife' },
  build: { target: ['chrome100', 'safari15', 'firefox100'], outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 4000, assetsInlineLimit: 100_000_000 },
});
