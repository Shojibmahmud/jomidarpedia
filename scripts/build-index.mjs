#!/usr/bin/env node
// Builds public/data/index.json: the one file the browser fetches
// (Explore map + list, search, Lite mode). Everything else is read at build time.
//
// Usage: node scripts/build-index.mjs <sites.csv> <images.csv> <out-dir>
// No dependencies: the CSV reader is in ./csv.mjs.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { parseCsv } from './csv.mjs';

// Site types grouped as in the filter drawer.
const TYPE_GROUP = {
  zamindar_house: 'house', talukdar_house: 'house', jotdar_house: 'house', historic_residence: 'house', garden_house: 'house',
  royal_palace: 'rajbari', kachari: 'kachari', kachari_bari: 'kachari', indigo_kuthi: 'kuthi', circle_chief_seat: 'chief',
  temple: 'religious', mosque: 'religious', math: 'religious', fort: 'fort',
  museum: 'other', estate_cluster: 'other', dighi: 'other', hammamkhana: 'other', archaeological_site: 'other', memorial_institution: 'other',
  unclassified: 'unclassified'
};
// The data has '4-5h' and '4h+'; the UI merges them.
const BUCKET = { '0-1h': '0-1', '1-2h': '1-2', '2-3h': '2-3', '3-4h': '3-4', '4-5h': '4+', '4h+': '4+', unknown: 'unknown' };
const DAY = { TRUE: 1, FALSE: 0 };

const [sitesPath, imagesPath, outDir] = process.argv.slice(2);
if (!sitesPath || !outDir) { console.error('usage: build-index.mjs <sites.csv> <images.csv> <out-dir>'); process.exit(1); }

const sites = parseCsv(readFileSync(sitesPath, 'utf8'));
const withPhoto = new Set();
if (imagesPath) {
  for (const im of parseCsv(readFileSync(imagesPath, 'utf8'))) {
    // Only openly licensed, reviewed images may ever reach the site.
    if ((im['Publication readiness'] || im.publication_readiness || '').startsWith('Ready')) withPhoto.add(im['Jomidarbari ID'] || im.site_id);
  }
}

const warnings = [];
const index = sites.map(s => {
  const hidden = s.map_display === 'hide' || !s.latitude;
  const fee = s.visitor_access === 'ticketed' && s.entry_fee_bdt !== '' && s.entry_fee_bdt !== '0' ? Number(s.entry_fee_bdt) : null;
  if (s.visitor_access === 'ticketed' && fee === null) warnings.push(`${s.site_id}: ticketed but no fee`);
  if (/\bOrca\b|this thread|Claude/.test(s.short_description)) warnings.push(`${s.site_id}: internal research note in short_description`);
  return {
    i: s.site_id,                       // permanent ID
    s: s.dataset_slug,                  // URL slug
    e: s.name_en, b: s.name_bn,
    a: s.alternate_names || undefined,  // searched, not shown in the list
    dv: s.division, d: s.district, db: s.district_bn, u: s.upazila || undefined,
    ll: hidden ? undefined : [Number(Number(s.latitude).toFixed(5)), Number(Number(s.longitude).toFixed(5))],
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

mkdirSync(join(outDir), { recursive: true });
const json = JSON.stringify(index);
writeFileSync(join(outDir, 'index.json'), json);
const gz = gzipSync(json).length;
console.log(`sites: ${index.length}  raw: ${(json.length / 1024).toFixed(1)} KB  gzipped: ${(gz / 1024).toFixed(1)} KB  (budget 150 KB)`);
console.log(`on map: ${index.filter(x => x.ll).length}  with photos: ${index.filter(x => x.p).length}`);
if (warnings.length) { console.log(`\n${warnings.length} data warnings:`); warnings.forEach(w => console.log('  ' + w)); }
if (gz > 150 * 1024) process.exitCode = 1;
