// Error states (roadmap task 13.5; spec 13 FR-14 to FR-18, AC-8), each tested by blocking the request.
// Covered elsewhere and not repeated here: blocked tiles on the Explore map (map.spec.ts, "blocked tiles show the
// overlay"), the itinerary route map (trips.spec.ts), offline (areas-sources-about.spec.ts, "the offline toast")
// and an unknown route returning 404 (areas-sources-about.spec.ts, "404 (AC-13)").

import { expect, test, type Page } from './fixtures';
import { stubTiles, TILE } from './tiles';
import { PHOTO_FALLBACK } from '../lib/prefs';

test.beforeEach(async ({ page }) => { await stubTiles(page); });

/** Uncaught page errors: a failed request must be handled, never thrown (FR-14). */
function pageErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  return errors;
}

/** Fails index.json until `release` is called, then serves it again. */
async function failIndex(page: Page) {
  let failing = true;
  await page.route('**/data/index.json', r => (failing ? r.abort() : r.continue()));
  return () => { failing = false; };
}

test.describe('a failed index.json request (FR-14)', () => {
  test('Explore shows the error with Retry, and Retry loads the list', async ({ page }) => {
    const errors = pageErrors(page);
    const release = await failIndex(page);
    await page.goto('/explore/');
    const alert = page.locator('main [role="alert"]').filter({ hasText: /couldn/i }).first();
    await expect(alert).toBeVisible();
    release();
    await alert.getByRole('button').click();
    await expect(page.locator('[data-results] [data-site]').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Search shows the error with Retry, and Retry finds results', async ({ page }) => {
    const errors = pageErrors(page);
    const release = await failIndex(page);
    await page.goto('/search/?q=baliati');
    await expect(page.locator('[data-search-error]')).toBeVisible();
    release();
    await page.locator('[data-search-error] button').click();
    await expect(page.locator('[data-site="JB-DHK-064"]').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('the home search box shows the error instead of suggestions', async ({ page }) => {
    const errors = pageErrors(page);
    await failIndex(page);
    await page.goto('/');
    await page.locator('[data-hero-search] input').click();
    await page.keyboard.type('Baliati', { delay: 30 });
    await expect(page.locator('[data-home-hero] [data-search-error]')).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test('blocked tiles on the site mini map show the overlay, and Retry recovers (FR-15)', async ({ page }) => {
  await page.unroute(TILE);
  await page.route(TILE, r => r.abort());
  await page.goto('/site/JB-DHK-064/baliati-palace/');
  await page.locator('[data-mini-map-box]').scrollIntoViewIfNeeded();
  const overlay = page.locator('[data-mini-map] [data-tiles-failed]');
  await expect(overlay).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#sources, [data-section="sources"]').first()).toBeAttached();
  await page.unroute(TILE);
  await stubTiles(page);
  await overlay.getByRole('button').click();
  await expect(overlay).toHaveCount(0);
});

test.describe('a failed image falls back to the placeholder drawing (FR-16)', () => {
  test('site gallery and related cards', async ({ page }) => {
    await page.route('**/thumbs/**', r => r.abort());
    await page.goto('/site/JB-DHK-064/baliati-palace/');
    const failed = page.locator('main img[data-failed]');
    await expect(failed.first()).toBeAttached();
    await expect(failed.first()).toHaveAttribute('src', PHOTO_FALLBACK);
    // The drawing loads: its natural width is set once it has decoded.
    await expect.poll(() => failed.first().evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  });

  test('home hero, category and division tiles', async ({ page }) => {
    await page.route('**/home/**', r => r.abort());
    await page.route('**/thumbs/**', r => r.abort());
    await page.goto('/');
    const hero = page.locator('[data-home-hero] img').first();
    await expect(hero).toHaveAttribute('data-failed', '1');
    await expect(hero).toHaveAttribute('src', PHOTO_FALLBACK);
    await expect(hero).not.toHaveAttribute('srcset', /./);
    // Lazy tiles load only near the viewport; load them all now so each one meets the blocked request.
    await page.evaluate(() => document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; }));
    await expect.poll(() => page.locator('main img:not([data-failed])').evaluateAll(imgs =>
      imgs.filter(i => (i as HTMLImageElement).src.includes('/home/') || (i as HTMLImageElement).src.includes('/thumbs/')).length)).toBe(0);
  });

  test('Explore result cards', async ({ page }) => {
    await page.route('**/thumbs/**', r => r.abort());
    await page.goto('/explore/');
    const card = page.locator('[data-results] [data-site] img').first();
    await expect(card).toHaveAttribute('data-failed', '1');
    await expect(card).toHaveAttribute('src', PHOTO_FALLBACK);
  });
});
