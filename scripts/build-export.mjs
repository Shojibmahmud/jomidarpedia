// The data download (roadmap task 14.6; spec 16 FR-11 to FR-14): public/data/jomidarpedia-data.zip, holding one
// CSV per published table, a LICENSE and a README in English and Bangla, plus data/build/export.json, which the
// licences block and the footer read to link it. Run by `npm run data`, after the data builders.
//
// - It is made only from the published build output (data/build/**), never from data/csv/, so a column the site
//   does not publish cannot reach it, and hidden sites have no coordinates (FR-12).
// - Every field of the build records is either exported or skipped with a reason. A field the lists do not name,
//   or a named field that no record has any more, fails the build (FR-13), so a new field never leaks silently.
// - Only a release build writes it. Other modes delete any earlier copy, so a local or preview build never
//   publishes a download made from unreviewed data, and shows no link (FR-14).
// - The zip has sorted entries dated with meta.json's compiledAt, so it does not depend on the clock (NFR-1).

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { writeZip } from './lib/zip.mjs';

export const EXPORT_FILE = 'jomidarpedia-data.zip';
export const EXPORT_URL = `/data/${EXPORT_FILE}`;

// ---------- values ----------

const yesNo = v => (v === undefined ? '' : v ? 'yes' : 'no');
const fact = m => (m?.known ? String(m.value) : '');
const factBn = m => (m?.known ? m.bn ?? '' : '');
const ids = refs => (refs ?? []).map(r => (typeof r === 'string' ? r : r.id)).join('; ');
const list = xs => (xs ?? []).join('; ');
const sitePath = s => `/site/${s.id}/${s.slug}/`;

/** One CSV cell: RFC 4180 quoting when needed. */
export function cell(v) {
  if (v === undefined || v === null) return '';
  const s = typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v);
  return /[",\r\n]|^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** A CSV with a header row and LF line ends. columns: [name, getter] pairs. */
export function toCsv(columns, rows) {
  const lines = [columns.map(([name]) => name).join(',')];
  for (const row of rows) lines.push(columns.map(([, get]) => cell(get(row))).join(','));
  return `${lines.join('\n')}\n`;
}

// ---------- which fields are exported, and which are skipped and why (FR-13) ----------

export const FIELDS = {
  site: {
    exported: ['id', 'slug', 'name', 'place', 'location', 'summary', 'summaryBn', 'era', 'founder', 'style', 'condition', 'preservation', 'access',
      'visiting', 'travel', 'history', 'features', 'legends', 'conflicts', 'related', 'sources', 'stillToConfirm', 'stillToConfirmBn', 'confidence', 'lastVerified'],
    skipped: { images: 'in image_credits.csv', externalPhotos: 'a link out, not data', itineraries: 'in trips.csv', bnState: 'page display state', bnMissing: 'page display state' },
  },
  place: { exported: ['division', 'divisionBn', 'district', 'districtBn', 'upazila', 'upazilaBn', 'union', 'unionBn', 'locality', 'localityBn'], skipped: {} },
  location: { exported: ['latlon', 'status', 'flagged', 'note', 'noteBn', 'googleMapsUrl'], skipped: {} },
  visiting: {
    exported: ['hours', 'hoursNote', 'hoursNoteBn', 'closed', 'closedDays', 'fee', 'feeNote', 'feeNoteBn', 'restrictions', 'photography', 'facilities', 'accessibility', 'bestTime', 'date'],
    skipped: { hoursKnown: 'derived from opening_hours' },
  },
  trip: {
    exported: ['id', 'title', 'titleBn', 'duration', 'planStatus', 'anchor', 'siteIds', 'stops', 'legs', 'schematic', 'notes', 'notesBn', 'budget', 'costsEstimated'],
    skipped: { bnState: 'page display state' },
  },
  source: {
    exported: ['id', 'type', 'title', 'publisher', 'date', 'accessed', 'url', 'readStatus', 'notes', 'projectFile', 'bib', 'sites'],
    skipped: { typeLabel: 'the label of type', citationsByDivision: 'derived from site_sources.csv' },
  },
  credit: {
    exported: ['imageId', 'thumb', 'siteId', 'creator', 'license', 'credit', 'view', 'sourcePage'],
    skipped: { siteSlug: 'in sites.csv', siteEn: 'in sites.csv', siteBn: 'in sites.csv' },
  },
};

/** Problems with one kind of record against FIELDS[kind]: unknown fields, and exported fields no record has. */
export function fieldProblems(kind, records) {
  const { exported, skipped } = FIELDS[kind];
  const known = new Set([...exported, ...Object.keys(skipped)]);
  const seen = new Set(records.flatMap(r => Object.keys(r ?? {})));
  const problems = [];
  for (const k of [...seen].sort()) if (!known.has(k)) problems.push(`export: ${kind} field "${k}" is neither exported nor skipped (scripts/build-export.mjs FIELDS)`);
  if (records.length) for (const k of exported) if (!seen.has(k)) problems.push(`export: ${kind} field "${k}" is listed for export but no record has it`);
  return problems;
}

// ---------- tables ----------

const perSite = (sites, pick) => sites.flatMap(s => pick(s).map((x, i) => ({ s, x, i: i + 1 })));

/** The tables: file name, columns and rows, from the build records. */
export function tables({ sites, trips, sources, credits }) {
  const siteSources = s => new Map(s.sources.map(r => [r.n, r.id]));
  const refIds = (s, refs) => (refs ?? []).map(r => r.id ?? siteSources(s).get(r.n)).filter(Boolean).join('; ');
  return [
    ['sites.csv', [
      ['site_id', s => s.id], ['slug', s => s.slug], ['name_en', s => s.name.en], ['name_bn', s => s.name.bn], ['alternate_names', s => list(s.name.alt)],
      ['division', s => s.place.division], ['division_bn', s => s.place.divisionBn], ['district', s => s.place.district], ['district_bn', s => s.place.districtBn],
      ['upazila', s => s.place.upazila], ['upazila_bn', s => s.place.upazilaBn], ['union', s => s.place.union], ['union_bn', s => s.place.unionBn],
      ['locality', s => s.place.locality], ['locality_bn', s => s.place.localityBn],
      ['latitude', s => s.location.latlon?.[0]], ['longitude', s => s.location.latlon?.[1]],
      ['location_status', s => s.location.status], ['location_flagged', s => yesNo(s.location.flagged)],
      ['location_note', s => s.location.note], ['location_note_bn', s => s.location.noteBn], ['google_maps_url', s => s.location.googleMapsUrl],
      ['summary', s => s.summary], ['summary_bn', s => s.summaryBn],
      ['era', s => fact(s.era)], ['era_bn', s => factBn(s.era)], ['founder', s => fact(s.founder)], ['founder_bn', s => factBn(s.founder)],
      ['style', s => fact(s.style)], ['style_bn', s => factBn(s.style)],
      ['condition', s => s.condition], ['preservation', s => fact(s.preservation)], ['preservation_bn', s => factBn(s.preservation)], ['access', s => s.access],
      ['travel_hours_from_dhaka', s => s.travel.hours], ['travel_time_band', s => s.travel.bucket], ['day_trip', s => yesNo(s.travel.dayTrip)],
      ['one_way_cost_bdt', s => s.travel.oneWayCost],
      ['still_to_confirm', s => list(s.stillToConfirm)], ['still_to_confirm_bn', s => (s.stillToConfirmBn ?? []).map(x => x ?? '').join('; ').replace(/^(; )+$/, '')],
      ['record_confidence', s => s.confidence], ['last_verified', s => s.lastVerified], ['page_path', sitePath],
    ], sites],
    ['visitor_info.csv', [
      ['site_id', s => s.id],
      ['opening_hours', s => fact(s.visiting.hours)], ['opening_hours_bn', s => factBn(s.visiting.hours)],
      ['hours_note', s => s.visiting.hoursNote], ['hours_note_bn', s => s.visiting.hoursNoteBn],
      ['weekly_closing', s => fact(s.visiting.closed)], ['weekly_closing_bn', s => factBn(s.visiting.closed)],
      ['closed_days', s => (s.visiting.closedDays.known ? (s.visiting.closedDays.days.length ? s.visiting.closedDays.days.join(' ') : 'none') : '')],
      ['entry_fee_bdt', s => fact(s.visiting.fee)], ['fee_note', s => s.visiting.feeNote], ['fee_note_bn', s => s.visiting.feeNoteBn],
      ['restrictions', s => fact(s.visiting.restrictions)], ['restrictions_bn', s => factBn(s.visiting.restrictions)],
      ['photography', s => fact(s.visiting.photography)], ['photography_bn', s => factBn(s.visiting.photography)],
      ['facilities', s => fact(s.visiting.facilities)], ['facilities_bn', s => factBn(s.visiting.facilities)],
      ['accessibility', s => fact(s.visiting.accessibility)], ['accessibility_bn', s => factBn(s.visiting.accessibility)],
      ['best_time', s => fact(s.visiting.bestTime)], ['best_time_bn', s => factBn(s.visiting.bestTime)],
      ['last_verified', s => s.visiting.date],
    ], sites],
    ['travel_routes.csv', [
      ['site_id', r => r.s.id], ['route_order', r => r.i], ['kind', r => r.x.kind], ['mode', r => r.x.mode],
      ['steps', r => r.x.steps.map(st => st.label).join(' → ')], ['steps_bn', r => (r.x.steps.every(st => st.labelBn) ? r.x.steps.map(st => st.labelBn).join(' → ') : '')],
      ['hours', r => r.x.hours], ['cost_bdt', r => r.x.cost], ['cost_basis', r => r.x.costBasis], ['cost_basis_bn', r => r.x.costBasisBn],
      ['estimate_date', r => r.x.estimateDate], ['description', r => r.x.description], ['description_bn', r => r.x.descriptionBn],
    ], perSite(sites, s => s.travel.routes)],
    ['history_events.csv', [
      ['site_id', r => r.s.id], ['event_order', r => r.i], ['year', r => r.x.year], ['year_bn', r => r.x.yearBn], ['event_type', r => r.x.type],
      ['text', r => r.x.text], ['text_bn', r => r.x.textBn], ['status', r => r.x.status], ['source_ids', r => refIds(r.s, r.x.sources)],
    ], perSite(sites, s => s.history)],
    ['features.csv', [
      ['site_id', r => r.s.id], ['feature_order', r => r.i], ['text', r => r.x.text], ['text_bn', r => r.x.textBn],
      ['measurement', r => r.x.measurement], ['unit', r => r.x.unit], ['status', r => r.x.status], ['source_ids', r => refIds(r.s, r.x.sources)],
    ], perSite(sites, s => s.features)],
    ['legends.csv', [
      ['site_id', r => r.s.id], ['legend_order', r => r.i], ['text', r => r.x.text], ['text_bn', r => r.x.textBn], ['evidence', r => r.x.evidence],
      ['attribution', r => r.x.attribution], ['note', r => r.x.note], ['source_ids', r => refIds(r.s, r.x.sources)],
    ], perSite(sites, s => s.legends)],
    ['disagreements.csv', [
      ['site_id', r => r.s.id], ['field', r => r.c.field], ['field_bn', r => r.c.fieldBn], ['version', r => r.v],
      ['text', r => r.t?.text], ['text_bn', r => r.t?.textBn], ['source_ids', r => refIds(r.s, r.t ? r.t.sources : r.c.unattributedSources)],
    ], sites.flatMap(s => s.conflicts.flatMap(c => [
      ...c.versions.map((t, i) => ({ s, c, t, v: i + 1 })),
      ...(c.unattributedSources?.length ? [{ s, c, t: undefined, v: 'not matched to a version' }] : []),
    ]))],
    ['site_relationships.csv', [
      ['site_id', r => r.s.id], ['related_site_id', r => r.x.id], ['relation', r => r.x.relation], ['note', r => r.x.note], ['note_bn', r => r.x.noteBn],
    ], perSite(sites, s => s.related)],
    ['site_sources.csv', [
      ['site_id', r => r.s.id], ['footnote', r => r.x.n], ['source_id', r => r.x.id],
    ], perSite(sites, s => s.sources)],
    ['sources.csv', [
      ['source_id', x => x.id], ['type', x => x.type], ['title', x => x.title], ['publisher', x => x.publisher], ['author', x => x.bib?.author],
      ['edition', x => x.bib?.edition], ['isbn', x => x.bib?.isbn], ['date', x => x.date], ['accessed', x => x.accessed], ['url', x => x.url],
      ['read_status', x => x.readStatus], ['used_for', x => x.notes], ['project_file', x => yesNo(x.projectFile)], ['site_ids', x => ids(x.sites)],
    ], sources],
    ['trips.csv', [
      ['trip_id', t => t.id], ['title', t => t.title], ['title_bn', t => t.titleBn], ['duration', t => t.duration], ['plan_status', t => t.planStatus],
      ['anchor_site_id', t => t.anchor], ['site_ids', t => list(t.siteIds)], ['schematic', t => yesNo(t.schematic)],
      ['notes', t => t.notes.join(' ')], ['notes_bn', t => (t.notesBn ?? []).join(' ')],
      ['known_cost_per_person_bdt', t => t.budget.known], ['omitted_costs', t => list(t.budget.omitted)], ['omitted_costs_bn', t => list(t.budget.omittedBn)],
      ['costs_estimated_from', t => t.costsEstimated?.from], ['costs_estimated_to', t => t.costsEstimated?.to], ['page_path', t => `/trips/${t.id}/`],
    ], trips],
    ['trip_stops.csv', [
      ['trip_id', r => r.t.id], ['stop_order', r => r.x.order], ['kind', r => r.x.kind], ['site_id', r => r.x.siteId], ['name', r => r.x.name], ['name_bn', r => r.x.nameBn],
      ['time', r => r.x.time], ['note', r => r.x.note], ['note_bn', r => r.x.noteBn], ['latitude', r => r.x.latlon?.[0]], ['longitude', r => r.x.latlon?.[1]],
      ['source_ids', r => list(r.x.sources)], ['visiting_checked', r => r.x.visitingChecked],
    ], trips.flatMap(t => t.stops.map(x => ({ t, x })))],
    ['trip_legs.csv', [
      ['trip_id', r => r.t.id], ['from_stop', r => r.x.from], ['to_stop', r => r.x.to], ['mode', r => r.x.mode], ['hours', r => r.x.hours],
      ['cost_row', r => r.x.costRow], ['source_ids', r => list(r.x.sources)],
    ], trips.flatMap(t => t.legs.map(x => ({ t, x })))],
    ['trip_costs.csv', [
      ['trip_id', r => r.t.id], ['item', r => r.x.item], ['item_bn', r => r.x.itemBn], ['category', r => r.x.category], ['amount', r => r.x.amount],
      ['currency', r => r.x.currency], ['unit', r => r.x.unit], ['basis', r => r.x.basis], ['no_ticket', r => yesNo(r.x.noTicket)],
      ['legs', r => (r.x.legs ?? []).map(([a, b]) => `${a}-${b}`).join('; ')], ['note', r => r.x.note], ['note_bn', r => r.x.noteBn],
      ['estimate_date', r => r.x.date], ['status', r => r.x.status], ['source_ids', r => list(r.x.sources)],
    ], trips.flatMap(t => t.budget.rows.map(x => ({ t, x })))],
    ['image_credits.csv', [
      ['image_id', c => c.imageId], ['site_id', c => c.siteId], ['creator', c => c.creator], ['licence', c => c.license], ['credit', c => c.credit],
      ['view', c => c.view], ['source_page', c => c.sourcePage], ['thumbnail_path', c => c.thumb],
    ], credits],
  ];
}

// ---------- LICENSE and README ----------

export function licenseText() {
  return `Jomidarpedia data
https://jomidarpedia.vercel.app

The text and data in these files are licensed under the
Creative Commons Attribution-ShareAlike 4.0 International licence (CC BY-SA 4.0).
Legal code: https://creativecommons.org/licenses/by-sa/4.0/legalcode
Summary:    https://creativecommons.org/licenses/by-sa/4.0/

You may share and adapt them, also commercially, as long as you give credit
("Jomidarpedia, https://jomidarpedia.vercel.app, CC BY-SA 4.0") and share your
adaptations under the same licence.

Photos are not covered by this licence. Each photo keeps its own licence, named
with its credit line in image_credits.csv. The photos themselves are not in this
download.
`;
}

const TABLE_NOTES = {
  'sites.csv': ['One row per site: names, place, location, condition, access, summary, era, founder and travel from Dhaka.', 'প্রতিটি জমিদার বাড়ির জন্য একটি সারি: নাম, ঠিকানা, অবস্থান, বর্তমান অবস্থা, প্রবেশের সুযোগ, সংক্ষিপ্ত পরিচয়, সময়কাল, প্রতিষ্ঠাতা ও ঢাকা থেকে যাতায়াত।'],
  'visitor_info.csv': ['Opening hours, closing days, entry fee and visiting notes, one row per site.', 'খোলার সময়, বন্ধের দিন, প্রবেশমূল্য ও ঘুরতে যাওয়ার তথ্য, প্রতিটি বাড়ির জন্য একটি সারি।'],
  'travel_routes.csv': ['Ways to get there from Dhaka.', 'ঢাকা থেকে যাওয়ার পথ।'],
  'history_events.csv': ['Dated events in each site\'s history.', 'প্রতিটি বাড়ির ইতিহাসের তারিখসহ ঘটনা।'],
  'features.csv': ['Buildings and features recorded at each site.', 'প্রতিটি বাড়িতে নথিভুক্ত ভবন ও স্থাপত্য-বৈশিষ্ট্য।'],
  'legends.csv': ['Local stories, kept apart from the history.', 'স্থানীয় জনশ্রুতি, ইতিহাস থেকে আলাদা করে রাখা।'],
  'disagreements.csv': ['Where sources disagree: every version, with its sources.', 'যেখানে তথ্যসূত্রগুলো একমত নয়: প্রতিটি মত, তার তথ্যসূত্রসহ।'],
  'site_relationships.csv': ['Links between sites (same family, same complex, combine on a trip).', 'বাড়িগুলোর পারস্পরিক সম্পর্ক (একই পরিবার, একই চত্বর, এক ভ্রমণে দেখা যায়)।'],
  'site_sources.csv': ['Which sources each site cites, with the footnote number on its page.', 'কোন বাড়ির পাতায় কোন তথ্যসূত্র, পাদটীকার নম্বরসহ।'],
  'sources.csv': ['Every published source: books, articles, websites.', 'প্রকাশিত সব তথ্যসূত্র: বই, প্রবন্ধ, ওয়েবসাইট।'],
  'trips.csv': ['Trip plans from Dhaka.', 'ঢাকা থেকে ভ্রমণ পরিকল্পনা।'],
  'trip_stops.csv': ['The stops of each trip, in order.', 'প্রতিটি ভ্রমণের থামার জায়গা, ক্রম অনুসারে।'],
  'trip_legs.csv': ['The legs between stops.', 'এক থামা থেকে আরেক থামা পর্যন্ত যাত্রাপথ।'],
  'trip_costs.csv': ['Budget items for each trip, with the date of the estimate.', 'প্রতিটি ভ্রমণের খরচের খাত, হিসাবের তারিখসহ।'],
  'image_credits.csv': ['Every published photo, with its creator, licence and credit line.', 'প্রকাশিত প্রতিটি ছবি, আলোকচিত্রী, লাইসেন্স ও কৃতজ্ঞতা লাইনসহ।'],
};

export function readmeText(files, meta) {
  const en = files.map(([f, n]) => `- \`${f}\` (${n} rows): ${TABLE_NOTES[f]?.[0] ?? ''}`);
  const bn = files.map(([f]) => `- \`${f}\`: ${TABLE_NOTES[f]?.[1] ?? ''}`);
  return `# Jomidarpedia data

The data behind https://jomidarpedia.vercel.app, a guide to the zamindar houses, palaces and kacharis of Bangladesh.
It holds exactly what the site publishes: ${meta.counts.sites} sites and ${meta.counts.trips} trip plans. Compiled ${meta.compiledAt}.

## Files

${en.join('\n')}

## How to read it

- The files are UTF-8 CSV with a header row. Bangla columns end in \`_bn\` and sit beside the English; an empty \`_bn\` cell means no Bangla text yet.
- **An empty cell means "not recorded".** It never means zero, free or none. Where the site says "none", the cell says \`none\`.
- \`site_id\` (e.g. \`JB-DHK-064\`) joins the site tables; \`trip_id\` joins the trip tables; \`source_ids\` lists source IDs from \`sources.csv\`, separated by "; ".
- \`page_path\` is the page on the site: add it to https://jomidarpedia.vercel.app.
- Sites whose location is not confirmed enough to map have empty \`latitude\` and \`longitude\`, as on the site.
- Amounts are in Bangladeshi taka, with the date of the estimate where there is one. Prices change: check before you travel.

## Licence and credit

Text and data: CC BY-SA 4.0 (see \`LICENSE\`). Credit it as:

> Jomidarpedia, https://jomidarpedia.vercel.app, CC BY-SA 4.0

Photos are not included. Each keeps its own licence, listed in \`image_credits.csv\`.
Spotted a mistake? Use "Suggest a correction" on the site.

---

# জমিদারপিডিয়ার তথ্যভান্ডার

https://jomidarpedia.vercel.app সাইটের পেছনের তথ্য। সাইটটি বাংলাদেশের জমিদার বাড়ি, প্রাসাদ ও কাছারির খোঁজ দেয়।
সাইটে যা প্রকাশিত, এখানে ঠিক তা-ই আছে: ${meta.counts.sites}টি জমিদার বাড়ি ও ${meta.counts.trips}টি ভ্রমণ পরিকল্পনা। সংকলনের তারিখ ${meta.compiledAt}।

## ফাইলগুলো

${bn.join('\n')}

## কীভাবে পড়বেন

- ফাইলগুলো UTF-8 CSV, প্রথম সারিতে কলামের নাম। বাংলা কলামের নামের শেষে \`_bn\`, ইংরেজি কলামের পাশেই। \`_bn\` ঘর ফাঁকা থাকলে বুঝবেন, বাংলা লেখা এখনও যোগ হয়নি।
- **ফাঁকা ঘর মানে তথ্যটি জানা নেই।** এর মানে শূন্য, বিনা মূল্যে বা "নেই" নয়। সাইটে যেখানে "নেই" লেখা, সেখানে ঘরে \`none\` লেখা আছে।
- \`site_id\` (যেমন \`JB-DHK-064\`) দিয়ে বাড়ির টেবিলগুলো মেলানো যায়, \`trip_id\` দিয়ে ভ্রমণের টেবিলগুলো। \`source_ids\` ঘরে \`sources.csv\`-এর তথ্যসূত্রের আইডি, "; " দিয়ে আলাদা করা।
- \`page_path\` হলো সাইটে ওই বাড়ি বা ভ্রমণের পাতা; এর আগে https://jomidarpedia.vercel.app জুড়ে দিন।
- যেসব বাড়ির অবস্থান মানচিত্রে দেখানোর মতো নিশ্চিত নয়, সেগুলোর \`latitude\` ও \`longitude\` ফাঁকা, সাইটেও যেমন।
- টাকার অঙ্ক বাংলাদেশি টাকায়, যেখানে আছে সেখানে হিসাবের তারিখসহ। দাম বদলায়, তাই রওনা দেওয়ার আগে যাচাই করে নিন।

## লাইসেন্স ও কৃতজ্ঞতা

লেখা ও তথ্য: CC BY-SA 4.0 (\`LICENSE\` দেখুন)। ব্যবহার করলে এভাবে কৃতজ্ঞতা জানান:

> Jomidarpedia, https://jomidarpedia.vercel.app, CC BY-SA 4.0

ছবি এই ফাইলে নেই। প্রতিটি ছবির নিজস্ব লাইসেন্স আছে, তালিকা \`image_credits.csv\`-এ।
কোনো ভুল চোখে পড়লে সাইটের "সংশোধনের প্রস্তাব দিন" ব্যবহার করুন।
`;
}

// ---------- the builder ----------

const readJson = p => JSON.parse(readFileSync(p, 'utf8'));
const megabytes = bytes => Math.max(0.1, Math.round(bytes / 104857.6) / 10);

/** @param {string} mode @param {{ buildDir?: string, zipPath?: string, metaPath?: string }} [options] */
export function buildExport(mode, { buildDir = 'data/build', zipPath = `public/data/${EXPORT_FILE}`, metaPath = 'data/build/export.json' } = {}) {
  const result = { name: 'export', structural: [], gates: [], editorial: {}, warnings: [], info: [], outputs: [] };
  rmSync(zipPath, { force: true });
  rmSync(metaPath, { force: true });
  if (mode !== 'release') { result.info.push(`export: skipped (${mode} build; only a release build publishes the download)`); return result; }
  if (!existsSync(join(buildDir, 'meta.json'))) { result.info.push('export: skipped (no data/build output)'); return result; }

  const meta = readJson(join(buildDir, 'meta.json'));
  const sites = readdirSync(join(buildDir, 'sites')).filter(f => f.endsWith('.json')).sort().map(f => readJson(join(buildDir, 'sites', f)));
  const trips = readJson(join(buildDir, 'trips.json')).map(t => readJson(join(buildDir, 'trips', `${t.id}.json`))).sort((a, b) => a.id.localeCompare(b.id));
  const sources = readJson(join(buildDir, 'sources.json'));
  const credits = readJson(join(buildDir, 'credits.json'));

  result.gates.push(
    ...fieldProblems('site', sites), ...fieldProblems('place', sites.map(s => s.place)), ...fieldProblems('location', sites.map(s => s.location)),
    ...fieldProblems('visiting', sites.map(s => s.visiting)), ...fieldProblems('trip', trips), ...fieldProblems('source', sources), ...fieldProblems('credit', credits),
  );
  if (result.gates.length) return result;

  const csvs = tables({ sites, trips, sources, credits }).map(([name, columns, rows]) => ({ name, data: toCsv(columns, rows), rows: rows.length }));
  const files = [
    ...csvs,
    { name: 'LICENSE', data: licenseText() },
    { name: 'README.md', data: readmeText(csvs.map(c => [c.name, c.rows]), meta) },
  ];
  const zip = writeZip(files, { date: meta.compiledAt });
  mkdirSync(dirname(zipPath), { recursive: true });
  writeFileSync(zipPath, zip);
  mkdirSync(dirname(metaPath), { recursive: true });
  writeFileSync(metaPath, `${JSON.stringify({ url: EXPORT_URL, megabytes: megabytes(zip.length) })}\n`);
  result.outputs.push(zipPath, metaPath);
  result.info.push(`export: ${zipPath} (${(zip.length / 1024).toFixed(0)} KB, ${csvs.length} tables)`);
  return result;
}
