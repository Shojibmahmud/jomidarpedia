// Map tests (roadmap task 7.12, spec 07 §8). Expected counts come from public/data/index.json through
// lib/filters.ts, never typed (I6). Every tile request is answered with a local 1 × 1 image (A-5), so no test
// contacts a tile server. Run `npm run build:local` first.

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Response } from './fixtures';
import { readFileSync } from 'node:fs';
import { EMPTY, filter, makePlaces, type FilterState } from '../lib/filters';
import { parse } from '../lib/urlState';
import type { District, Division, IndexSite } from '../lib/types';
import { BASE_MAPS } from '../lib/map-config';
import { stubTiles, TILE } from './tiles';

const index: IndexSite[] = JSON.parse(readFileSync('public/data/index.json', 'utf8'));
const divisions: Division[] = JSON.parse(readFileSync('data/build/divisions.json', 'utf8'));
const districts: District[] = JSON.parse(readFileSync('data/build/districts.json', 'utf8'));
const places = makePlaces({
  divisions: divisions.map(d => ({ slug: d.slug, en: d.en, bn: d.bn })),
  districts: districts.map(d => ({ slug: d.slug, en: d.en, bn: d.bn, divisionSlug: d.divisionSlug })),
});
const onMapFor = (f: FilterState) => filter(index, f, places).filter(s => s.ll);
const stateOf = (page: Page) => parse(new URL(page.url()).search, places).state;

const DESKTOP = { width: 1440, height: 900 };
const PANE = { width: 1100, height: 900 };
const PHONE = { width: 390, height: 844 };

const baliati = index.find(s => s.i === 'JB-DHK-064')!;
const hiddenPin = index.find(s => !s.ll)!;
const fortSite = index.find(s => s.ll && s.t !== 'fort')!;

/** Records tile requests and any script or stylesheet carrying Leaflet (the map chunks). */
function watchMap(page: Page) {
  const hits: string[] = [];
  const pending: Promise<void>[] = [];
  page.on('request', r => { if (TILE.test(r.url())) hits.push(r.url()); });
  page.on('response', (r: Response) => {
    if (!/\.(js|css)(\?|$)/.test(r.url())) return;
    pending.push(r.text().then(t => { if (t.includes('leaflet-container')) hits.push(r.url()); }, () => {}));
  });
  return { hits, settle: () => Promise.all(pending) };
}

async function open(page: Page, query = '') {
  await page.goto(`/explore/${query ? `?${query}` : ''}`);
  await expect(page.locator('[data-count]').first()).toBeAttached();
}

/** Waits for the map, its pins and the end of the fit and cluster animations. */
async function mapReady(page: Page) {
  await expect(page.locator('.leaflet-container')).toHaveCount(1);
  await expect(page.locator('.leaflet-marker-pane .jp-pin, .leaflet-marker-pane .jp-cluster').first()).toBeAttached();
  await expect(page.locator('.leaflet-cluster-anim')).toHaveCount(0);
  await page.waitForTimeout(500);
}

/** Pins on their own plus the sites inside every cluster. */
const shownOnMap = (page: Page) => page.evaluate(() => {
  const pins = document.querySelectorAll('.leaflet-marker-pane .jp-pin').length;
  const inClusters = [...document.querySelectorAll('.leaflet-marker-pane .jp-cluster__ring')].reduce((a, e) => a + Number(e.getAttribute('data-count')), 0);
  return pins + inClusters;
});
const zoomOf = async (page: Page) => Number(await page.locator('[data-map]').getAttribute('data-zoom'));
const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const seriousAxe = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`);
};

test.beforeEach(async ({ page }) => { await stubTiles(page); });

// ---------------------------------------------------------------- loading only when shown (AC-1)
test.describe('map code loads only when the map is shown (AC-1, NFR-2)', () => {
  test('phone list view: no Leaflet, no tiles', async ({ page }) => {
    await page.setViewportSize(PHONE);
    const w = watchMap(page);
    await open(page);
    await expect(page.locator('[data-open-map]')).toBeVisible();
    await page.waitForTimeout(800);
    await w.settle();
    expect(w.hits).toEqual([]);
    await page.locator('[data-open-map]').click();
    await mapReady(page);
    await w.settle();
    expect(w.hits.length).toBeGreaterThan(0);
  });

  test('Lite mode at 1440 px: no Leaflet, no tiles, the map pane says so', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.addInitScript(() => localStorage.setItem('jp-lite', '1'));
    const w = watchMap(page);
    await open(page, 'view=map');
    await expect(page.locator('[data-map-pane] [data-lite-off]')).toBeVisible();
    await page.waitForTimeout(800);
    await w.settle();
    expect(w.hits).toEqual([]);
    expect(page.url()).toContain('view=map');
  });

  test('site page: the mini map waits until Location nears the screen', async ({ page }) => {
    await page.setViewportSize(PHONE);
    const w = watchMap(page);
    await page.goto(`/site/${baliati.i}/${baliati.s}/`);
    await page.waitForTimeout(800);
    await w.settle();
    expect(w.hits).toEqual([]);
    await page.locator('[data-mini-map-box]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-mini-map] .leaflet-container')).toBeVisible();
    await w.settle();
    expect(w.hits.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------- desktop map
test.describe('desktop', () => {
  test.use({ viewport: DESKTOP });

  test('the map shows exactly the mappable results, and the bar counts them (AC-2)', async ({ page }) => {
    for (const q of ['', 'day=1', 'div=dhaka&cond=in_ruins,preserved']) {
      await open(page, q);
      await mapReady(page);
      const want = onMapFor(stateOf(page));
      const total = filter(index, stateOf(page), places).length;
      await expect.poll(() => shownOnMap(page), q).toBe(want.length);
      const bar = page.locator('[data-map-bar]');
      await expect(bar).toHaveAttribute('data-on-map', String(want.length));
      await expect(bar).toHaveAttribute('data-off-map', String(total - want.length));
    }
  });

  test('keyboard: a cluster zooms in, a pin opens the summary, Esc returns focus (AC-4)', async ({ page }) => {
    await open(page);
    await mapReady(page);
    expect(await page.locator('.jp-pin button, .jp-cluster button').count()).toBe(0);
    const before = await zoomOf(page);
    const cluster = page.locator('.leaflet-marker-pane .jp-cluster').first();
    await expect(cluster).toHaveAttribute('tabindex', '0');
    await expect(cluster).toHaveAttribute('aria-label', /Cluster of \d+ sites/);
    await cluster.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => zoomOf(page)).toBeGreaterThan(before);

    await open(page, 'div=dhaka&dist=manikganj');
    await mapReady(page);
    const pin = page.locator('.leaflet-marker-pane .jp-pin').first();
    const id = await pin.getAttribute('data-site');
    await expect(pin).toHaveAttribute('role', 'button');
    await expect(pin).toHaveAttribute('aria-label', /, /);
    await pin.focus();
    await page.keyboard.press('Enter');
    const dialog = page.locator(`[data-popover] [data-summary="${id}"]`);
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();
    await expect(page).toHaveURL(new RegExp(`sel=${id}`));
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page).not.toHaveURL(/sel=/);
    await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.site)).toBe(id);
  });

  test('Space opens a pin too', async ({ page }) => {
    await open(page, 'div=dhaka&dist=manikganj');
    await mapReady(page);
    const pin = page.locator('.leaflet-marker-pane .jp-pin').first();
    await pin.focus();
    await page.keyboard.press(' ');
    await expect(page.locator('[data-popover] [role="dialog"]')).toBeVisible();
  });

  test('selecting adds one entry: Back closes, Forward reopens; Close on an opened link replaces (AC-5)', async ({ page }) => {
    await open(page, 'div=dhaka&dist=manikganj');
    await mapReady(page);
    const pin = page.locator('.leaflet-marker-pane .jp-pin').first();
    const id = await pin.getAttribute('data-site');
    await pin.click();
    await expect(page).toHaveURL(new RegExp(`sel=${id}`));
    await expect(page.locator('[data-popover] [role="dialog"]')).toBeVisible();
    await page.goBack();
    await expect(page).not.toHaveURL(/sel=/);
    await expect(page.locator('[data-popover]')).toHaveCount(0);
    await page.goForward();
    await expect(page.locator(`[data-popover] [data-summary="${id}"]`)).toBeVisible();

    await open(page);
    await page.goto(`/explore/?sel=${baliati.i}`);
    await expect(page.locator(`[data-popover] [data-summary="${baliati.i}"]`)).toBeVisible();
    await page.locator('[data-summary-close]').click();
    await expect(page).toHaveURL(/\/explore\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/explore\/$/);
  });

  test('a sel that cannot be shown is dropped (AC-6)', async ({ page }) => {
    await open(page, `sel=${hiddenPin.i}`);
    await expect(page.locator('[data-notice]')).toBeVisible();
    await expect(page).not.toHaveURL(/sel=/);

    await open(page, `type=fort&sel=${fortSite.i}`);
    await expect(page.locator('[data-notice]')).toBeVisible();
    await expect(page).toHaveURL(/\?type=fort$/);

    await open(page, `sel=${baliati.i}`);
    await expect(page.locator('[data-popover]')).toBeVisible();
    const other = (['preserved', 'preserved_adaptive_reuse', 'in_ruins', 'lost', 'unknown'] as const).find(c => c !== baliati.c)!;
    await page.locator(`aside [data-chip="cond:${other}"]`).click();
    await expect(page).not.toHaveURL(/sel=/);
    await expect(page.locator('[data-popover]')).toHaveCount(0);
    await expect(page.locator('[data-notice]')).toHaveCount(0);
  });

  test('hover highlights a pin; Show on map opens its popover (AC-7)', async ({ page }) => {
    await open(page, 'div=dhaka&dist=manikganj');
    await mapReady(page);
    const row = page.locator('[data-results] li').filter({ has: page.locator('[data-show-on-map]') }).first();
    await row.hover();
    await expect(page.locator('.leaflet-marker-pane .is-hover')).toHaveCount(1);
    const id = await row.locator('[data-show-on-map]').getAttribute('data-show-on-map');
    await row.locator('[data-show-on-map]').click();
    await expect(page.locator(`[data-popover] [data-summary="${id}"]`)).toBeVisible();
    await expect(page.locator(`[data-results] [data-site="${id}"]`)).toHaveClass(/ring-2/);
    for (const s of filter(index, stateOf(page), places).filter(x => !x.ll).slice(0, 3)) {
      await expect(page.locator(`[data-results] [data-site="${s.i}"] [data-show-on-map]`)).toHaveCount(0);
    }
  });

  test('blocked tiles show the overlay; the list keeps working; Retry recovers (AC-10)', async ({ page }) => {
    await page.unroute(TILE);
    await page.route(TILE, r => r.abort());
    await open(page);
    await expect(page.locator('[data-tiles-failed]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.leaflet-control-attribution')).toBeInViewport();
    await page.locator('aside').getByRole('switch', { name: /Day trips from Dhaka/ }).click();
    await expect(page.locator('#jp-results-title')).toHaveAttribute('data-count', String(filter(index, { ...EMPTY, day: true }, places).length));
    await page.unroute(TILE);
    await stubTiles(page);
    await page.locator('[data-tiles-failed] button').click();
    await expect(page.locator('[data-tiles-failed]')).toHaveCount(0);
  });

  test('attribution follows the base map; controls and key work (AC-11, AC-12)', async ({ page }) => {
    await open(page);
    await mapReady(page);
    // Only OSM is offered until O4 (spec 07 D5, amended): the menu lists it, pressed, and the attribution names it.
    const attribution = page.locator('[data-map-pane] .leaflet-control-attribution');
    await expect(attribution).toBeInViewport();
    await expect(attribution).toContainText('OpenStreetMap');
    await page.locator('[data-base-menu]').click();
    await expect(page.locator('[data-base]')).toHaveCount(BASE_MAPS.length);
    await expect(page.locator('[data-base="osm"]')).toHaveAttribute('aria-pressed', 'true');
    const tile = page.waitForRequest(r => /tile\.openstreetmap\.org/.test(r.url()));
    await page.locator('[data-base="osm"]').click();
    await page.locator('[data-zoom-in]').click();
    await tile;

    const z = await zoomOf(page);
    await page.locator('[data-zoom-in]').click();
    await expect.poll(() => zoomOf(page)).toBe(z + 1);
    await page.locator('[data-zoom-out]').click();
    await expect.poll(() => zoomOf(page)).toBe(z);

    await page.locator('[data-locate]').click();
    await expect(page.locator('[data-locate-status]')).toContainText(/refused|isn't available/);

    await page.getByRole('button', { name: 'Map key' }).click();
    await expect(page.locator('[data-key-unverified]')).toBeVisible();
    await expect(page.locator('[data-key-circle]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-key-circle]')).toBeHidden();
  });

  test('the map fits each filter change and keeps a hand-panned view on sort (AC-19)', async ({ page }) => {
    await open(page, 'div=khulna');
    await mapReady(page);
    const inside = () => page.evaluate(() => {
      const box = document.querySelector('[data-map]')!.getBoundingClientRect();
      return [...document.querySelectorAll<HTMLElement>('.leaflet-marker-pane .jp-pin, .leaflet-marker-pane .jp-cluster')].every(el => {
        const r = el.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
      });
    });
    expect(await inside()).toBe(true);
    const map = page.locator('[data-map]');
    const b = (await map.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 120, b.y + b.height / 2 + 60, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(1200); // drag inertia
    const first = page.locator('.leaflet-marker-pane .jp-pin, .leaflet-marker-pane .jp-cluster').first();
    const before = await first.boundingBox();
    await page.locator('[data-sort="name"]').click();
    await expect(page).toHaveURL(/sort=name/);
    await page.waitForTimeout(400);
    expect(await first.boundingBox()).toEqual(before);
  });

  test('axe: map and popover, light and dark (AC-17)', async ({ page }) => {
    for (const theme of ['light', 'dark']) {
      await page.addInitScript(t => localStorage.setItem('jp-theme', t), theme);
      await open(page, `sel=${baliati.i}`);
      await mapReady(page);
      await expect(page.locator('[data-popover] [role="dialog"]')).toBeVisible();
      expect(await seriousAxe(page), theme).toEqual([]);
    }
  });

  test('Bangla digits on clusters', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('jp-lang', 'bn'));
    await open(page);
    await mapReady(page);
    await expect(page.locator('.jp-cluster__ring').first()).toHaveText(/^[০-৯]+$/);
  });
});

// ---------------------------------------------------------------- phone map
test.describe('phone', () => {
  test.use({ viewport: PHONE });

  test('the handle cycles peek, half, full; a summary swaps sheets and Close restores (AC-8)', async ({ page }) => {
    await open(page, 'view=map');
    await mapReady(page);
    const sheet = page.locator('[data-sheet]');
    const handle = page.locator('[data-sheet-handle]');
    await expect(sheet).toHaveAttribute('data-sheet', 'peek');
    await expect(handle).toHaveAttribute('aria-expanded', 'false');
    await handle.click();
    await expect(sheet).toHaveAttribute('data-sheet', 'half');
    await expect(handle).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('H2');
    await handle.click();
    await expect(sheet).toHaveAttribute('data-sheet', 'full');
    await expect(page.locator('[data-sheet-list]')).toHaveCSS('overflow-y', 'auto');
    await expect(page.locator('.leaflet-control-attribution')).toBeInViewport();
    await handle.click();
    await expect(sheet).toHaveAttribute('data-sheet', 'peek');
    await handle.click();
    await expect(sheet).toHaveAttribute('data-sheet', 'half');

    const pin = page.locator('.leaflet-marker-pane .jp-pin, .leaflet-marker-pane .jp-cluster').first();
    await pin.focus();
    await page.keyboard.press('Enter');
    if (!(await page.locator('[data-summary-sheet]').count())) {
      await mapReady(page);
      const p = page.locator('.leaflet-marker-pane .jp-pin').first();
      await p.focus();
      await page.keyboard.press('Enter');
    }
    await expect(page.locator('[data-summary-sheet] [role="dialog"]')).toBeVisible();
    await expect(sheet).toHaveAttribute('aria-hidden', 'true');
    await page.locator('[data-summary-close]').click();
    await expect(page.locator('[data-summary-sheet]')).toHaveCount(0);
    await expect(sheet).toHaveAttribute('data-sheet', 'half');
    await expect(sheet).not.toHaveAttribute('aria-hidden', 'true');
  });

  test('Back closes the summary sheet; the Map/List switch keeps the filters (AC-5, AC-8)', async ({ page }) => {
    await open(page, `day=1&view=map&sel=${baliati.i}`);
    await expect(page.locator(`[data-summary-sheet] [data-summary="${baliati.i}"]`)).toBeVisible();
    await expect(page.locator('[data-summary-sheet] [data-read-more]')).toHaveAttribute('href', `/site/${baliati.i}/${baliati.s}/`);
    await expect(page.locator('[data-summary-sheet] [data-directions]')).toBeVisible();
    await page.locator('[data-summary-close]').click();
    await expect(page).toHaveURL(/\?day=1&view=map$/);
    await page.locator('[data-sheet-handle]').click();
    await page.locator('[data-sheet-handle]').click();
    await page.locator('[data-view-switch] button').nth(1).click();
    await expect(page).toHaveURL(/\?day=1&view=list$/);
    await expect(page.locator('[data-phone-map]')).toHaveCount(0);
    await page.goBack();
    await expect(page.locator('[data-phone-map]')).toBeVisible();
  });

  test('attribution at every snap point; no horizontal scroll; axe (AC-11, AC-16, AC-17)', async ({ page }) => {
    await open(page);
    expect(await noHorizontalScroll(page)).toBe(true);
    await open(page, 'view=map');
    await mapReady(page);
    for (let k = 0; k < 3; k++) {
      await expect(page.locator('.leaflet-control-attribution')).toBeInViewport();
      expect(await noHorizontalScroll(page)).toBe(true);
      expect(await seriousAxe(page), `snap ${k}`).toEqual([]);
      await page.locator('[data-sheet-handle]').click();
    }
    await open(page, `view=map&sel=${baliati.i}`);
    await expect(page.locator('[data-summary-sheet]')).toBeVisible();
    expect(await seriousAxe(page)).toEqual([]);
  });

  test('Save-Data turns Lite mode on and says so (AC-14)', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' }, configurable: true }));
    const w = watchMap(page);
    await open(page, 'view=map');
    await expect(page.locator('[data-lite-auto-note]').first()).toBeVisible();
    await expect(page.locator('[data-lite-off]')).toBeVisible();
    await page.waitForTimeout(800);
    await w.settle();
    expect(w.hits).toEqual([]);
    await page.locator('[data-lite-off] button').click();
    await mapReady(page);
    expect(await page.evaluate(() => localStorage.getItem('jp-lite'))).toBe('0');
  });

  test('a slow connection suggests Lite mode (FR-36)', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: false, effectiveType: '2g' }, configurable: true }));
    await open(page);
    await expect(page.locator('[data-lite-hint]')).toBeVisible();
    await page.locator('[data-lite-hint]').getByRole('button', { name: 'Turn on Lite mode' }).click();
    await expect(page.locator('[data-lite-hint]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.dataset.lite)).toBe('1');
  });
});

// ---------------------------------------------------------------- layouts, Lite switches, mini map
test('layouts at 390, 1024, 1280 and 1440 px (AC-16)', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await open(page);
  await expect(page.locator('[data-open-map]')).toBeVisible();
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
  await page.setViewportSize({ width: 1024, height: 900 });
  await open(page);
  await expect(page.locator('[data-view-switch]')).toBeVisible();
  await expect(page.locator('[data-map-pane]')).toHaveCount(0);
  await open(page, 'view=map');
  await expect(page.locator('[data-map-pane]')).toBeVisible();
  await expect(page.locator('[data-results]')).toHaveCount(0);
  for (const width of [1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    await expect(page.locator('[data-map-pane]')).toBeVisible();
    await expect(page.locator('[data-results]')).toBeVisible();
    await expect(page.locator('aside')).toBeVisible();
  }
});

test('one map instance across switches; it follows its container (AC-18)', async ({ page }) => {
  await page.setViewportSize(PANE);
  await open(page, 'view=map');
  await mapReady(page);
  for (let k = 0; k < 10; k++) {
    await page.locator('[data-view-switch] button').nth(k % 2 === 0 ? 1 : 0).click();
  }
  await mapReady(page);
  expect(await page.locator('.leaflet-container').count()).toBe(1);
  await page.setViewportSize(DESKTOP);
  await page.waitForTimeout(300);
  await page.setViewportSize(PANE);
  await page.waitForTimeout(300);
  const sizes = await page.evaluate(() => {
    const c = document.querySelector('.leaflet-container')!.getBoundingClientRect();
    const p = document.querySelector('[data-map]')!.getBoundingClientRect();
    return [Math.round(c.width), Math.round(p.width), Math.round(c.height), Math.round(p.height)];
  });
  expect(sizes[0]).toBe(sizes[1]);
  expect(sizes[2]).toBe(sizes[3]);
});

test('the header and Explore Lite switches are one preference (AC-14)', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await open(page);
  await mapReady(page);
  const header = page.locator('header [data-lite-toggle]').first();
  const explore = page.locator('main [data-lite-toggle]');
  await header.click();
  await expect(header).toHaveAttribute('aria-checked', 'true');
  await expect(explore).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.leaflet-container')).toHaveCount(0);
  await expect(page.locator('[data-map-pane] [data-lite-off]')).toBeVisible();
  await explore.click();
  await expect(header).toHaveAttribute('aria-checked', 'false');
  await mapReady(page);
});

test('site page: mini map, Open in Explore, and Show map in Lite mode (AC-14, AC-15)', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto(`/site/${baliati.i}/${baliati.s}/`);
  await page.locator('[data-mini-map-box]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-mini-map] .leaflet-container')).toBeVisible();
  await expect(page.locator('[data-mini-map] .jp-pin')).toHaveCount(1);
  await expect(page.locator('[data-mini-map] .leaflet-control-attribution')).toBeVisible();
  expect(await seriousAxe(page)).toEqual([]);
  await page.locator('[data-open-explore]').click();
  await expect(page).toHaveURL(new RegExp(`/explore/\\?view=map&sel=${baliati.i}$`));
  await expect(page.locator(`[data-popover] [data-summary="${baliati.i}"]`)).toBeVisible();

  await page.addInitScript(() => localStorage.setItem('jp-lite', '1'));
  await page.goto(`/site/${baliati.i}/${baliati.s}/`);
  await page.locator('[data-mini-map-box]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-mini-map-box] [data-show-map]')).toBeVisible();
  await expect(page.locator('[data-mini-map] .leaflet-container')).toHaveCount(0);
  await page.locator('[data-show-map]').click();
  await expect(page.locator('[data-mini-map] .leaflet-container')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('jp-lite'))).toBe('1');
});

test.describe('without JavaScript (AC-20)', () => {
  test.use({ javaScriptEnabled: false });
  test('Explore shows the note and no map', async ({ page }) => {
    await page.goto('/explore/?view=map');
    // getByText skips <noscript>; innerText does not.
    expect(await page.locator('main').innerText()).toContain('Explore needs JavaScript');
    await expect(page.locator('.leaflet-container')).toHaveCount(0);
  });
});
