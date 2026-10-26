#!/usr/bin/env node
// `npm run check:budgets`: the size budgets of roadmap task 13.1 (spec 13 FR-2 to FR-4, A-2), measured on the
// static export so the result is the same on every run. Lighthouse CI (lighthouserc.json) adds the category
// scores, which need a browser. It fails when:
//   - public/data/index.json is over 150 KB gzipped;
//   - the home page's JavaScript is over HOME_JS_BUDGET gzipped. Counted: every script out/index.html loads in a
//     modern browser (A-2: the noModule polyfills are skipped by those browsers and are not counted);
//   - the largest image the home page can load (any src or srcset candidate) is over 300 KB;
//   - the home page references a Leaflet, leaflet.markercluster or Fuse.js chunk (FR-4).

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

const KB = 1024;
export const INDEX_BUDGET = 150 * KB;
// The measured size plus 5 KB (D7, OQ-2): 160.7 KB on 26 Oct 2026. React and the Next runtime are ~128 KB of it and
// the interface strings (lib/i18n.ts, pulled in whole by the client components) ~18 KB, so 150 KB is not reachable
// without loading strings per component; see the roadmap's Phase 13 notes.
export const HOME_JS_BUDGET = 166 * KB;
export const HOME_IMAGE_BUDGET = 300 * KB;
const HEAVY = [['Leaflet', 'leaflet-container'], ['leaflet.markercluster', 'MarkerClusterGroup'], ['Fuse.js', 'useExtendedSearch']];

const gz = file => gzipSync(readFileSync(file), { level: 9 }).length;
const fmt = n => `${(n / KB).toFixed(1)} KB`;

/** The scripts a modern browser loads for one page (noModule scripts excluded), as paths under out/. */
export function pageScripts(html) {
  const scripts = [];
  for (const [tag] of html.matchAll(/<script\b[^>]*\bsrc="[^"]+"[^>]*>/gi)) {
    if (/\bnoModule\b/i.test(tag)) continue;
    scripts.push(decodeURIComponent(tag.match(/\bsrc="([^"]+)"/)[1]));
  }
  return [...new Set(scripts)];
}

/** Every local image URL the page can load: img src, srcset candidates, and og:image is ignored (not loaded). */
export function pageImages(html) {
  const urls = new Set();
  for (const [tag] of html.matchAll(/<(?:img|source)\b[^>]*>/gi)) {
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1];
    if (src) urls.add(src);
    const set = tag.match(/\bsrcset="([^"]+)"/i)?.[1];
    if (set) for (const part of set.split(',')) urls.add(part.trim().split(/\s+/)[0]);
  }
  return [...urls].filter(u => u.startsWith('/'));
}

/** @param {{ dir?: string, budgets?: { index?: number, homeJs?: number, homeImage?: number } }} [options] */
export function checkBudgets({ dir = 'out', budgets = {} } = {}) {
  const b = { index: INDEX_BUDGET, homeJs: HOME_JS_BUDGET, homeImage: HOME_IMAGE_BUDGET, ...budgets };
  if (!existsSync(join(dir, 'index.html'))) throw new Error(`${dir}/index.html does not exist: build first`);
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  const problems = [];
  const lines = [];

  const index = gz(join(dir, 'data/index.json'));
  lines.push(`index.json: ${fmt(index)} gzipped (budget ${fmt(b.index)})`);
  if (index > b.index) problems.push(`index.json is ${fmt(index)} gzipped, over ${fmt(b.index)}`);

  const scripts = pageScripts(html);
  const sizes = scripts.map(s => ({ s, n: gz(join(dir, s)) })).sort((x, y) => y.n - x.n);
  const js = sizes.reduce((t, x) => t + x.n, 0);
  lines.push(`home JavaScript: ${fmt(js)} gzipped in ${scripts.length} files (budget ${fmt(b.homeJs)})`);
  for (const { s, n } of sizes.slice(0, 5)) lines.push(`  ${fmt(n)}  ${s}`);
  if (js > b.homeJs) problems.push(`home JavaScript is ${fmt(js)} gzipped, over ${fmt(b.homeJs)}`);
  // Chunk names are hashed, so look inside too: each library carries a string only it uses.
  for (const { s } of sizes) {
    const code = readFileSync(join(dir, s), 'utf8');
    for (const [name, marker] of HEAVY) if (code.includes(marker)) problems.push(`home page loads ${name} (${s})`);
  }

  const images = pageImages(html).filter(u => existsSync(join(dir, u))).map(u => ({ u, n: statSync(join(dir, u)).size })).sort((x, y) => y.n - x.n);
  const biggest = images[0];
  if (biggest) {
    lines.push(`largest home image: ${fmt(biggest.n)} ${biggest.u} (budget ${fmt(b.homeImage)})`);
    if (biggest.n > b.homeImage) problems.push(`home image ${biggest.u} is ${fmt(biggest.n)}, over ${fmt(b.homeImage)}`);
  }
  return { problems, lines };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { problems, lines } = checkBudgets();
  for (const l of lines) console.log(l);
  for (const p of problems) console.log(`FAIL ${p}`);
  if (problems.length) process.exitCode = 1;
}
