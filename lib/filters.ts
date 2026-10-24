// Explore filters (roadmap task 6.2, spec 06 FR-6 to FR-9, FR-27). Pure: no React, no DOM.
// Groups combine with AND, options within a group with OR, and an empty group matches everything.
// A count is a facet count (D2): how many sites match that option under every *other* group's filters.
// Districts narrow their division (D7): a division with none of its districts ticked means all of it.

import type { Access, Condition, IndexSite, TravelBucket, TypeGroup } from './types';

export const CONDITION_ORDER: readonly Condition[] = ['preserved', 'preserved_adaptive_reuse', 'in_ruins', 'lost', 'unknown'];
export const ACCESS_ORDER: readonly Access[] = ['ticketed', 'open_no_ticket_reported', 'restricted_or_permission', 'unknown', 'not_applicable_lost'];
export const BUCKET_ORDER: readonly TravelBucket[] = ['0-1', '1-2', '2-3', '3-4', '4+', 'unknown'];
export const TYPE_ORDER: readonly TypeGroup[] = ['house', 'rajbari', 'kachari', 'kuthi', 'chief', 'religious', 'fort', 'other', 'unclassified'];

export interface FilterState {
  day: boolean;
  tt: TravelBucket | 'any';
  cond: Condition[];
  acc: Access[];
  div: string[];   // division slugs
  dist: string[];  // district slugs
  type: TypeGroup[];
  doc: boolean;
  vloc: boolean;
  photo: boolean;
  hours: boolean;
}

export const EMPTY: FilterState = { day: false, tt: 'any', cond: [], acc: [], div: [], dist: [], type: [], doc: false, vloc: false, photo: false, hours: false };

/** The groups in rail order. Division and district are one group, "where". */
export const GROUPS = ['day', 'tt', 'cond', 'acc', 'where', 'type', 'doc', 'vloc', 'photo', 'hours'] as const;
export type Group = (typeof GROUPS)[number];
export const SWITCHES = ['day', 'doc', 'vloc', 'photo', 'hours'] as const;
export type SwitchKey = (typeof SWITCHES)[number];

/** Division and district slugs, from data/build/divisions.json and districts.json (passed to the page as props). */
export interface PlaceList {
  divisions: { slug: string; en: string; bn: string }[];
  districts: { slug: string; en: string; bn: string; divisionSlug: string }[];
}

/** Lookups from an index row's English names to slugs. */
export interface Places {
  div(site: IndexSite): string;
  dist(site: IndexSite): string;
  divisionOf(district: string): string | undefined;
  list: PlaceList;
}

export function makePlaces(list: PlaceList): Places {
  const div = new Map(list.divisions.map(d => [d.en, d.slug]));
  const dist = new Map(list.districts.map(d => [d.en, d.slug]));
  const parent = new Map(list.districts.map(d => [d.slug, d.divisionSlug]));
  return { div: s => div.get(s.dv) ?? '', dist: s => dist.get(s.d) ?? '', divisionOf: d => parent.get(d), list };
}

const PASS: Record<Group, (s: IndexSite, f: FilterState, p: Places) => boolean> = {
  day: (s, f) => !f.day || s.dt === 1,
  tt: (s, f) => f.tt === 'any' || s.tb === f.tt,
  cond: (s, f) => !f.cond.length || f.cond.includes(s.c),
  acc: (s, f) => !f.acc.length || f.acc.includes(s.ac),
  where: (s, f, p) => {
    if (!f.div.length) return true;
    const division = p.div(s);
    if (!f.div.includes(division)) return false;
    const picked = f.dist.filter(d => p.divisionOf(d) === division);
    return !picked.length || picked.includes(p.dist(s));
  },
  type: (s, f) => !f.type.length || f.type.includes(s.t),
  doc: (s, f) => !f.doc || s.rc === 'confirmed' || s.rc === 'partially_confirmed',
  vloc: (s, f) => !f.vloc || s.lc === 'verified',
  photo: (s, f) => !f.photo || s.p === 1,
  hours: (s, f) => !f.hours || s.hv === 1,
};

/** True when the site passes every group, or every group but `except`. */
export function passes(site: IndexSite, f: FilterState, p: Places, except?: Group): boolean {
  for (const g of GROUPS) if (g !== except && !PASS[g](site, f, p)) return false;
  return true;
}

export const filter = (sites: IndexSite[], f: FilterState, p: Places) => sites.filter(s => passes(s, f, p));

export interface Counts {
  total: number;                         // the result count
  day: number; doc: number; vloc: number; photo: number; hours: number;
  confirmed: number; partial: number;    // for the "well-documented" subline
  tt: Record<TravelBucket | 'any', number>;
  cond: Record<Condition, number>;
  acc: Record<Access, number>;
  type: Record<TypeGroup, number>;
  div: Record<string, number>;
  dist: Record<string, number>;
}

const zeros = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map(k => [k, 0])) as Record<K, number>;

export function counts(sites: IndexSite[], f: FilterState, p: Places): Counts {
  const others = (g: Group) => sites.filter(s => passes(s, f, p, g));
  const c: Counts = {
    total: filter(sites, f, p).length,
    day: others('day').filter(s => s.dt === 1).length,
    doc: 0, confirmed: 0, partial: 0,
    vloc: others('vloc').filter(s => s.lc === 'verified').length,
    photo: others('photo').filter(s => s.p === 1).length,
    hours: others('hours').filter(s => s.hv === 1).length,
    tt: { any: 0, ...zeros(BUCKET_ORDER) },
    cond: zeros(CONDITION_ORDER), acc: zeros(ACCESS_ORDER), type: zeros(TYPE_ORDER),
    div: zeros(p.list.divisions.map(d => d.slug)), dist: zeros(p.list.districts.map(d => d.slug)),
  };
  for (const s of others('doc')) {
    if (s.rc === 'confirmed') c.confirmed++;
    if (s.rc === 'partially_confirmed') c.partial++;
  }
  c.doc = c.confirmed + c.partial;
  const tt = others('tt');
  c.tt.any = tt.length;
  for (const s of tt) c.tt[s.tb]++;
  for (const s of others('cond')) c.cond[s.c]++;
  for (const s of others('acc')) c.acc[s.ac]++;
  for (const s of others('type')) c.type[s.t]++;
  for (const s of others('where')) {
    c.div[p.div(s)]++;
    c.dist[p.dist(s)]++;
  }
  return c;
}

/** The groups with a filter on, in rail order. */
export function activeGroups(f: FilterState): Group[] {
  return GROUPS.filter(g => {
    if (g === 'tt') return f.tt !== 'any';
    if (g === 'where') return f.div.length > 0;
    const v = f[g];
    return Array.isArray(v) ? v.length > 0 : v === true;
  });
}

/** The number of active values, for the Filters button. */
export function activeCount(f: FilterState): number {
  return (f.day ? 1 : 0) + (f.tt !== 'any' ? 1 : 0) + f.cond.length + f.acc.length + f.div.length + f.dist.length + f.type.length
    + [f.doc, f.vloc, f.photo, f.hours].filter(Boolean).length;
}

/** The state with one whole group removed. */
export function without(f: FilterState, g: Group): FilterState {
  if (g === 'where') return { ...f, div: [], dist: [] };
  return { ...f, [g]: EMPTY[g] };
}

/** The one group or switch whose removal brings back the most sites (FR-27, D6). Ties go to rail order. */
export function bestRemoval(sites: IndexSite[], f: FilterState, p: Places): { group: Group; count: number } | null {
  let best: { group: Group; count: number } | null = null;
  for (const g of activeGroups(f)) {
    const count = filter(sites, without(f, g), p).length;
    if (!best || count > best.count) best = { group: g, count };
  }
  return best;
}

/** One active value, as an ActiveFilters chip shows it. */
export type ActiveValue =
  | { group: SwitchKey }
  | { group: 'tt'; value: TravelBucket }
  | { group: 'cond'; value: Condition }
  | { group: 'acc'; value: Access }
  | { group: 'type'; value: TypeGroup }
  | { group: 'div' | 'dist'; value: string };

export function activeValues(f: FilterState): ActiveValue[] {
  const out: ActiveValue[] = [];
  if (f.day) out.push({ group: 'day' });
  if (f.tt !== 'any') out.push({ group: 'tt', value: f.tt });
  for (const value of f.cond) out.push({ group: 'cond', value });
  for (const value of f.acc) out.push({ group: 'acc', value });
  for (const value of f.div) out.push({ group: 'div', value });
  for (const value of f.dist) out.push({ group: 'dist', value });
  for (const value of f.type) out.push({ group: 'type', value });
  for (const k of ['doc', 'vloc', 'photo', 'hours'] as const) if (f[k]) out.push({ group: k });
  return out;
}

/** Removes one value. Removing a division also removes its districts. */
export function removeValue(f: FilterState, v: ActiveValue, p: Places): FilterState {
  switch (v.group) {
    case 'tt': return { ...f, tt: 'any' };
    case 'cond': return { ...f, cond: f.cond.filter(x => x !== v.value) };
    case 'acc': return { ...f, acc: f.acc.filter(x => x !== v.value) };
    case 'type': return { ...f, type: f.type.filter(x => x !== v.value) };
    case 'div': return { ...f, div: f.div.filter(x => x !== v.value), dist: f.dist.filter(d => p.divisionOf(d) !== v.value) };
    case 'dist': return { ...f, dist: f.dist.filter(x => x !== v.value) };
    default: return { ...f, [v.group]: false };
  }
}

/** Adds or removes a value, keeping the list in its canonical order. */
export function toggle<T>(list: readonly T[], value: T, order: readonly T[]): T[] {
  const next = list.includes(value) ? list.filter(x => x !== value) : [...list, value];
  return order.filter(x => next.includes(x));
}

/** Ticks or unticks a division; unticking clears its districts. */
export function toggleDivision(f: FilterState, slug: string, p: Places): FilterState {
  const order = p.list.divisions.map(d => d.slug);
  if (f.div.includes(slug)) return { ...f, div: f.div.filter(d => d !== slug), dist: f.dist.filter(d => p.divisionOf(d) !== slug) };
  return { ...f, div: toggle(f.div, slug, order) };
}

export function toggleDistrict(f: FilterState, slug: string, p: Places): FilterState {
  return { ...f, dist: toggle(f.dist, slug, p.list.districts.map(d => d.slug)) };
}
