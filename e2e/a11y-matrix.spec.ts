// The automated accessibility state matrix (roadmap task 13.2; spec 13 FR-6 to FR-9, AC-4, AC-5). axe runs on
// each state below and a test fails on any serious or critical finding. States 1–5 use a fixed real record;
// a guard first checks that the record still has its state, so a data change cannot quietly empty the matrix
// (D12): when a guard fails, choose a new record for that state rather than dropping the state.

import AxeBuilder from '@axe-core/playwright';
import { readdirSync, readFileSync } from 'node:fs';
import { expect, test, type Page } from './fixtures';
import { stubTiles, TILE } from './tiles';
import { disagreements, isSparse } from '../lib/site-page';
import { LANG_KEY, THEME_KEY } from '../lib/prefs';
import type { Itinerary, SiteRecord } from '../lib/types';

test.beforeEach(async ({ page }) => { await stubTiles(page); });

const site = (id: string): SiteRecord => JSON.parse(readFileSync(`data/build/sites/${id}.json`, 'utf8'));
const sites = () => readdirSync('data/build/sites').map(f => site(f.replace(/\.json$/, '')));
const trip = (id: string): Itinerary => JSON.parse(readFileSync(`data/build/trips/${id}.json`, 'utf8'));
const trips = () => readdirSync('data/build/trips').map(f => trip(f.replace(/\.json$/, '')));
const siteHref = (s: SiteRecord) => `/site/${s.id}/${s.slug}/`;

/** Serious and critical findings only (FR-6); each listed with its rule and first target. */
async function seriousFindings(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations.filter(v => v.impact === 'serious' || v.impact === 'critical')
    .map(v => `${v.id} (${v.impact}): ${v.nodes.length} × ${v.nodes[0]?.target.join(' ')}`);
}

// ------------------------------------------------------------------ states 1–5: fixed records and their guards

const STATES = [
  {
    state: 'a sparse record: no pin, no photo', id: 'JB-RAJ-002',
    guard: (s: SiteRecord) => !s.location.latlon && s.images.length === 0 && isSparse(s),
  },
  {
    state: 'unknown access and unknown fee', id: 'JB-BSL-004',
    guard: (s: SiteRecord) => s.access === 'unknown' && !s.visiting.fee.known,
  },
  {
    state: 'an unverified pin', id: 'JB-DHK-008',
    guard: (s: SiteRecord) => !!s.location.latlon && s.location.status === 'unverified',
  },
  {
    state: 'the site with the most recorded conflicts', id: 'JB-MYM-019',
    guard: (s: SiteRecord) => disagreements(s).length === Math.max(...sites().map(x => disagreements(x).length)),
  },
] as const;

for (const { state, id, guard } of STATES) {
  test(`axe: ${state} (${id})`, async ({ page }) => {
    const s = site(id);
    expect(guard(s), `${id} no longer has the state "${state}": choose another record for it`).toBe(true);
    await page.goto(siteHref(s));
    if (s.location.latlon) {
      await page.locator('[data-mini-map-box]').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-mini-map] .leaflet-container')).toBeVisible();
    }
    expect(await seriousFindings(page)).toEqual([]);
  });
}

const LONGEST = 'IT-DHK-010-1';
test(`axe: the longest itinerary (${LONGEST})`, async ({ page }) => {
  const t = trip(LONGEST);
  const most = Math.max(...trips().map(x => x.stops.length));
  expect(t.stops.length, `${LONGEST} is no longer the longest itinerary (${most} stops): choose another`).toBe(most);
  await page.goto(`/trips/${LONGEST}/`);
  const map = page.locator('[data-route-map-box]');
  if (await map.count()) await map.scrollIntoViewIfNeeded();
  expect(await seriousFindings(page)).toEqual([]);
});

// ------------------------------------------------------------------ states 6–7: Bangla mode and dark mode

const PAGES = [
  { name: 'Home', path: '/' },
  { name: 'Explore', path: '/explore/' },
  { name: 'a site page', path: siteHref(site('JB-DHK-064')) },
  { name: 'an itinerary', path: `/trips/${LONGEST}/` },
];

const MODES = [
  { mode: 'Bangla mode', key: LANG_KEY, value: 'bn', check: (p: Page) => expect(p.locator('html')).toHaveAttribute('lang', 'bn') },
  { mode: 'dark mode', key: THEME_KEY, value: 'dark', check: (p: Page) => expect(p.locator('html')).toHaveAttribute('data-theme', 'dark') },
];

for (const { mode, key, value, check } of MODES) {
  for (const { name, path } of PAGES) {
    test(`axe: ${mode} on ${name}`, async ({ page }) => {
      await page.addInitScript(([k, v]) => { localStorage.setItem(k, v); }, [key, value]);
      await page.goto(path);
      await check(page);
      if (path === '/explore/') await expect(page.locator('[data-count]').first()).toBeAttached();
      expect(await seriousFindings(page)).toEqual([]);
    });
  }
}

// ------------------------------------------------------------------ states 8–9: failed requests

test('axe: a failed index.json request on Explore and Search', async ({ page }) => {
  await page.route('**/data/index.json', r => r.abort());
  await page.goto('/explore/');
  await expect(page.locator('main [role="alert"]').first()).toBeVisible();
  expect(await seriousFindings(page)).toEqual([]);
  await page.goto('/search/?q=baliati');
  await expect(page.locator('[data-search-error]')).toBeVisible();
  expect(await seriousFindings(page)).toEqual([]);
});

test('axe: a failed tile request on the Explore map and a site mini map', async ({ page }) => {
  await page.unroute(TILE);
  await page.route(TILE, r => r.abort());
  await page.goto('/explore/');
  await expect(page.locator('[data-tiles-failed]')).toBeVisible({ timeout: 15_000 });
  expect(await seriousFindings(page)).toEqual([]);
  await page.goto(siteHref(site('JB-DHK-064')));
  await page.locator('[data-mini-map-box]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-mini-map] [data-tiles-failed]')).toBeVisible({ timeout: 15_000 });
  expect(await seriousFindings(page)).toEqual([]);
});
