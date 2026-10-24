// Shapes of the generated JSON. The CSV tables are the source of truth;
// scripts/build-data turns them into these files at build time.
// docs/DATA_CONTRACT.md documents where each field comes from and its empty state; keep the two in step.

export type Condition = 'preserved' | 'preserved_adaptive_reuse' | 'in_ruins' | 'lost' | 'unknown';
export type Access = 'ticketed' | 'open_no_ticket_reported' | 'restricted_or_permission' | 'unknown' | 'not_applicable_lost';
export type LocationStatus = 'verified' | 'single_source' | 'approximate' | 'unverified' | 'not_found';
export type RecordConfidence = 'confirmed' | 'partially_confirmed' | 'unconfirmed' | 'not_graded';
export type TravelBucket = '0-1' | '1-2' | '2-3' | '3-4' | '4+' | 'unknown';
export type TypeGroup = 'house' | 'rajbari' | 'kachari' | 'kuthi' | 'chief' | 'religious' | 'fort' | 'other' | 'unclassified';

/** One row of public/data/index.json (short keys keep it at ~60 KB gzipped for 413 sites). */
export interface IndexSite {
  i: string;              // site_id, e.g. "JB-DHK-064"
  s: string;              // slug
  e: string; b?: string;  // name_en, name_bn; no b → "Bangla name not yet recorded" (O13)
  sm?: string;            // first sentence of short_description, ≤160 chars: the map card's one-liner (spec 07 D1)
  a?: string;             // alternate_names (search only)
  fm?: string;            // founder or family, as text (search only; not a normalized family)
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
  ty: string;             // raw site_type, for the type filter
  hv?: 1;                 // opening times known (a clock time in opening_hours)
  oc?: number;            // one-way cost from Dhaka in Tk, only when a number is known
  p?: 1;                  // has at least one Ready image
  img?: { id: string; credit: string }; // first Ready image, for the card photo
}

/** A value that may be unknown. Render `text` ("Not documented", "No ticket reported") — never a blank, 0 or "Free". */
export type Maybe<T> = { known: true; value: T; note?: string } | { known: false; text: string };

export type Relation = 'supports' | 'disputed_by' | 'reported_by';
/** site_relationships.relation_type. Only combine_on_trip is a trip suggestion; the others are notes about identity. */
export type SiteRelation = 'combine_on_trip' | 'same_name_different_site' | 'possible_duplicate' | 'possibly_part_of' | 'same_complex' | 'same_family_separate_site';
/** A footnote on this page. relation: how the source relates to the claim, where a claim link says so. */
export interface SourceRef { id: string; n: number; relation?: Relation }
/** A Maybe with the sources of the fact claims for the field (empty when none has a source). */
export type Fact = Maybe<string> & { sources: SourceRef[] };
/**
 * Versions carry only the sources whose publisher their text names. Sources that match no version, or
 * more than one, are in unattributedSources: "Sources for this disagreement (not matched to a version)".
 */
export interface Conflict { field: string; versions: { text: string; sources: SourceRef[] }[]; unattributedSources?: SourceRef[] }

export interface ImageRecord {
  id: string;                 // IMG-DHK-064-001
  thumb: string;              // /thumbs/IMG-DHK-064-001.webp (4:3, in the repo)
  full: string;               // the source file (Wikimedia Commons), loaded only in the lightbox; the thumbnail when there is none (an owner's photo)
  alt: string; altLang: 'en' | 'bn';
  view: string;               // view_category
  credit: string;             // required_credit, printed verbatim
  sourcePage?: string;        // source_page_url; absent for a photo with no web page (an owner's photo)
}

/** data/build/sites/<id>.json — read at build time by /site/[id]/[slug]. */
export interface SiteRecord {
  id: string; slug: string;
  name: { en: string; bn?: string; alt: string[] };
  bnMissing?: true;           // no Bangla name yet: show the English name with lang="en" (O13)
  place: { division: string; divisionBn: string; district: string; districtBn: string; upazila: string; upazilaBn: string; union?: string; unionBn?: string; locality?: string; localityBn?: string };
  location: { latlon?: [number, number]; status: LocationStatus; flagged: boolean; note?: string; googleMapsUrl: string }; // no note for a hidden pin (it may name coordinates)
  summary: string;            // short_description, public text only (build fails on internal notes)
  era: Fact; founder: Fact; style: Fact;
  condition: Condition; preservation: Fact;
  access: Access;
  visiting: {
    hours: Maybe<string>; hoursKnown: boolean; hoursNote?: string;
    closed: Maybe<string>;    // weekly_closing_days as written (unreviewed text)
    closedDays: ClosedDays;   // the reviewed closed_days column; DayCheck reads only this
    fee: Maybe<number>; feeNote?: string; restrictions: Maybe<string>; photography: Maybe<string>; facilities: Maybe<string>; accessibility: Maybe<string>; bestTime: Maybe<string>;
    date?: string;            // visitor_info.last_verified: "Visiting info checked …"
  };
  travel: { hours?: number; bucket: TravelBucket; dayTrip?: boolean; oneWayCost?: number; routes: Route[] };
  history: { year: string; type: string; text: string; status: string; sources: SourceRef[] }[]; // placeholder events dropped; [] → "No history recorded yet"
  features: Feature[];        // from features.csv only; [] → FeatureList shows "Not documented"
  legends: { text: string; evidence: 'local_oral_account' | 'unattributed_report' | 'legend_or_folklore'; attribution: string; note: string; sources: SourceRef[] }[];
  conflicts: Conflict[];
  images: ImageRecord[];      // Ready only. 'Needs review' and 'Permission required' never reach this file.
  externalPhotos?: { label: string; url: string }; // only without Ready images; a hidden pin gets a name-only search (O10)
  related: { id: string; slug: string; en: string; bn?: string; c: Condition; h?: number; thumb?: string; relation: SiteRelation; note?: string }[];
  itineraries: { id: string; title: string; duration: string }[];
  sources: { n: number; id: string; title: string; publisher: string; date?: string; url?: string }[];
  stillToConfirm: string[];   // from unverified_fields, as plain words
  confidence: RecordConfidence;
  lastVerified: string;
}

/** Closing days from the reviewed column. known: false → "Closing days not documented". */
export type Day = 'sat' | 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri';
export type ClosedDays = { known: true; days: Day[] } | { known: false }; // days [] = no closing day

export interface Feature { text: string; textBn?: string; measurement?: string; unit?: string; status: string; sources: SourceRef[] }

/** unknown and mixed get neutral icons. inferred: the label was "Other / mixed" and the description named one mode. */
export type Mode = 'bus' | 'train' | 'launch' | 'ferry' | 'car' | 'air' | 'boat' | 'unknown' | 'mixed';

export interface Route {
  kind: 'primary' | 'alternative';
  mode: Mode; inferred?: true;
  steps: { label: string; mode?: string; note?: string; costText?: string }[];
  hours?: number; cost?: number; costBasis?: string; estimateDate?: string;
  description: string;
}

export type PlanStatus = 'timed' | 'circuit' | 'incomplete';

/** A budget row from costs.csv. No amount → the item is listed under budget.omitted (unless noTicket). */
export interface BudgetRow {
  item: string; category: string;
  amount?: number;            // a number > 0, never 0
  range?: [number, number];   // reserved: not emitted until costs.csv has min/max columns
  noTicket?: true;            // entry fee 0: "No ticket reported", in neither the subtotal nor omitted
  currency?: string;
  unit?: 'per_person' | 'per_vehicle' | 'per_group';
  basis?: 'shared' | 'reserved';
  legs?: [number, number][];  // stop-order pairs the cost covers
  note?: string;              // basis_and_assumptions, as written
  date?: string;              // estimate_date
  status: string;
  sources: string[];          // SRC- IDs
}

/** data/build/trips/<id>.json — read at build time by /trips/[id]. */
export interface Itinerary {
  id: string; title: string; titleBn?: string;
  duration: 'One day' | 'Overnight / multi-day' | 'Not stated';
  planStatus?: PlanStatus;    // absent until the editor reviews plan_status
  anchor: string; siteIds: string[];
  stops: {
    order: number; kind: 'site' | 'place'; time?: string; siteId?: string; name: string; note: string;
    latlon?: [number, number];  // a site: when it has a pin; a place: only from itinerary_places.csv
    sources?: string[];         // a place's location sources
    visitingChecked?: string;   // a site's visitor_info.last_verified
  }[];
  legs: { from: number; to: number; mode: Mode; hours?: number; costRow?: string; sources: string[] }[];
  schematic: boolean;         // no legs: "schematic: stops in order, roads not drawn"
  notes: string[];
  budget: { rows: BudgetRow[]; known?: number; omitted: string[] }; // known: per-person amounts only
  costsEstimated?: { from: string; to: string };  // "Costs estimated …"
}

/** data/build/trips.json — one row per itinerary, for /trips, Home and division pages. */
export interface TripSummary {
  id: string; title: string; duration: Itinerary['duration']; planStatus?: PlanStatus;
  anchor: string; anchorSlug: string; anchorEn: string; anchorBn?: string;
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
  sites: { id: string; slug: string; en: string; bn?: string }[];
  citationsByDivision: Partial<Record<string, number>>; // site citations per division (divisions with none are absent)
  bib?: { author?: string; publisher?: string; edition?: string; isbn?: string; verificationMethod?: string };
}

/** data/build/credits.json — Ready images only. */
export interface Credit {
  imageId: string; thumb: string; siteId: string; siteSlug: string; siteEn: string; siteBn?: string;
  creator: string; license: string; credit: string; sourcePage?: string;
}

/** data/build/meta.json */
export interface Meta {
  lastVerified: string;       // newest last_verified in sites and visitor_info
  compiledAt: string;         // when the data was compiled: SOURCE_DATE_EPOCH, else lastVerified
  counts: {
    sites: number; onMap: number; noPin: number; flagged: number; withPhotos: number; images: number;
    trips: number; dayTrips: number; sources: number; divisions: number; districts: number;
    historyEvents: number; legends: number; hoursKnown: number; conditions: ConditionCounts; confidence: Record<RecordConfidence, number>;
  };
}
