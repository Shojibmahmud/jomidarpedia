#!/usr/bin/env node
// `npm run icons`: maintenance command (roadmap task 3.8). Writes the committed browser icons from the
// logo geometry in scripts/lib/logo.mjs:
//   public/icon.svg            the simple mark (favicons are drawn at 16–32 px), with a dark variant
//   public/apple-touch-icon.png 180×180, full bleed (iOS rounds the corners itself)
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

export async function buildIcons(dir = 'public') {
  writeFileSync(`${dir}/icon.svg`, iconSvg());
  await sharp(Buffer.from(markSvg({ simple: true, radius: 0 })), { density: 300 })
    .resize(180, 180).png({ compressionLevel: 9 }).toFile(`${dir}/apple-touch-icon.png`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await buildIcons();
  console.log('wrote public/icon.svg and public/apple-touch-icon.png');
}
