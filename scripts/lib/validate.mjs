// Shared data rules for build-index.mjs, build-data.mjs and the tests. Each rule is defined once here.

import { MODE_LABEL, MODES, PLAN_STATUS, FARE_BASIS, RELATIONS } from './rules.mjs';

// Bangladesh with a margin. Coordinates outside this box are a structural error, not a hidden pin.
export const BBOX = { latMin: 20.3, latMax: 26.7, lonMin: 88.0, lonMax: 92.7 };

const finite = v => v !== '' && v != null && Number.isFinite(Number(v));
export const inBangladesh = (lat, lon) =>
  finite(lat) && finite(lon) && +lat >= BBOX.latMin && +lat <= BBOX.latMax && +lon >= BBOX.lonMin && +lon <= BBOX.lonMax;

// A site gets a pin only with both coordinates inside the box and map_display other than "hide".
export const isMappable = s => s.map_display !== 'hide' && inBangladesh(s.latitude, s.longitude);
export const latlon = s => (isMappable(s) ? [Number(Number(s.latitude).toFixed(5)), Number(Number(s.longitude).toFixed(5))] : undefined);

// A latitude,longitude pair inside a string (plain or URL-encoded comma), used to keep hidden pins out of URLs.
export const COORD_PAIR = /-?\d{1,3}\.\d{3,}\s*(?:,|%2C)\s*-?\d{1,3}\.\d{3,}/i;

export const ID = {
  site: /^JB-[A-Z]{3}-\d{3}$/,
  source: /^SRC-\d{4}$/,
  claim: /^CL-[A-Z]{3}-\d{3}-\d{3}$/,
  itinerary: /^IT-[A-Z]{3}-\d{3}-\d$/,
  relation: /^RL-\d{4}$/,
  image: /^[A-Z]{3}-[A-Z]{3}-\d{3}-\d{3}$/,
  route: /^[A-Z]{2}-[A-Z]{3}-\d{3}-\d$/,
  cost: /^[A-Z]{2}-[A-Z]{3}-\d{3}-\d{2}$/,
  event: /^[A-Z]{2}-[A-Z]{3}-\d{3}-\d{3}$/,
  legend: /^[A-Z]{2}-[A-Z]{3}-\d{3}-\d{2}$/
};

// Site types grouped as in the filter drawer. Its keys are the allowed site_type values.
export const TYPE_GROUP = {
  zamindar_house: 'house', talukdar_house: 'house', jotdar_house: 'house', historic_residence: 'house', garden_house: 'house',
  royal_palace: 'rajbari', kachari: 'kachari', kachari_bari: 'kachari', indigo_kuthi: 'kuthi', circle_chief_seat: 'chief',
  temple: 'religious', mosque: 'religious', math: 'religious', fort: 'fort',
  museum: 'other', estate_cluster: 'other', dighi: 'other', hammamkhana: 'other', archaeological_site: 'other', memorial_institution: 'other',
  unclassified: 'unclassified'
};
// The data has '4-5h' and '4h+'; the UI merges them.
export const BUCKET = { '0-1h': '0-1', '1-2h': '1-2', '2-3h': '2-3', '3-4h': '3-4', '4-5h': '4+', '4h+': '4+', unknown: 'unknown' };
export const DIVISIONS = ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh'];
export const CONDITIONS = ['preserved', 'preserved_adaptive_reuse', 'in_ruins', 'lost', 'unknown'];
export const CONFIDENCE = ['confirmed', 'partially_confirmed', 'unconfirmed', 'not_graded'];

const BOOL_OR_BLANK = ['TRUE', 'FALSE', ''];
// Allowed values per table and column, as observed on 22 Oct 2026.
export const ENUMS = {
  sites: {
    condition_category: CONDITIONS,
    visitor_access: ['restricted_or_permission', 'open_no_ticket_reported', 'unknown', 'not_applicable_lost', 'ticketed'],
    coordinates_status: ['verified', 'single_source', 'approximate', 'unverified', 'not_found'],
    map_display: ['show', 'show_flagged', 'hide'],
    record_confidence: CONFIDENCE,
    travel_time_bucket: Object.keys(BUCKET),
    day_trip_from_dhaka: BOOL_OR_BLANK,
    division: DIVISIONS,
    site_type: Object.keys(TYPE_GROUP)
  },
  itineraries: { duration: ['One day', 'Overnight / multi-day', 'Not stated'], day_trip_from_dhaka: BOOL_OR_BLANK, plan_status: [...PLAN_STATUS, ''] },
  costs: { fare_basis: [...FARE_BASIS, ''] },
  itinerary_legs: { mode: MODES },
  claims: { claim_type: ['fact', 'conflict', 'legend'] },
  claim_source_links: { relation: ['supports', 'disputed_by', 'reported_by'] },
  travel_routes: { route_kind: ['primary', 'alternative'], transport_mode: Object.keys(MODE_LABEL) },
  site_relationships: { relation_type: RELATIONS }
};

// Dates. System dates are exact days; citation dates are as precise as their source, or a range.
export function isIsoDay(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}
const isPartialDate = v => /^\d{4}$/.test(v) || (/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) || isIsoDay(v);
export function isCitationDate(v) {
  if (v === '') return true;
  const parts = v.split(' to ');
  return parts.length <= 2 && parts.every(isPartialDate);
}

export const isNonNegativeNumber = v => finite(v) && Number(v) >= 0;
export const isPositiveInteger = v => /^\d+$/.test(v) && Number(v) >= 1;

export const slugify = v => v.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const list = v => (v || '').split(';').map(x => x.trim()).filter(Boolean);
export const srcIds = v => (v || '').match(/SRC-\d{4}/g) ?? [];
