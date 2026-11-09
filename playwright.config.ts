// Page tests (roadmap tasks 4.4 and 4.5, I2): Playwright serves the static export in out/ with the
// pinned `serve`, as a static host would. `npm run e2e` does not build: run `npm run build:local` first.
// Browsers: `npx playwright install --with-deps chromium`.
// With PW_BASE_URL set (`npm run e2e:prod`, spec 16 FR-9) the tests run against that deployed host, and no local
// server is started. Tests that read out/ skip themselves then (e2e/smoke.spec.ts).

import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const REMOTE = process.env.PW_BASE_URL?.trim();

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: REMOTE || `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: REMOTE ? undefined : {
    // serve.json mirrors vercel.json's headers, so the CSP applies in every test (spec 13 FR-28)
    command: `npx serve out --config ../serve.json --listen ${PORT} --no-clipboard --no-port-switching`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
