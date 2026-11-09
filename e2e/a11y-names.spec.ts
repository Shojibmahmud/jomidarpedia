// Names and focus found in the manual accessibility checks (roadmap 13.3, docs/a11y-checks.md, 9 and 10 Nov 2026):
// what VoiceOver read twice or without a name, and where keyboard focus dropped to the page.
import { expect, test, type Page } from './fixtures';
import { readFileSync } from 'node:fs';
import type { IndexSite } from '../lib/types';

const index: IndexSite[] = JSON.parse(readFileSync('public/data/index.json', 'utf8'));
const onMap = index.filter(s => s.ll).length;

async function mapReady(page: Page) {
  await expect(page.locator('.leaflet-marker-pane .jp-pin, .leaflet-marker-pane .jp-cluster').first()).toBeAttached();
  await expect(page.locator('.leaflet-cluster-anim')).toHaveCount(0);
  await page.waitForTimeout(500);
}

test.describe('names', () => {
  test('the logo link is named once, in both languages', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('banner').getByRole('link').first()).toHaveAccessibleName('Jomidarpedia home');
    await page.evaluate(() => localStorage.setItem('jp-lang', 'bn'));
    await page.reload();
    await expect(page.getByRole('banner').getByRole('link').first()).toHaveAccessibleName('জমিদারপিডিয়া প্রথম পাতা');
  });

  test("Home's map link has one name with the count", async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-home-map] a')).toHaveAccessibleName(`Map of Bangladesh: ${onMap} sites`);
  });

  test('every card article is named by its heading', async ({ page }) => {
    for (const path of ['/', '/explore/', '/trips/']) {
      await page.goto(path);
      await expect(page.locator('article').first()).toBeAttached();
      const unnamed = await page.locator('article').evaluateAll(els => els.filter(a => {
        const id = a.getAttribute('aria-labelledby');
        return !id || !document.getElementById(id)?.textContent?.trim();
      }).length);
      expect(unnamed, path).toBe(0);
    }
  });

  test('the trip budget table has a caption', async ({ page }) => {
    await page.goto('/trips/IT-DHK-010-1/');
    await expect(page.getByRole('table', { name: 'Rough budget' })).toBeAttached();
  });
});

test.describe('focus', () => {
  test('Enter on a map cluster moves focus to what it opened into', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/explore/');
    await mapReady(page);
    // The largest cluster, so Enter zooms in (and removes it) rather than spreading the pins at full zoom.
    await page.evaluate(() => {
      const all = [...document.querySelectorAll<HTMLElement>('.leaflet-marker-pane .jp-cluster')];
      const big = all.sort((x, y) => Number(y.textContent?.replace(/\D/g, '')) - Number(x.textContent?.replace(/\D/g, '')))[0];
      big.dataset.testOpened = '1';
      big.focus();
    });
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-test-opened]')).toHaveCount(0, { timeout: 5000 }); // the cluster is gone
    await expect.poll(() => page.evaluate(() => {
      const a = document.activeElement;
      return !!a?.closest('.leaflet-marker-pane') && (a.classList.contains('jp-pin') || a.classList.contains('jp-cluster'));
    }), { timeout: 5000 }).toBe(true);
  });

  test('"Show on map" on a narrow screen moves focus into the summary', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 733 });
    await page.goto('/explore/');
    const show = page.locator('[data-show-on-map]').first();
    await show.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/view=map/);
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))).toBe(true);
  });
});
