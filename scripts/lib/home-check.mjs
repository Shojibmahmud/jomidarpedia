// Home photo check (spec 11 FR-24, D2), run by `npm run data` after the thumbnail check. Fatal in every mode:
// - every ID in lib/home-images.json is a Ready image (credits.json) with its thumbnail and home variants;
// - each division tile shows a site in that division; each category tile a site that matches its filter;
// - public/home/ holds no .webp other than the listed variants, since any file there is published (R4).
// It also warns when a home count is 0 (spec 11 A-5). Like the thumbnail check, it never reads the originals.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homeVariants, variantFile } from '../build-thumbs.mjs';

/** What a category tile's photo must show (FR-9): the same rule as the tile's Explore link. */
export const CATEGORY_TEST = {
  dayTrips: s => s.dt === 1,
  preserved: s => s.c === 'preserved',
  ruins: s => s.c === 'in_ruins',
  newUse: s => s.c === 'preserved_adaptive_reuse',
};

/** @param {{ buildDir?: string, indexPath?: string, thumbsDir?: string, homeDir?: string, listPath?: string }} [options] */
export function checkHome({
  buildDir = 'data/build', indexPath = 'public/data/index.json', thumbsDir = 'public/thumbs', homeDir = 'public/home', listPath = 'lib/home-images.json'
} = {}) {
  const result = { name: 'home', structural: [], gates: [], editorial: {}, warnings: [], info: [], outputs: [] };
  const creditsPath = join(buildDir, 'credits.json');
  if (!existsSync(creditsPath) || !existsSync(indexPath)) { result.info.push('home: skipped (no data/build output)'); return result; }
  if (!existsSync(listPath)) { result.info.push(`home: skipped (no ${listPath})`); return result; }
  const gate = m => result.gates.push(`${listPath}: ${m}`);

  const list = JSON.parse(readFileSync(listPath, 'utf8'));
  const credits = new Map(JSON.parse(readFileSync(creditsPath, 'utf8')).map(c => [c.imageId, c]));
  const sites = new Map(JSON.parse(readFileSync(indexPath, 'utf8')).map(s => [s.i, s]));
  const divisions = JSON.parse(readFileSync(join(buildDir, 'divisions.json'), 'utf8'));
  const site = id => sites.get(credits.get(id)?.siteId);

  const wanted = homeVariants(list);
  for (const [id, widths] of wanted) {
    if (!credits.has(id)) { gate(`${id} is not a Ready image`); continue; }
    if (!existsSync(join(thumbsDir, `${id}.webp`))) gate(`${id} has no thumbnail in ${thumbsDir}/ (run npm run thumbs)`);
    for (const w of widths) if (!existsSync(join(homeDir, variantFile(id, w)))) gate(`${id} has no ${w} px variant in ${homeDir}/ (run npm run thumbs)`);
  }
  for (const key of Object.keys(CATEGORY_TEST)) {
    const id = list.categories?.[key];
    if (!id) { gate(`no photo for the "${key}" tile`); continue; }
    const s = site(id);
    if (s && !CATEGORY_TEST[key](s)) gate(`${id} (${s.i}) does not match the "${key}" tile`);
  }
  for (const d of divisions) {
    const id = list.divisions?.[d.slug];
    if (!id) { gate(`no photo for the ${d.slug} division tile`); continue; }
    const s = site(id);
    if (s && s.dv !== d.en) gate(`${id} (${s.i}) is in ${s.dv}, not ${d.en}`);
  }
  for (const slug of Object.keys(list.divisions ?? {})) if (!divisions.some(d => d.slug === slug)) gate(`"${slug}" is not a division in divisions.json`);

  const expected = new Set([...wanted].flatMap(([id, widths]) => widths.map(w => variantFile(id, w))));
  const onDisk = existsSync(homeDir) ? readdirSync(homeDir).filter(f => f.endsWith('.webp')) : [];
  for (const f of onDisk.sort()) if (!expected.has(f)) result.gates.push(`${homeDir}/${f} is not a listed home variant and must not be published (run npm run thumbs)`);

  const metaPath = join(buildDir, 'meta.json');
  if (existsSync(metaPath)) {
    const { counts } = JSON.parse(readFileSync(metaPath, 'utf8'));
    const shown = { dayTripSites: counts.dayTripSites, openToVisitors: counts.openToVisitors, preserved: counts.conditions.preserved,
      in_ruins: counts.conditions.in_ruins, preserved_adaptive_reuse: counts.conditions.preserved_adaptive_reuse };
    for (const [k, v] of Object.entries(shown)) if (!v) result.warnings.push(`home: the ${k} count is 0; its tile or chip shows 0`);
  }
  result.info.push(`home             ${wanted.size} curated photos; ${onDisk.length} variants in ${homeDir}/`);
  return result;
}
