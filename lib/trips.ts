// Pure rules behind the trips listing and the itinerary pages (roadmap Phase 9, spec .claude/specs/09-Trips-and-itineraries.md).
// The listing's URL state follows docs/URLS.md (`len`, `tt`, `div`, `plan`, `sort`): parseTrips() drops and
// reports anything unknown, serializeTrips() writes the one canonical form. The rest says what a page may
// claim: times only for a reviewed timed plan (D1), pins only where the build gave coordinates (D3), a
// closing day only from the reviewed column (D2), a budget line only from known amounts (D16).

import { BUCKET_ORDER } from './filters';
import type { Lang } from './i18n';
import type { BudgetRow, ClosedDays, Day, Itinerary, TravelBucket, TripSummary } from './types';

// ---------------------------------------------------------------- the listing's cards (FR-1 to FR-16)
/** What a card and the listing filters need: trips.json without the site IDs, plus the division's slug. */
export type TripCard = Omit<TripSummary, 'siteIds' | 'anchor' | 'thumb'> & { divSlug: string; distSlug?: string };

export const LENS = ['one-day', 'multi-day', 'not-stated'] as const;
export type Len = (typeof LENS)[number];
export const LEN_OF: Record<Itinerary['duration'], Len> = { 'One day': 'one-day', 'Overnight / multi-day': 'multi-day', 'Not stated': 'not-stated' };

export const TRIP_SORTS = ['time', 'name'] as const;
export type TripSort = (typeof TRIP_SORTS)[number];

export interface TripFilters { len: Len[]; tt: TravelBucket | 'any'; div: string[]; plan: boolean }
export interface TripView { filters: TripFilters; sort: TripSort }
export const NO_FILTERS: TripFilters = { len: [], tt: 'any', div: [], plan: false };

/** Canonical key order: the trips table in docs/URLS.md. */
export const TRIP_KEYS = ['len', 'tt', 'div', 'plan', 'sort'] as const;
export const PAGE = 12;

/** `divisions`: every division slug, in divisions.json order. */
export function parseTrips(search: string, divisions: readonly string[]): TripView & { dropped: boolean } {
  const params = new URLSearchParams(search);
  const filters: TripFilters = { ...NO_FILTERS, len: [], div: [] };
  let sort: TripSort = 'time';
  let dropped = false;
  const seen = new Set<string>();
  const multi = <T extends string>(raw: string, order: readonly T[]) => {
    const parts = raw.split(',');
    if (parts.some(v => !(order as readonly string[]).includes(v))) dropped = true;
    return order.filter(v => parts.includes(v));
  };
  for (const [key, raw] of params) {
    if (!(TRIP_KEYS as readonly string[]).includes(key) || seen.has(key)) { dropped = true; continue; }
    seen.add(key);
    switch (key) {
      case 'len': filters.len = multi(raw, LENS); break;
      case 'div': filters.div = multi(raw, divisions); break;
      case 'tt':
        if ((BUCKET_ORDER as readonly string[]).includes(raw)) filters.tt = raw as TravelBucket;
        else dropped = true;
        break;
      case 'plan':
        if (raw === 'timed') filters.plan = true;
        else dropped = true;
        break;
      case 'sort':
        if ((TRIP_SORTS as readonly string[]).includes(raw)) sort = raw as TripSort;
        else dropped = true;
        break;
    }
  }
  return { filters, sort, dropped };
}

/** The canonical query string, without "?"; empty for the default view. */
export function serializeTrips({ filters: f, sort }: TripView): string {
  const pairs: string[] = [];
  if (f.len.length) pairs.push(`len=${f.len.join(',')}`);
  if (f.tt !== 'any') pairs.push(`tt=${f.tt}`);
  if (f.div.length) pairs.push(`div=${f.div.join(',')}`);
  if (f.plan) pairs.push('plan=timed');
  if (sort !== 'time') pairs.push(`sort=${sort}`);
  return pairs.join('&');
}

export const tripsHref = (view: TripView) => {
  const qs = serializeTrips(view);
  return qs ? `/trips/?${qs}` : '/trips/';
};

type Group = 'len' | 'tt' | 'div' | 'plan';
function passes(t: TripCard, f: TripFilters, except?: Group): boolean {
  return (except === 'len' || !f.len.length || f.len.includes(LEN_OF[t.duration]))
    && (except === 'tt' || f.tt === 'any' || t.bucket === f.tt)
    && (except === 'div' || !f.div.length || f.div.includes(t.divSlug))
    && (except === 'plan' || !f.plan || t.planStatus === 'timed');
}

export const filterTrips = (trips: readonly TripCard[], f: TripFilters) => trips.filter(t => passes(t, f));

/** Counts for each length, with every other filter applied (FR-4). */
export function lenCounts(trips: readonly TripCard[], f: TripFilters): Record<Len, number> {
  const out: Record<Len, number> = { 'one-day': 0, 'multi-day': 0, 'not-stated': 0 };
  for (const t of trips) if (passes(t, f, 'len')) out[LEN_OF[t.duration]] += 1;
  return out;
}

/** "Has a timed plan" is offered only once the editor has marked a trip timed (FR-7, D1). */
export const hasTimed = (trips: readonly { id: string; planStatus?: string }[]) => trips.some(t => t.planStatus === 'timed');

const collators: Partial<Record<Lang, Intl.Collator>> = {};
const collator = (lang: Lang) => (collators[lang] ??= new Intl.Collator(lang));
const byId = (a: TripCard, b: TripCard) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** time: the anchor's travel-time band, then hours, unknown last, then title (FR-8). name: the title. Stable by ID. */
export function sortTrips(trips: readonly TripCard[], sort: TripSort, lang: Lang): TripCard[] {
  const list = [...trips];
  if (sort === 'name') return list.sort((a, b) => collator(lang).compare(a.title, b.title) || byId(a, b));
  return list.sort((a, b) => BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket)
    || (a.hours ?? Infinity) - (b.hours ?? Infinity)
    || collator('en').compare(a.title, b.title)
    || byId(a, b));
}

// ---------------------------------------------------------------- the itinerary page
/** Clock times are shown only for a reviewed timed plan (FR-24, D1). */
export const showTimes = (trip: Pick<Itinerary, 'planStatus'>) => trip.planStatus === 'timed';

/** "07:30–17:00": the first and last stop times of a timed plan, when both are clock times (FR-19). */
export function timeRange(trip: Pick<Itinerary, 'planStatus' | 'stops'>): [string, string] | undefined {
  if (!showTimes(trip)) return undefined;
  const clock = /^\d{1,2}:\d{2}\s*(?:AM|PM)?$/i;
  const times = trip.stops.map(s => s.time).filter((t): t is string => !!t && clock.test(t.trim()));
  return times.length >= 2 ? [times[0].trim(), times.at(-1)!.trim()] : undefined;
}

/** Stops with a pin, and stops without one. A map is shown only with 2 or more pins (FR-28, FR-30, D3). */
export function mapStops(trip: Pick<Itinerary, 'stops'>) {
  const pinned = trip.stops.filter(s => s.latlon);
  const unpinned = trip.stops.filter(s => !s.latlon);
  return { pinned, unpinned, show: pinned.length >= 2 };
}

/** Site IDs of the site stops, once each, in stop order. */
export const stopSiteIds = (trip: Pick<Itinerary, 'stops'>) => [...new Set(trip.stops.flatMap(s => (s.kind === 'site' && s.siteId ? [s.siteId] : [])))];

/** "Open all stops on the map" (FR-42, D13): Explore with ids, the map, and the first stop with a pin selected. */
export function exploreStopsHref(trip: Pick<Itinerary, 'stops'>): string | undefined {
  const ids = stopSiteIds(trip);
  if (!ids.length) return undefined;
  const sel = trip.stops.find(s => s.kind === 'site' && s.siteId && s.latlon)?.siteId;
  return `/explore/?view=map${sel ? `&sel=${sel}` : ''}&ids=${ids.join(',')}`;
}

// ---------------------------------------------------------------- DayCheck (FR-39 to FR-41, D2)
export const DAYS: readonly Day[] = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];
export interface DayStop { order: number; name: string; closedDays: ClosedDays }

/** The picker appears only when at least one site stop has reviewed closing days. */
export const dayPicker = (stops: readonly DayStop[]) => stops.some(s => s.closedDays.known);

/** For one day: the stops closed that day, and the stops whose closing days are not documented. */
export function dayCheck(stops: readonly DayStop[], day: Day) {
  return {
    closed: stops.filter(s => s.closedDays.known && s.closedDays.days.includes(day)),
    unknown: stops.filter(s => !s.closedDays.known),
  };
}

// ---------------------------------------------------------------- budget (FR-34 to FR-38, D16)
export type RowValue = { kind: 'amount'; amount: number; estimate: boolean } | { kind: 'noTicket' } | { kind: 'notApplicable' } | { kind: 'none' };

/** A row's value: an amount ("~" when it is an estimate), "No ticket reported", "Not applicable", or "Not estimated yet". */
export function rowValue(row: BudgetRow): RowValue {
  if (row.amount !== undefined && row.amount > 0) return { kind: 'amount', amount: row.amount, estimate: row.status === 'estimate' };
  if (row.noTicket) return { kind: 'noTicket' };
  if (row.status === 'not_applicable') return { kind: 'notApplicable' };
  return { kind: 'none' };
}

/** The closing line: the known per-person amount with the items left out, or none known. Never a total. */
export function budgetLine(budget: Itinerary['budget']): { known?: number; omitted: string[] } {
  return { ...(budget.known !== undefined && budget.known > 0 && { known: budget.known }), omitted: budget.omitted };
}

// ---------------------------------------------------------------- print (FR-50)
/** A CSS string literal for the print running header: quotes, backslashes, "<" and line breaks escaped. */
export const cssString = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/</g, '\\3C ').replace(/[\r\n]+/g, ' ')}"`;
