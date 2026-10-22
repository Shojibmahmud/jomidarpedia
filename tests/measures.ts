// The dataset measures in DEVELOPMENT_ROADMAP.md §2.5, computed from the CSVs and the build output.
// tests/baseline.json holds the reviewed values. To change it on purpose, review the diff the failing
// test prints, then: JP_DATA_MODE=local npm run data && node tests/measures.ts > tests/baseline.json
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from '../scripts/csv.mjs';
import { isMappable } from '../scripts/lib/validate.mjs';

type Row = Record<string, string>;
const count = <T>(items: T[], key: (x: T) => string) => {
  const out: Record<string, number> = {};
  for (const x of items) out[key(x)] = (out[key(x)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
};

export function measures(csvDir: string, indexPath: string) {
  const read = (n: string): Row[] => parseCsv(readFileSync(join(csvDir, `${n}.csv`), 'utf8')).rows;
  const sites = read('sites'), itineraries = read('itineraries'), stops = read('itinerary_stops'), images = read('images');
  const mapped = sites.filter(isMappable);
  const ready = images.filter(i => i.publication_readiness.startsWith('Ready'));
  const index: { ll?: unknown }[] = JSON.parse(readFileSync(indexPath, 'utf8'));
  const dhaka = sites.filter(s => s.division === 'Dhaka');
  return {
    sites: sites.length,
    onMap: mapped.length,
    onMapByStatus: count(mapped, s => s.coordinates_status),
    noPin: sites.length - mapped.length,
    dayTripSites: count(sites, s => s.day_trip_from_dhaka || 'blank'),
    itineraries: itineraries.length,
    itinerariesByDuration: count(itineraries, i => i.duration),
    stops: stops.length,
    stopsWithoutSite: stops.filter(s => !s.site_id).length,
    stopsWithTime: stops.filter(s => s.time_or_day).length,
    itinerariesWithTimedStop: new Set(stops.filter(s => s.time_or_day).map(s => s.itinerary_id)).size,
    sources: read('sources').length,
    siteSources: read('site_sources').length,
    imagesByReadiness: count(images, i => i.publication_readiness.split(/[:(.;]/)[0].trim()),
    readyImageHosts: count(ready, i => new URL(i.direct_image_url).host),
    sitesWithReadyImages: new Set(ready.map(i => i.site_id)).size,
    claims: count(read('claims'), c => c.claim_type),
    claimSourceLinks: count(read('claim_source_links'), l => l.relation),
    unclassifiedSites: sites.filter(s => s.site_type === 'unclassified').length,
    dhakaDivision: { sites: dhaka.length, noPin: dhaka.filter(s => !isMappable(s)).length },
    indexRowsOnMap: index.filter(r => r.ll).length
  };
}

// Prints the current measures, for reviewing a deliberate baseline update.
if (process.argv[1]?.endsWith('measures.ts')) {
  console.log(JSON.stringify(measures('data/csv', 'public/data/index.json'), null, 2));
}
