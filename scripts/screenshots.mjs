#!/usr/bin/env node
// Full-page screenshots for the owner's visual review against the design boards (roadmap Phase 5
// acceptance, spec 05 FR-58): Baliati and Elangi at 390 and 1440 px in light, and Baliati at 390 px in dark.
// Serves out/ with the pinned `serve` on the Playwright port, so run `npm run build:local` first.
// Output: screenshots/ (gitignored).

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const PORT = 4174;
const OUT = 'screenshots';
const site = id => JSON.parse(readFileSync(`data/build/sites/${id}.json`, 'utf8'));
const shots = [
  ['baliati', 'JB-DHK-064', 1440, 'light'], ['baliati', 'JB-DHK-064', 390, 'light'], ['baliati', 'JB-DHK-064', 390, 'dark'],
  ['elangi', 'JB-RAJ-002', 1440, 'light'], ['elangi', 'JB-RAJ-002', 390, 'light'],
];

const server = spawn('npx', ['serve', 'out', '--listen', String(PORT), '--no-clipboard', '--no-port-switching'], { stdio: 'ignore' });
try {
  for (let k = 0; k < 50; k++) {
    try { if ((await fetch(`http://localhost:${PORT}/`)).ok) break; } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 200));
  }
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, id, width, theme] of shots) {
    const s = site(id);
    const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: theme });
    await page.goto(`http://localhost:${PORT}/site/${s.id}/${s.slug}/`, { waitUntil: 'networkidle' });
    const file = `${OUT}/${name}-${width}-${theme}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
    await page.close();
  }
  await browser.close();
} finally {
  server.kill();
}
