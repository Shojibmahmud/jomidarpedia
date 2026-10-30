// The Bangla device check's automated guard (spec 15 FR-14 to FR-16, AC-6, AC-8): on the pages the owner checks
// on phones, Bangla text is drawn only with the site's own Bangla fonts, nothing scrolls sideways at 390 px, and
// prose digits are Bengali except in IDs and codes. Chromium only: fonts are read through the DevTools protocol.
// Run `npm run build:local` first.

import { expect, test, type Page } from './fixtures';
import { readdirSync, readFileSync } from 'node:fs';
import type { SiteRecord } from '../lib/types';
import { stubTiles } from './tiles';

test.beforeEach(async ({ page }) => { await stubTiles(page); });

/** The checklist pages (spec 15 FR-1, rows P1–P8). */
const PAGES = [
  '/site/JB-DHK-064/baliati-palace/',
  '/site/JB-SYL-005/jalsukha-zamindar-bari-cluster/',
  '/site/JB-KHL-031/shilaidaha-rabindra-kuthibari/',
  '/site/JB-DHK-002/ahsan-manzil/',
  '/trips/IT-KHL-026-1/',
  '/explore/',
  '/explore/?view=map&sel=JB-DHK-064',
  '/division/sylhet/',
  '/about/',
];

/** The site's Bangla web fonts: the body and heading faces, and the Noto Sans Bengali digit subset (app/fonts.ts). */
const BANGLA_FONTS = /^(Hind Siliguri|Tiro Bangla|Noto Sans Bengali)\b/;

const bangla = (page: Page) => page.addInitScript(() => localStorage.setItem('jp-lang', 'bn'));

/**
 * Fonts used for visible elements whose text is Bangla letters, spaces and punctuation only, up to 40 of the
 * longest on the page. The Latin web fonts have no Bangla glyphs, so a web font there can only have drawn
 * punctuation; any system font means a Bangla glyph fell through to the phone's own font. Symbols such as "→"
 * that no site font has are left out: they fall back to a system font by design.
 */
async function banglaFonts(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const count = await page.evaluate(() => {
    const own = (el: Element) => [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('');
    const banglaOnly = (t: string) => /[ঀ-৿]/.test(t) && /^[ঀ-৿\s‌‍.,;:!?'"‘’“”()[\]\-–—/…·]*$/.test(t);
    const visible = (el: Element) => (el as HTMLElement).offsetParent !== null && !el.closest('.sr-only');
    const picked = [...document.querySelectorAll('body *')]
      .filter(el => visible(el) && banglaOnly(own(el)) && banglaOnly(el.textContent ?? ''))
      .sort((a, b) => (b.textContent?.length ?? 0) - (a.textContent?.length ?? 0))
      .slice(0, 40);
    picked.forEach(el => el.setAttribute('data-font-probe', ''));
    return picked.length;
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-font-probe]' });
  const used = new Map<string, boolean>();
  for (const nodeId of nodeIds) {
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    for (const f of fonts) if (f.glyphCount > 0) used.set(f.familyName, f.isCustomFont);
  }
  await cdp.detach();
  return { count, used };
}

test.describe('Bangla rendering guard at 390 px (spec 15 FR-14, FR-15, AC-8)', () => {
  test.use({ viewport: { width: 390, height: 900 } });

  for (const path of PAGES) {
    test(`${path}: Bangla in the site's fonts, no sideways scroll`, async ({ page }) => {
      await bangla(page);
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.locator('html')).toHaveAttribute('lang', 'bn');

      const { count, used } = await banglaFonts(page);
      expect(count, 'Bangla-only elements probed').toBeGreaterThan(5);
      const system = [...used].filter(([, custom]) => !custom).map(([family]) => family);
      expect(system, 'system fonts drew Bangla text').toEqual([]);
      expect([...used.keys()].filter(f => BANGLA_FONTS.test(f)), 'Bangla web fonts used').not.toEqual([]);

      const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: document.documentElement.clientWidth }));
      expect(scroll, 'horizontal overflow').toBeLessThanOrEqual(width);
    });
  }
});

test.describe('Bengali digits in Bangla prose (spec 15 FR-8, FR-10, FR-16, AC-6)', () => {
  const sites: SiteRecord[] = readdirSync('data/build/sites').sort().map(f => JSON.parse(readFileSync(`data/build/sites/${f}`, 'utf8')));
  // A site whose Bangla history names an outlet with digits next to a year, e.g. "(bdnews24 ব্লগ 2011)".
  const withOutlet = sites.find(s => s.history.some(e => e.textBn && /bdnews24 \S+ \d{4}/.test(e.textBn)));

  test('history years show Bengali digits in Bangla and Latin digits in English', async ({ page }) => {
    const path = '/site/JB-SYL-005/jalsukha-zamindar-bari-cluster/';
    await bangla(page);
    await page.goto(path);
    const history = page.locator('#history');
    await expect(history.locator('[data-l="bn"]').filter({ hasText: '১৭০০' }).first()).toBeVisible();
    await expect(history.locator('[data-l="bn"]').filter({ hasText: /\b1700\b/ })).toHaveCount(0);

    await page.evaluate(() => localStorage.removeItem('jp-lang'));
    await page.addInitScript(() => localStorage.removeItem('jp-lang'));
    await page.reload();
    await expect(history.locator('[data-l="en"]').filter({ hasText: '1700' }).first()).toBeVisible();
  });

  test('an outlet name keeps its Latin digits inside Bangla prose', async ({ page }) => {
    test.skip(!withOutlet, 'no Bangla history mentions bdnews24 with a year');
    const event = withOutlet!.history.find(e => e.textBn && /bdnews24 \S+ \d{4}/.test(e.textBn))!;
    const year = event.textBn!.match(/bdnews24 \S+ (\d{4})/)![1];
    const bnYear = year.replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[Number(d)]);
    await bangla(page);
    await page.goto(`/site/${withOutlet!.id}/${withOutlet!.slug}/`);
    const text = await page.locator('#history [data-l="bn"]').filter({ hasText: 'bdnews24' }).first().textContent();
    expect(text).toContain('bdnews24');
    expect(text).toContain(bnYear);
    expect(text).not.toMatch(new RegExp(`\\b${year}\\b`));
  });

  test('the Bangla About page keeps its link targets', async ({ page }) => {
    await bangla(page);
    await page.goto('/about/');
    const hrefs = await page.locator('[data-l="bn"] a[href]').evaluateAll(as => as.map(a => a.getAttribute('href') ?? ''));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const h of hrefs) expect(h, h).not.toMatch(/[০-৯]/);
  });
});
