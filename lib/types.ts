// Shapes of the generated JSON. The CSV tables are the source of truth;
// scripts/build-data turns them into these files at build time.

export type Condition = 'preserved' | 'preserved_adaptive_reuse' | 'in_ruins' | 'lost' | 'unknown';
export type Access = 'ticketed' | 'open_no_ticket_reported' | 'restricted_or_permission' | 'unknown' | 'not_applicable_lost';
export type LocationStatus = 'verified' | 'single_source' | 'approximate' | 'unverified' | 'not_found';
export type RecordConfidence = 'confirmed' | 'partially_confirmed' | 'unconfirmed' | 'not_graded';
export type TravelBucket = '0-1' | '1-2' | '2-3' | '3-4' | '4+' | 'unknown';
export type TypeGroup = 'house' | 'rajbari' | 'kachari' | 'kuthi' | 'chief' | 'religious' | 'fort' | 'other' | 'unclassified';

/** One row of public/data/index.json (short keys keep it at ~34 KB gzipped for 399 sites). */
export interface IndexSite {
  i: string;              // site_id, e.g. "JB-DHK-064"
  s: string;              // slug
  e: string; b: string;   // name_en, name_bn
  a?: string;             // alternate_names (search only)
  dv: string; d: string; db: string; u?: string; // division, district, district_bn, upazila
  ll?: [number, number];  // absent when map_display = hide → "No map location yet"
  lc: LocationStatus;
  f?: 1;                  // map_display = show_flagged → gold "?" badge
  c: Condition;
  ac: Access;
  fe?: number;            // entry fee in Tk, only when ticketed and known. Never 0.
  h?: number;             // travel_time_hours_from_dhaka
  tb: TravelBucket;
  dt?: 0 | 1;             // day trip; absent = unknown
  rc: RecordConfidence;
  t: TypeGroup;
  p?: 1;                  // has at least one Ready image
}

/** A value that may be unknown. Render `text` ("Not documented", "No ticket reported") — never a blank, 0 or "Free". */
export type Maybe<T> = { known: true; value: T; note?: string } | { known: false; text: string };

export interface SourceRef { id: string; n: number }            // footnote number on this page
export interface Conflict { field: string; versions: { text: string; sources: SourceRef[] }[] }

export interface ImageRecord {
  id: string;                 // IMG-DHK-064-001
  thumb: string;              // /thumbs/IMG-DHK-064-001.webp (4:3, in the repo)
  full: string;               // Wikimedia Commons file URL, loaded only in the lightbox
  alt: string; altLang: 'en' | 'bn';
  view: string;               // view_category
  credit: string;             // required_credit, printed verbatim
  sourcePage: string;         // source_page_url
}

/** data/build/sites/<id>.json — read at build time by /site/[id]/[slug]. */
export interface SiteRecord {
  id: string; slug: string;
  name: { en: string; bn: string; alt: string[] };
  place: { division: string; divisionBn: string; district: string; districtBn: string; upazila: string; upazilaBn: string; union?: string; unionBn?: string; locality?: string; localityBn?: string };
  location: { latlon?: [number, number]; status: LocationStatus; flagged: boolean; note: string; googleMapsUrl: string };
  summary: string;            // short_description, public text only (build fails on internal notes)
  era: Maybe<string>; founder: Maybe<string>; style: Maybe<string>;
  condition: Condition; preservation: Maybe<string>;
  access: Access;
  visiting: { hours: Maybe<string>; hoursNote?: string; closed: Maybe<string>; fee: Maybe<number>; feeNote?: string; restrictions: Maybe<string>; photography: Maybe<string>; facilities: Maybe<string>; accessibility: Maybe<string>; bestTime: Maybe<string>; lastChecked: string };
  travel: { hours?: number; bucket: TravelBucket; dayTrip?: boolean; oneWayCost?: number; routes: Route[] };
  history: { year: string; type: string; text: string; status: string; sources: SourceRef[] }[];
  features: string[];
  legends: { text: string; evidence: 'local_oral_account' | 'unattributed_report' | 'legend_or_folklore'; attribution: string; note: string }[];
  conflicts: Conflict[];
  images: ImageRecord[];      // Ready only. 'Needs review' and 'Permission required' never reach this file.
  externalPhotos?: { label: string; url: string }; // "See visitor photos on Google Maps"
  related: { id: string; slug: string; en: string; bn: string; c: Condition; h?: number; thumb?: string }[];
  itineraries: { id: string; title: string; duration: string }[];
  sources: { n: number; id: string; title: string; publisher: string; date?: string; url?: string }[];
  stillToConfirm: string[];   // from unverified_fields, as plain words
  confidence: RecordConfidence;
  lastVerified: string;
}

export interface Route {
  kind: 'primary' | 'alternative';
  mode: 'bus' | 'train' | 'launch' | 'ferry' | 'car' | 'air' | 'boat';
  steps: { label: string; mode?: string; note?: string; costText?: string }[];
  hours?: number; cost?: number; costBasis?: string; estimateDate?: string;
  description: string;
}

/** data/build/trips/<id>.json — read at build time by /trips/[id]. */
export interface Itinerary {
  id: string; title: string; titleBn?: string;
  duration: 'One day' | 'Overnight / multi-day' | 'Not stated';
  anchor: string; siteIds: string[];
  stops: { order: number; time?: string; siteId?: string; name: string; note: string; leg?: string; latlon?: [number, number] }[];
  notes: string[]; budget: { item: string; amount: Maybe<string> }[];
  lastChecked: string;
}

/** data/build/trips.json — one row per itinerary, for /trips, Home and division pages. */
export interface TripSummary {
  id: string; title: string; duration: Itinerary['duration'];
  anchor: string; anchorSlug: string; anchorEn: string; anchorBn: string;
  division: string; district: string; siteIds: string[]; stopCount: number;
  hours?: number; bucket: TravelBucket; dayTrip?: boolean; thumb?: string;
}

type ConditionCounts = Record<Condition, number>;

/** data/build/divisions.json */
export interface Division {
  slug: string; en: string; bn: string; count: number; onMap: number;
  conditions: ConditionCounts; noPin: string[];  // site IDs with map_display = hide
  districts: { slug: string; en: string; bn: string; count: number }[];
  tripCount: number;
}

/** data/build/districts.json */
export interface District {
  slug: string; en: string; bn: string; division: string; divisionSlug: string;
  count: number; onMap: number; conditions: ConditionCounts; noPin: string[]; siteIds: string[];
}

/** data/build/sources.json — /sources and /sources/[id]. */
export interface SourceEntry {
  id: string; type: string; typeLabel: string; title: string; publisher: string;
  date?: string; accessed?: string; url?: string; readStatus: string; notes: string;
  projectFile: boolean;   // project working files (master lists, audits), grouped separately
  sites: { id: string; slug: string; en: string; bn: string }[];
}

/** data/build/credits.json — Ready images only. */
export interface Credit {
  imageId: string; thumb: string; siteId: string; siteSlug: string; siteEn: string; siteBn: string;
  creator: string; license: string; credit: string; sourcePage: string;
}

/** data/build/meta.json */
export interface Meta {
  lastUpdated: string; generatedAt: string;
  counts: {
    sites: number; onMap: number; noPin: number; flagged: number; withPhotos: number; images: number;
    trips: number; dayTrips: number; sources: number; divisions: number; districts: number;
    historyEvents: number; legends: number; conditions: ConditionCounts; confidence: Record<RecordConfidence, number>;
  };
}
