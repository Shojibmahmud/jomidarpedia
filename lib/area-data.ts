// Build-time reads for the division and district pages (roadmap tasks 10.1, 10.2; spec 10 FR-1 to FR-18).
// Server only: it joins divisions.json and districts.json with the index and the trip cards, so the pages
// pass plain props to their client parts. Counts are never recomputed here; they come from the area files.

import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inOrder } from './areas';
import { getDistricts, getDivisions, getIndex } from './data';
import { tripCards } from './trip-data';
import type { District, Division, IndexSite } from './types';

export interface NoPinSite { id: string; slug: string; en: string; bn?: string; district: string; districtBn: string }

const noPinSites = (ids: readonly string[]): NoPinSite[] =>
  inOrder(ids, getIndex()).map(s => ({ id: s.i, slug: s.s, en: s.e, ...(s.b && { bn: s.b }), district: s.d, districtBn: s.db }))
    .sort((a, b) => a.en.localeCompare(b.en, 'en') || a.id.localeCompare(b.id));

export function division(slug: string): Division {
  const d = getDivisions().find(x => x.slug === slug);
  if (!d) throw new Error(`areas: no division "${slug}" in divisions.json`);
  return d;
}

export function district(slug: string): District {
  const d = getDistricts().find(x => x.slug === slug);
  if (!d) throw new Error(`areas: no district "${slug}" in districts.json`);
  return d;
}

export function divisionPage(slug: string) {
  const div = division(slug);
  return {
    div,
    // Most sites first, then by name (FR-12).
    districts: getDistricts().filter(d => d.divisionSlug === slug).sort((a, b) => b.count - a.count || a.en.localeCompare(b.en, 'en')),
    noPin: noPinSites(div.noPin),
    trips: tripCards().filter(t => t.divSlug === slug),
  };
}

export function districtPage(slug: string) {
  const dist = district(slug);
  // Only what SiteCard shows: the list is a client component, so its props are in the page twice.
  const sites: IndexSite[] = inOrder(dist.siteIds, getIndex()).map(({ i, s, e, b, dv, d, db, u, ll, lc, c, ac, fe, h, tb, rc, t, ty, img }) =>
    ({ i, s, e, ...(b && { b }), dv, d, db, ...(u && { u }), ...(ll && { ll }), lc, c, ac, ...(fe && { fe }), ...(h !== undefined && { h }), tb, rc, t, ty, ...(img && { img }) }));
  return {
    dist,
    div: division(dist.divisionSlug),
    sites,
    noPin: noPinSites(dist.noPin),
    trips: tripCards().filter(t => t.divSlug === dist.divisionSlug && t.distSlug === slug),
  };
}

/** The static map of an area (3.8), inlined so its token colours follow the theme. */
export function areaSvg(kind: 'division' | 'district', slug: string): string {
  return readFileSync(join(process.cwd(), 'public', 'maps', kind, `${slug}.svg`), 'utf8');
}
