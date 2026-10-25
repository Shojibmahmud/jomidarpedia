// Build-time reads for the trips listing and the itinerary pages (roadmap Phase 9, spec 09). Server only:
// it joins trips.json and the trip files with divisions, districts, site records and sources, so the pages
// pass plain props to their client parts.

import 'server-only';
import { getDistricts, getDivisions, getSite, getSources, getTrip, getTrips } from './data';
import type { TripCard } from './trips';
import type { Itinerary, SiteRecord, SourceEntry } from './types';

const placeOf = (division: string, district: string) => {
  const div = getDivisions().find(d => d.en === division);
  if (!div) throw new Error(`trips: no division "${division}" in divisions.json`);
  const dist = getDistricts().find(d => d.en === district && d.divisionSlug === div.slug);
  return { div, dist };
};

/** Every trip as a card: trips.json without the site IDs, with its division's slug (FR-6). */
let cards: TripCard[] | undefined;
export function tripCards(): TripCard[] {
  return cards ??= getTrips().map(({ siteIds: _s, anchor: _a, thumb: _t, ...t }) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    const { div, dist } = placeOf(t.division, t.district);
    return { ...t, divSlug: div.slug, ...(dist && { distSlug: dist.slug }) };
  });
}

export interface TripPage {
  trip: Itinerary;
  card: TripCard;
  place: { div: { slug: string; en: string; bn: string }; dist?: { slug: string; en: string; bn: string } };
  anchor: SiteRecord;
  /** Each site stop's record, once per site, in stop order (FR-33). */
  sites: { order: number; site: SiteRecord }[];
  /** The sources the plan cites (budget rows, legs, places), in first-cited order. */
  sources: SourceEntry[];
}

export function tripPage(id: string): TripPage {
  const trip = getTrip(id);
  const card = tripCards().find(c => c.id === id)!;
  const { div, dist } = placeOf(card.division, card.district);
  const seen = new Set<string>();
  const sites: TripPage['sites'] = [];
  for (const s of trip.stops) {
    if (s.kind !== 'site' || !s.siteId || seen.has(s.siteId)) continue;
    seen.add(s.siteId);
    sites.push({ order: s.order, site: getSite(s.siteId) });
  }
  const cited = [...new Set([
    ...trip.budget.rows.flatMap(r => r.sources), ...trip.legs.flatMap(l => l.sources), ...trip.stops.flatMap(s => s.sources ?? []),
  ])];
  const byId = new Map(getSources().map(s => [s.id, s]));
  return {
    trip, card,
    place: { div: { slug: div.slug, en: div.en, bn: div.bn }, ...(dist && { dist: { slug: dist.slug, en: dist.en, bn: dist.bn } }) },
    anchor: getSite(trip.anchor),
    sites,
    sources: cited.flatMap(sid => (byId.has(sid) ? [byId.get(sid)!] : [])),
  };
}
