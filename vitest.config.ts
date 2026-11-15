import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@spend-lens/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@spend-lens/banks': fileURLToPath(new URL('./packages/banks/src/index.ts', import.meta.url)),
    },
  },
  test: { include: ['packages/*/test/**/*.test.ts'], environment: 'node' },
});
