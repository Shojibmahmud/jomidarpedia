// Pure rules behind the home page (roadmap Phase 11, spec .claude/specs/11-Home-page.md). No hooks and no
// server-only imports. The curated photos live in lib/home-images.json, which `npm run thumbs` also reads to make
// the larger variants, and scripts/lib/home-check.mjs checks against the data (FR-24, D2).

import { pickTrips } from './areas';
import { EMPTY, type FilterState } from './filters';
import type { TripCard } from './trips';
import { exploreHref } from './urlState';
import HOME_IMAGES_JSON from './home-images.json';

export const CATEGORY_KEYS = ['dayTrips', 'preserved', 'ruins', 'newUse'] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export interface HomeImages { hero: string; categories: Record<CategoryKey, string>; divisions: Record<string, string> }
export const HOME_IMAGES: HomeImages = HOME_IMAGES_JSON;

const explore = (state: Partial<FilterState>, extras = {}) => exploreHref({ state: { ...EMPTY, ...state }, sort: 'time', extras });

/** The hero's quick chips (FR-7, D3): canonical Explore links. */
export const CHIP_HREF = {
  dayTrips: explore({ day: true }),
  open: explore({ acc: ['ticketed', 'open_no_ticket_reported'] }),
  map: explore({}, { view: 'map' }),
};

/** Each category tile's Explore link (FR-8); the same rule as CATEGORY_TEST in scripts/lib/home-check.mjs. */
export const CATEGORY_HREF: Record<CategoryKey, string> = {
  dayTrips: explore({ day: true }),
  preserved: explore({ cond: ['preserved'] }),
  ruins: explore({ cond: ['in_ruins'] }),
  newUse: explore({ cond: ['preserved_adaptive_reuse'] }),
};

export const FEATURED_TRIPS = 3;

/**
 * The featured trips (FR-14, D4): trips with a photo, timed plans first, then by travel time and title, at most one
 * per district. Photo-less trips fill any place left, by the same order and district rule.
 */
export function featuredTrips(trips: readonly TripCard[], n = FEATURED_TRIPS): TripCard[] {
  const ordered = pickTrips(trips, trips.length);
  const chosen: TripCard[] = [];
  const fill = (pool: TripCard[]) => {
    for (const t of pool) {
      if (chosen.length >= n) return;
      if (!chosen.some(c => c.district === t.district)) chosen.push(t);
    }
  };
  fill(ordered.filter(t => t.photos?.length));
  fill(ordered.filter(t => !t.photos?.length));
  return chosen;
}
