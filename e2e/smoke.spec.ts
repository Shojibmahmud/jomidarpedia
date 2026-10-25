// Smoke tests for the walking skeleton (roadmap task 4.5, spec 04 FR-12). Expected names and slugs
// come from the built data, never from numbers or names typed here (I6).

import { expect, test } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import HOME_IMAGES from '../lib/home-images.json';
import { BD_COORD_TEXT } from '../scripts/lib/rules.mjs';
import type { Credit, IndexSite, SiteRecord } from '../lib/types';
import { stubTiles } from './tiles';

test.beforeEach(async ({ page }) => { await stubTiles(page); });

const index: IndexSite[] = JSON.parse(readFileSync('public/data/index.json', 'utf8'));
const site = (id: string): SiteRecord => JSON.parse(readFileSync(`data/build/sites/${id}.json`, 'utf8'));
const href = (s: SiteRecord) => `/site/${s.id}/${s.slug}/`;
const baliati = site('JB-DHK-064');
const elangi = site('JB-RAJ-002');
// A build outside release includes the /dev/ test page (next.config.mjs); its pages must be noindex.
const nonRelease = existsSync('out/dev/i18n/index.html');

test('home shows the title, the hero credit and a link from each section (spec 11 AC-2, FR-25)', async ({ page }) => {
  const credits: Credit[] = JSON.parse(readFileSync('data/build/credits.json', 'utf8'));
  await page.goto('/');
  await expect(page.locator('h1 > :visible')).toHaveText('The zamindar palaces of Bangladesh');
  await expect(page.locator('[data-home-hero] [data-credit]')).toHaveText(credits.find(c => c.imageId === HOME_IMAGES.hero)!.credit);
  await expect(page.getByText('Five sites to start with')).toHaveCount(0);
  const main = page.locator('main');
  for (const href of ['/explore/?day=1', '/explore/?cond=in_ruins', '/sources/', '/explore/?view=map', '/division/dhaka/', '/trips/', '/about/'])
    await expect(main.locator(`a[href="${href}"]`).first(), href).toBeAttached();
  await expect(main.locator('[data-home-trips] [data-trip]')).toHaveCount(3);
});

test("Baliati's page shows both names from the data", async ({ page }) => {
  await page.goto(href(baliati));
  const h1 = page.locator('h1');
  await expect(h1).toContainText(baliati.name.en);
  await expect(h1).toContainText(baliati.name.bn!);
  await expect(page.locator('main')).toContainText(baliati.summary);
});

test('the ID route arrives at the canonical URL', async ({ page }) => {
  await page.goto(`/site/${baliati.id}/`);
  await expect(page).toHaveURL(href(baliati));
  await expect(page.locator('h1')).toContainText(baliati.name.en);
});

test("Elangi's page renders with no location", async ({ page }) => {
  await page.goto(href(elangi));
  await expect(page.locator('h1')).toContainText(elangi.name.en);
  await expect(page.locator('main')).not.toContainText(/\d{1,2}\.\d{3,}/);
});

test('pages outside release are noindex', async ({ page }) => {
  test.skip(!nonRelease, 'release output: pages may be indexed');
  for (const path of ['/', href(baliati)]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  }
});

test.describe('static export', () => {
  const html = (path: string) => readFileSync(join('out', path, 'index.html'), 'utf8');

  test('one slug page and one ID redirect per site', () => {
    const dirs = readdirSync('out/site');
    expect(dirs.sort()).toEqual(index.map(s => s.i).sort());
    for (const s of index) {
      const target = `/site/${s.i}/${s.s}/`;
      expect(existsSync(join('out', target, 'index.html')), target).toBe(true);
      const redirect = html(`/site/${s.i}/`);
      expect(redirect, s.i).toContain(`content="0;url=${target}"`);
      expect(redirect, s.i).toMatch(new RegExp(`rel="canonical" href="[^"]*${target}"`));
      expect(redirect, s.i).toMatch(/<meta name="robots" content="noindex/);
      expect(redirect, s.i).toContain(`href="${target}"`);
    }
  });

  // Phase 5 shows coordinates for mappable sites (spec 05 FR-19); a hidden pin's page carries none (R5),
  // and no mini map or "Open in Explore" (spec 07 FR-41, AC-15).
  test('no hidden-pin page contains coordinates, a directions link or a map', () => {
    for (const s of index.filter(s => !s.ll)) {
      const page = html(`/site/${s.i}/${s.s}/`);
      expect(BD_COORD_TEXT.test(page), s.i).toBe(false);
      expect(page, s.i).not.toContain('/maps/dir/');
      expect(page, s.i).not.toContain('data-mini-map-box');
      expect(page, s.i).not.toContain('data-open-explore');
    }
  });
});

// Heading fonts (spec 10, site-wide fix): a <span lang> inside a serif heading keeps the heading's face in both
// languages; body text stays in the sans of its language; Latin inside a monospace ID stays monospace.
test.describe('fonts by language and role', () => {
  const family = (page: import('@playwright/test').Page, selector: string) =>
    page.locator(selector).first().evaluate(el => getComputedStyle(el).fontFamily);

  test('English: heading spans are Fraunces, body text Source Sans, IDs monospace', async ({ page }) => {
    await page.goto('/about/');
    expect(await family(page, 'h1 [data-l="en"]')).toMatch(/Fraunces/);
    expect(await family(page, 'h2 [data-l="en"], h2[lang="en"]')).toMatch(/Fraunces/);
    expect(await family(page, '#grading li')).toMatch(/Source Sans/);
    await page.goto(`/site/${baliati.id}/${baliati.slug}/`);
    expect(await family(page, 'h1 [lang="en"]')).toMatch(/Fraunces/);
    await page.goto('/sources/');
    expect(await family(page, '[data-source-row] .font-mono [lang="en"]')).toMatch(/monospace/);
  });

  test('Bangla: heading spans are Tiro Bangla, body text Hind Siliguri, Latin stays Latin', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('jp-lang', 'bn'));
    await page.goto('/about/');
    expect(await family(page, 'h1 [data-l="bn"]')).toMatch(/Tiro Bangla/);
    expect(await family(page, 'footer p [data-l="bn"]')).toMatch(/Hind Siliguri/);
    await page.goto(`/site/${baliati.id}/${baliati.slug}/`);
    expect(await family(page, 'h1 [lang="bn"]')).toMatch(/Tiro Bangla/);
    expect(await family(page, 'h1 [lang="en"]')).toMatch(/Fraunces/);
  });
});
