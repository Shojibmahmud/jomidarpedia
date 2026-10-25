// Home page tests (spec .claude/specs/11-Home-page.md AC-3, AC-5, AC-6, AC-14 to AC-16, AC-18, AC-19). Counts come
// from the built data, never typed here (I6).

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { Meta } from '../lib/types';
import { stubTiles } from './tiles';

const { counts }: Meta = JSON.parse(readFileSync('data/build/meta.json', 'utf8'));
const SECTIONS = ['[data-home-hero]', '[data-home-categories]', '[data-stat-strip]', '[data-home-map]', '[data-home-divisions]', '[data-home-trips]', '[data-trust-band]'];

test.beforeEach(async ({ page }) => { await stubTiles(page); });

/** Requests for Leaflet, Fuse.js, index.json or map tiles while the page is in use. */
function watch(page: Page) {
  const hits: string[] = [];
  page.on('request', r => { if (/leaflet|fuse|index\.json|tile\.|\/tiles?\//i.test(r.url())) hits.push(r.url()); });
  page.on('response', async r => {
    if (!r.url().endsWith('.js')) return;
    const body = await r.text().catch(() => '');
    if (/new Fuse\(|leaflet/i.test(body.slice(0, 400_000))) hits.push(`code: ${r.url()}`);
  });
  return hits;
}

test('works without JavaScript: every section, link and credit is in the page (AC-3)', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  for (const s of SECTIONS) await expect(page.locator(s), s).toBeVisible();
  await expect(page.locator('[data-credit]')).toHaveCount(13);
  await expect(page.locator('[data-hero-search] input[name="q"]')).toBeVisible();
  await context.close();
});

test('loads no Leaflet or Fuse.js until the search box is used, then suggests (AC-5)', async ({ page }) => {
  const hits = watch(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(hits).toEqual([]);
  await page.locator('[data-hero-search] input').click();
  await page.keyboard.type('Baliati', { delay: 30 });
  await expect(page.locator('[data-home-hero] [role="combobox"]')).toHaveValue('Baliati');
  await expect(page.locator('[data-home-hero] [role="option"]').first()).toContainText('Baliati');
});

test('at 390 px in light mode the live search box has dark text and its suggestions are not clipped by the hero', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.locator('[data-hero-search] input').click();
  await page.keyboard.type('nat', { delay: 30 });
  const box = page.locator('[data-home-hero] [role="combobox"]');
  await expect(box).toHaveValue('nat');
  expect(await box.evaluate(el => getComputedStyle(el).color)).toBe('rgb(33, 29, 24)'); // --ink, not the hero's white
  const options = page.locator('[data-home-hero] [role="option"]');
  await expect(options.first()).toBeVisible();
  // The last suggestion is what the browser hits at its centre: nothing (the hero's edge, the next section) covers it.
  const last = options.last();
  await last.scrollIntoViewIfNeeded();
  expect(await last.evaluate(el => {
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
  })).toBe(true);
});

test('the quick chips and category tiles open Explore with the same count (AC-6)', async ({ page }) => {
  const cases: [string, number][] = [
    ['[data-home-chip="home.chip.open"]', counts.openToVisitors],
    ['[data-home-category="ruins"] h3 a', counts.conditions.in_ruins],
  ];
  for (const [sel, want] of cases) {
    await page.goto('/');
    await page.locator(sel).click();
    await expect(page).toHaveURL(/\/explore\/\?/);
    await expect(page.locator('#jp-results-title')).toHaveAttribute('data-count', String(want));
  }
});

test('the header lies over the hero on Home only (AC-14)', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('body > header');
  await expect(header).toHaveCSS('position', 'absolute');
  await expect(header).toHaveCSS('color', 'rgb(255, 255, 255)');
  await page.goto('/about/');
  await expect(header).toHaveCSS('position', 'sticky');
});

test.describe('at 390 px (AC-15)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('tiles are 2×2, all five stats show, rows scroll sideways and the page does not', async ({ page }) => {
    await page.goto('/');
    const tiles = page.locator('[data-home-category]');
    const boxes = await Promise.all([0, 1, 2, 3].map(i => tiles.nth(i).boundingBox()));
    expect(boxes[0]!.y).toBe(boxes[1]!.y);
    expect(boxes[2]!.y).toBeGreaterThan(boxes[0]!.y);
    const stats = page.locator('[data-stat]');
    await expect(stats).toHaveCount(5);
    for (const box of await stats.evaluateAll(els => els.map(e => e.getBoundingClientRect().toJSON()))) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(390);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const row = page.locator('[data-home-divisions] ul');
    expect(await row.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  });

  test('Tab reaches every division tile and keeps it in view', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('[data-home-division] h3 a');
    await links.first().focus();
    for (let i = 0; i < counts.divisions; i++) {
      await expect(links.nth(i)).toBeFocused();
      await expect(links.nth(i)).toBeInViewport();
      await page.keyboard.press('Tab');
    }
  });
});

test('in Bangla, the title is Bangla and no Latin digits show outside credits and English text (AC-16)', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('jp-lang', 'bn'));
  await page.goto('/');
  await expect(page.locator('h1 > :visible')).toHaveText('বাংলাদেশের জমিদার বাড়ি');
  const latin = await page.locator('main').evaluate(main => {
    const out: string[] = [];
    const walk = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement!;
      if (!el.checkVisibility() || el.closest('[lang="en"], [data-credit], svg')) continue;
      if (/[0-9]/.test(n.textContent ?? '')) out.push(n.textContent!.trim());
    }
    return out;
  });
  expect(latin).toEqual([]);
});

test.describe('accessibility (AC-18)', () => {
  for (const [lang, theme] of [['en', 'light'], ['bn', 'light'], ['en', 'dark'], ['bn', 'dark']]) {
    test(`axe finds no violations on Home (${lang}, ${theme})`, async ({ page }) => {
      await page.addInitScript(([l, t]) => { if (l === 'bn') localStorage.setItem('jp-lang', 'bn'); localStorage.setItem('jp-theme', t); }, [lang, theme]);
      await page.goto('/');
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(', ')}`)).toEqual([]);
    });
  }
});

test('every photo has a credit: printed beside it, or behind the trip card camera button (AC-19)', async ({ page }) => {
  await page.goto('/');
  const shown = await page.locator('main img').evaluateAll(imgs => imgs.map(img => {
    const tile = img.closest('li, section')!;
    return !!tile.querySelector('[data-credit]') || !!tile.querySelector('[data-photo-credits]');
  }));
  expect(shown.length).toBeGreaterThan(13);
  expect(shown.every(Boolean)).toBe(true);
});
