#!/usr/bin/env node
// `npm run icons`: maintenance command (roadmap task 3.8). Writes the committed browser icons from the
// logo geometry in scripts/lib/logo.mjs:
//   public/icon.svg            the simple mark (favicons are drawn at 16–32 px), with a dark variant
//   public/apple-touch-icon.png 180×180, full bleed (iOS rounds the corners itself)
//   public/og-default.png       1200×630 share card for pages without a photo (roadmap 13.11, spec 13 FR-38)
// tests/assets.test.ts checks that the committed icon.svg still matches the geometry.

import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { markGlyph, markSvg, VIEWBOX } from './lib/logo.mjs';

// Light: terracotta tile, white glyph. Dark (as on the board's dark lockup): light terracotta, dark glyph.
export function iconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}">` +
    '<style>.b{fill:#A3422A}.g{color:#FFFFFF}@media (prefers-color-scheme:dark){.b{fill:#E58B6C}.g{color:#191712}}</style>' +
    `<rect class="b" width="64" height="64" rx="14"/><g class="g">${markGlyph({ simple: true })}</g></svg>\n`;
}

// The share card: the full mark and the name on the page colour. Latin text only, so the card renders the same
// with any system serif; the Bangla name is in the page itself.
export function ogSvg() {
  const mark = markSvg({ radius: 14 }).replace('<svg ', '<svg x="120" y="195" width="240" height="240" ');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">' +
    '<rect width="1200" height="630" fill="#F7F2E8"/><rect y="600" width="1200" height="30" fill="#A3422A"/>' + mark +
    '<text x="410" y="305" font-family="Georgia, \'Times New Roman\', serif" font-size="84" font-weight="700" fill="#191712">Jomidarpedia</text>' +
    '<text x="412" y="375" font-family="Georgia, \'Times New Roman\', serif" font-size="38" fill="#5C5446">The zamindar palaces of Bangladesh</text></svg>\n';
}

export async function buildIcons(dir = 'public') {
  writeFileSync(`${dir}/icon.svg`, iconSvg());
  await sharp(Buffer.from(markSvg({ simple: true, radius: 0 })), { density: 300 })
    .resize(180, 180).png({ compressionLevel: 9 }).toFile(`${dir}/apple-touch-icon.png`);
  await sharp(Buffer.from(ogSvg())).png({ compressionLevel: 9, palette: true }).toFile(`${dir}/og-default.png`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await buildIcons();
  console.log('wrote public/icon.svg, public/apple-touch-icon.png and public/og-default.png');
}
