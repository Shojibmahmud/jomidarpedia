import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // e2e/ holds the Playwright page tests (npm run e2e), which need a built out/.
  test: { exclude: ['**/node_modules/**', 'e2e/**'] },
  resolve: {
    alias: {
      '@/': fileURLToPath(new URL('./', import.meta.url)),
      // `server-only` throws outside a React server build; tests run lib/data.ts directly in Node.
      'server-only': fileURLToPath(new URL('./tests/stubs/empty.ts', import.meta.url)),
    },
  },
});
