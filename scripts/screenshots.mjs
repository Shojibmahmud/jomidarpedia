#!/usr/bin/env node
// Full-page screenshots for the owner's visual review against the design boards (roadmap Phase 5
// acceptance, spec 05 FR-58): Baliati and Elangi at 390 and 1440 px in light, and Baliati at 390 px in dark.
// Explore (spec 06 AC-12): 1440 and 390 px in light, 390 px in dark, 1440 px in Bangla, and the 390 px drawer.
// The map (spec 07 AC-16): 1440 px with Baliati's popover open, the 390 px map at peek, half and full, the
// selected-site sheet, 390 px dark at full, and Baliati's Location section with its mini map. These load real
// tiles from the development provider (O4).
// Search (spec 08 AC-17): /search/ results at 1440 px, "Did you mean" and no results at 390 px, and the header
// overlay with suggestions at 1440 and 390 px.
// Trips (spec 09 OQ-1): /trips/ at 1440 and 390 px, the Manikganj and Mymensingh itineraries at 1440 px, an
// itinerary at 390 px in dark, and A4 PDFs of the Manikganj plan and the shortest and longest plans.
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
// [name, query, width, theme, language, open the drawer]; the board's own view: day trips, sorted by travel time.
const explore = [
  ['explore', 'day=1', 1440, 'light', 'en', false], ['explore', 'day=1', 390, 'light', 'en', false],
  ['explore', 'day=1', 390, 'dark', 'en', false], ['explore-bn', 'day=1', 1440, 'light', 'bn', false],
  ['explore-drawer', 'day=1&tt=2-3&cond=preserved,in_ruins', 390, 'light', 'en', true],
];

// [name, query, width, theme, handle presses (phone sheet)]
const maps = [
  ['map-popover', 'day=1&sel=JB-DHK-064', 1440, 'light', 0],
  ['map-peek', 'view=map', 390, 'light', 0], ['map-half', 'view=map', 390, 'light', 1], ['map-full', 'view=map', 390, 'light', 2],
  ['map-summary', 'day=1&view=map&sel=JB-DHK-064', 390, 'light', 0], ['map-full', 'day=1&view=map', 390, 'dark', 2],
];

// [name, query, width, theme]
const searches = [
  ['search-results', 'q=jamidar%20badi%20choudhury', 1440, 'light'],
  ['search-did-you-mean', 'q=baliyati', 390, 'light'], ['search-no-results', 'q=lalbagh%20kella', 390, 'light'],
];

// [name, path, width, theme]; the itineraries the boards show, by anchor site.
const tripOf = anchor => JSON.parse(readFileSync('data/build/trips.json', 'utf8')).find(t => t.anchor === anchor).id;
const tripFiles = () => JSON.parse(readFileSync('data/build/trips.json', 'utf8'));
const trips = [
  ['trips', '/trips/', 1440, 'light'], ['trips', '/trips/', 390, 'light'],
  ['trip-manikganj', `/trips/${tripOf('JB-DHK-064')}/`, 1440, 'light'], ['trip-muktagacha', `/trips/${tripOf('JB-MYM-010')}/`, 1440, 'light'],
  ['trip-manikganj', `/trips/${tripOf('JB-DHK-064')}/`, 390, 'dark'],
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
  for (const [name, query, width, theme, lang, drawer] of explore) {
    const page = await browser.newPage({ viewport: { width, height: drawer ? 844 : 900 }, colorScheme: theme });
    if (lang === 'bn') await page.addInitScript(() => localStorage.setItem('jp-lang', 'bn'));
    await page.goto(`http://localhost:${PORT}/explore/?${query}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#jp-results-title[data-count]');
    if (drawer) {
      await page.click('[data-open-filters]');
      await page.waitForSelector('dialog[open]');
    }
    const file = `${OUT}/${name}-${width}-${theme}.png`;
    await page.screenshot({ path: file, fullPage: !drawer });
    console.log(file);
    await page.close();
  }
  for (const [name, query, width, theme, presses] of maps) {
    const page = await browser.newPage({ viewport: { width, height: width < 1024 ? 844 : 900 }, colorScheme: theme });
    await page.goto(`http://localhost:${PORT}/explore/?${query}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.leaflet-marker-pane .jp-pin, .leaflet-marker-pane .jp-cluster');
    for (let k = 0; k < presses; k++) await page.click('[data-sheet-handle]');
    await page.waitForTimeout(1200); // fit, cluster and sheet animations, tiles
    const file = `${OUT}/${name}-${width}-${theme}.png`;
    await page.screenshot({ path: file });
    console.log(file);
    await page.close();
  }
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`http://localhost:${PORT}/site/JB-DHK-064/baliati-palace/`, { waitUntil: 'networkidle' });
    const panel = page.locator('[data-location-state]');
    await panel.scrollIntoViewIfNeeded();
    await page.waitForSelector('[data-mini-map] .jp-pin');
    await page.waitForTimeout(1200);
    const file = `${OUT}/baliati-location-${width}-light.png`;
    await panel.screenshot({ path: file });
    console.log(file);
    await page.close();
  }
  for (const [name, query, width, theme] of searches) {
    const page = await browser.newPage({ viewport: { width, height: width < 1024 ? 844 : 900 }, colorScheme: theme });
    await page.goto(`http://localhost:${PORT}/search/?${query}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-tab], [data-search-empty]');
    const file = `${OUT}/${name}-${width}-${theme}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
    await page.close();
  }
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width < 1024 ? 844 : 900 } });
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    await page.click('[data-search-open]');
    await page.waitForSelector('[data-search-overlay] [role="combobox"]:focus');
    await page.keyboard.type('chowdhury');
    await page.waitForSelector('[data-search-overlay] [role="option"]');
    const file = `${OUT}/search-overlay-${width}-light.png`;
    await page.screenshot({ path: file });
    console.log(file);
    await page.close();
  }
  for (const [name, path, width, theme] of trips) {
    const page = await browser.newPage({ viewport: { width, height: width < 1024 ? 844 : 900 }, colorScheme: theme });
    await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: 'networkidle' });
    await page.locator('[data-route-map-box], [data-trip-list]').first().scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(1200);
    const file = `${OUT}/${name}-${width}-${theme}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
    await page.close();
  }
  const bySize = [...tripFiles()].sort((a, b) => a.stopCount - b.stopCount);
  for (const [name, id] of [['print-manikganj', tripOf('JB-DHK-064')], ['print-shortest', bySize[0].id], ['print-longest', bySize.at(-1).id]]) {
    const page = await browser.newPage({ colorScheme: 'dark' });
    await page.goto(`http://localhost:${PORT}/trips/${id}/`, { waitUntil: 'networkidle' });
    await page.locator('[data-trip-footer]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    const file = `${OUT}/${name}.pdf`;
    await page.pdf({ path: file, format: 'A4' });
    console.log(file);
    await page.close();
  }
  await browser.close();
} finally {
  server.kill();
}
