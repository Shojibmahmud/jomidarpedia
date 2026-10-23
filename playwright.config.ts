// Page tests (roadmap tasks 4.4 and 4.5, I2): Playwright serves the static export in out/ with the
// pinned `serve`, as a static host would. `npm run e2e` does not build: run `npm run build:local` first.
// Browsers: `npx playwright install --with-deps chromium`.

import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx serve out --listen ${PORT} --no-clipboard --no-port-switching`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
