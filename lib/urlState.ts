// Explore URL state (roadmap task 6.3, spec 06 FR-10 to FR-14), to the contract in docs/URLS.md.
// Pure: parse() turns a query string into filters, sort and the kept keys; serialize() writes the one
// canonical form (keys in table order, values in their listed order, defaults left out, commas unencoded).
// Anything unknown or invalid is dropped and reported, so the page can rewrite the URL and show the notice.

import { ACCESS_ORDER, BUCKET_ORDER, CONDITION_ORDER, EMPTY, TYPE_ORDER, type FilterState, type Places } from './filters';
import type { TravelBucket } from './types';

export const SORTS = ['time', 'name', 'district'] as const;
export type Sort = (typeof SORTS)[number];

/** Keys kept and validated but with no effect yet: q (Phase 8), view and sel (Phase 7), ids (9.8). */
export interface Extras { q?: string; view?: 'list' | 'map'; sel?: string; ids?: string[] }

export interface View { state: FilterState; sort: Sort; extras: Extras }
export interface Parsed extends View { dropped: boolean }

/** Canonical key order: the Explore table in docs/URLS.md. */
export const KEYS = ['day', 'tt', 'cond', 'acc', 'div', 'dist', 'type', 'doc', 'vloc', 'photo', 'hours', 'sort', 'q', 'view', 'sel', 'ids'] as const;
const ID = /^JB-[A-Z]{3}-\d{3}$/;
export const Q_MAX = 100;

/** Splits a multi-value list and keeps the allowed values, in `order`. Reports any value dropped. */
function multi<T extends string>(raw: string, order: readonly T[]): { values: T[]; bad: boolean } {
  const parts = raw.split(',');
  const values = order.filter(v => parts.includes(v));
  return { values, bad: parts.some(v => !(order as readonly string[]).includes(v)) };
}

/**
 * `knownIds`, once the index has loaded, also drops `sel` and `ids` that name no site; before that they
 * are checked by pattern only.
 */
export function parse(search: string, places: Places, knownIds?: ReadonlySet<string>): Parsed {
  const params = new URLSearchParams(search);
  const state: FilterState = { ...EMPTY };
  const extras: Extras = {};
  let sort: Sort = 'time';
  let dropped = false;
  const seen = new Set<string>();
  const divisions = places.list.divisions.map(d => d.slug);
  const districts = places.list.districts.map(d => d.slug);
  const idOk = (id: string) => ID.test(id) && (!knownIds || knownIds.has(id));

  for (const [key, raw] of params) {
    if (!(KEYS as readonly string[]).includes(key) || seen.has(key)) { dropped = true; continue; }
    seen.add(key);
    const take = <T extends string>(order: readonly T[]) => {
      const r = multi(raw, order);
      if (r.bad) dropped = true;
      return r.values;
    };
    switch (key) {
      case 'day': case 'doc': case 'vloc': case 'photo': case 'hours':
        if (raw === '1') state[key as 'day' | 'doc' | 'vloc' | 'photo' | 'hours'] = true;
        else dropped = true;
        break;
      case 'tt':
        if ((BUCKET_ORDER as readonly string[]).includes(raw)) state.tt = raw as TravelBucket;
        else dropped = true;
        break;
      case 'cond': state.cond = take(CONDITION_ORDER); break;
      case 'acc': state.acc = take(ACCESS_ORDER); break;
      case 'type': state.type = take(TYPE_ORDER); break;
      case 'div': state.div = take(divisions); break;
      case 'dist': state.dist = take(districts); break;
      case 'sort':
        if ((SORTS as readonly string[]).includes(raw)) sort = raw as Sort;
        else dropped = true;
        break;
      case 'q': {
        const q = raw.trim().slice(0, Q_MAX).trim();
        if (q) extras.q = q;
        break;
      }
      case 'view':
        if (raw === 'list' || raw === 'map') extras.view = raw;
        else dropped = true;
        break;
      case 'sel':
        if (idOk(raw)) extras.sel = raw;
        else dropped = true;
        break;
      case 'ids': {
        const parts = raw.split(',');
        const ids = [...new Set(parts.filter(idOk))];
        if (ids.length < parts.length) dropped = true;
        if (ids.length) extras.ids = ids;
        break;
      }
    }
  }
  // A district must belong to a selected division (URLS.md, 6.3).
  const kept = state.dist.filter(d => state.div.includes(places.divisionOf(d) ?? ''));
  if (kept.length < state.dist.length) dropped = true;
  state.dist = kept;
  return { state, sort, extras, dropped };
}

/** The canonical query string, without "?"; empty for the default view. */
export function serialize({ state, sort, extras }: View): string {
  const pairs: [string, string][] = [];
  if (state.day) pairs.push(['day', '1']);
  if (state.tt !== 'any') pairs.push(['tt', state.tt]);
  for (const k of ['cond', 'acc', 'div', 'dist', 'type'] as const) if (state[k].length) pairs.push([k, state[k].join(',')]);
  for (const k of ['doc', 'vloc', 'photo', 'hours'] as const) if (state[k]) pairs.push([k, '1']);
  if (sort !== 'time') pairs.push(['sort', sort]);
  if (extras.q) pairs.push(['q', encodeURIComponent(extras.q)]);
  if (extras.view) pairs.push(['view', extras.view]);
  if (extras.sel) pairs.push(['sel', extras.sel]);
  if (extras.ids?.length) pairs.push(['ids', extras.ids.join(',')]);
  return pairs.map(([k, v]) => `${k}=${v}`).join('&');
}

/** The Explore path for a view: /explore/ or /explore/?… */
export const exploreHref = (view: View) => {
  const qs = serialize(view);
  return qs ? `/explore/?${qs}` : '/explore/';
};
