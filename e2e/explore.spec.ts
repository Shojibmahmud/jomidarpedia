// Explore tests (roadmap task 6.12, spec 06 §8). Every expected count and order is computed here from
// public/data/index.json with lib/filters.ts and lib/sort.ts, never typed (I6). Run `npm run build:local` first.

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { bestRemoval, counts, EMPTY, filter, makePlaces, type FilterState } from '../lib/filters';
import { sortSites } from '../lib/sort';
import { parse } from '../lib/urlState';
import type { District, Division, IndexSite } from '../lib/types';
import { stubTiles } from './tiles';

test.beforeEach(async ({ page }) => { await stubTiles(page); });

const index: IndexSite[] = JSON.parse(readFileSync('public/data/index.json', 'utf8'));
const divisions: Division[] = JSON.parse(readFileSync('data/build/divisions.json', 'utf8'));
const districts: District[] = JSON.parse(readFileSync('data/build/districts.json', 'utf8'));
const places = makePlaces({
  divisions: divisions.map(d => ({ slug: d.slug, en: d.en, bn: d.bn })),
  districts: districts.map(d => ({ slug: d.slug, en: d.en, bn: d.bn, divisionSlug: d.divisionSlug })),
});
const st = (o: Partial<FilterState>): FilterState => ({ ...EMPTY, ...o });
const resultCount = (f: FilterState) => filter(index, f, places).length;
const stateOf = (page: Page) => parse(new URL(page.url()).search, places).state;

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

/** Opens Explore and waits for the list. */
async function open(page: Page, query = '') {
  await page.goto(`/explore/${query ? `?${query}` : ''}`);
  await expect(page.locator('#jp-results-title[data-count]')).toBeVisible();
}
const shownCount = async (page: Page) => Number(await page.locator('#jp-results-title').getAttribute('data-count'));
const shownIds = (page: Page) => page.locator('[data-results] [data-site]').evaluateAll(els => els.map(e => e.getAttribute('data-site')));
/** The last number in a control's text: its count. */
const digits = (s: string) => Number((s.match(/[\d,]+(?![\s\S]*\d)/)?.[0] ?? '').replace(/,/g, ''));

test.describe('desktop rail', () => {
  test.use({ viewport: DESKTOP });

  const actions: [string, string, (page: Page) => Promise<void>][] = [
    ['day trip', 'day=1', p => p.locator('aside').getByRole('switch', { name: /Day trips from Dhaka/ }).click()],
    ['travel time', 'tt=2-3', p => p.locator('aside [data-tt="2-3"]').click()],
    ['condition', 'cond=in_ruins', p => p.locator('aside [data-chip="cond:in_ruins"]').click()],
    ['visiting', 'acc=ticketed', p => p.locator('aside [data-chip="acc:ticketed"]').click()],
    ['division', 'div=rajshahi', p => p.locator('aside input[data-div="rajshahi"]').click()],
    ['type', 'type=kachari', async p => { await p.getByRole('button', { name: /^More:/ }).click(); await p.locator('aside [data-chip="type:kachari"]').click(); }],
    ['well documented', 'doc=1', async p => { await p.getByRole('button', { name: /^More:/ }).click(); await p.locator('aside').getByRole('switch', { name: /Only well-documented/ }).click(); }],
    ['verified locations', 'vloc=1', async p => { await p.getByRole('button', { name: /^More:/ }).click(); await p.locator('aside').getByRole('switch', { name: /Only verified locations/ }).click(); }],
    ['photos', 'photo=1', async p => { await p.getByRole('button', { name: /^More:/ }).click(); await p.locator('aside').getByRole('switch', { name: /Has photos/ }).click(); }],
    ['opening times', 'hours=1', async p => { await p.getByRole('button', { name: /^More:/ }).click(); await p.locator('aside').getByRole('switch', { name: /Opening times known/ }).click(); }],
  ];
  for (const [name, query, act] of actions) {
    test(`${name} changes the list and the URL`, async ({ page }) => {
      await open(page);
      expect(await shownCount(page)).toBe(index.length);
      await act(page);
      await expect(page).toHaveURL(new RegExp(`\\?${query.replace('+', '\\+')}$`));
      const want = resultCount(stateOf(page));
      expect(want).toBeLessThan(index.length);
      await expect(page.locator('#jp-results-title')).toHaveAttribute('data-count', String(want));
    });
  }

  test('a district narrows its division', async ({ page }) => {
    await open(page, 'div=dhaka');
    await page.locator('aside [data-dist="manikganj"]').click();
    await expect(page).toHaveURL(/\?div=dhaka&dist=manikganj$/);
    await expect(page.locator('#jp-results-title')).toHaveAttribute('data-count', String(resultCount(st({ div: ['dhaka'], dist: ['manikganj'] }))));
  });

  test('every displayed count matches the facet counts', async ({ page }) => {
    const f = st({ day: true, cond: ['preserved', 'in_ruins'], div: ['dhaka'] });
    await open(page, 'day=1&cond=preserved,in_ruins&div=dhaka');
    const c = counts(index, f, places);
    expect(await shownCount(page)).toBe(c.total);
    const rail = page.locator('aside');
    expect(digits(await rail.getByRole('switch', { name: /Day trips/ }).innerText())).toBe(c.day);
    for (const [k, v] of Object.entries(c.tt)) expect(digits(await rail.locator(`[data-tt="${k}"]`).innerText()), `tt ${k}`).toBe(v);
    for (const [k, v] of Object.entries(c.cond)) expect(digits(await rail.locator(`[data-chip="cond:${k}"]`).innerText()), `cond ${k}`).toBe(v);
    for (const [k, v] of Object.entries(c.acc)) expect(digits(await rail.locator(`[data-chip="acc:${k}"]`).innerText()), `acc ${k}`).toBe(v);
    for (const d of divisions) {
      expect(digits(await rail.locator(`label:has(input[data-div="${d.slug}"])`).innerText()), `div ${d.slug}`).toBe(c.div[d.slug]);
    }
    for (const d of districts.filter(x => x.divisionSlug === 'dhaka')) {
      expect(digits(await rail.locator(`[data-dist="${d.slug}"]`).innerText()), `dist ${d.slug}`).toBe(c.dist[d.slug]);
    }
    await page.getByRole('button', { name: /^More:/ }).click();
    for (const [k, v] of Object.entries(c.type)) expect(digits(await rail.locator(`[data-chip="type:${k}"]`).innerText()), `type ${k}`).toBe(v);
    expect(digits(await rail.getByRole('switch', { name: /Only well-documented/ }).innerText())).toBe(c.doc);
    expect(digits(await rail.getByRole('switch', { name: /Only verified/ }).innerText())).toBe(c.vloc);
    expect(digits(await rail.getByRole('switch', { name: /Has photos/ }).innerText())).toBe(c.photo);
    expect(digits(await rail.getByRole('switch', { name: /Opening times/ }).innerText())).toBe(c.hours);
  });

  test('sort orders the list and is kept in the URL', async ({ page }) => {
    await open(page, 'day=1');
    const f = st({ day: true });
    expect(await shownIds(page)).toEqual(sortSites(filter(index, f, places), 'time', 'en').slice(0, 24).map(s => s.i));
    for (const sort of ['name', 'district'] as const) {
      await page.locator(`[data-sort="${sort}"]`).click();
      await expect(page).toHaveURL(new RegExp(`\\?day=1&sort=${sort}$`));
      await expect.poll(() => shownIds(page)).toEqual(sortSites(filter(index, f, places), sort, 'en').slice(0, 24).map(s => s.i));
    }
  });

  test('an invalid query shows the notice and is rewritten without a new history entry', async ({ page }) => {
    await page.goto('/');
    await open(page, 'cond=ruins,lost&dist=sylhet&div=dhaka&colour=red');
    await expect(page).toHaveURL(/\/explore\/\?cond=lost&div=dhaka$/);
    await expect(page.locator('[data-notice]')).toBeVisible();
    await page.locator('[data-notice] button').click();
    await expect(page.locator('[data-notice]')).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
  });

  test('Back and Forward restore filters, loaded rows and scroll position', async ({ page }) => {
    await open(page);
    await page.locator('aside [data-chip="cond:in_ruins"]').click();
    await expect(page).toHaveURL(/\?cond=in_ruins$/);
    await page.locator('aside').getByRole('switch', { name: /Day trips/ }).click();
    await expect(page).toHaveURL(/\?day=1&cond=in_ruins$/);
    await page.getByRole('button', { name: 'Load more' }).click();
    await expect(page.locator('[data-result-index]')).toHaveCount(48);
    await page.evaluate(() => window.scrollTo(0, 2000));
    await page.waitForTimeout(400); // the scroll position is saved after 200 ms
    await page.goBack();
    await expect(page).toHaveURL(/\?cond=in_ruins$/);
    await expect(page.locator('#jp-results-title')).toHaveAttribute('data-count', String(resultCount(st({ cond: ['in_ruins'] }))));
    await expect(page.locator('[data-result-index]')).toHaveCount(24);
    await page.goForward();
    await expect(page).toHaveURL(/\?day=1&cond=in_ruins$/);
    await expect(page.locator('[data-result-index]')).toHaveCount(48);
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(2000);
  });

  test('a site page and Back restore the view', async ({ page }) => {
    await open(page, 'cond=in_ruins');
    await page.getByRole('button', { name: 'Load more' }).click();
    await expect(page.locator('[data-result-index]')).toHaveCount(48);
    const link = page.locator('[data-result-index="30"] a');
    await link.scrollIntoViewIfNeeded();
    const y = await page.evaluate(() => Math.round(window.scrollY));
    await link.click();
    await expect(page).toHaveURL(/\/site\//);
    await page.goBack();
    await expect(page).toHaveURL(/\/explore\/\?cond=in_ruins$/);
    await expect(page.locator('[data-result-index]')).toHaveCount(48);
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(y);
  });

  test('Load more moves focus to the first new card', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Load more' }).click();
    await expect(page.locator('[data-result-index="24"] a')).toBeFocused();
    await expect(page.locator('[data-showing]')).toContainText(`Showing 48 of ${index.length}`);
  });

  test('Copy link reproduces the same view', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page, 'day=1&acc=restricted_or_permission&sort=name');
    await page.getByRole('button', { name: 'Copy link to this view' }).click();
    await expect(page.locator('section [role="status"]').filter({ hasText: 'Link copied' })).toBeVisible();
    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toMatch(/^http:\/\/localhost:\d+\/explore\/\?day=1&acc=restricted_or_permission&sort=name$/);
    const ids = await shownIds(page);
    const other = await context.newPage();
    await other.goto(url);
    await expect(other.locator('#jp-results-title[data-count]')).toBeVisible();
    expect(await shownIds(other)).toEqual(ids);
  });

  test('an empty result names the filter to remove, and removing it brings those sites back', async ({ page }) => {
    const f = st({ day: true, tt: 'unknown', cond: ['lost'] });
    expect(resultCount(f)).toBe(0);
    const best = bestRemoval(index, f, places)!;
    await open(page, 'day=1&tt=unknown&cond=lost');
    const suggest = page.locator('[data-empty] [data-suggest]');
    await expect(suggest).toHaveAttribute('data-suggest', best.group);
    await expect(suggest).toContainText(String(best.count));
    await suggest.click();
    await expect(page.locator('#jp-results-title')).toHaveAttribute('data-count', String(best.count));
  });

  test('every rail control works from the keyboard', async ({ page }) => {
    await open(page);
    const day = page.locator('aside').getByRole('switch', { name: /Day trips/ });
    for (let k = 0; k < 40 && !(await day.evaluate(el => el === document.activeElement)); k++) await page.keyboard.press('Tab');
    await expect(day).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page).toHaveURL(/\?day=1$/);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // the 0–1 h segment
    await expect(page).toHaveURL(/\?day=1&tt=0-1$/);
    const ruins = page.locator('aside [data-chip="cond:in_ruins"]');
    await ruins.focus();
    await page.keyboard.press('Enter');
    await expect(ruins).toHaveAttribute('aria-pressed', 'true');
    const division = page.locator('aside input[data-div="khulna"]');
    await division.focus();
    await page.keyboard.press('Space');
    await expect(page).toHaveURL(/div=khulna/);
  });

  // Phase 7 shows the map at this width; map loading is tested in map.spec.ts (spec 07 AC-1).
  test('the page fetches only index.json for data, and no tiles in Lite mode (R7)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('jp-lite', '1'));
    const urls: string[] = [];
    page.on('request', r => urls.push(r.url()));
    await open(page);
    expect(urls.filter(u => /tile|basemap/i.test(u))).toEqual([]);
    expect(urls.filter(u => u.includes('/data/'))).toEqual([expect.stringMatching(/\/data\/index\.json$/)]);
  });

  test('Bangla mode shows Bangla digits and names', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('jp-lang', 'bn'));
    await open(page, 'sort=name');
    const title = await page.locator('#jp-results-title').innerText();
    expect(title).toMatch(/[০-৯]/);
    expect(title).not.toMatch(/[0-9]/);
    const first = sortSites(index, 'name', 'bn')[0];
    await expect(page.locator('[data-result-index="0"] [data-site]')).toHaveAttribute('data-site', first.i);
  });
});

test.describe('mobile drawer', () => {
  test.use({ viewport: PHONE });

  async function openDrawer(page: Page) {
    await page.locator('[data-open-filters]').click();
    await expect(page.locator('dialog[open]')).toBeVisible();
  }

  test('a draft is discarded by Esc, X and the backdrop; Show applies it', async ({ page }) => {
    await open(page);
    const discards: [string, (p: Page) => Promise<void>][] = [
      ['Esc', p => p.keyboard.press('Escape')],
      ['X', p => p.locator('[data-drawer-close]').click()],
      ['backdrop', p => p.mouse.click(200, 8)],
    ];
    for (const [name, discard] of discards) {
      await openDrawer(page);
      await page.locator('dialog [data-chip="cond:lost"]').click();
      await expect(page.locator('[data-drawer-show]')).toContainText(`Show ${resultCount(st({ cond: ['lost'] }))} site`);
      await discard(page);
      await expect(page.locator('dialog[open]'), name).toHaveCount(0);
      await expect(page, name).toHaveURL(/\/explore\/$/);
      await expect(page.locator('[data-open-filters]'), name).toBeFocused();
    }
    await openDrawer(page);
    await expect(page.locator('dialog [data-chip="cond:lost"]')).toHaveAttribute('aria-pressed', 'false'); // the draft restarted
    await page.locator('dialog').getByRole('switch', { name: /Day trips/ }).click();
    await page.locator('dialog [data-chip="cond:in_ruins"]').click();
    await page.locator('[data-drawer-show]').click();
    await expect(page).toHaveURL(/\?day=1&cond=in_ruins$/);
    await expect(page.locator('#jp-results-title')).toHaveAttribute('data-count', String(resultCount(st({ day: true, cond: ['in_ruins'] }))));
    await expect(page.locator('[data-active-count]')).toHaveAttribute('data-active-count', '2');
    await page.goBack();
    await expect(page).toHaveURL(/\/explore\/$/);
  });

  test('"Clear all" in the drawer clears the draft only', async ({ page }) => {
    await open(page, 'cond=lost');
    await openDrawer(page);
    await page.locator('dialog').getByRole('button', { name: 'Clear all' }).click();
    await expect(page.locator('[data-drawer-show]')).toContainText(`Show ${index.length} sites`);
    await expect(page).toHaveURL(/\?cond=lost$/);
  });

  test('focus stays in the drawer', async ({ page }) => {
    await open(page);
    await openDrawer(page);
    for (let k = 0; k < 80; k++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
    }
    for (let k = 0; k < 5; k++) {
      await page.keyboard.press('Shift+Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
    }
  });

  test('no horizontal scroll at 390 px, with or without filters', async ({ page }) => {
    for (const q of ['', 'day=1&cond=preserved,in_ruins&div=dhaka&dist=manikganj&type=house&photo=1']) {
      await open(page, q);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    }
  });
});

test.describe('axe (NFR-1)', () => {
  const check = async (page: Page) => {
    const { violations } = await new AxeBuilder({ page }).analyze();
    const bad = violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
  };
  for (const scheme of ['light', 'dark'] as const) {
    test(`no serious or critical issues, default and filtered (${scheme})`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await page.emulateMedia({ colorScheme: scheme });
      await open(page);
      await check(page);
      await open(page, 'day=1&cond=in_ruins&div=dhaka&dist=manikganj&type=house&doc=1');
      await check(page);
      await open(page, 'day=1&tt=unknown');
      await check(page);
    });
    test(`no serious or critical issues with the drawer open (${scheme})`, async ({ page }) => {
      await page.setViewportSize(PHONE);
      await page.emulateMedia({ colorScheme: scheme });
      await open(page, 'cond=lost');
      await page.locator('[data-open-filters]').click();
      await expect(page.locator('dialog[open]')).toBeVisible();
      await check(page);
    });
  }
});
