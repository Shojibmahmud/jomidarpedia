// Site page tests (roadmap task 5.19, spec 05 FR-57 and §8). Expectations come from data/build/**, never from
// numbers typed here (I6). Run `npm run build:local` first.

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from './fixtures';
import { readdirSync, readFileSync } from 'node:fs';
import { BD_COORD_TEXT } from '../scripts/lib/rules.mjs';
import { disagreements, openQuestions, isSparse } from '../lib/site-page';
import type { SiteRecord } from '../lib/types';
import { stubTiles } from './tiles';

test.beforeEach(async ({ page }) => { await stubTiles(page); });

const site = (id: string): SiteRecord => JSON.parse(readFileSync(`data/build/sites/${id}.json`, 'utf8'));
const href = (s: SiteRecord) => `/site/${s.id}/${s.slug}/`;

const baliati = site('JB-DHK-064');      // full record
const elangi = site('JB-RAJ-002');       // no photo, no pin, unknowns, sparse
const conflicted = site('JB-MYM-019');   // most multi-version conflicts (A-5)
const unknownFee = site('JB-BSL-004');   // access and fee unknown (A-5)
const unverified = site('JB-DHK-008');   // O9
const noBangla = site('JB-RAJ-059');     // O13 until Phase 12 recorded its Bangla name
const SIX = [baliati, elangi, conflicted, unknownFee, unverified, noBangla];
const SECTIONS = ['summary', 'location', 'history', 'architecture', 'stories', 'visiting', 'getting-there', 'itineraries', 'combine', 'sources'];

const visibleText = (page: Page) => page.locator('main').innerText();

for (const s of SIX) {
  test(`${s.id}: every section is present and no fee shows as a price unless known`, async ({ page }) => {
    await page.goto(href(s));
    for (const id of SECTIONS) await expect(page.locator(`section#${id} h2`)).toBeVisible();
    const text = await visibleText(page);
    expect(text).not.toMatch(/free entry|\bfree\b/i);
    expect(text).not.toMatch(/Tk\s*0(?![\d.,])/);
    if (!s.visiting.fee.known) expect(await page.locator('[data-fee]').innerText()).not.toMatch(/Tk\s*\d/);
  });

  test(`${s.id}: no horizontal scroll at 390 px`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(href(s));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });

  for (const scheme of ['light', 'dark'] as const) {
    test(`${s.id}: axe finds no serious or critical issues (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(href(s));
      const { violations } = await new AxeBuilder({ page }).analyze();
      const bad = violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
      expect(bad.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
    });
  }
}

test('hidden pins carry no coordinates and no directions link (R5)', async ({ request }) => {
  for (const s of SIX.filter(x => !x.location.latlon)) {
    const html = await (await request.get(href(s))).text();
    expect(BD_COORD_TEXT.test(html), s.id).toBe(false);
    expect(html, s.id).not.toContain('/maps/dir/');
  }
});

test('Baliati: directions, coordinates and the location state', async ({ page }) => {
  await page.goto(href(baliati));
  const [lat, lon] = baliati.location.latlon!;
  const dir = page.locator('a[data-directions]');
  await expect(dir).toHaveAttribute('href', new RegExp(`/maps/dir/.*destination=${lat.toFixed(5)},${lon.toFixed(5)}`));
  await expect(dir).toHaveAttribute('target', '_blank');
  await expect(page.locator('[data-location-state]')).toHaveAttribute('data-location-state', baliati.location.status);
});

test('Baliati: legends sit outside the timeline, each with its attribution (R3)', async ({ page }) => {
  await page.goto(href(baliati));
  await expect(page.locator('[data-timeline] [data-legends]')).toHaveCount(0);
  await expect(page.locator('section#stories [data-legends] li')).toHaveCount(baliati.legends.length);
  for (const l of baliati.legends) await expect(page.locator('section#stories')).toContainText(l.attribution);
});

test('Baliati: the fee is a price and every cost has a date', async ({ page }) => {
  await page.goto(href(baliati));
  await expect(page.locator('[data-fee]')).toContainText(`Tk ${baliati.visiting.fee.known ? baliati.visiting.fee.value : ''}`);
  for (const cell of await page.locator('[data-cost-date]').all()) await expect(cell).not.toBeEmpty();
});

test('Baliati: each itinerary links to its trip page (spec 09 FR-51, replacing spec 05 FR-44)', async ({ page }) => {
  await page.goto(href(baliati));
  await expect(page.locator('[data-itinerary]')).toHaveCount(baliati.itineraries.length);
  const links = await page.locator('[data-itineraries] a').evaluateAll(els => els.map(e => e.getAttribute('href')));
  expect(links).toEqual(baliati.itineraries.map(it => `/trips/${it.id}/`));
});

test('Baliati: every gallery image has its credit and source, and full files load only in the lightbox', async ({ page }) => {
  const wikimedia: string[] = [];
  page.on('request', r => { if (/wikimedia\.org/.test(r.url())) wikimedia.push(r.url()); });
  await page.goto(href(baliati));
  const figures = page.locator('[data-gallery] figure');
  for (const f of await figures.all()) {
    await expect(f.locator('img')).toBeVisible();
    await expect(f.locator('[data-credit]')).toBeVisible();
    await expect(f.locator('[data-credit] a')).toHaveAttribute('href', /commons\.wikimedia\.org/);
  }
  expect(wikimedia).toEqual([]);

  const opener = page.locator('[data-gallery-open="0"]');
  await opener.click();
  const box = page.locator('dialog[data-lightbox]');
  await expect(box).toBeVisible();
  await expect(box.locator('[data-counter]')).toContainText(`1 of ${baliati.images.length}`);
  await page.keyboard.press('ArrowRight');
  await expect(box.locator('[data-counter]')).toContainText(`2 of ${baliati.images.length}`);
  await expect(box).toContainText(baliati.images[1].credit);
  await page.keyboard.press('Escape');
  await expect(box).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('Elangi: sparse banner, checklist, empty history, open question and no-photo panel', async ({ page }) => {
  expect(isSparse(elangi)).toBe(true);
  await page.goto(href(elangi));
  await expect(page.getByText('Little is documented about this site')).toBeVisible();
  await expect(page.locator('#what-we-know li')).toHaveCount(8);
  await expect(page.locator('[data-history-empty]')).toContainText('No history recorded yet');
  await expect(page.locator('[data-open-question]')).toHaveCount(openQuestions(elangi).length);
  await expect(page.getByText(/Sources disagree on/)).toHaveCount(0);
  await expect(page.locator('[data-no-photo]')).toBeVisible();
  await expect(page.locator('[data-no-photo] a[data-correction="photo"]')).toHaveAttribute('href', /^\/correction\/\?.*field=photo/);
  await expect(page.locator('main a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.locator('footer a[data-contact]')).toHaveAttribute('href', 'mailto:jomidarpedia@gmail.com');
  await expect(page.locator('[data-location-state]')).toHaveAttribute('data-location-state', 'noPin');
});

test('Baliati is not sparse', async ({ page }) => {
  expect(isSparse(baliati)).toBe(false);
  await page.goto(href(baliati));
  await expect(page.getByText('Little is documented about this site')).toHaveCount(0);
  await expect(page.locator('#what-we-know')).toHaveCount(0);
});

test('the header correction link is prefilled', async ({ page }) => {
  await page.goto(href(baliati));
  const link = page.locator('header a[data-correction="general"]');
  const url = new URL((await link.getAttribute('href'))!, page.url());
  expect(url.pathname).toBe('/correction/');
  expect(url.searchParams.get('site_id')).toBe(baliati.id);
  expect(url.searchParams.get('field')).toBe('general');
  expect(url.searchParams.get('page_url')).toContain(href(baliati));
});

test('a correction link opens the form as a popup and sends it by email', async ({ page }) => {
  let sent: string | null = null;
  await page.route('https://api.web3forms.com/submit', async route => {
    sent = route.request().postData();
    await route.fulfill({ json: { success: true } });
  });
  await page.goto(href(baliati));
  await page.locator('header a[data-correction="general"]').click();
  const dialog = page.locator('[data-correction-dialog]');
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(new RegExp(href(baliati)));
  await expect(dialog.locator('input[name="subject"]')).toHaveValue(`Correction · ${baliati.id}`);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.locator('header a[data-correction="general"]').click();
  await dialog.locator('input[name="email"]').fill('reader@example.org');
  await dialog.locator('textarea[name="message"]').fill('The gate is open on Fridays.');
  await dialog.locator('[data-correction-send]').click();
  await expect(dialog.locator('[data-correction-sent]')).toBeVisible();
  expect(sent).toContain('reader@example.org');
  expect(sent).toContain(baliati.id);
  expect(sent).toContain('Jomidarpedia: Correction');
});

test('JB-MYM-019: the disagreement pill counts multi-version conflicts only', async ({ page }) => {
  const n = disagreements(conflicted).length;
  await page.goto(href(conflicted));
  await expect(page.getByText(`Sources disagree on ${n} points`)).toBeVisible();
  await expect(page.locator('[data-conflict]')).toHaveCount(n);
});

test('JB-DHK-008 is shown as unverified (O9)', async ({ page }) => {
  await page.goto(href(unverified));
  await expect(page.locator('header').getByText('Location unverified')).toBeVisible();
  await expect(page.locator('header').getByText('Location confirmed')).toHaveCount(0);
});

// Chosen by rule: Phase 12 gave JB-RAJ-059 its Bangla name, so the test uses any site still without one.
const bnMissing = readdirSync('data/build/sites').map(f => site(f.replace(/\.json$/, ''))).find(x => x.bnMissing);

test('a site without a Bangla name: English name only, with the note outside the heading (O13)', async ({ page }) => {
  test.skip(!bnMissing, 'every site has a Bangla name (Phase 12 FR-25)');
  await page.goto(href(bnMissing!));
  const h1 = page.locator('h1');
  await expect(h1).toHaveText(bnMissing!.name.en);
  await expect(h1.locator('[lang="bn"]')).toHaveCount(0);
  await expect(page.locator('header').getByText('Bangla name not yet recorded')).toBeVisible();
});

test('an identity relation shows a note under the summary, not in Combine with', async ({ page }) => {
  const s = site('JB-DHK-090');
  const other = s.related.find(r => r.relation === 'same_name_different_site')!;
  await page.goto(href(s));
  await expect(page.locator('[data-identity-notes]')).toContainText('Not the same place as');
  await expect(page.locator(`[data-combine] a[href*="${other.id}"]`)).toHaveCount(0);
});

test('"May be out of date" follows the clock, not the build', async ({ page }) => {
  const date = baliati.visiting.date!;
  const [y, m] = date.split('-').map(Number);
  await page.clock.setFixedTime(new Date(Date.UTC(y + 1, m + 1, 1)));
  await page.goto(href(baliati));
  await expect(page.locator('section#visiting [data-stale]')).toBeVisible();
  const fresh = await page.context().newPage();
  await fresh.clock.setFixedTime(new Date(Date.UTC(y, m + 9, 1)));
  await fresh.goto(href(baliati));
  await expect(fresh.locator('section#visiting')).toContainText('Last checked');
  await expect(fresh.locator('section#visiting [data-stale]')).toHaveCount(0);
});

test('mobile: the section select moves to a section and focuses its heading', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto(href(baliati));
  await page.locator('select[data-section-select]').selectOption('getting-there');
  await expect(page.locator('#getting-there h2')).toBeFocused();
});

test('Share copies the link when navigator.share is missing; Copy coordinates uses Latin digits', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.addInitScript(() => { Object.defineProperty(navigator, 'share', { value: undefined }); });
  await page.goto(href(baliati));
  await page.locator('header').getByRole('button', { name: 'Share' }).click();
  await expect(page.locator('header [role="status"]')).toHaveText('Link copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(href(baliati));
  await page.getByRole('button', { name: 'Copy coordinates' }).click();
  const [lat, lon] = baliati.location.latlon!;
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
});
