// The data download links (spec 16 FR-14, FR-16, FR-17; AC-12, AC-14). A release build has the zip, and About's
// licences block and the footer link to it in both languages. Any other build has neither the zip nor a link.
// CI's e2e job serves a local build, so it checks the absence; run against a release build to check the links.

import { expect, test } from './fixtures';
import { existsSync, readFileSync } from 'node:fs';
import { stubTiles } from './tiles';

const ZIP = '/data/jomidarpedia-data.zip';
const release = existsSync(`out${ZIP}`);

test.beforeEach(async ({ page }) => { await stubTiles(page); });

test('a build without the download shows no download link', async ({ page }) => {
  test.skip(release || !!process.env.PW_BASE_URL, 'this build has the download');
  await page.goto('/about/');
  await expect(page.locator(`a[href="${ZIP}"]`)).toHaveCount(0);
});

test.describe('release build', () => {
  test.skip(!release && !process.env.PW_BASE_URL, 'only a release build writes the download');
  const info = existsSync('data/build/export.json') ? JSON.parse(readFileSync('data/build/export.json', 'utf8')) : { megabytes: 0 };

  test('About and the footer link to the zip, in English', async ({ page }) => {
    await page.goto('/about/');
    const lic = page.locator('#licences [data-download]:visible');
    await expect(lic.locator(`a[href="${ZIP}"]`)).toHaveAttribute('download', '');
    await expect(lic.locator('[data-l="en"]').filter({ hasText: 'Download the data' })).toBeVisible();
    await expect(lic).toContainText(`${info.megabytes} MB zip`);
    await expect(page.locator(`footer a[href="${ZIP}"]`)).toBeVisible();
  });

  test('in Bangla, the size uses Bengali digits', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('jp-lang', 'bn'));
    await page.goto('/about/');
    const lic = page.locator('#licences [data-download]:visible');
    await expect(lic.locator('[data-l="bn"]').filter({ hasText: 'সব তথ্য ডাউনলোড করুন' })).toBeVisible();
    const bn = String(info.megabytes).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[Number(d)]);
    await expect(lic.locator('[data-l="bn"]').last()).toContainText(`${bn} মেগাবাইট`);
    await expect(page.locator('footer [data-download] [data-l="bn"]')).toHaveText('তথ্য ডাউনলোড');
  });

  test('the link downloads a non-empty zip', async ({ page }) => {
    const res = await page.request.get(ZIP);
    expect(res.status()).toBe(200);
    const body = await res.body();
    expect(body.length).toBeGreaterThan(1000);
    expect(body.subarray(0, 2).toString()).toBe('PK');
  });
});
