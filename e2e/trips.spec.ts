// Trips tests (roadmap Phase 9, spec 09 §8). Expectations come from data/build/** and lib/trips.ts, never from
// numbers typed here (I6). Run `npm run build:local` first.

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from './fixtures';
import { readdirSync, readFileSync } from 'node:fs';
import { parseCsv } from '../scripts/csv.mjs';
import { isMappable } from '../scripts/lib/validate.mjs';
import { filterTrips, mapStops, NO_FILTERS, PAGE, sortTrips, stopSiteIds, type TripCard } from '../lib/trips';
import type { Division, Itinerary, TripSummary } from '../lib/types';
import { stubTiles, TILE } from './tiles';

test.beforeEach(async ({ page }) => { await stubTiles(page); });

const summaries: TripSummary[] = JSON.parse(readFileSync('data/build/trips.json', 'utf8'));
const divisions: Division[] = JSON.parse(readFileSync('data/build/divisions.json', 'utf8'));
const cards: TripCard[] = summaries.map(t => ({ ...t, divSlug: divisions.find(d => d.en === t.division)!.slug }));
const trips: Itinerary[] = readdirSync('data/build/trips').map(f => JSON.parse(readFileSync(`data/build/trips/${f}`, 'utf8')));
const trip = (id: string) => trips.find(t => t.id === id)!;
const href = (t: { id: string }) => `/trips/${t.id}/`;

// Edge cases, chosen by rule (spec 09 §7).
const withMap = trips.find(t => mapStops(t).show && mapStops(t).unpinned.length && t.notes.length)!;
const noMap = trips.find(t => !mapStops(t).show && stopSiteIds(t).length)!;
const oneStop = trips.find(t => t.stops.length === 1)!;
const longest = [...trips].sort((a, b) => b.stops.length - a.stops.length)[0];
const noKnown = trips.find(t => t.budget.known === undefined)!;
const withPhotos = sortTrips(cards, 'time', 'en').slice(0, PAGE).find(t => (t.photos?.length ?? 0) >= 2)!;

const shownIds = (page: Page) => page.locator('[data-trip-list] [data-trip]').evaluateAll(els => els.map(e => e.getAttribute('data-trip')));

test.describe('listing', () => {
  test('without JavaScript, the first 12 plans by travel time are there, with working links (FR-2)', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/trips/');
    expect(await shownIds(page)).toEqual(sortTrips(cards, 'time', 'en').slice(0, PAGE).map(t => t.id));
    const link = page.locator('[data-trip-list] [data-trip] h2 a').first();
    expect(await link.getAttribute('href')).toMatch(/^\/trips\/IT-[A-Z]{3}-\d{3}-\d+\/$/);
    await ctx.close();
  });

  test('length and division filters, the count line and Load more (FR-3 to FR-6, FR-10)', async ({ page }) => {
    await page.goto('/trips/?len=one-day&div=dhaka');
    const expected = sortTrips(filterTrips(cards, { ...NO_FILTERS, len: ['one-day'], div: ['dhaka'] }), 'time', 'en');
    await expect(page.locator('[data-showing]')).toHaveAttribute('data-showing', String(expected.length));
    expect(await shownIds(page)).toEqual(expected.slice(0, PAGE).map(t => t.id));
    if (expected.length > PAGE) {
      await page.locator('[data-more]').click();
      await expect(page.locator('[data-trip-list] [data-trip]')).toHaveCount(Math.min(expected.length, 2 * PAGE));
      await expect(page.locator(`[data-trip-index="${PAGE}"] a`)).toBeFocused();
    }
    await page.locator('[data-len="multi-day"]').click();
    await expect(page).toHaveURL(/\?len=one-day,multi-day&div=dhaka$/);
  });

  test('no matches: the empty state, and Clear filters brings the list back (FR-11)', async ({ page }) => {
    const empty = divisions.find(d => !filterTrips(cards, { ...NO_FILTERS, len: ['multi-day'], tt: '0-1', div: [d.slug] }).length)!;
    await page.goto(`/trips/?len=multi-day&tt=0-1&div=${empty.slug}`);
    await expect(page.locator('[data-trips-empty]')).toBeVisible();
    await page.locator('[data-trips-empty] button').click();
    await expect(page).toHaveURL(/\/trips\/$/);
    await expect(page.locator('[data-trip-list] [data-trip]')).toHaveCount(PAGE);
  });

  test('"Has a timed plan" follows the reviewed status (FR-7, D1)', async ({ page }) => {
    const timed = cards.some(c => c.planStatus === 'timed');
    await page.goto('/trips/?plan=timed');
    await expect(page.locator('[data-plan-filter]')).toHaveCount(timed ? 1 : 0);
    if (!timed) {
      await expect(page.locator('[data-no-timed]')).toBeVisible();
      await expect(page.locator('[data-trips-empty]')).toBeVisible();
      await expect(page.locator('[data-plan]')).toHaveCount(0);
    }
  });

  test('an unknown value is dropped with the notice (FR-9)', async ({ page }) => {
    await page.goto('/trips/?len=weekend&sort=price');
    await expect(page.locator('[data-notice]')).toBeVisible();
    await expect(page).toHaveURL(/\/trips\/$/);
  });

  test('the camera button lists the exact credits; Esc and an outside click close it (FR-14)', async ({ page }) => {
    await page.goto('/trips/');
    const card = page.locator(`[data-trip-list]:not([data-static]) [data-trip="${withPhotos.id}"]`);
    const button = card.locator('[data-photo-credits]');
    await button.click();
    const list = card.locator('[data-credits-list]');
    for (const p of withPhotos.photos!) await expect(list).toContainText(p.credit);
    await page.keyboard.press('Escape');
    await expect(list).toHaveCount(0);
    await expect(button).toBeFocused();
    await button.click();
    await page.locator('h1').click();
    await expect(list).toHaveCount(0);
  });

  test('loads no map code (NFR-2)', async ({ page }) => {
    const leaflet: string[] = [];
    page.on('request', r => { if (/leaflet/i.test(r.url()) || TILE.test(r.url())) leaflet.push(r.url()); });
    await page.goto('/trips/');
    await page.waitForLoadState('networkidle');
    const scripts = await page.locator('script[src]').evaluateAll(els => els.map(e => (e as HTMLScriptElement).src));
    for (const src of scripts) expect(await (await page.request.get(src)).text(), src).not.toContain('leaflet');
    expect(leaflet).toEqual([]);
  });
});

test.describe('itinerary page', () => {
  test('with no reviewed status: no status badge and no times; places labelled (FR-12, FR-24, FR-25)', async ({ page }) => {
    const t = trips.find(x => !x.planStatus && x.stops.some(s => s.time) && x.stops.some(s => s.kind === 'place'))!;
    test.skip(!t, 'every itinerary has a reviewed plan_status (Phase 12 FR-20)');
    await page.goto(href(t));
    await expect(page.locator('[data-plan]')).toHaveCount(0);
    await expect(page.locator('[data-time]')).toHaveCount(0);
    await expect(page.locator('[data-stop]')).toHaveCount(t.stops.length);
    await expect(page.locator('[data-kind="place"] a')).toHaveCount(0);
    await expect(page.locator('[data-kind="site"] a')).toHaveCount(t.stops.filter(s => s.kind === 'site').length);
  });

  test('a schematic map: markers for pinned stops only, no lines, the label and the stops not on the map (FR-28, FR-29)', async ({ page }) => {
    await page.goto(href(withMap));
    await page.locator('[data-route-map-box]').scrollIntoViewIfNeeded();
    await expect(page.locator('.jp-stop')).toHaveCount(mapStops(withMap).pinned.length);
    await expect(page.locator('.jp-leg')).toHaveCount(0);
    await expect(page.locator('[data-schematic]')).toBeVisible();
    await expect(page.locator('[data-not-on-map]')).toContainText(mapStops(withMap).unpinned[0].name);
  });

  test('fewer than 2 pins: no map at all (FR-30)', async ({ page }) => {
    await page.goto(href(noMap));
    await expect(page.locator('[data-route-map-box]')).toHaveCount(0);
    await expect(page.locator('[data-stops]')).toBeVisible();
  });

  test('Lite mode loads no map (FR-31)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('jp-lite', '1'));
    const tiles: string[] = [];
    page.on('request', r => { if (TILE.test(r.url())) tiles.push(r.url()); });
    await page.goto(href(withMap));
    await expect(page.locator('[data-lite-off]')).toBeVisible();
    await expect(page.locator('.leaflet-container')).toHaveCount(0);
    expect(tiles).toEqual([]);
  });

  test('when tiles fail, the map area lists the stops (FR-32)', async ({ page }) => {
    await page.unrouteAll();
    await page.route(TILE, r => r.abort());
    await page.goto(href(withMap));
    await page.locator('[data-route-map-box]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-tiles-failed]')).toBeVisible({ timeout: 15_000 });
  });

  test('the budget names what it leaves out and never says Total (FR-34 to FR-37)', async ({ page }) => {
    for (const t of [withMap, noKnown]) {
      await page.goto(href(t));
      const text = await page.locator('[data-budget]').innerText();
      expect(text).not.toMatch(/total/i);
      expect(text).toMatch(t.budget.known === undefined ? /No costs known yet/ : /Known so far/);
      for (const item of t.budget.omitted) expect(text).toContain(item);
    }
  });

  test('DayCheck: one line while no site has reviewed closing days (FR-41)', async ({ page }) => {
    await page.goto(href(withMap));
    const sites = stopSiteIds(withMap).map(id => JSON.parse(readFileSync(`data/build/sites/${id}.json`, 'utf8')));
    const known = sites.some(s => s.visiting.closedDays.known);
    await expect(page.locator('[data-daycheck]')).toHaveCount(known ? 1 : 0);
    await expect(page.locator('[data-daycheck-none]')).toHaveCount(known ? 0 : 1);
  });

  test('breadcrumb, notes, footer and the correction link (FR-18, FR-20, FR-22)', async ({ page }) => {
    await page.goto(href(withMap));
    expect(await page.locator('[data-crumb="division"]').getAttribute('href')).toMatch(/^\/division\/[a-z-]+\/$/); // spec 10 FR-62
    await expect(page.locator('[data-notes]')).toBeVisible();
    const footer = page.locator('[data-trip-footer]');
    if (withMap.costsEstimated) await expect(footer).toContainText('Costs estimated');
    expect(await footer.locator('[data-correction]').getAttribute('href')).toContain(`site_id=${withMap.anchor}`);
    const bare = trips.find(t => !t.notes.length)!;
    await page.goto(href(bare));
    await expect(page.locator('[data-notes]')).toHaveCount(0);
  });

  test('Share copies the link when the share sheet is missing (FR-45)', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.addInitScript(() => { Object.defineProperty(navigator, 'share', { value: undefined }); });
    await page.goto(href(withMap));
    await page.getByRole('button', { name: 'Share' }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(new URL(href(withMap), page.url()).href);
  });

  test('"Open all stops on the map" shows exactly those sites in Explore; the chip removes them (FR-42, FR-43)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(href(withMap));
    await page.locator('[data-open-on-map]').click();
    await expect(page).toHaveURL(/\/explore\/\?view=map&(sel=[^&]+&)?ids=/);
    const ids = stopSiteIds(withMap);
    await expect(page.locator('#jp-results-title')).toHaveAttribute('data-count', String(ids.length));
    await page.locator('[data-active="ids"]').click();
    await expect(page).not.toHaveURL(/ids=/);
  });

  test('an unknown site ID in ids is dropped with the notice (FR-43)', async ({ page }) => {
    await page.goto('/explore/?ids=JB-DHK-001,JB-ZZZ-999');
    await expect(page.locator('[data-notice]')).toBeVisible();
    await expect(page.locator('#jp-results-title')).toHaveAttribute('data-count', '1');
  });

  test('site pages link each itinerary to a page that exists (FR-51, AC-1)', async ({ page, request }) => {
    const anchor = JSON.parse(readFileSync(`data/build/sites/${withMap.anchor}.json`, 'utf8'));
    await page.goto(`/site/${anchor.id}/${anchor.slug}/`);
    const links = await page.locator('[data-itineraries] a').evaluateAll(els => els.map(e => e.getAttribute('href')));
    expect(links.length).toBe(anchor.itineraries.length);
    for (const l of links) expect((await request.get(l!)).status(), l!).toBe(200);
    await expect(page.locator('[data-timed-preview]')).toHaveCount(anchor.itineraries.filter((i: { id: string }) => trip(i.id).planStatus === 'timed').length);
  });

  test('Bangla: interface in Bangla, trip data in English (FR-53, FR-54)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('jp-lang', 'bn'));
    await page.goto(href(withMap));
    await expect(page.locator('h1')).toHaveText(withMap.title);
    expect((await page.locator('#jp-budget').innerText()).trim()).toBe('আনুমানিক খরচ'); // the English twin is hidden
  });

  test('no hidden-pin coordinates on any trip page (R5, NFR-4)', async ({ request }) => {
    const sites: Record<string, string>[] = parseCsv(readFileSync('data/csv/sites.csv', 'utf8')).rows;
    const hidden = new Map(sites.filter(s => !isMappable(s) && s.latitude && s.longitude).map(s => [s.site_id, s]));
    const affected = trips.filter(t => t.stops.some(s => s.siteId && hidden.has(s.siteId))).slice(0, 20);
    for (const t of affected) {
      const html = await (await request.get(href(t))).text();
      for (const s of t.stops) {
        const h = s.siteId ? hidden.get(s.siteId) : undefined;
        if (h) expect(html, `${t.id} ${h.site_id}`).not.toContain(Number(h.latitude).toFixed(4));
      }
    }
  });
});

test.describe('print (FR-46 to FR-50, AC-16)', () => {
  const pages = async (page: Page) => (Buffer.from(await page.pdf({ format: 'A4' })).toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;

  for (const [label, setup] of [
    ['light', async (p: Page) => p.emulateMedia({ colorScheme: 'light' })],
    ['dark by the OS', async (p: Page) => p.emulateMedia({ colorScheme: 'dark' })],
    ['dark by the toggle', async (p: Page) => p.addInitScript(() => localStorage.setItem('jp-theme', 'dark'))],
  ] as const) {
    test(`${label}: light, controls hidden, credited, nothing clipped`, async ({ page }) => {
      await setup(page);
      for (const t of [oneStop, longest]) {
        await page.goto(href(t));
        await page.locator('[data-trip-footer]').scrollIntoViewIfNeeded();
        await page.waitForLoadState('networkidle');
        await page.emulateMedia({ media: 'print' });
        expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 255, 255)');
        for (const sel of ['[data-print-button]', 'body > header', '[data-breadcrumb]', '[data-open-on-map]']) {
          for (const el of await page.locator(sel).all()) await expect(el, `${t.id} ${sel}`).toBeHidden();
        }
        const last = page.locator(`[data-stop="${t.stops.at(-1)!.order}"]`);
        await expect(last).toBeVisible();
        await expect(page.locator('[data-before-you-go]')).toBeVisible();
        await expect(page.locator('[data-print-footer]')).toContainText('Photos: each under the licence');
        await expect(page.locator('[data-page-url]')).toContainText(href(t));
        for (const c of await page.locator('[data-site-card] [data-credit]').all()) await expect(c).toBeVisible();
        // Nothing clipped: no element in the plan scrolls or is cut off by overflow.
        const clipped = await page.locator('main').evaluate(main => [...main.querySelectorAll('*')].filter(el => {
          const s = getComputedStyle(el);
          return /hidden|clip/.test(s.overflow) && el.scrollHeight > el.clientHeight + 2 && !el.closest('.sr-only, .leaflet-container, [data-route-map-box], [data-site-card] figure') && el.clientHeight > 0;
        }).map(el => el.outerHTML.slice(0, 80)));
        expect(clipped, t.id).toEqual([]);
        await page.emulateMedia({ media: 'screen' });
      }
    });
  }

  test('page counts: the shortest plan fits one page, the longest flows on with the title repeated', async ({ page }) => {
    await page.goto(href(oneStop));
    expect(await pages(page)).toBeLessThanOrEqual(2);
    await page.goto(href(longest));
    await page.locator('[data-trip-footer]').scrollIntoViewIfNeeded();
    expect(await pages(page)).toBeGreaterThanOrEqual(2);
    expect(await page.locator('style').evaluateAll(els => els.some(e => e.textContent?.includes('@top-left')))).toBe(true);
  });
});

test.describe('accessibility (NFR-3)', () => {
  for (const scheme of ['light', 'dark'] as const) {
    test(`axe: listing, popover open, and an itinerary page (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      const check = async (what: string) => {
        const { violations } = await new AxeBuilder({ page }).analyze();
        const bad = violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
        expect(bad.map(v => `${what} ${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
      };
      await page.goto('/trips/');
      await expect(page.locator('[data-trip-list]:not([data-static])')).toBeVisible();
      await check('/trips/');
      await page.locator('[data-photo-credits]').first().click();
      await check('popover');
      await page.goto(href(withMap));
      await check(href(withMap));
    });
  }

  test('keyboard only: a filter, the popover and Share', async ({ page }) => {
    await page.goto('/trips/');
    await expect(page.locator('[data-trip-list]:not([data-static])')).toBeVisible();
    await page.locator('[data-len="one-day"]').focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/len=one-day/);
    const credits = page.locator('[data-photo-credits]').first();
    await credits.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-credits-list]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(credits).toBeFocused();
  });
});
