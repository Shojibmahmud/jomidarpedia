// Bangla prose in the browser (spec 14 AC-6 to AC-8, AC-10, NFR-4). Records are chosen by rule from
// data/build/**; a test whose kind of record does not exist yet (no translations merged) skips with the reason.
// Run `npm run build:local` first.

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from './fixtures';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import type { Itinerary, SiteRecord, TripSummary, IndexSite, TranslationCells } from '../lib/types';
import { stubTiles } from './tiles';

test.beforeEach(async ({ page }) => { await stubTiles(page); });

const sites: SiteRecord[] = readdirSync('data/build/sites').sort().map(f => JSON.parse(readFileSync(`data/build/sites/${f}`, 'utf8')));
const trips: TripSummary[] = JSON.parse(readFileSync('data/build/trips.json', 'utf8'));
const index: IndexSite[] = JSON.parse(readFileSync('public/data/index.json', 'utf8'));
const trip = (id: string): Itinerary => JSON.parse(readFileSync(`data/build/trips/${id}.json`, 'utf8'));
const href = (s: SiteRecord) => `/site/${s.id}/${s.slug}/`;
const bangla = (page: Page) => page.addInitScript(() => localStorage.setItem('jp-lang', 'bn'));

const reviewed = sites.find(s => s.summaryBn && !s.bnState.draft && !s.bnState.english);
const drafted = sites.find(s => s.summaryBn && s.bnState.draft);
const partial = sites.find(s => s.bnState.english);
const translatedTrip = trips.find(t => t.titleBn);

async function noSeriousAxe(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id)).toEqual([]);
}

test('a fully reviewed site: Bangla prose and no note (AC-6)', async ({ page }) => {
  test.skip(!reviewed, 'no site is fully translated and reviewed yet');
  await bangla(page);
  await page.goto(href(reviewed!));
  await expect(page.locator('#summary [lang="bn"]').first()).toHaveText(reviewed!.summaryBn!);
  await expect(page.locator('[data-prose-note]')).toHaveCount(0);
  await noSeriousAxe(page);
});

test('a site with drafts: the "not yet checked" note (AC-6)', async ({ page }) => {
  test.skip(!drafted, 'no site has a draft translation yet');
  await bangla(page);
  await page.goto(href(drafted!));
  await expect(page.locator('#summary p [lang="bn"]').first()).toHaveText(drafted!.summaryBn!);
  await expect(page.locator('[data-prose-note]')).toHaveAttribute('data-prose-note', drafted!.bnState.english ? 'bnNote.both' : 'bnNote.draft');
  await noSeriousAxe(page);
});

test('a partial site: English blocks marked lang="en" and one note (AC-6)', async ({ page }) => {
  test.skip(!partial, 'every site is fully translated');
  await bangla(page);
  await page.goto(href(partial!));
  await expect(page.locator('[data-prose-note]')).toHaveCount(1);
  await expect(page.locator('[data-prose-note]')).toBeVisible();
  if (!partial!.summaryBn) await expect(page.locator('#summary p > span[lang="en"]').first()).toBeVisible();
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await noSeriousAxe(page);
  }
});

test('English mode: no note and no Bangla prose (AC-6)', async ({ page }) => {
  const s = drafted ?? partial!;
  await page.goto(href(s));
  await expect(page.locator('[data-prose-note]')).toBeHidden();
  if (s.summaryBn) await expect(page.locator('#summary p [lang="bn"]').first()).toBeHidden();
});

test('a trip page and its card in Bangla (AC-6, AC-7)', async ({ page }) => {
  test.skip(!translatedTrip, 'no trip title is translated yet');
  await bangla(page);
  await page.goto(`/trips/${translatedTrip!.id}/`);
  await expect(page.locator('h1 [lang="bn"]')).toHaveText(translatedTrip!.titleBn!);
  const t = trip(translatedTrip!.id);
  if (t.bnState.draft || t.bnState.english) await expect(page.locator('[data-prose-note]')).toBeVisible();
  await noSeriousAxe(page);
  await page.goto('/trips/');
  await expect(page.getByText(translatedTrip!.titleBn!, { exact: true }).first()).toBeVisible();
});

test('the map card shows the Bangla one-liner (AC-7)', async ({ page }) => {
  const row = index.find(r => r.smb && r.ll);
  test.skip(!row, 'no mappable site has a translated summary yet');
  await bangla(page);
  await page.goto(`/explore/?view=map&sel=${row!.i}`);
  await expect(page.locator(`[data-summary="${row!.i}"] [data-summary-text] [lang="bn"]`)).toHaveText(row!.smb!);
});

test('a translated photo has Bangla alt text and its credit unchanged (AC-7)', async ({ page }) => {
  const s = sites.find(x => x.images.some(im => im.altBn));
  test.skip(!s, 'no photo alt text is translated yet');
  const im = s!.images.find(x => x.altBn)!;
  await bangla(page);
  await page.goto(href(s!));
  await expect(page.locator(`[data-gallery] img[src="${im.thumb}"]`).first()).toHaveAttribute('alt', im.altBn!);
  await expect(page.locator('[data-gallery]')).toContainText(im.credit);
});

test('About: Bangla text with the draft note, or English with its note (AC-8)', async ({ page }) => {
  await bangla(page);
  await page.goto('/about/');
  if (!existsSync('content/about.bn.md')) {
    await expect(page.locator('[data-prose-note="common.proseInEnglish"]')).toBeVisible();
    return;
  }
  const reviewedBn = /^---\nreviewed: true\n/.test(readFileSync('content/about.bn.md', 'utf8'));
  await expect(page.locator('[data-about] section h2 [lang="bn"]').first()).toBeVisible();
  await expect(page.locator('[data-prose-note="bnNote.draft"]')).toHaveCount(reviewedBn ? 0 : 1);
  await noSeriousAxe(page);
});

test('the review page is built for local mode, noindex, with the right counts (AC-10)', async ({ page }) => {
  const { cells }: TranslationCells = JSON.parse(readFileSync('data/build/translations.json', 'utf8'));
  await page.goto('/dev/bn-review/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  const summaries = cells.filter(c => c.table === 'sites' && c.column === 'short_description');
  const row = page.locator('[data-coverage-row="sites.short_description"] td');
  await expect(row.first()).toHaveText(String(summaries.filter(c => c.state === 'reviewed').length));
  await page.goto('/dev/bn-review/sites/');
  await page.getByLabel('State').selectOption('');
  await page.getByLabel('Column').selectOption('short_description');
  await expect(page.getByText(`${summaries.length} rows`)).toBeVisible();
});
