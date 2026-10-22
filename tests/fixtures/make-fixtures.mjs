#!/usr/bin/env node
// Writes tests/fixtures/csv/: a minimal valid data set (valid/) plus one case per rule.
// Each case folder holds only the tables it changes (the rest come from valid/) and an
// expected.json. Run `node tests/fixtures/make-fixtures.mjs` after changing a rule or a column.
//
//   invalid/<case>   structural errors: fatal in every mode, named by file, line and column
//   hostile/<case>   safety rules: fatal in every mode, output written for inspection
//   editorial/<case> fatal only in release

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REQUIRED } from '../../scripts/lib/structure.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), 'csv');

const S1 = {
  site_id: 'JB-DHK-001', dataset_slug: 'test-house-one', name_en: 'Test House One', name_bn: 'টেস্ট বাড়ি এক', site_type: 'zamindar_house',
  division: 'Dhaka', division_bn: 'ঢাকা', district: 'Manikganj', district_bn: 'মানিকগঞ্জ', upazila: 'Saturia', upazila_bn: 'সাটুরিয়া',
  latitude: '23.91234', longitude: '90.12345', coordinates_status: 'verified', map_display: 'show', coordinates_note: 'Pin matched to a published map.',
  google_maps_url: 'https://www.google.com/maps/search/?api=1&query=23.91234,90.12345', short_description: 'A two-storey house with a courtyard.',
  established_era: 'c. 1850', founder_or_family: 'Roy family', architectural_style: 'Indo-Saracenic', condition_category: 'preserved',
  preservation_status: 'Maintained by a trust', visitor_access: 'ticketed', entry_fee_bdt: '20', travel_time_hours_from_dhaka: '2',
  travel_time_bucket: '1-2h', day_trip_from_dhaka: 'TRUE', one_way_cost_bdt_estimate: '200', record_confidence: 'confirmed',
  unverified_fields: '', last_verified: '2026-10-01'
};
// Hidden pin: map_display = hide, with coordinates in the CSV that must never reach the output.
const S2 = {
  ...S1, site_id: 'JB-DHK-002', dataset_slug: 'test-house-two', name_en: 'Test House Two', name_bn: 'টেস্ট বাড়ি দুই', site_type: 'royal_palace',
  latitude: '23.95678', longitude: '90.15678', coordinates_status: 'unverified', map_display: 'hide', coordinates_note: 'Location not confirmed.',
  google_maps_url: 'https://www.google.com/maps/search/?api=1&query=23.95678,90.15678', condition_category: 'in_ruins',
  visitor_access: 'open_no_ticket_reported', entry_fee_bdt: '0', travel_time_hours_from_dhaka: '', travel_time_bucket: 'unknown',
  day_trip_from_dhaka: '', one_way_cost_bdt_estimate: '', record_confidence: 'unconfirmed', unverified_fields: 'location.coordinates', last_verified: '2026-10-02'
};

const VALID = {
  sites: [S1, S2],
  history_events: [{ event_id: 'HE-DHK-001-001', site_id: 'JB-DHK-001', event_type: 'built', date_text: 'c. 1850', year_start: '1850', date_approximate: 'TRUE', description: 'The house was built.', verification_status: 'single_source', source_ids: 'SRC-0001' }],
  legends: [{ legend_id: 'LG-DHK-001-01', site_id: 'JB-DHK-001', narrative: 'A tunnel is said to run to the river.', evidence_type: 'oral', attribution: 'SRC-0001', verification_note: 'Not confirmed.', claim_id: 'CL-DHK-001-001' }],
  visitor_info: [
    { site_id: 'JB-DHK-001', opening_hours: '9 AM to 5 PM', closed_days: 'fri', entry_fee_bdt: '20', entry_fee_note: 'Per adult.', last_verified: '2026-10-01' },
    { site_id: 'JB-DHK-002', opening_hours: 'Unknown', closed_days: 'unknown', entry_fee_bdt: '0', last_verified: '2026-10-02' }
  ],
  travel_routes: [{ route_id: 'TR-DHK-001-1', site_id: 'JB-DHK-001', route_kind: 'primary', transport_mode: 'Bus', route_description: 'Gabtoli -> Saturia', last_mile: 'Rickshaw', duration_hours_one_way: '2', cost_bdt_one_way: '150', cost_basis: 'Bus fare', estimate_date: '2026-10-01' }],
  itineraries: [{ itinerary_id: 'IT-DHK-001-1', anchor_site_id: 'JB-DHK-001', title: 'Suggested circuit (Saturia loop) (Test House One (Roy Bari))', duration: 'One day', linked_site_ids: 'JB-DHK-001; JB-DHK-002', planning_notes: 'Start early.', day_trip_from_dhaka: 'TRUE', plan_status: 'circuit' }],
  itinerary_stops: [
    { itinerary_id: 'IT-DHK-001-1', stop_order: '1', time_or_day: '9:00 AM', site_id: 'JB-DHK-001', stop_name: 'Test House One', notes: '' },
    { itinerary_id: 'IT-DHK-001-1', stop_order: '2', time_or_day: '', site_id: 'JB-DHK-002', stop_name: 'Test House Two', notes: '' },
    { itinerary_id: 'IT-DHK-001-1', stop_order: '3', time_or_day: '1:00 PM', site_id: '', stop_name: 'Lunch at Saturia bazaar', notes: '' }
  ],
  // A researched place location and leg, each with a source.
  itinerary_places: [{ itinerary_id: 'IT-DHK-001-1', stop_order: '3', latitude: '23.91500', longitude: '90.12500', source_ids: 'SRC-0002' }],
  itinerary_legs: [{ itinerary_id: 'IT-DHK-001-1', from_stop: '1', to_stop: '2', mode: 'car', duration: '0.5', cost_row: 'CO-DHK-001-02', source_ids: 'SRC-0002' }],
  features: [],
  costs: [
    { cost_id: 'CO-DHK-001-01', site_id: 'JB-DHK-001', category: 'entry_fee', amount_bdt: '20', amount_text: 'Tk 20', currency: 'BDT', unit: 'per person (local adult rate unless stated)', basis_and_assumptions: 'Ticket price at the gate.', estimate_date: '2026-10-01', status: 'reported', source_ids: 'SRC-0002' },
    { cost_id: 'CO-DHK-001-02', site_id: 'JB-DHK-001', category: 'transport_dhaka_one_way', amount_bdt: '150', amount_text: 'Tk 150', currency: 'BDT', unit: 'per person, one way, public transport (assumed)', estimate_date: '2026-09-20', status: 'estimate', source_ids: 'record-level' },
    { cost_id: 'CO-DHK-001-03', site_id: 'JB-DHK-001', category: 'food', amount_bdt: '', amount_text: 'Unknown (not researched)', currency: 'BDT', estimate_date: '2026-10-01', status: 'unknown' },
    { cost_id: 'CO-DHK-002-01', site_id: 'JB-DHK-002', category: 'entry_fee', amount_bdt: '0', amount_text: 'No ticket reported', currency: 'BDT', unit: 'per person (local adult rate unless stated)', estimate_date: '2026-10-02', status: 'needs_verification' }
  ],
  images: [
    { image_id: 'IMG-DHK-001-001', site_id: 'JB-DHK-001', site_name: 'Test House One', relative_file_path: 'dhaka/test-house-one-1.jpg', view_category: 'Facade',
      caption_alt_text: 'Front of Test House One', creator: 'A. Person', source_page_url: 'https://commons.wikimedia.org/wiki/File:Test.jpg',
      direct_image_url: 'https://upload.wikimedia.org/test.jpg', license_rights_status: 'Open license: CC BY-SA 4.0',
      required_credit: 'Photo: A. Person / Wikimedia Commons, CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)', publication_readiness: 'Ready' },
    { image_id: 'IMG-DHK-002-001', site_id: 'JB-DHK-002', site_name: 'Test House Two', relative_file_path: '', view_category: 'Facade',
      required_credit: '', publication_readiness: 'Permission required' }
  ],
  sources: [
    { source_id: 'SRC-0001', source_type: 'book', source_type_label: 'Book', title: 'A Book of Houses', author_or_organization: 'A. Author', publication_date: '2024-02', access_date: '2026-10-01', read_status: 'read', reliability_notes: 'Printed source.',
      author: 'A. Author', publisher: 'House Press', edition: 'First edition', isbn: '978-0-00-000000-0', verification_method: 'Checked in print' },
    { source_id: 'SRC-0002', source_type: 'news', source_type_label: 'News media', title: 'Old house restored', author_or_organization: 'A Newspaper', publication_date: '2019', access_date: '2026-10-01', url: 'https://example.org/news', read_status: 'read', reliability_notes: '' }
  ],
  site_sources: [
    { site_id: 'JB-DHK-001', source_id: 'SRC-0001', citation_title: 'A Book of Houses', citation_publisher: 'A. Author', citation_date: '2024-02 to 2024-03' },
    { site_id: 'JB-DHK-002', source_id: 'SRC-0002', citation_title: 'Old house restored', citation_publisher: 'A Newspaper', citation_date: '' }
  ],
  // Conflicts: 002 has a matched source (A Newspaper) and an unmatched one ("A" is too short to match);
  // 003 names one publisher in both versions (ambiguous); 004 has one version.
  claims: [
    { claim_id: 'CL-DHK-001-001', site_id: 'JB-DHK-001', claim_type: 'legend', claim_text: 'A tunnel is said to run to the river.' },
    { claim_id: 'CL-DHK-001-002', site_id: 'JB-DHK-001', claim_type: 'conflict', claim_text: 'Style: Indo-Saracenic (A. Author) vs colonial (A Newspaper).' },
    { claim_id: 'CL-DHK-001-003', site_id: 'JB-DHK-001', claim_type: 'conflict', claim_text: 'Built: 1850 (A Newspaper, print) vs 1860 (A Newspaper, online).' },
    { claim_id: 'CL-DHK-001-004', site_id: 'JB-DHK-001', claim_type: 'conflict', claim_text: 'Name: the house may be the Roy family seat (A Newspaper).' },
    { claim_id: 'CL-DHK-001-005', site_id: 'JB-DHK-001', claim_type: 'fact', field: 'history.founder', claim_text: 'Roy family.' }
  ],
  claim_source_links: [
    { claim_id: 'CL-DHK-001-001', site_id: 'JB-DHK-001', source_id: 'SRC-0002', relation: 'reported_by' },
    { claim_id: 'CL-DHK-001-002', site_id: 'JB-DHK-001', source_id: 'SRC-0001', relation: 'disputed_by' },
    { claim_id: 'CL-DHK-001-002', site_id: 'JB-DHK-001', source_id: 'SRC-0002', relation: 'disputed_by' },
    { claim_id: 'CL-DHK-001-003', site_id: 'JB-DHK-001', source_id: 'SRC-0002', relation: 'disputed_by' },
    { claim_id: 'CL-DHK-001-004', site_id: 'JB-DHK-001', source_id: 'SRC-0002', relation: 'disputed_by' },
    { claim_id: 'CL-DHK-001-005', site_id: 'JB-DHK-001', source_id: 'SRC-0001', relation: 'supports' }
  ],
  site_relationships: [{ relation_id: 'RL-0001', site_id: 'JB-DHK-001', related_site_id: 'JB-DHK-002' }]
};

const cell = v => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const toCsv = (table, rows) => [REQUIRED[table].join(','), ...rows.map(r => REQUIRED[table].map(c => cell(r[c] ?? '')).join(','))].join('\n') + '\n';
const write = (path, text) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); };
const with1 = (table, k, patch) => VALID[table].map((r, i) => (i === k ? { ...r, ...patch } : r));
const plus = (table, row) => [...VALID[table], row];

// [name, { table: rows | raw text }, expected]. Lines: header = 1, first row = 2.
const INVALID = [
  ['ragged-row', { sites: toCsv('sites', VALID.sites).replace(/\n$/, ',extra\n') }, { file: 'sites.csv', line: 3 }],
  ['unclosed-quote', { sources: toCsv('sources', VALID.sources) + 'SRC-0003,news,"News media\n' }, { file: 'sources.csv', line: 4 }],
  ['duplicate-header', { claims: 'claim_id,site_id,field,claim_type,claim_text,claim_text\nCL-DHK-001-001,JB-DHK-001,,fact,a,b\n' }, { file: 'claims.csv', line: 1, column: 'claim_text' }],
  ['empty-header', { claims: 'claim_id,site_id,field,claim_type,claim_text,\nCL-DHK-001-001,JB-DHK-001,,fact,a,\n' }, { file: 'claims.csv', line: 1 }],
  ['missing-column', { costs: 'cost_id,site_id,category,amount_bdt,amount_text\nCO-DHK-001-01,JB-DHK-001,entry_fee,20,Tk 20\n' }, { file: 'costs.csv', line: 1, column: 'estimate_date' }],
  ['bad-id', { sites: with1('sites', 1, { site_id: 'JB-DHK-2' }) }, { file: 'sites.csv', line: 3, column: 'site_id' }],
  ['duplicate-id', { claims: plus('claims', { ...VALID.claims[0] }) }, { file: 'claims.csv', line: VALID.claims.length + 2, column: 'claim_id' }],
  ['duplicate-pair', { site_sources: plus('site_sources', { ...VALID.site_sources[0] }) }, { file: 'site_sources.csv', line: 4, column: 'site_id' }],
  ['fk-site', { costs: with1('costs', 1, { site_id: 'JB-DHK-099' }) }, { file: 'costs.csv', line: 3, column: 'site_id' }],
  ['fk-source', { site_sources: with1('site_sources', 0, { source_id: 'SRC-0099' }) }, { file: 'site_sources.csv', line: 2, column: 'source_id' }],
  ['fk-claim', { claim_source_links: with1('claim_source_links', 0, { claim_id: 'CL-DHK-001-099' }) }, { file: 'claim_source_links.csv', line: 2, column: 'claim_id' }],
  ['fk-embedded-source', { history_events: with1('history_events', 0, { source_ids: 'SRC-0001; SRC-0099' }) }, { file: 'history_events.csv', line: 2, column: 'source_ids' }],
  ['fk-legend-attribution', { legends: with1('legends', 0, { attribution: 'Book (SRC-0099)' }) }, { file: 'legends.csv', line: 2, column: 'attribution' }],
  ['fk-itinerary', { itinerary_stops: with1('itinerary_stops', 1, { itinerary_id: 'IT-DHK-001-9' }) }, { file: 'itinerary_stops.csv', line: 3, column: 'itinerary_id' }],
  ['fk-linked-site', { itineraries: with1('itineraries', 0, { linked_site_ids: 'JB-DHK-001; JB-DHK-099' }) }, { file: 'itineraries.csv', line: 2, column: 'linked_site_ids' }],
  ['fk-related-site', { site_relationships: with1('site_relationships', 0, { related_site_id: 'JB-DHK-099' }) }, { file: 'site_relationships.csv', line: 2, column: 'related_site_id' }],
  ['bad-enum', { sites: with1('sites', 0, { condition_category: 'ruined' }) }, { file: 'sites.csv', line: 2, column: 'condition_category' }],
  ['bad-division', { sites: with1('sites', 1, { division: 'Dhaka Division' }) }, { file: 'sites.csv', line: 3, column: 'division' }],
  ['bad-site-type', { sites: with1('sites', 0, { site_type: 'palace' }) }, { file: 'sites.csv', line: 2, column: 'site_type' }],
  ['bad-system-date', { visitor_info: with1('visitor_info', 0, { last_verified: '2026-02-30' }) }, { file: 'visitor_info.csv', line: 2, column: 'last_verified' }],
  ['bad-citation-date', { sources: with1('sources', 0, { publication_date: 'February 2024 (first edition)' }) }, { file: 'sources.csv', line: 2, column: 'publication_date' }],
  ['bad-number', { costs: with1('costs', 0, { amount_bdt: '-5' }) }, { file: 'costs.csv', line: 2, column: 'amount_bdt' }],
  ['bad-stop-order', { itinerary_stops: with1('itinerary_stops', 0, { stop_order: '0' }) }, { file: 'itinerary_stops.csv', line: 2, column: 'stop_order' }],
  ['swapped-coordinates', { sites: with1('sites', 0, { latitude: '90.12345', longitude: '23.91234' }) }, { file: 'sites.csv', line: 2, column: 'latitude' }],
  ['zero-coordinates', { sites: with1('sites', 0, { latitude: '0', longitude: '0' }) }, { file: 'sites.csv', line: 2, column: 'latitude' }],
  ['one-coordinate', { sites: with1('sites', 0, { longitude: '' }) }, { file: 'sites.csv', line: 2, column: 'longitude' }],
  ['duplicate-slug', { sites: with1('sites', 1, { dataset_slug: 'test-house-one' }) }, { file: 'sites.csv', line: 3, column: 'dataset_slug' }],
  ['district-slug-collision', { sites: with1('sites', 1, { district: 'manikganj' }) }, { file: 'sites.csv', line: 3, column: 'district' }],
  ['ready-image-without-file', { images: with1('images', 0, { relative_file_path: '' }) }, { file: 'images.csv', line: 2, column: 'relative_file_path' }],
  // Phase 2 columns and tables.
  ['unlisted-transport-mode', { travel_routes: with1('travel_routes', 0, { transport_mode: 'Hovercraft' }) }, { file: 'travel_routes.csv', line: 2, column: 'transport_mode' }],
  ['bad-closed-days', { visitor_info: with1('visitor_info', 0, { closed_days: 'Sun' }) }, { file: 'visitor_info.csv', line: 2, column: 'closed_days' }],
  ['bad-plan-status', { itineraries: with1('itineraries', 0, { plan_status: 'timed?' }) }, { file: 'itineraries.csv', line: 2, column: 'plan_status' }],
  ['cost-without-unit', { costs: with1('costs', 0, { unit: '' }) }, { file: 'costs.csv', line: 2, column: 'unit' }],
  ['cost-unlisted-unit', { costs: with1('costs', 1, { unit: 'per adult' }) }, { file: 'costs.csv', line: 3, column: 'unit' }],
  ['bad-fare-basis', { costs: with1('costs', 1, { fare_basis: 'private' }) }, { file: 'costs.csv', line: 3, column: 'fare_basis' }],
  ['bad-cost-legs', { costs: with1('costs', 1, { legs: '1 to 2' }) }, { file: 'costs.csv', line: 3, column: 'legs' }],
  ['place-at-site-stop', { itinerary_places: with1('itinerary_places', 0, { stop_order: '1' }) }, { file: 'itinerary_places.csv', line: 2, column: 'stop_order' }],
  ['place-without-source', { itinerary_places: with1('itinerary_places', 0, { source_ids: '' }) }, { file: 'itinerary_places.csv', line: 2, column: 'source_ids' }],
  ['place-outside-bangladesh', { itinerary_places: with1('itinerary_places', 0, { latitude: '0' }) }, { file: 'itinerary_places.csv', line: 2, column: 'latitude' }],
  ['leg-missing-stop', { itinerary_legs: with1('itinerary_legs', 0, { to_stop: '9' }) }, { file: 'itinerary_legs.csv', line: 2, column: 'to_stop' }],
  ['leg-bad-mode', { itinerary_legs: with1('itinerary_legs', 0, { mode: 'hovercraft' }) }, { file: 'itinerary_legs.csv', line: 2, column: 'mode' }],
  ['leg-bad-cost-row', { itinerary_legs: with1('itinerary_legs', 0, { cost_row: 'CO-DHK-001-99' }) }, { file: 'itinerary_legs.csv', line: 2, column: 'cost_row' }],
  ['fk-feature-site', { features: [{ site_id: 'JB-DHK-099', feature: 'Courtyard', status: 'reported' }] }, { file: 'features.csv', line: 2, column: 'site_id' }]
];

// Safety rules reachable from the CSV. `gate` is a substring of the expected failure.
const HOSTILE = [
  // A hidden site cites a source whose URL carries coordinates.
  ['hidden-site-url-coordinates', { sources: with1('sources', 1, { url: 'https://maps.example.org/place?ll=23.95678,90.15678' }) }, { gate: "hidden site's URL carries coordinates" }],
  ['free-entry-text', { visitor_info: with1('visitor_info', 0, { entry_fee_note: 'Free entry for students.' }) }, { gate: 'says "Free entry"' }],
  ['budget-note-free-entry', { costs: with1('costs', 0, { basis_and_assumptions: 'Free entry for children.' }) }, { gate: 'says "Free entry"' }]
];

const EDITORIAL = [
  ['internal-note', { sites: with1('sites', 0, { short_description: 'Checked in this thread against the book.' }) }, { cell: 'sites / JB-DHK-001 / short_description' }],
  ['local-path', { sources: with1('sources', 0, { reliability_notes: 'See /Users/someone/notes/master-list.xlsx' }) }, { cell: 'sources / SRC-0001 / reliability_notes' }],
  ['credit-line', { images: with1('images', 0, { required_credit: 'Wikimedia Commons' }) }, { cell: 'images / IMG-DHK-001-001 / required_credit' }],
  ['unclassified', { sites: with1('sites', 1, { site_type: 'unclassified' }) }, { cell: 'sites / JB-DHK-002 / site_type' }],
  ['unreviewed-plan-status', { itineraries: with1('itineraries', 0, { plan_status: '' }) }, { cell: 'itineraries / IT-DHK-001-1 / plan_status' }],
  ['unreviewed-closed-days', { visitor_info: with1('visitor_info', 0, { closed_days: '' }) }, { cell: 'visitor_info / JB-DHK-001 / closed_days' }]
];

rmSync(ROOT, { recursive: true, force: true });
for (const [table, rows] of Object.entries(VALID)) write(join(ROOT, 'valid', `${table}.csv`), toCsv(table, rows));
for (const [group, cases] of [['invalid', INVALID], ['hostile', HOSTILE], ['editorial', EDITORIAL]]) {
  for (const [name, tables, expected] of cases) {
    for (const [table, v] of Object.entries(tables)) write(join(ROOT, group, name, `${table}.csv`), typeof v === 'string' ? v : toCsv(table, v));
    write(join(ROOT, group, name, 'expected.json'), JSON.stringify(expected, null, 2) + '\n');
  }
}
console.log(`fixtures: valid + ${INVALID.length} invalid, ${HOSTILE.length} hostile, ${EDITORIAL.length} editorial`);
