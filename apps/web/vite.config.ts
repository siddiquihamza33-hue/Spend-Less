import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

const pkg = (p: string) => fileURLToPath(new URL(`../../packages/${p}/src/index.ts`, import.meta.url));

// Builds ONE self-contained HTML file (all JS/CSS inlined). That's what lets people keep opening
// Spend Lens by double-clicking index.html: Chrome refuses to load separate module files on file://.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: [
      { find: '@spend-lens/ui/styles.css', replacement: fileURLToPath(new URL('../../packages/ui/src/styles.css', import.meta.url)) },
      { find: '@spend-lens/core', replacement: pkg('core') },
      { find: '@spend-lens/banks', replacement: pkg('banks') },
      { find: '@spend-lens/ui', replacement: pkg('ui') },
    ],
  },
  worker: { format: 'iife' },
  build: { target: ['chrome100', 'safari15', 'firefox100'], outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 4000, assetsInlineLimit: 100_000_000 },
});
