// Search tests (roadmap task 8.5, spec 08 §8). Expected results are computed here from public/data/index.json
// with lib/search.ts and lib/filters.ts, never typed (I6). Run `npm run build:local` first.

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from './fixtures';
import { readdirSync, readFileSync } from 'node:fs';
import Fuse from 'fuse.js';
import { EMPTY, filter, makePlaces } from '../lib/filters';
import { createMatcher, searchAll, type SearchDistrict, type SearchResult } from '../lib/search';
import { siteHref } from '../lib/site-url';
import type { District, Division, IndexSite } from '../lib/types';
import { stubTiles } from './tiles';

test.beforeEach(async ({ page }) => { await stubTiles(page); });

const index: IndexSite[] = JSON.parse(readFileSync('public/data/index.json', 'utf8'));
const divisions: Division[] = JSON.parse(readFileSync('data/build/divisions.json', 'utf8'));
const districtRows: District[] = JSON.parse(readFileSync('data/build/districts.json', 'utf8'));
const districts: SearchDistrict[] = districtRows.map(d => ({ slug: d.slug, en: d.en, bn: d.bn, divisionSlug: d.divisionSlug, count: d.count }));
const places = makePlaces({
  divisions: divisions.map(d => ({ slug: d.slug, en: d.en, bn: d.bn })),
  districts: districtRows.map(d => ({ slug: d.slug, en: d.en, bn: d.bn, divisionSlug: d.divisionSlug })),
});
const m = createMatcher(index, Fuse);

/** The Fuse.js chunk of this build: the one holding Fuse's own error text. */
const CHUNKS = 'out/_next/static/chunks';
const FUSE_CHUNK = readdirSync(CHUNKS).find(f => f.endsWith('.js') && readFileSync(`${CHUNKS}/${f}`, 'utf8').includes('Pattern length exceeds max'))!;
const isFuse = (url: string) => url.includes(FUSE_CHUNK);

const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const announced = (r: SearchResult) => (r.sites.length + r.families.length + r.districts.length === 0 ? 'No matches'
  : [plural(r.sites.length, 'site', 'sites'), plural(r.families.length, 'family', 'families'), plural(r.districts.length, 'district', 'districts')].join(', '));

const seriousAxe = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`);
};

async function openOverlay(page: Page, path = '/') {
  await page.goto(path);
  const button = page.locator('[data-search-open]');
  await expect(button).toBeVisible();
  await button.focus();
  await page.keyboard.press('Enter');
  const box = page.locator('[data-search-overlay] [role="combobox"]');
  await expect(box).toBeFocused();
  return box;
}

/** Opens /search/ and waits for results, or for the help when there is no query. */
async function openSearch(page: Page, query: string) {
  await page.goto(`/search/${query ? `?${query}` : ''}`);
  await expect(page.locator('[data-tab], [data-search-empty], [data-search-help], [data-family-title], #jp-family-title').first()).toBeVisible();
}

test.describe('header overlay (FR-14 to FR-19)', () => {
  test.use({ viewport: DESKTOP });

  test('keyboard only: open, type, hear the counts, move through options, open a site', async ({ page }) => {
    const box = await openOverlay(page);
    await expect(box).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.type('teota');
    const r = searchAll(m, districts, 'teota');
    await expect(page.locator('[data-search-announce]')).toHaveText(announced(r));
    await expect(box).toHaveAttribute('aria-expanded', 'true');
    await expect(box).not.toHaveAttribute('aria-activedescendant');
    const options = page.locator('[data-search-overlay] [role="option"]');
    const n = await options.count();
    expect(n).toBe(Math.min(r.sites.length, 5) + Math.min(r.families.length, 3) + Math.min(r.districts.length, 3) + 1);
    // ↓ moves through every option across the groups and wraps; ↑ goes back.
    for (let k = 0; k < n; k++) {
      await page.keyboard.press('ArrowDown');
      const id = await options.nth(k).getAttribute('id');
      await expect(box).toHaveAttribute('aria-activedescendant', id!);
      await expect(options.nth(k)).toHaveAttribute('aria-selected', 'true');
    }
    await page.keyboard.press('ArrowDown');
    await expect(box).toHaveAttribute('aria-activedescendant', (await options.first().getAttribute('id'))!);
    await page.keyboard.press('Enter');
    const teota = r.sites[0].site;
    await expect(page).toHaveURL(new RegExp(`${siteHref(teota.i, teota.s)}$`));
  });

  test('Esc clears the text, a second Esc closes, and focus is back on the icon', async ({ page }) => {
    const box = await openOverlay(page);
    await page.keyboard.type('saha');
    await expect(page.locator('[data-search-overlay] [role="listbox"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(box).toHaveValue('');
    await expect(box).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-search-overlay]')).not.toBeVisible();
    await expect(page.locator('[data-search-open]')).toBeFocused();
  });

  test('Enter with no option active, and "See all results", go to /search/', async ({ page }) => {
    await openOverlay(page);
    await page.keyboard.type('saha');
    await expect(page.locator('[data-option="all"]')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/search\/\?q=saha$/);
  });

  test('Fuse.js loads only when a search box is used, and index.json at most once per page (AC-11)', async ({ page }) => {
    const urls: string[] = [];
    page.on('request', r => urls.push(r.url()));
    for (const path of ['/', siteHref(index[0].i, index[0].s), '/explore/']) {
      urls.length = 0;
      await page.goto(path);
      await expect(page.locator('[data-search-open]')).toBeVisible();
      if (path === '/explore/') await expect(page.locator('#jp-results-title[data-count]')).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(urls.filter(isFuse), path).toEqual([]);
    }
    // Explore has the index; opening the overlay adds Fuse.js once and no second index.json.
    urls.length = 0;
    await page.locator('[data-search-open]').click();
    await expect(page.locator('[data-search-overlay] [role="combobox"]')).toBeFocused();
    await page.keyboard.type('teota');
    await expect(page.locator('[data-search-overlay] [role="option"]').first()).toBeVisible();
    expect(urls.filter(isFuse)).toHaveLength(1);
    expect(urls.filter(u => u.endsWith('/data/index.json'))).toEqual([]);
  });

  test('axe: no serious or critical issues with the overlay open', async ({ page }) => {
    await openOverlay(page);
    await page.keyboard.type('chowdhury');
    await expect(page.locator('[data-search-overlay] [role="option"]').first()).toBeVisible();
    expect(await seriousAxe(page)).toEqual([]);
  });

  test('without JavaScript the icon is a link to /search/, which says it needs JavaScript (A-6)', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('header a[href="/search/"]')).toBeVisible();
    await page.goto('/search/');
    await expect(page.locator('[data-search-noscript]')).toBeVisible();
    await expect(page.locator('[data-search-noscript] a[href="/explore/"]')).toBeVisible();
    await context.close();
  });
});

test.describe('/search/ page (FR-20 to FR-27)', () => {
  test.use({ viewport: DESKTOP });

  test('variant spellings: the "Searching as" note, group counts and paging (AC-8)', async ({ page }) => {
    const q = 'jamidar badi choudhury';
    const r = searchAll(m, districts, q);
    await openSearch(page, `q=${encodeURIComponent(q)}`);
    await expect(page.locator('[data-searching-as]')).toContainText('zamindar bari chowdhury');
    for (const [tab, n] of [['all', r.sites.length + r.families.length + r.districts.length], ['sites', r.sites.length], ['families', r.families.length], ['districts', r.districts.length]] as const) {
      await expect(page.locator(`[data-tab="${tab}"] [data-tab-count]`), tab).toHaveAttribute('data-tab-count', String(n));
    }
    await expect(page.locator('[data-search-sites] [data-site]')).toHaveCount(5);
    expect(await page.locator('[data-search-sites] [data-site]').evaluateAll(els => els.map(e => e.getAttribute('data-site')))).toEqual(r.sites.slice(0, 5).map(h => h.site.i));
    await expect(page).toHaveTitle(`Search: ${q} · Jomidarpedia`);
    await page.locator('[data-more-sites]').click();
    await expect(page).toHaveURL(/in=sites$/);
    await expect(page.locator('[data-search-sites] [data-site]')).toHaveCount(Math.min(20, r.sites.length));
    await page.locator('[data-more]').click();
    const loaded = Math.min(40, r.sites.length);
    await expect(page.locator('[data-search-sites] [data-site]')).toHaveCount(loaded);
    // A site and Back: the tab and the loaded rows are restored.
    await page.locator('[data-search-sites] [data-site] a').nth(loaded - 1).click();
    await expect(page).toHaveURL(/\/site\//);
    await page.goBack();
    await expect(page).toHaveURL(/in=sites$/);
    await expect(page.locator('[data-search-sites] [data-site]')).toHaveCount(loaded);
    await page.goBack();
    await expect(page.locator('[data-tab="all"]')).toHaveAttribute('aria-selected', 'true');
  });

  test('typing submits after a pause, one history entry per query (A-7)', async ({ page }) => {
    await openSearch(page, '');
    await page.locator('#jp-search-input').pressSequentially('teota', { delay: 40 });
    await expect(page).toHaveURL(/\?q=teota$/);
    await page.locator('#jp-search-input').fill('saha');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\?q=saha$/);
    await page.goBack();
    await expect(page).toHaveURL(/\?q=teota$/);
    await expect(page.locator('#jp-search-input')).toHaveValue('teota');
  });

  test('Did you mean, and "exactly instead" (AC-5)', async ({ page }) => {
    const r = searchAll(m, districts, 'baliyati');
    await openSearch(page, 'q=baliyati');
    await expect(page.locator('[data-did-you-mean]')).toHaveAttribute('data-did-you-mean', r.corrected!);
    await expect(page.locator('[data-search-sites] [data-site]').first()).toHaveAttribute('data-site', r.sites[0].site.i);
    await page.locator('[data-exact-instead]').click();
    await expect(page).toHaveURL(/\?q=baliyati&exact=1$/);
    await expect(page.locator('[data-search-empty]')).toBeVisible();
    await page.goBack();
    await expect(page.locator('[data-did-you-mean]')).toBeVisible();
  });

  test('a family card lists exactly the sites naming it (AC-4)', async ({ page }) => {
    const roy = m.search('chowdhury').families.find(f => f.key === 'roy chowdhury')!;
    const naming = m.search(roy.phrase, { field: 'family' }).sites;
    await openSearch(page, 'q=chowdhury');
    await page.locator('[data-family="roy chowdhury"]').click();
    await expect(page).toHaveURL(new RegExp(`\\?q=${encodeURIComponent(roy.phrase)}&field=family$`));
    await expect(page.locator('#jp-family-title')).toBeVisible();
    await expect(page.locator('[data-tab]')).toHaveCount(0);
    await expect(page.locator('[data-showing]')).toContainText(`of ${naming.length}`);
    await expect(page.locator('[data-search-sites] [data-site]')).toHaveCount(Math.min(20, naming.length));
  });

  // Until Phase 10 a district led to Explore filtered to it (AC-3); it now leads to its district page (spec 10 FR-63).
  test('a district leads to its district page, which lists its sites (AC-3, spec 10 FR-63)', async ({ page }) => {
    const manikganj = districts.find(d => d.slug === 'manikganj')!;
    await openSearch(page, 'q=manikganj');
    await page.locator('[data-district="manikganj"]').click();
    await expect(page).toHaveURL(/\/district\/manikganj\/$/);
    const want = filter(index, { ...EMPTY, div: [manikganj.divisionSlug], dist: ['manikganj'] }, places).length;
    expect(want).toBe(manikganj.count);
    await expect(page.locator('[data-district-sites] > li')).toHaveCount(want);
  });

  test('the empty state and the help page (AC-9)', async ({ page }) => {
    await openSearch(page, 'q=lalbagh%20kella');
    const empty = page.locator('[data-search-empty]');
    await expect(empty).toContainText('Nothing matches “lalbagh kella”');
    await expect(empty.locator('a[href="/explore/"]')).toContainText(String(index.length));
    await page.locator('[data-search-lang]').click();
    await expect(page.locator('html')).toHaveAttribute('data-lang', 'bn');
    await expect(page).toHaveURL(/\?q=lalbagh%20kella$/);
    await page.locator('[data-search-lang]').click();
    const example = page.locator('[data-search-empty] [data-examples] a').first();
    const q = (await example.textContent())!;
    await example.click();
    await expect(page).toHaveURL(new RegExp(`\\?q=${encodeURIComponent(q)}$`));
    await expect(page.locator('[data-search-sites] [data-site]').first()).toBeVisible();
    await openSearch(page, '');
    await expect(page.locator('[data-search-help] [data-examples] a')).toHaveCount(3);
    await expect(page.locator('#jp-search-input')).toBeFocused();
  });

  test('an unknown key or value is dropped with the notice', async ({ page }) => {
    await openSearch(page, 'q=saha&in=trips&foo=1');
    await expect(page).toHaveURL(/\?q=saha$/);
    await expect(page.locator('[data-notice]')).toBeVisible();
  });

  test('Bangla mode: Bangla digits in the group counts (AC-13)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('jp-lang', 'bn'));
    await openSearch(page, 'q=chowdhury');
    const count = page.locator('[data-tab="sites"] [data-tab-count] [data-l="bn"]');
    await expect(count).toBeVisible();
    expect(await count.textContent()).toMatch(/^[০-৯,]+$/);
    await expect(page.locator('[data-tab="sites"]')).toContainText('বাড়ি');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`axe: results, Did you mean and empty, ${theme} (AC-14)`, async ({ page }) => {
      await page.addInitScript(t => localStorage.setItem('jp-theme', t), theme);
      for (const query of ['q=chowdhury', 'q=baliyati', 'q=lalbagh%20kella', '']) {
        await openSearch(page, query);
        expect(await seriousAxe(page), query).toEqual([]);
      }
    });
  }

  test('Fuse.js failing to load shows the error with Retry (AC-15)', async ({ page }) => {
    let block = true;
    await page.route(`**/${FUSE_CHUNK}`, r => (block ? r.abort() : r.continue()));
    await page.goto('/search/?q=saha');
    await expect(page.locator('[data-search-error]')).toBeVisible();
    block = false;
    await page.locator('[data-search-error] button').click();
    await expect(page.locator('[data-search-sites] [data-site]').first()).toBeVisible();
  });
});

test.describe('Explore q (FR-28 to FR-31, AC-10)', () => {
  test.use({ viewport: DESKTOP });
  const dayTrips = filter(index, { ...EMPTY, day: true }, places);
  const saha = m.match('saha');
  const want = dayTrips.filter(s => saha.has(s.i));

  test('typing narrows the list and the map; the chip removes it; Back restores', async ({ page }) => {
    await page.goto('/explore/?day=1');
    await expect(page.locator('#jp-results-title')).toHaveAttribute('data-count', String(dayTrips.length));
    await page.locator('#jp-search-within').pressSequentially('saha', { delay: 40 });
    await expect(page).toHaveURL(/\?day=1&q=saha$/);
    await expect(page.locator('#jp-results-title')).toHaveAttribute('data-count', String(want.length));
    await expect(page.locator('[data-map-bar]')).toHaveAttribute('data-on-map', String(want.filter(s => s.ll).length));
    await expect(page.locator('[data-results] mark').first()).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\?day=1$/);
    await expect(page.locator('#jp-results-title')).toHaveAttribute('data-count', String(dayTrips.length));
    await page.goForward();
    await expect(page.locator('#jp-results-title')).toHaveAttribute('data-count', String(want.length));
    await page.locator('[data-active="q"]').click();
    await expect(page).toHaveURL(/\?day=1$/);
    await expect(page.locator('#jp-search-within')).toHaveValue('');
  });

  test('a query that excludes the selected site drops sel with no notice', async ({ page }) => {
    const other = dayTrips.find(s => s.ll && !saha.has(s.i))!;
    await page.goto(`/explore/?day=1&sel=${other.i}`);
    await expect(page.locator('[data-summary]').or(page.locator('[role="dialog"]')).first()).toBeVisible();
    await page.locator('#jp-search-within').fill('saha');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\?day=1&q=saha$/);
    await expect(page.locator('[data-notice]')).toHaveCount(0);
  });

  test('no results names the search as a cause', async ({ page }) => {
    await page.goto('/explore/?q=lalbagh%20kella');
    await expect(page.locator('[data-suggest="q"]')).toBeVisible();
    await page.locator('[data-suggest="q"]').click();
    await expect(page.locator('#jp-results-title')).toHaveAttribute('data-count', String(index.length));
  });

  test('if Fuse.js fails, the filters still work without q (NFR-4)', async ({ page }) => {
    await page.route(`**/${FUSE_CHUNK}`, r => r.abort());
    await page.goto('/explore/?day=1&q=saha');
    await expect(page.locator('[data-search-error]').first()).toBeVisible();
    await expect(page.locator('#jp-results-title')).toHaveAttribute('data-count', String(dayTrips.length));
  });

  test('axe: no serious or critical issues with a query', async ({ page }) => {
    await page.goto('/explore/?q=saha');
    await expect(page.locator('#jp-results-title[data-count]')).toBeVisible();
    expect(await seriousAxe(page)).toEqual([]);
  });
});

test.describe('phone (AC-17)', () => {
  test.use({ viewport: PHONE });

  test('no horizontal scroll on /search/ or in the overlay', async ({ page }) => {
    for (const query of ['q=jamidar%20badi%20choudhury', 'q=baliyati', 'q=lalbagh%20kella']) {
      await openSearch(page, query);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), query).toBe(true);
    }
    await openOverlay(page);
    await page.keyboard.type('chowdhury');
    await expect(page.locator('[data-search-overlay] [role="option"]').first()).toBeVisible();
    expect(await page.evaluate(() => {
      const d = document.querySelector('[data-search-overlay]')!;
      return d.scrollWidth <= d.clientWidth;
    })).toBe(true);
  });

  test('the Explore box is above the list on phones', async ({ page }) => {
    await page.goto('/explore/');
    await page.locator('#jp-search-within-list').fill('teota');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\?q=teota$/);
    await expect(page.locator('#jp-results-title')).toHaveAttribute('data-count', String(m.match('teota').size));
  });
});
