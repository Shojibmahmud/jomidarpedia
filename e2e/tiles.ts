// Map tiles in tests (spec 07 A-5): every tile request is answered with a local 1 × 1 image, so no test
// contacts a tile server, whichever page shows a map.

import type { Page } from '@playwright/test';

export const TILE = /basemaps\.cartocdn\.com|tile\.openstreetmap\.org/;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

export async function stubTiles(page: Page) {
  await page.route(TILE, r => r.fulfill({ contentType: 'image/png', body: PNG }));
}
