// Pure rules behind the division and district pages (roadmap tasks 10.1, 10.2; spec .claude/specs/10-Areas-sources-about-and-system-states.md
// FR-1 to FR-18). Every count comes from divisions.json and districts.json (one source, I6); these helpers only
// order and filter what the build wrote. No hooks and no server-only imports, so the district list can use them.

import { EMPTY } from './filters';
import { sortTrips, type TripCard } from './trips';
import type { Condition, IndexSite, LocationCounts } from './types';
import { exploreHref } from './urlState';

/** The location tiles, in the boards' order (FR-4). */
export const LOCATION_KEYS = ['verified', 'singleSource', 'approximate', 'unverified', 'noPin'] as const satisfies readonly (keyof LocationCounts)[];

/** The condition bar's segments, left to right (FR-3). */
export const CONDITION_ORDER: readonly Condition[] = ['in_ruins', 'unknown', 'preserved_adaptive_reuse', 'preserved', 'lost'];

/** Tiles to show: every non-zero count, and "no pin yet" always (spec 10 §7). */
export const locationTiles = (l: LocationCounts) => LOCATION_KEYS.filter(k => k === 'noPin' || l[k] > 0);

// ---------------------------------------------------------------- district chips (FR-17)
export const CHIPS = ['all', 'open', 'preserved', 'in_ruins', 'lost'] as const;
export type Chip = (typeof CHIPS)[number];

const CHIP_TEST: Record<Chip, (s: IndexSite) => boolean> = {
  all: () => true,
  open: s => s.ac === 'ticketed' || s.ac === 'open_no_ticket_reported',
  preserved: s => s.c === 'preserved' || s.c === 'preserved_adaptive_reuse',
  in_ruins: s => s.c === 'in_ruins',
  lost: s => s.c === 'lost',
};
export const chipMatches = (chip: Chip, site: IndexSite) => CHIP_TEST[chip](site);

/** Each chip with its count; a chip other than "All" appears only when its count is above 0. */
export function chipCounts(sites: readonly IndexSite[]): { chip: Chip; count: number }[] {
  return CHIPS.map(chip => ({ chip, count: sites.filter(s => CHIP_TEST[chip](s)).length })).filter(c => c.chip === 'all' || c.count > 0);
}

/** Sites in the order of `ids` (districts.json siteIds: the list order the map's pin numbers follow). */
export function inOrder(ids: readonly string[], sites: readonly IndexSite[]): IndexSite[] {
  const byId = new Map(sites.map(s => [s.i, s]));
  return ids.map(id => {
    const s = byId.get(id);
    if (!s) throw new Error(`areas: no site "${id}" in the index`);
    return s;
  });
}

// ---------------------------------------------------------------- trips row (FR-7, D3)
export const TRIPS_SHOWN = 4;

/** Up to four trips: timed plans first (only a reviewed status counts), then by travel time and title. */
export function pickTrips(trips: readonly TripCard[], n = TRIPS_SHOWN): TripCard[] {
  const sorted = sortTrips(trips, 'time', 'en');
  return [...sorted.filter(t => t.planStatus === 'timed'), ...sorted.filter(t => t.planStatus !== 'timed')].slice(0, n);
}

// ---------------------------------------------------------------- links
export const districtHref = (slug: string) => `/district/${slug}/`;

/** Explore filtered to the area, on the list or the map (FR-5, FR-11, FR-13). */
export function areaExploreHref(div: string, dist?: string, map = false): string {
  return exploreHref({ state: { ...EMPTY, div: [div], dist: dist ? [dist] : [] }, sort: 'time', extras: map ? { view: 'map' } : {} });
}
