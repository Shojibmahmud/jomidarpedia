// The dataset measures in roadmap/DEVELOPMENT_ROADMAP.md §2.5, computed from the CSVs and the build output.
// tests/baseline.json holds the reviewed values. To change it on purpose, review the diff the failing
// test prints, then: JP_DATA_MODE=local npm run data && node tests/measures.ts > tests/baseline.json
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv } from '../scripts/csv.mjs';
import { isMappable } from '../scripts/lib/validate.mjs';
import { suggestPlanStatus } from '../scripts/lib/rules.mjs';

type Row = Record<string, string>;
const count = <T>(items: T[], key: (x: T) => string) => {
  const out: Record<string, number> = {};
  for (const x of items) out[key(x)] = (out[key(x)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
};

type Ref = { id: string };
type Conflict = { versions: { sources: Ref[] }[]; unattributedSources?: Ref[] };
type SiteJson = { conflicts: Conflict[]; travel: { routes: { mode: string; inferred?: true }[] } };

export function measures(csvDir: string, indexPath: string, buildDir: string) {
  const read = (n: string): Row[] => parseCsv(readFileSync(join(csvDir, `${n}.csv`), 'utf8')).rows;
  const sites = read('sites'), itineraries = read('itineraries'), stops = read('itinerary_stops'), images = read('images');
  const mapped = sites.filter(isMappable);
  const ready = images.filter(i => i.publication_readiness.startsWith('Ready'));
  const index: { ll?: unknown; hv?: 1 }[] = JSON.parse(readFileSync(indexPath, 'utf8'));
  const siteFiles: SiteJson[] = readdirSync(join(buildDir, 'sites')).sort().map(f => JSON.parse(readFileSync(join(buildDir, 'sites', f), 'utf8')));
  const conflicts = siteFiles.flatMap(s => s.conflicts);
  const versions = conflicts.flatMap(c => c.versions);
  const routes = siteFiles.flatMap(s => s.travel.routes);
  const stopsByTrip = new Map<string, Row[]>();
  for (const st of stops) stopsByTrip.set(st.itinerary_id, [...(stopsByTrip.get(st.itinerary_id) ?? []), st]);
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
    readyImageHosts: count(ready, i => (i.direct_image_url ? new URL(i.direct_image_url).host : 'none (own photo)')),
    sitesWithReadyImages: new Set(ready.map(i => i.site_id)).size,
    claims: count(read('claims'), c => c.claim_type),
    claimSourceLinks: count(read('claim_source_links'), l => l.relation),
    unclassifiedSites: sites.filter(s => s.site_type === 'unclassified').length,
    dhakaDivision: { sites: dhaka.length, noPin: dhaka.filter(s => !isMappable(s)).length },
    indexRowsOnMap: index.filter(r => r.ll).length,
    // Phase 2 contract.
    hoursKnown: index.filter(r => r.hv).length,
    conflictVersions: { withSources: versions.filter(v => v.sources.length).length, withoutSources: versions.filter(v => !v.sources.length).length },
    unattributedConflictLinks: conflicts.reduce((n, c) => n + (c.unattributedSources?.length ?? 0), 0),
    routesByMode: count(routes, r => r.mode),
    routesModeInferred: routes.filter(r => r.inferred).length,
    suggestedPlanStatus: count(itineraries, i => suggestPlanStatus(stopsByTrip.get(i.itinerary_id) ?? [])),
    bnMissing: sites.filter(s => !s.name_bn).length
  };
}

// Prints the current measures, for reviewing a deliberate baseline update.
if (process.argv[1]?.endsWith('measures.ts')) {
  console.log(JSON.stringify(measures('data/csv', 'public/data/index.json', 'data/build'), null, 2));
}
