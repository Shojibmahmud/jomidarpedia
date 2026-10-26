// Phase 10 page tests (spec .claude/specs/10-Areas-sources-about-and-system-states.md AC-1, AC-3 to AC-5, AC-7 to
// AC-10, AC-12 to AC-19, AC-21). Expected names and counts come from the built data, never typed (I6).

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Response } from './fixtures';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import type { Credit, District, Division, IndexSite, Meta, SourceEntry } from '../lib/types';
import { stubTiles, TILE } from './tiles';

test.beforeEach(async ({ page }) => { await stubTiles(page); });

const json = <T>(f: string): T => JSON.parse(readFileSync(f, 'utf8'));
const index = json<IndexSite[]>('public/data/index.json');
const divisions = json<Division[]>('data/build/divisions.json');
const districts = json<District[]>('data/build/districts.json');
const sources = json<SourceEntry[]>('data/build/sources.json');
const credits = json<Credit[]>('data/build/credits.json');
const meta = json<Meta>('data/build/meta.json');
const trips = json<{ id: string; district: string; division: string }[]>('data/build/trips.json');
const html = (path: string) => readFileSync(join('out', path, 'index.html'), 'utf8');
const dhaka = divisions.find(d => d.slug === 'dhaka')!;
const manikganj = districts.find(d => d.slug === 'manikganj')!;
const noMapDistrict = districts.find(d => d.onMap === 0);
const noTripDistrict = districts.find(d => d.tripCount === 0);
const projectFile = sources.find(s => s.projectFile)!;
const baliati = index.find(s => s.i === 'JB-DHK-064')!;
const DESKTOP = { width: 1440, height: 900 };

/** Records any script or stylesheet carrying Leaflet or Fuse.js, and any tile request. */
function watchHeavy(page: Page) {
  const hits: string[] = [];
  const pending: Promise<void>[] = [];
  page.on('request', r => { if (TILE.test(r.url())) hits.push(r.url()); });
  page.on('response', (r: Response) => {
    if (!/\.(js|css)(\?|$)/.test(r.url())) return;
    pending.push(r.text().then(t => { if (t.includes('leaflet-container') || t.includes('Pattern length exceeds max')) hits.push(r.url()); }, () => {}));
  });
  return { hits, settle: () => Promise.all(pending) };
}

test.describe('static export (AC-1, AC-19, AC-20)', () => {
  test('every Phase 10 route exists, with one <h1>', () => {
    expect(readdirSync('out/division').sort()).toEqual(divisions.map(d => d.slug).sort());
    expect(readdirSync('out/district').sort()).toEqual(districts.map(d => d.slug).sort());
    for (const s of sources) expect(existsSync(`out/sources/${s.id}/index.html`), s.id).toBe(true);
    const pages = ['/about/', '/credits/', '/sources/', ...divisions.map(d => `/division/${d.slug}/`), ...districts.map(d => `/district/${d.slug}/`), `/sources/${sources[0].id}/`];
    for (const p of pages) expect(html(p).match(/<h1[\s>]/g), p).toHaveLength(1);
    expect(readFileSync('out/404.html', 'utf8').match(/<h1[\s>]/g)).toHaveLength(1);
  });

  test('every internal link on the new pages resolves', () => {
    const pages = ['/about/', '/credits/', '/sources/', ...divisions.map(d => `/division/${d.slug}/`), ...districts.map(d => `/district/${d.slug}/`), ...sources.slice(0, 50).map(s => `/sources/${s.id}/`), '/sources/SRC-0001/'];
    const missing = new Set<string>();
    for (const p of pages) for (const m of html(p).matchAll(/href="(\/[^"#?]*)/g)) {
      const target = m[1];
      if (/^\/(_next|thumbs|maps|data)\//.test(target) || /\.(svg|png|webp|ico|json|css|js)$/.test(target)) continue;
      if (!existsSync(join('out', target, 'index.html')) && !existsSync(join('out', target))) missing.add(`${p} → ${target}`);
    }
    expect([...missing]).toEqual([]);
  });

  test('every coordinate pair on an area page is a mappable site\'s pin (NFR-5)', () => {
    // The district list's cards carry their sites' pins; nothing else may appear, and a hidden site has none.
    const pins = new Set(index.filter(s => s.ll).map(s => `${s.ll![0]},${s.ll![1]}`));
    for (const d of [...divisions.map(x => `/division/${x.slug}/`), ...districts.map(x => `/district/${x.slug}/`)]) {
      const page = html(d).replace(/<svg[\s\S]*?<\/svg>/g, ''); // the inlined maps: only mappable pins (unit tests)
      for (const m of page.matchAll(/(2[0-6]\.\d{3,})\s*,\s*((?:8[89]|9[0-2])\.\d{3,})/g)) expect(pins.has(`${m[1]},${m[2]}`), `${d}: ${m[0]}`).toBe(true);
    }
  });

  test('/sources/ and /credits/ stay under their recorded size budgets (NFR-3)', () => {
    const gz = (p: string) => gzipSync(readFileSync(join('out', p, 'index.html'))).length;
    // Budgets recorded in docs/DATA_CONTRACT.md (25 Oct 2026: sources 55 KB, credits 126 KB gzipped).
    const warn = (p: string, kb: number) => {
      const size = gz(p) / 1024;
      if (size > kb) console.warn(`${p} is ${size.toFixed(0)} KB gzipped, over the ${kb} KB budget`);
      expect(size, p).toBeLessThan(kb * 1.5);
    };
    warn('/sources/', 70);
    warn('/credits/', 150);
  });
});

test.describe('division page (AC-3)', () => {
  test('Dhaka: intro from counts, condition legend, location tiles, districts, trips and the no-pin list', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/division/dhaka/');
    await expect(page.locator('h1')).toContainText('Dhaka Division');
    await expect(page.locator('[data-area-intro]')).toHaveText(`${dhaka.count} sites in ${dhaka.districts.length} districts. ${dhaka.dayTrip} can be visited in a day from Dhaka.`, { useInnerText: true });
    await expect(page.locator('[data-on-map]')).toHaveText(`${dhaka.onMap} of ${dhaka.count} on the map`, { useInnerText: true });
    for (const [c, n] of Object.entries(dhaka.conditions)) {
      if (n) await expect(page.locator(`[data-condition="${c}"]`)).toContainText(String(n));
      else await expect(page.locator(`[data-condition="${c}"]`)).toHaveCount(0);
    }
    for (const [k, n] of Object.entries(dhaka.locations)) await expect(page.locator(`[data-location-tile="${k}"]`)).toContainText(String(n));
    const rows = page.locator('[data-district]');
    await expect(rows).toHaveCount(dhaka.districts.length);
    const order = [...dhaka.districts].sort((a, b) => b.count - a.count || a.en.localeCompare(b.en, 'en'));
    await expect(rows.first()).toHaveAttribute('href', `/district/${order[0].slug}/`);
    const cards = page.locator('[data-area-trips] [data-trip]');
    expect(await cards.count()).toBeLessThanOrEqual(4);
    await expect(page.locator('[data-all-trips]')).toHaveAttribute('href', '/trips/?div=dhaka');
    await expect(page.locator('[data-filter-explore]')).toHaveAttribute('href', '/explore/?div=dhaka');
    const list = page.locator('[data-nopin-list]');
    await expect(list.locator('> ul > li')).toHaveCount(5);
    await list.locator('[data-nopin-more] summary').click();
    await expect(list.locator('li')).toHaveCount(dhaka.noPin.length);
    await expect(list.locator('[data-nopin-tell]')).toHaveAttribute('href', /page_url=/);
  });
});

test.describe('district page (AC-4, AC-5)', () => {
  test('Manikganj: numbered cards in list order, pins to match, chips filter in the browser', async ({ page }) => {
    await page.goto('/district/manikganj/');
    const items = page.locator('[data-district-sites] > li');
    await expect(items).toHaveCount(manikganj.count);
    for (const [k, id] of manikganj.siteIds.entries()) {
      await expect(items.nth(k).locator('[data-site]')).toHaveAttribute('data-site', id);
      await expect(items.nth(k)).toHaveAttribute('data-site-n', String(k + 1));
      if (index.find(s => s.i === id)!.ll) await expect(page.locator(`[data-map-teaser] g[data-site-id="${id}"]`)).toHaveAttribute('data-n', String(k + 1));
    }
    const open = page.locator('[data-chip="open"]');
    if (await open.count()) {
      await open.click();
      const visible = manikganj.siteIds.filter(id => ['ticketed', 'open_no_ticket_reported'].includes(index.find(s => s.i === id)!.ac));
      await expect(page.locator('[data-district-sites] > li:not([hidden])')).toHaveCount(visible.length);
    }
    await expect(page.locator('[data-breadcrumb] [data-crumb="division"]')).toHaveAttribute('href', '/division/dhaka/');
  });

  test('without JavaScript every card shows and there are no chips', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/district/manikganj/');
    await expect(page.locator('[data-district-sites] > li:not([hidden])')).toHaveCount(manikganj.count);
    await expect(page.locator('[data-district-chips]')).toHaveCount(0);
    await context.close();
  });

  test('a district with no pins has a note and no map; one with no trips has no trips row', async ({ page }) => {
    test.skip(!noMapDistrict || !noTripDistrict, 'no such district in the data');
    await page.goto(`/district/${noMapDistrict!.slug}/`);
    await expect(page.locator('[data-no-map]')).toBeVisible();
    await expect(page.locator('[data-map-teaser]')).toHaveCount(0);
    await page.goto(`/district/${noTripDistrict!.slug}/`);
    await expect(page.locator('[data-area-trips]')).toHaveCount(0);
  });
});

test.describe('sources (AC-7, AC-8)', () => {
  test('chips, search, paging and Back drive the URL and the table', async ({ page }) => {
    await page.goto('/sources/');
    await expect(page.locator('[data-range]')).toHaveText(`1–25 of ${sources.length.toLocaleString('en')}`, { useInnerText: true });
    await page.locator('[data-type="encyclopedia"]').click();
    await expect(page).toHaveURL(/\/sources\/\?type=encyclopedia$/);
    const enc = sources.filter(s => s.type === 'encyclopedia');
    await expect(page.locator('[data-range] [data-l="en"]')).toContainText(`of ${enc.length}`);
    await page.locator('[data-sources-search]').fill('Banglapedia');
    await expect(page).toHaveURL(/q=Banglapedia&type=encyclopedia/);
    await page.locator('[data-type="encyclopedia"]').click(); // back to all types
    await page.locator('[data-sources-search]').fill('');
    await expect(page).toHaveURL(/\/sources\/$/);
    const two = page.locator('[data-pages] a[data-page="2"]').first();
    await expect(two).toHaveAttribute('href', '/sources/?page=2');
    await two.click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.locator('[data-range] [data-l="en"]')).toContainText('26–50');
    await page.goBack();
    await expect(page.locator('[data-range] [data-l="en"]')).toContainText('1–25');
  });

  test('a query with no match shows the empty state; Clear filters restores the list', async ({ page }) => {
    await page.goto('/sources/?q=zzzzzzzz');
    await expect(page.locator('[data-sources-empty]')).toBeVisible();
    await page.locator('[data-sources-empty] button').click();
    await expect(page.locator('[data-source-row]')).toHaveCount(25);
  });

  test('a bad value is dropped with the notice', async ({ page }) => {
    await page.goto('/sources/?type=zine&page=999');
    await expect(page.locator('[data-notice]')).toBeVisible();
    await expect(page).toHaveURL(/\/sources\/$/);
  });

  test('with JavaScript off, 25 rows show', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/sources/');
    await expect(page.locator('[data-source-row]')).toHaveCount(25);
    await context.close();
  });

  test('the core book: structured fields, counts by division and every citing site', async ({ page }) => {
    const book = sources.find(s => s.id === 'SRC-0001')!;
    await page.goto('/sources/SRC-0001/');
    await expect(page.locator('[data-author]')).toHaveText(book.bib!.author!);
    await expect(page.locator('[data-source-fields]')).toContainText(book.bib!.isbn!);
    await expect(page.locator('[data-source-fields]')).toContainText(book.bib!.edition!);
    await expect(page.locator('[data-checked]')).toHaveText(book.bib!.verificationMethod!);
    await expect(page.locator('[data-cited-by]')).toHaveText(`${book.sites.length} sites`, { useInnerText: true });
    const counts = await page.locator('[data-division-count]').evaluateAll(els => els.map(e => Number(e.getAttribute('data-division-count'))));
    expect(counts.reduce((a, b) => a + b, 0)).toBe(Object.values(book.citationsByDivision).reduce((a, b) => a! + b!, 0));
    await expect(page.locator('[data-examples] li')).toHaveCount(3);
    await page.locator('[data-see-all]').click();
    await expect(page).toHaveURL(/#sites$/);
    await expect(page.locator('#sites li a')).toHaveCount(book.sites.length);
  });

  test('a project working file is labelled and has no outbound link', async ({ page }) => {
    await page.goto(`/sources/${projectFile.id}/`);
    await expect(page.locator('[data-project-file]')).toBeVisible();
    await expect(page.locator('[data-source-link]')).toHaveCount(0);
  });
});

test.describe('links into the new pages (AC-9)', () => {
  test('site page: SRC IDs and the breadcrumb link to their pages', async ({ page }) => {
    await page.goto(`/site/${baliati.i}/${baliati.s}/`);
    const id = page.locator('[data-source-id]').first();
    await expect(id).toHaveAttribute('href', `/sources/${await id.innerText()}/`);
    await expect(page.locator('[data-crumb="division"]')).toHaveAttribute('href', '/division/dhaka/');
    await expect(page.locator('[data-crumb="district"]')).toHaveAttribute('href', '/district/manikganj/');
  });

  test('trip page: the breadcrumb links to the area pages', async ({ page }) => {
    const t = trips.find(x => x.district === 'Manikganj')!;
    await page.goto(`/trips/${t.id}/`);
    await expect(page.locator('[data-crumb="division"]')).toHaveAttribute('href', '/division/dhaka/');
    await expect(page.locator('[data-crumb="district"]')).toHaveAttribute('href', '/district/manikganj/');
  });

  test('search: a district result leads to its page; a site ID finds that site first (AC-14)', async ({ page }) => {
    await page.goto('/search/?q=manikganj');
    await expect(page.locator('a[href="/district/manikganj/"]').first()).toBeVisible();
    await page.goto(`/search/?q=${baliati.i.toLowerCase()}`);
    const first = page.locator('[data-site]').first();
    await expect(first).toHaveAttribute('data-site', baliati.i);
    await expect(page.locator('main')).toContainText('matched by site ID');
    await page.goto('/search/?q=JB-DHK-999');
    await expect(page.locator('[data-site]')).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText('Did you mean');
  });
});

test.describe('About (AC-10)', () => {
  test('anchors, numbers from meta.json, disagreements apart, licences, no download promise', async ({ page }) => {
    await page.goto('/about/');
    for (const id of ['core-book', 'grading', 'locations', 'disagreements', 'costs', 'photos', 'not-done', 'contribute', 'licences']) await expect(page.locator(`#${id}`)).toHaveCount(1);
    const text = await page.locator('main').innerText();
    const c = meta.counts;
    const n = (v: number) => v.toLocaleString('en');
    for (const v of [c.sites, c.sources, c.confidence.confirmed, c.stillToConfirm, c.locations.verified, c.locations.noPin, c.disagreements, c.openQuestions, c.legends, c.images, c.imagesNeedReview, c.imagesPermissionRequired])
      expect(text).toContain(n(v));
    expect(text).toContain(`${n(c.disagreements)} disagreements`);
    expect(text).not.toContain(n(c.disagreements + c.openQuestions));
    const licences = await page.locator('#licences').innerText();
    for (const s of ['CC BY-SA 4.0', 'WebP', 'OpenStreetMap', 'CC BY 3.0 IGO', 'Fraunces']) expect(licences).toContain(s);
    expect(text).not.toMatch(/download|CSV files/i);
  });
});

test.describe('credits (AC-12)', () => {
  test('every Ready image, exact credit lines, 8 rows then Show more', async ({ page }) => {
    await page.goto('/credits/');
    await expect(page.locator('[data-credit-row]')).toHaveCount(credits.length);
    await expect(page.locator('[data-credit-group]')).toHaveCount(new Set(credits.map(c => c.siteId)).size);
    const shown = await page.locator('[data-credit]').evaluateAll(els => els.map(e => e.textContent));
    expect(shown.sort()).toEqual(credits.map(c => c.credit).sort());
    for (const c of credits.filter(x => !x.sourcePage)) await expect(page.locator(`[data-credit-row="${c.imageId}"] [data-file-page]`)).toHaveCount(0);
    const big = page.locator('[data-credit-group]').filter({ has: page.locator('details') }).first();
    await expect(big.locator('> ul > li')).toHaveCount(8);
  });

  test('?site= shows one site with "Show all sites"; an unknown ID is dropped with the notice', async ({ page }) => {
    await page.goto(`/credits/?site=${baliati.i}`);
    await expect(page.locator('[data-credit-group]:not([hidden])')).toHaveCount(1);
    await expect(page.locator(`[data-credit-group][data-site="${baliati.i}"]`)).toBeVisible();
    await page.locator('[data-show-all]').click();
    await expect(page.locator('[data-credit-group]:not([hidden])')).toHaveCount(new Set(credits.map(c => c.siteId)).size);
    await page.goto('/credits/?site=JB-XXX-999');
    await expect(page.locator('[data-notice]')).toBeVisible();
    await expect(page).toHaveURL(/\/credits\/$/);
  });

  test('the search box finds a photographer', async ({ page }) => {
    const c = credits.find(x => x.creator.length > 6)!;
    await page.goto('/credits/');
    await page.locator('[data-credits-search]').fill(c.creator);
    await expect(page.locator(`[data-credit-row="${c.imageId}"]`)).toBeVisible();
  });
});

test.describe('404 (AC-13)', () => {
  test('an unknown URL returns 404 with search and a report link carrying page_url', async ({ page }) => {
    const response = await page.goto('/no/such/page/');
    expect(response?.status()).toBe(404);
    await expect(page.locator('h1')).toHaveText('This page has fallen into ruin', { useInnerText: true });
    await expect(page.locator('[data-report-link]')).toHaveAttribute('href', /page_url=.*no%2Fsuch%2Fpage/);
    await page.locator('[data-nf-search] input').fill(baliati.i);
    await page.locator('[data-nf-search] button').click();
    await expect(page).toHaveURL(new RegExp(`/search/\\?q=${baliati.i}`));
    await expect(page.locator('[data-site]').first()).toHaveAttribute('data-site', baliati.i);
  });
});

test.describe('system states (AC-15 to AC-17)', () => {
  test('Explore shows the row skeleton while the index loads', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>(r => { release = r; });
    await page.route('**/data/index.json', async r => { await gate; await r.continue(); });
    await page.goto('/explore/');
    await expect(page.locator('[data-skeleton="row"]')).toBeVisible();
    release();
    await expect(page.locator('[data-skeleton="row"]')).toHaveCount(0);
  });

  test('the offline toast: shows, stays on Try again while offline, hides online, Dismiss until next time', async ({ page, context }) => {
    await page.goto('/about/');
    await context.setOffline(true);
    const toast = page.locator('[data-offline]');
    await expect(toast).toContainText('You’re offline. This page stays open; other pages and photos need a connection.');
    await page.locator('[data-offline-retry]').click();
    await expect(page.locator('[data-offline-still]')).toBeVisible();
    await context.setOffline(false);
    await expect(toast).toHaveCount(0);
    await context.setOffline(true);
    await expect(toast).toBeVisible();
    await toast.getByRole('button', { name: 'Dismiss' }).click();
    await expect(toast).toHaveCount(0);
    await context.setOffline(false);
    await context.setOffline(true);
    await expect(toast).toBeVisible();
    await context.setOffline(false);
  });

  test('Save-Data: trip and site pages with a map say Lite mode is on and load no Leaflet', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true, effectiveType: '4g' }, configurable: true }));
    const watch = watchHeavy(page);
    const tripWithMap = json<{ id: string; stops: { latlon?: unknown }[] }[]>('data/build/trips.json').length
      ? readdirSync('data/build/trips').map(f => json<{ id: string; stops: { latlon?: unknown }[] }>(`data/build/trips/${f}`)).find(t => t.stops.filter(s => s.latlon).length >= 2)!
      : undefined;
    await page.goto(`/trips/${tripWithMap!.id}/`);
    await expect(page.locator('[data-lite-auto-note]')).toBeVisible();
    await page.goto(`/site/${baliati.i}/${baliati.s}/`);
    await expect(page.locator('[data-lite-auto-note]')).toBeVisible();
    await page.waitForTimeout(500);
    await watch.settle();
    expect(watch.hits).toEqual([]);
  });

  test('new pages load no Leaflet or Fuse.js code', async ({ page }) => {
    const watch = watchHeavy(page);
    for (const p of ['/division/dhaka/', '/district/manikganj/', '/sources/', '/sources/SRC-0001/', '/about/', '/credits/']) {
      await page.goto(p);
      await page.waitForLoadState('networkidle');
    }
    await watch.settle();
    expect(watch.hits).toEqual([]);
  });
});

test.describe('accessibility and language (AC-18, AC-21)', () => {
  for (const p of ['/division/dhaka/', '/district/manikganj/', '/sources/', '/sources/SRC-0001/', '/about/', '/credits/', '/no-such-page/']) {
    test(`axe finds no violations on ${p}`, async ({ page }) => {
      if (p === '/credits/') test.slow(); // 938 rows: axe takes a while under a parallel run
      await page.goto(p);
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(', ')}`)).toEqual([]);
    });
  }

  test('axe passes with the offline toast open', async ({ page, context }) => {
    await page.goto('/about/');
    await context.setOffline(true);
    await expect(page.locator('[data-offline]')).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map(v => v.id)).toEqual([]);
    await context.setOffline(false);
  });

  test('keyboard: a district chip, a sources chip and page link, and See all work without a mouse', async ({ page }) => {
    await page.goto('/district/dhaka/');
    const chip = page.locator('[data-chip]').nth(1);
    await chip.focus();
    await page.keyboard.press('Enter');
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/sources/');
    await page.locator('[data-type="news"]').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/type=news/);
    await page.locator('[data-pages] a[data-page="2"]').first().focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/page=2/);
    await page.goto('/division/dhaka/');
    await page.locator('[data-nopin-more] summary').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-nopin-list] li')).toHaveCount(dhaka.noPin.length);
  });

  test('Bangla mode: labels and digits in Bangla, names in Bangla, About prose stays English', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('jp-lang', 'bn'));
    await page.goto('/division/dhaka/');
    await expect(page.locator('h1')).toContainText('ঢাকা');
    await expect(page.locator('[data-on-map]')).toContainText('মানচিত্রে');
    await expect(page.locator('[data-area-intro]')).toContainText('১১১');
    await page.goto('/about/');
    await expect(page.locator('#grading [lang="en"]').first()).toBeVisible();
    await expect(page.locator('main')).toContainText('এই লেখাটি ইংরেজিতে।');
  });
});
