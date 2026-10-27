// Pure rules behind the site page (Phase 5, spec .claude/specs/05-Site-page.md). Components read these so
// that the banner, the checklist, the pills and the section hints can never disagree with each other.

import { CORRECTIONS_URL } from './nav';
import type { Conflict, SiteRecord } from './types';

// ---------------------------------------------------------------- sparse records (FR-6, FR-14)
export const KNOWN_ITEMS = ['union', 'founder', 'route', 'location', 'history', 'style', 'photo'] as const;
export type KnownItem = (typeof KNOWN_ITEMS)[number];

/** Which of the seven basic facts the record has. */
export function knownItems(site: SiteRecord): Record<KnownItem, boolean> {
  return {
    union: !!site.place.union,
    founder: site.founder.known,
    route: site.travel.routes.length > 0,
    location: site.location.status === 'verified' || site.location.status === 'single_source',
    history: site.era.known || site.history.length > 0,
    style: site.style.known && site.condition !== 'unknown',
    photo: site.images.length > 0,
  };
}

export const SPARSE_MIN_UNKNOWN = 3;
/** Sparse: 3 or more of the seven are unknown. Shows the "Little is documented" banner and the checklist. */
export const isSparse = (site: SiteRecord) => Object.values(knownItems(site)).filter(k => !k).length >= SPARSE_MIN_UNKNOWN;

// ---------------------------------------------------------------- conflicts (FR-34, FR-35, FR-36)
/** Two or more versions: a disagreement. One version: an open question, never counted as a disagreement. */
export const disagreements = (site: SiteRecord) => site.conflicts.filter(c => c.versions.length > 1);
export const openQuestions = (site: SiteRecord) => site.conflicts.filter(c => c.versions.length === 1);

export type ConflictSection = 'location' | 'history' | 'architecture' | 'sources';
// Where a disagreement is shown, from words in its field name. Anything else goes under Sources.
const SECTION_OF: [RegExp, ConflictSection][] = [
  [/coordinates|location|upazila|union|village|district|distance|river/i, 'location'],
  [/area|size|rooms?\b|room count|style|acres|buildings?|storeys|floors/i, 'architecture'],
  [/founder|builder|date|age|founding|year|built|zamindari|owner|family|era|end of/i, 'history'],
];
export const conflictSection = (c: Conflict): ConflictSection => SECTION_OF.find(([re]) => re.test(c.field))?.[1] ?? 'sources';
export const conflictAnchor = (k: number) => `conflict-${k + 1}`;

// ---------------------------------------------------------------- sections (FR-1, FR-43)
export const SECTIONS = ['summary', 'location', 'history', 'architecture', 'stories', 'visiting', 'gettingThere', 'itineraries', 'combine', 'sources'] as const;
export type Section = (typeof SECTIONS)[number];
export const sectionId = (s: Section) => (s === 'gettingThere' ? 'getting-there' : s);

export const combineWith = (site: SiteRecord) => site.related.filter(r => r.relation === 'combine_on_trip');
export const identityNotes = (site: SiteRecord) => site.related.filter(r => r.relation !== 'combine_on_trip');

export type Hint = 'noPin' | 'notYet' | 'none';
/** The status beside a section in "On this page" (Assumption A-7). Sections are never removed. */
export function sectionHint(site: SiteRecord, s: Section): Hint | undefined {
  switch (s) {
    case 'location': return site.location.latlon ? undefined : 'noPin';
    case 'history': return site.history.length ? undefined : 'notYet';
    case 'architecture': return site.style.known || site.features.length ? undefined : 'notYet';
    case 'stories': return site.legends.length ? undefined : 'none';
    case 'gettingThere': return site.travel.routes.length ? undefined : 'notYet';
    case 'itineraries': return site.itineraries.length ? undefined : 'none';
    case 'combine': return combineWith(site).length ? undefined : 'none';
    default: return undefined;
  }
}

// ---------------------------------------------------------------- corrections (FR-39, Assumption A-3)
export type CorrectionField = 'general' | 'summary' | 'location' | 'history' | 'architecture' | 'stories' | 'visiting' | 'getting-there' | 'sources';

/** What the correction form is about: from the link's query, with the page it was opened on as the fallback. */
export interface CorrectionContext { siteId?: string; field?: CorrectionField | 'photo'; pageUrl?: string }

const formUrl = (params: Record<string, string | undefined>) => {
  const q = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1]));
  return `${CORRECTIONS_URL}?${q}`;
};

/** The prefilled correction form: site_id, field and page_url; field=photo for the photo offer. */
export function correctionUrl(siteId: string, pageUrl: string, field: CorrectionField | 'photo'): string {
  return formUrl({ site_id: siteId, field, page_url: pageUrl });
}

/** The correction form for a page about no single site (area pages, the 404): page_url, and the field when known. */
export function pageCorrectionUrl(pageUrl: string, field?: CorrectionField): string {
  return formUrl({ field, page_url: pageUrl });
}

/** Reads a correction link's query back (the inverse of correctionUrl). */
export function correctionContext(params: URLSearchParams): CorrectionContext {
  const get = (k: string) => params.get(k)?.trim().slice(0, 300) || undefined;
  return { siteId: get('site_id'), field: get('field') as CorrectionContext['field'], pageUrl: get('page_url') };
}

// ---------------------------------------------------------------- outbound map links (FR-19, 5.18)
/** Directions to a mappable site. Never call this for a hidden pin (R5). */
export const directionsUrl = ([lat, lon]: [number, number]) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(5)},${lon.toFixed(5)}`;
/** What "Copy coordinates" puts on the clipboard: Latin digits, 5 decimals. */
export const coordsText = ([lat, lon]: [number, number]) => `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

// ---------------------------------------------------------------- freshness (FR-17)
/** More than 12 months between a YYYY-MM-DD date and now. */
export function isStale(date: string, now: Date): boolean {
  const [y, m, d] = date.split('-').map(Number);
  const limit = new Date(Date.UTC(y, m - 1 + 12, d ?? 1));
  return now.getTime() > limit.getTime();
}
