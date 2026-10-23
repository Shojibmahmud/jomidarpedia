// Smoke tests for the walking skeleton (roadmap task 4.5, spec 04 FR-12). Expected names and slugs
// come from the built data, never from numbers or names typed here (I6).

import { expect, test } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { HOME_SAMPLE_IDS } from '../lib/home';
import { BD_COORD_TEXT } from '../scripts/lib/rules.mjs';
import type { IndexSite, SiteRecord } from '../lib/types';

const index: IndexSite[] = JSON.parse(readFileSync('public/data/index.json', 'utf8'));
const site = (id: string): SiteRecord => JSON.parse(readFileSync(`data/build/sites/${id}.json`, 'utf8'));
const href = (s: SiteRecord) => `/site/${s.id}/${s.slug}/`;
const baliati = site('JB-DHK-064');
const elangi = site('JB-RAJ-002');
// A build outside release includes the /dev/ test page (next.config.mjs); its pages must be noindex.
const nonRelease = existsSync('out/dev/i18n/index.html');

test('home shows the title and links to the five sample sites', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Jomidarpedia');
  for (const id of HOME_SAMPLE_IDS) await expect(page.locator(`main a[href="${href(site(id))}"]`)).toBeVisible();
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

  // Phase 5 shows coordinates for mappable sites (spec 05 FR-19); a hidden pin's page carries none (R5).
  test('no hidden-pin page contains coordinates or a directions link', () => {
    for (const s of index.filter(s => !s.ll)) {
      const page = html(`/site/${s.i}/${s.s}/`);
      expect(BD_COORD_TEXT.test(page), s.i).toBe(false);
      expect(page, s.i).not.toContain('/maps/dir/');
    }
  });
});
