#!/usr/bin/env node
// `npm run check:out`: link and leak checks over the static export (roadmap task 13.9; spec 13 FR-29 to FR-32).
// Run after a build, in CI after `build:local` and after the release build (A-5). It fails when:
//   - a link that opens a new tab lacks rel="noopener noreferrer" (FR-29);
//   - published text carries an internal term or a working-file name (FR-30) or a local path (FR-31);
//   - a hidden site's coordinates appear anywhere (FR-32). They are read from every column of that site's
//     sites.csv row (the note and the Google Maps link may name the pin or a nearby place), and searched at
//     the precision stored and rounded to 4 and 5 decimals, in plain and URL-encoded text. A pair within about
//     100 m of a shown site's own pin is skipped: a note may name a neighbour's public location (e.g. JB-KHL-046's
//     note gives the Jessoreshwari temple, JB-KHL-047, which is published), and that reveals nothing hidden.
// The data build already checks its own output (scripts/lib/checks.mjs); this checks what is actually served.
// JavaScript chunks under _next/static are framework code, not published text, and are not searched for terms.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseCsv } from './csv.mjs';
import { INTERNAL_TERMS, LOCAL_PATHS, WORKING_FILES } from './lib/internal-terms.mjs';

const TEXT_TYPES = new Set(['.html', '.json', '.txt', '.xml']);
const COORD_PAIR = /(-?\d{1,2}\.\d{3,})\s*(?:,|%2C)\s*(-?\d{2,3}\.\d{3,})/gi;

export function outFiles(dir) {
  const files = [];
  const walk = d => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk(dir);
  return files;
}

/** Links that open a new tab without both noopener and noreferrer. */
export function unsafeLinks(html) {
  const bad = [];
  for (const [tag] of html.matchAll(/<a\b[^>]*>/gi)) {
    if (!/\btarget=["']?_blank/i.test(tag)) continue;
    const rel = tag.match(/\brel=["']([^"']*)["']/i)?.[1].toLowerCase().split(/\s+/) ?? [];
    if (!rel.includes('noopener') || !rel.includes('noreferrer')) bad.push(tag.slice(0, 160));
  }
  return bad;
}

// Visible text and attribute values only: markup, inline scripts' code and styles are not published text,
// but the strings inside a Next payload are, so they are kept.
const textOf = html => html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');

/** Internal terms, working-file names and local paths in one file's text. */
export function termHits(text) {
  const hits = [];
  for (const re of [...INTERNAL_TERMS, ...WORKING_FILES, ...LOCAL_PATHS]) {
    const m = text.match(new RegExp(re.source, re.flags.replace('g', '')));
    if (m) hits.push({ term: m[0], context: text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).replace(/\s+/g, ' ') });
  }
  return hits;
}

const variants = v => {
  const n = Number(v);
  return [...new Set([v, n.toFixed(5), n.toFixed(4)])];
};

/** Patterns for every coordinate pair recorded for a hidden site: "lat, lon" in any of the precisions. */
export function hiddenCoordinatePatterns(sitesCsv) {
  const { rows } = parseCsv(sitesCsv);
  const shown = rows.filter(r => r.map_display !== 'hide' && r.latitude && r.longitude).map(r => [Number(r.latitude), Number(r.longitude)]);
  const isShownPin = ([lat, lon]) => shown.some(([a, b]) => Math.abs(a - lat) < 0.001 && Math.abs(b - lon) < 0.001);
  const out = [];
  for (const r of rows.filter(r => r.map_display === 'hide')) {
    const pairs = [];
    if (r.latitude && r.longitude) pairs.push([r.latitude, r.longitude]);
    for (const value of Object.values(r)) for (const m of String(value).matchAll(COORD_PAIR)) pairs.push([m[1], m[2]]);
    for (const [lat, lon] of pairs.filter(p => !isShownPin(p.map(Number)))) {
      for (const la of variants(lat)) for (const lo of variants(lon)) {
        const esc = s => s.replace(/[.-]/g, c => `\\${c}`);
        out.push({ site: r.site_id, pair: `${lat}, ${lon}`, re: new RegExp(`${esc(la)}\\d*\\s*(?:,|%2C|/|\\s)\\s*${esc(lo)}`, 'i') });
      }
    }
  }
  return out;
}

/** @param {{ dir?: string, sitesCsv?: string }} [options] */
export function checkOut({ dir = 'out', sitesCsv = 'data/csv/sites.csv' } = {}) {
  if (!existsSync(dir)) throw new Error(`${dir}/ does not exist: build first`);
  const problems = [];
  const coords = hiddenCoordinatePatterns(readFileSync(sitesCsv, 'utf8'));
  // One combined pattern for speed; the single patterns name the site only when it matches.
  const anyCoord = coords.length ? new RegExp(coords.map(c => c.re.source).join('|'), 'i') : null;
  let checked = 0;
  for (const file of outFiles(dir)) {
    const ext = extname(file);
    if (!TEXT_TYPES.has(ext)) continue;
    const rel = relative(dir, file);
    const raw = readFileSync(file, 'utf8');
    checked++;
    if (ext === '.html') for (const tag of unsafeLinks(raw)) problems.push(`${rel}: new-tab link without rel="noopener noreferrer": ${tag}`);
    if (!rel.startsWith(`_next${'/'}static`)) {
      for (const h of termHits(ext === '.html' ? textOf(raw) : raw)) problems.push(`${rel}: "${h.term}" in "…${h.context}…"`);
    }
    if (anyCoord?.test(raw)) for (const c of coords) if (c.re.test(raw)) problems.push(`${rel}: coordinates of hidden site ${c.site} (${c.pair})`);
  }
  return { problems: [...new Set(problems)], checked, hiddenPairs: new Set(coords.map(c => `${c.site} ${c.pair}`)).size };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { problems, checked, hiddenPairs } = checkOut();
  console.log(`checked ${checked} files in out/ (${hiddenPairs} hidden-site coordinate pairs searched)`);
  for (const p of problems.slice(0, 200)) console.log(`  ${p}`);
  if (problems.length > 200) console.log(`  … and ${problems.length - 200} more`);
  if (problems.length) {
    console.log(`${problems.length} problem(s)`);
    process.exitCode = 1;
  } else console.log('no problems');
}
