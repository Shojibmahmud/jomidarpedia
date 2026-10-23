// Structural validation of data/csv (roadmap task 1.5). Every problem here is fatal in every mode.
// Each one names the file, the line it starts on, the column and the value.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv, LINE } from '../csv.mjs';
import { ID, ENUMS, BBOX, inBangladesh, isIsoDay, isCitationDate, isNonNegativeNumber, isPositiveInteger, slugify, list, srcIds } from './validate.mjs';
import { UNIT, LEGS, parseClosedDays } from './rules.mjs';

export const TABLES = ['sites', 'history_events', 'legends', 'visitor_info', 'travel_routes', 'itineraries',
  'itinerary_stops', 'costs', 'images', 'sources', 'site_sources', 'claims', 'claim_source_links', 'site_relationships',
  'itinerary_places', 'itinerary_legs', 'features'];
// Tables filled only from research. A missing file counts as an empty table.
export const OPTIONAL_TABLES = ['itinerary_places', 'itinerary_legs', 'features'];

// Columns the builders read. Other columns may come and go.
export const REQUIRED = {
  sites: ['site_id', 'dataset_slug', 'name_en', 'name_bn', 'alternate_names', 'site_type', 'division', 'division_bn', 'district', 'district_bn',
    'upazila', 'upazila_bn', 'union', 'union_bn', 'locality', 'locality_bn', 'latitude', 'longitude', 'coordinates_status', 'map_display',
    'coordinates_note', 'google_maps_url', 'short_description', 'established_era', 'founder_or_family', 'architectural_style',
    'condition_category', 'preservation_status', 'visitor_access', 'entry_fee_bdt', 'travel_time_hours_from_dhaka', 'travel_time_bucket',
    'day_trip_from_dhaka', 'one_way_cost_bdt_estimate', 'record_confidence', 'unverified_fields', 'last_verified'],
  history_events: ['event_id', 'site_id', 'event_type', 'date_text', 'year_start', 'year_end', 'date_approximate', 'description', 'verification_status', 'source_ids'],
  legends: ['legend_id', 'site_id', 'narrative', 'evidence_type', 'attribution', 'verification_note', 'claim_id'],
  visitor_info: ['site_id', 'opening_hours', 'hours_note', 'weekly_closing_days', 'closed_days', 'entry_fee_bdt', 'entry_fee_note', 'restrictions_and_permissions',
    'photography_rules', 'facilities', 'accessibility', 'best_time_to_visit', 'last_verified'],
  travel_routes: ['route_id', 'site_id', 'route_kind', 'transport_mode', 'route_description', 'last_mile', 'duration_hours_one_way', 'cost_bdt_one_way', 'cost_basis', 'estimate_date'],
  itineraries: ['itinerary_id', 'anchor_site_id', 'title', 'duration', 'linked_site_ids', 'planning_notes', 'day_trip_from_dhaka', 'plan_status'],
  itinerary_stops: ['itinerary_id', 'stop_order', 'time_or_day', 'site_id', 'stop_name', 'notes'],
  costs: ['cost_id', 'site_id', 'category', 'amount_bdt', 'amount_text', 'currency', 'unit', 'basis_and_assumptions', 'estimate_date', 'status', 'source_ids', 'fare_basis', 'legs'],
  images: ['image_id', 'site_id', 'site_name', 'relative_file_path', 'view_category', 'caption_alt_text', 'creator', 'source_page_url',
    'direct_image_url', 'google_maps_url', 'license_rights_status', 'required_credit', 'publication_readiness'],
  sources: ['source_id', 'source_type', 'source_type_label', 'title', 'author_or_organization', 'publication_date', 'access_date', 'url', 'read_status', 'reliability_notes',
    'author', 'publisher', 'edition', 'isbn', 'verification_method'],
  site_sources: ['site_id', 'source_id', 'citation_title', 'citation_publisher', 'citation_date'],
  claims: ['claim_id', 'site_id', 'field', 'claim_type', 'claim_text'],
  claim_source_links: ['claim_id', 'site_id', 'source_id', 'relation'],
  site_relationships: ['relation_id', 'site_id', 'related_site_id', 'relation_type', 'note'],
  itinerary_places: ['itinerary_id', 'stop_order', 'latitude', 'longitude', 'source_ids'],
  itinerary_legs: ['itinerary_id', 'from_stop', 'to_stop', 'mode', 'duration', 'cost_row', 'source_ids'],
  features: ['site_id', 'feature', 'feature_bn', 'measurement', 'unit', 'source_ids', 'status']
};

// Primary ID column and pattern per table. Tables without one are keyed by a column pair (rowKey).
const PRIMARY = {
  sites: ['site_id', ID.site], sources: ['source_id', ID.source], claims: ['claim_id', ID.claim], itineraries: ['itinerary_id', ID.itinerary],
  site_relationships: ['relation_id', ID.relation], images: ['image_id', ID.image], travel_routes: ['route_id', ID.route],
  costs: ['cost_id', ID.cost], history_events: ['event_id', ID.event], legends: ['legend_id', ID.legend], visitor_info: ['site_id', ID.site]
};
const PAIR = {
  site_sources: ['site_id', 'source_id'], claim_source_links: ['claim_id', 'source_id'], itinerary_stops: ['itinerary_id', 'stop_order'],
  itinerary_places: ['itinerary_id', 'stop_order'], itinerary_legs: ['itinerary_id', 'from_stop', 'to_stop']
};
const STOP_KEYED = ['itinerary_stops', 'itinerary_places', 'itinerary_legs'];

// How a row is named in messages and in the report's "cells to edit".
export function rowKey(table, row) {
  if (PRIMARY[table]) return row[PRIMARY[table][0]];
  if (PAIR[table]) return PAIR[table].map(k => row[k]).join(STOP_KEYED.includes(table) ? '#' : '/');
  return `line ${row[LINE]}`;
}

const SYSTEM_DATES = { sites: ['last_verified'], visitor_info: ['last_verified'], sources: ['access_date'], images: ['date_accessed'], costs: ['estimate_date'], travel_routes: ['estimate_date'] };
const CITATION_DATES = { site_sources: ['citation_date'], sources: ['publication_date'] };
const NUMBERS = {
  sites: ['entry_fee_bdt', 'travel_time_hours_from_dhaka', 'one_way_cost_bdt_estimate'], visitor_info: ['entry_fee_bdt'],
  costs: ['amount_bdt'], travel_routes: ['duration_hours_one_way', 'cost_bdt_one_way'], itinerary_legs: ['duration']
};

// Reads the named tables. A missing file or malformed CSV is reported, not thrown.
export function loadTables(csvDir, names = TABLES) {
  const T = {}, errors = [];
  for (const name of names) {
    const file = `${name}.csv`;
    const path = join(csvDir, file);
    if (!existsSync(path)) {
      if (!OPTIONAL_TABLES.includes(name)) errors.push({ file, line: 0, message: 'file is missing' });
      T[name] = [];
      continue;
    }
    const { rows, errors: e } = parseCsv(readFileSync(path, 'utf8'));
    e.forEach(x => errors.push({ file, ...x }));
    T[name] = rows;
  }
  return { T, errors };
}

// Checks the loaded tables. Foreign keys are checked only against tables that were loaded.
export function validateTables(T) {
  const errors = [];
  const err = (table, row, column, message) =>
    errors.push({ file: `${table}.csv`, line: row ? row[LINE] : 1, column, value: row && column ? row[column] : undefined, message });
  const has = t => Array.isArray(T[t]);

  for (const t of Object.keys(T)) {
    const rows = T[t];
    const present = rows.length ? Object.keys(rows[0]) : null;
    const missing = present ? (REQUIRED[t] ?? []).filter(c => !present.includes(c)) : [];
    missing.forEach(c => err(t, null, c, 'required column is missing'));
    if (missing.length) continue;

    // IDs: pattern and uniqueness.
    const seen = new Map();
    for (const r of rows) {
      if (PRIMARY[t]) {
        const [col, re] = PRIMARY[t];
        if (!re.test(r[col])) err(t, r, col, `ID does not match ${re.source}`);
      }
      const key = PRIMARY[t] || PAIR[t] ? rowKey(t, r) : null;
      if (key == null) continue;
      if (seen.has(key)) err(t, r, (PRIMARY[t] ?? PAIR[t])[0], `duplicate ID "${key}" (first on line ${seen.get(key)})`);
      else seen.set(key, r[LINE]);
    }
    // Optional columns are checked only when the file has them.
    const cols = names => (names ?? []).filter(c => present?.includes(c));
    for (const col of cols(Object.keys(ENUMS[t] ?? {}))) {
      const allowed = ENUMS[t][col];
      for (const r of rows) if (!allowed.includes(r[col])) err(t, r, col, `not one of: ${allowed.map(a => a || '(blank)').join(', ')}`);
    }
    for (const col of cols(SYSTEM_DATES[t]))
      for (const r of rows) if (r[col] !== '' && !isIsoDay(r[col])) err(t, r, col, 'date is not a real YYYY-MM-DD day');
    for (const col of cols(CITATION_DATES[t]))
      for (const r of rows) if (!isCitationDate(r[col])) err(t, r, col, 'date is not YYYY, YYYY-MM, YYYY-MM-DD or "A to B"');
    for (const col of cols(NUMBERS[t]))
      for (const r of rows) if (r[col] !== '' && !isNonNegativeNumber(r[col])) err(t, r, col, 'not a number of 0 or more');
  }

  if (has('itinerary_stops')) for (const r of T.itinerary_stops) if (!isPositiveInteger(r.stop_order)) err('itinerary_stops', r, 'stop_order', 'not a whole number of 1 or more');

  // Reviewed columns (2.11, 2.6). A blank closed_days is editorial, not structural.
  if (has('visitor_info')) for (const v of T.visitor_info)
    if (v.closed_days !== undefined && parseClosedDays(v.closed_days) === null) err('visitor_info', v, 'closed_days', 'not blank, unknown, none, or ;-separated days from sat;sun;mon;tue;wed;thu;fri');
  if (has('costs')) for (const c of T.costs) {
    if (c.amount_bdt !== '' && c.unit !== undefined && !Object.hasOwn(UNIT, c.unit))
      err('costs', c, 'unit', c.unit ? 'unit is not in the reviewed unit table (scripts/lib/rules.mjs)' : 'a cost with an amount needs a unit');
    if (c.legs && !LEGS.test(c.legs)) err('costs', c, 'legs', 'not stop-order pairs such as 1-2;2-4');
  }

  // Place coordinates and legs (2.10): only from researched rows with sources, and only for stops that exist.
  const stopOf = new Map((T.itinerary_stops ?? []).map(st => [`${st.itinerary_id}#${st.stop_order}`, st]));
  if (has('itinerary_places')) for (const p of T.itinerary_places) {
    const st = stopOf.get(`${p.itinerary_id}#${p.stop_order}`);
    if (!st) err('itinerary_places', p, 'stop_order', `there is no stop ${p.stop_order} in ${p.itinerary_id}`);
    else if (st.site_id) err('itinerary_places', p, 'stop_order', `stop ${p.stop_order} is a site (${st.site_id}); its location comes from sites.csv`);
    if (!inBangladesh(p.latitude, p.longitude)) err('itinerary_places', p, 'latitude', 'coordinates are missing or outside Bangladesh');
    if (!srcIds(p.source_ids).length) err('itinerary_places', p, 'source_ids', 'a place location needs at least one SRC- source');
  }
  if (has('itinerary_legs')) for (const l of T.itinerary_legs)
    for (const col of ['from_stop', 'to_stop'])
      if (!stopOf.has(`${l.itinerary_id}#${l[col]}`)) err('itinerary_legs', l, col, `there is no stop ${l[col]} in ${l.itinerary_id}`);
  if (has('features')) for (const f of T.features) if (!f.feature) err('features', f, 'feature', 'feature is empty');

  if (has('sites')) {
    for (const s of T.sites) {
      if (!s.latitude !== !s.longitude) err('sites', s, s.latitude ? 'longitude' : 'latitude', 'only one of latitude and longitude is given');
      else if (s.latitude && !inBangladesh(s.latitude, s.longitude))
        err('sites', s, 'latitude', `coordinates ${s.latitude}, ${s.longitude} are outside Bangladesh (lat ${BBOX.latMin}–${BBOX.latMax}, lon ${BBOX.lonMin}–${BBOX.lonMax}); swapped or mistyped?`);
    }
    // Generated route paths: one namespace each for sites, districts and divisions.
    const unique = (label, values) => {
      const first = new Map();
      for (const [slug, s, col] of values) {
        if (first.has(slug) && first.get(slug).name !== s[col]) err('sites', s, col, `${label} slug "${slug}" is also used by ${first.get(slug).id}`);
        else if (!first.has(slug)) first.set(slug, { id: s.site_id, name: s[col] });
      }
    };
    const firstSlug = new Map();
    for (const s of T.sites) {
      if (!s.dataset_slug) err('sites', s, 'dataset_slug', 'slug is empty');
      else if (firstSlug.has(s.dataset_slug)) err('sites', s, 'dataset_slug', `site slug "${s.dataset_slug}" is also used by ${firstSlug.get(s.dataset_slug)}`);
      else firstSlug.set(s.dataset_slug, s.site_id);
    }
    unique('district', T.sites.map(s => [slugify(s.district), s, 'district']));
    unique('division', T.sites.map(s => [slugify(s.division), s, 'division']));
  }

  if (has('images')) for (const im of T.images)
    if ((im.publication_readiness || '').startsWith('Ready') && !im.relative_file_path) err('images', im, 'relative_file_path', 'a Ready image has no file path');

  // Foreign keys.
  const ids = (t, col) => (has(t) ? new Set(T[t].map(r => r[col])) : null);
  const S = ids('sites', 'site_id'), SRC = ids('sources', 'source_id'), CL = ids('claims', 'claim_id'), IT = ids('itineraries', 'itinerary_id');
  const fk = (t, col, set, target, { blankOk = false, split = v => [v] } = {}) => {
    if (!has(t) || !set) return;
    for (const r of T[t]) {
      if (blankOk && !r[col]) continue;
      for (const v of split(r[col])) if (!set.has(v)) err(t, r, col, `"${v}" is not in ${target}`);
    }
  };
  for (const t of ['history_events', 'legends', 'visitor_info', 'travel_routes', 'costs', 'images', 'site_sources', 'claims', 'claim_source_links', 'site_relationships'])
    fk(t, 'site_id', S, 'sites.csv');
  fk('itinerary_stops', 'site_id', S, 'sites.csv', { blankOk: true });
  fk('itineraries', 'anchor_site_id', S, 'sites.csv');
  fk('itineraries', 'linked_site_ids', S, 'sites.csv', { split: list });
  fk('site_relationships', 'related_site_id', S, 'sites.csv');
  fk('site_sources', 'source_id', SRC, 'sources.csv');
  fk('claim_source_links', 'source_id', SRC, 'sources.csv');
  fk('history_events', 'source_ids', SRC, 'sources.csv', { split: srcIds });
  fk('legends', 'attribution', SRC, 'sources.csv', { split: srcIds });
  fk('claim_source_links', 'claim_id', CL, 'claims.csv');
  fk('legends', 'claim_id', CL, 'claims.csv', { blankOk: true });
  fk('itinerary_stops', 'itinerary_id', IT, 'itineraries.csv');
  fk('costs', 'source_ids', SRC, 'sources.csv', { split: srcIds });
  fk('itinerary_places', 'itinerary_id', IT, 'itineraries.csv');
  fk('itinerary_places', 'source_ids', SRC, 'sources.csv', { split: srcIds });
  fk('itinerary_legs', 'itinerary_id', IT, 'itineraries.csv');
  fk('itinerary_legs', 'cost_row', ids('costs', 'cost_id'), 'costs.csv', { blankOk: true });
  fk('itinerary_legs', 'source_ids', SRC, 'sources.csv', { split: srcIds });
  fk('features', 'site_id', S, 'sites.csv');
  fk('features', 'source_ids', SRC, 'sources.csv', { split: srcIds });
  return errors;
}

export const formatStructural = e =>
  `${e.file}${e.line ? `, line ${e.line}` : ''}${e.column ? `, column ${e.column}` : ''}: ${e.message}${e.value !== undefined && e.value !== '' ? ` (value: "${String(e.value).slice(0, 80)}")` : ''}`;
