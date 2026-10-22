#!/usr/bin/env node
// Builds public/data/index.json: the one file the browser fetches
// (Explore map + list, search, Lite mode). Everything else is read at build time.
//
// Usage: node scripts/build-index.mjs [sites.csv] [images.csv] [out-dir]
//   defaults: data/csv/sites.csv data/csv/images.csv public/data
// The mode comes from scripts/data-mode.mjs (release unless set). No dependencies.

import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TYPE_GROUP, BUCKET, latlon, isMappable } from './lib/validate.mjs';
import { loadTables, validateTables } from './lib/structure.mjs';
import { scanOutputs, coordinateLeaks, notesByCell, ZERO_OR_FREE } from './lib/checks.mjs';

export const INDEX_BUDGET = 150 * 1024;
const DAY = { TRUE: 1, FALSE: 0 };

/** @param {{ sitesPath?: string, imagesPath?: string, outDir?: string, budget?: number }} [options] */
export function buildIndex({
  sitesPath = 'data/csv/sites.csv', imagesPath = 'data/csv/images.csv', outDir = 'public/data', budget = INDEX_BUDGET
} = {}) {
  const outFile = join(outDir, 'index.json');
  const result = { name: 'build-index', structural: [], gates: [], editorial: {}, warnings: [], info: [], outputs: [outFile] };

  // Both files are read as tables; images.csv is optional only in name, as the index needs photo flags.
  const T = {}, structural = [];
  for (const [name, path] of [['sites', sitesPath], ['images', imagesPath]]) {
    const { T: t, errors } = loadTables(dirname(path), [basename(path, '.csv')]);
    T[name] = Object.values(t)[0];
    structural.push(...errors.map(e => ({ ...e, file: basename(path) })));
  }
  if (!structural.length) structural.push(...validateTables(T));
  if (structural.length) {
    result.structural = structural;
    rmSync(outFile, { force: true });
    return result;
  }

  // Only openly licensed, reviewed images may ever reach the site.
  const withPhoto = new Set(T.images.filter(im => (im.publication_readiness || '').startsWith('Ready')).map(im => im.site_id));

  const index = T.sites.map(s => {
    const fee = s.visitor_access === 'ticketed' && s.entry_fee_bdt !== '' && Number(s.entry_fee_bdt) > 0 ? Number(s.entry_fee_bdt) : null;
    if (s.visitor_access === 'ticketed' && fee === null) result.warnings.push(`${s.site_id}: ticketed but no fee`);
    return {
      i: s.site_id,                       // permanent ID
      s: s.dataset_slug,                  // URL slug
      e: s.name_en, b: s.name_bn,
      a: s.alternate_names || undefined,  // searched, not shown in the list
      dv: s.division, d: s.district, db: s.district_bn, u: s.upazila || undefined,
      ll: latlon(s),
      lc: s.coordinates_status,           // verified | single_source | approximate | unverified | not_found
      f: s.map_display === 'show_flagged' ? 1 : undefined,
      c: s.condition_category,
      ac: s.visitor_access,
      fe: fee ?? undefined,               // only when ticketed and known; never 0
      h: s.travel_time_hours_from_dhaka ? Number(s.travel_time_hours_from_dhaka) : undefined,
      tb: BUCKET[s.travel_time_bucket] ?? 'unknown',
      dt: DAY[s.day_trip_from_dhaka],     // 1, 0 or undefined (= unknown)
      rc: s.record_confidence,
      t: TYPE_GROUP[s.site_type] ?? 'unclassified',
      p: withPhoto.has(s.site_id) ? 1 : undefined
    };
  });

  // Safety rules: hidden pins, fees, budget.
  const siteById = new Map(T.sites.map(s => [s.site_id, s]));
  for (const row of index) {
    if (!isMappable(siteById.get(row.i))) result.gates.push(...coordinateLeaks(`index.json ${row.i}`, row, ['ll']));
    if (row.fe !== undefined && (!(row.fe > 0) || ZERO_OR_FREE.test(String(row.fe)))) result.gates.push(`index.json ${row.i}: fee shown as "${row.fe}"`);
  }
  const outputs = index.map(row => ({ file: `index.json ${row.i}`, id: row.i, value: row }));
  const { notes, freeEntry } = scanOutputs(outputs);
  result.gates.push(...freeEntry);
  const { cells } = notesByCell(T, notes);
  result.editorial.notes = cells;

  const json = JSON.stringify(index);
  const gz = gzipSync(json).length;
  if (gz > budget) result.gates.push(`index.json is ${(gz / 1024).toFixed(1)} KB gzipped, over the ${(budget / 1024).toFixed(0)} KB budget`);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, json);
  result.counts = { sites: index.length, onMap: index.filter(x => x.ll).length, withPhotos: index.filter(x => x.p).length, gzipBytes: gz };
  result.info.push(`index.json  sites: ${index.length}  raw: ${(json.length / 1024).toFixed(1)} KB  gzipped: ${(gz / 1024).toFixed(1)} KB  (budget ${(budget / 1024).toFixed(0)} KB)`);
  result.info.push(`            on map: ${result.counts.onMap}  with photos: ${result.counts.withPhotos}`);
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { runCli } = await import('./lib/cli.mjs');
  const [sitesPath, imagesPath, outDir] = process.argv.slice(2);
  runCli([() => buildIndex({ sitesPath, imagesPath, outDir })]);
}
