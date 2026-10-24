#!/usr/bin/env node
// Builds the build-time JSON (read by page.tsx via fs, never fetched by the browser):
//   data/build/sites/<id>.json   SiteRecord     data/build/trips.json      TripSummary[]
//   data/build/trips/<id>.json   Itinerary      data/build/divisions.json  Division[]
//   data/build/districts.json    District[]     data/build/sources.json    SourceEntry[]
//   data/build/credits.json      Credit[]       data/build/meta.json       Meta
// Shapes are in lib/types.ts and docs/DATA_CONTRACT.md. Every output object is built from named
// public fields only (roadmap I7); internal columns never reach it.
//
// Usage: node scripts/build-data.mjs [csv-dir = data/csv] [out-dir = data/build]
// No dependencies. The mode comes from scripts/data-mode.mjs (release unless set).
// - Structural errors (bad CSV, IDs, keys, enums, dates, numbers): nothing is written; any old output is removed.
// - Safety rules (hidden pins, non-Ready images, fees): fail in every mode; files are written for inspection.
// - Editorial problems (internal notes, credit lines, unclassified sites, unreviewed plan status and
//   closing days): fail only in release.
// The same input always gives the same bytes: compiledAt comes from SOURCE_DATE_EPOCH or the data.

import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BUCKET, DIVISIONS, CONDITIONS, CONFIDENCE, COORD_PAIR, isMappable, latlon, list, srcIds, slugify } from './lib/validate.mjs';
import { loadTables, validateTables, TABLES, rowKey } from './lib/structure.mjs';
import { scanOutputs, coordinateLeaks, notesByCell, strings, ZERO_OR_FREE } from './lib/checks.mjs';
import { UNKNOWN, BARE_UNKNOWN, hoursKnown, suggestPlanStatus, PLAN_STATUS, parseClosedDays, routeMode, UNIT, parseLegs, matchVersions, tripTitle,
  isPlaceholderEvent, eventYear, BD_COORD_TEXT, isReadyImage, leadFirst } from './lib/rules.mjs';
import { LINE } from './csv.mjs';

const OUTPUT_DIRS = ['sites', 'trips'];
const OUTPUT_FILES = ['trips.json', 'divisions.json', 'districts.json', 'sources.json', 'credits.json', 'meta.json'];

// compiledAt: SOURCE_DATE_EPOCH (seconds) when set and valid, otherwise the data's own last date.
/** @param {Record<string, string | undefined>} env @param {string} lastVerified @param {string[]} [notices] */
export function compiledAt(env, lastVerified, notices = []) {
  const epoch = env.SOURCE_DATE_EPOCH;
  if (epoch !== undefined && epoch !== '') {
    if (/^\d+$/.test(epoch)) return new Date(Number(epoch) * 1000).toISOString();
    notices.push(`SOURCE_DATE_EPOCH="${epoch}" is not a whole number of seconds; using lastVerified`);
  }
  return lastVerified;
}

// Safety rules on the generated output, fatal in every mode: hidden pins carry no coordinates (in a URL or in text),
// place stops have coordinates only with sources, only Ready images appear, and a known fee or
// budget amount is always a real price.
export function safetyChecks({ sites, readyImageIds, records, trips, credits }) {
  const gates = [];
  const gate = g => gates.push(g);
  const siteById = new Map(sites.map(s => [s.site_id, s]));
  const hidden = id => !siteById.has(id) || !isMappable(siteById.get(id));
  for (const r of records) if (hidden(r.id)) {
    coordinateLeaks(`sites/${r.id}.json`, r, []).forEach(gate);
    for (const [path, s] of strings(r)) if (BD_COORD_TEXT.test(s)) gate(`sites/${r.id}.json ${path}: hidden site's text carries coordinates`);
    if (r.location.latlon) gate(`sites/${r.id}.json: hidden site has location.latlon`);
  }
  for (const t of trips) for (const st of t.stops) {
    if (!st.latlon) continue;
    if (st.siteId && hidden(st.siteId)) gate(`trips/${t.id}.json: stop ${st.order} (${st.siteId}) carries coordinates of a hidden site`);
    if (!st.siteId && !st.sources?.length) gate(`trips/${t.id}.json: stop ${st.order} (no site) carries coordinates without a source`);
  }
  const ready = new Set(readyImageIds);
  for (const r of records) for (const im of r.images) if (!ready.has(im.id)) gate(`sites/${r.id}.json: image ${im.id} is not Ready`);
  for (const c of credits) if (!ready.has(c.imageId)) gate(`credits.json: ${c.imageId} is not Ready`);
  for (const r of records) {
    const f = r.visiting.fee;
    if (f.known && (!(f.value > 0) || ZERO_OR_FREE.test(String(f.value)))) gate(`sites/${r.id}.json: fee shown as a price: ${JSON.stringify(f)}`);
  }
  for (const t of trips) {
    for (const b of t.budget.rows)
      if (b.amount !== undefined && (!(b.amount > 0) || ZERO_OR_FREE.test(String(b.amount)))) gate(`trips/${t.id}.json: budget "${b.item}" shown as "${b.amount}"`);
    if (t.budget.known !== undefined && !(t.budget.known > 0)) gate(`trips/${t.id}.json: budget subtotal shown as "${t.budget.known}"`);
  }
  return gates;
}

/** @param {{ csvDir?: string, outDir?: string, env?: Record<string, string | undefined> }} [options] */
export function buildData({ csvDir = 'data/csv', outDir = 'data/build', env = process.env } = {}) {
  const outputs = [...OUTPUT_DIRS, ...OUTPUT_FILES].map(p => join(outDir, p));
  const result = { name: 'build-data', structural: [], gates: [], editorial: {}, warnings: [], info: [], notes: [], outputs };

  const { T, errors } = loadTables(csvDir, TABLES);
  result.structural = errors.length ? errors : validateTables(T);
  if (result.structural.length) {
    outputs.forEach(p => rmSync(p, { recursive: true, force: true }));
    return result;
  }
  const warn = w => result.warnings.push(w);

  const groupBy = (rows, key) => {
    const m = new Map();
    for (const r of rows) { const k = typeof key === 'function' ? key(r) : r[key]; if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
    return m;
  };
  const num = v => (v === '' || v == null || Number.isNaN(Number(v)) ? undefined : Number(v));
  const BOOL = { TRUE: true, FALSE: false };

  // ---------------------------------------------------------------- Maybe<T>
  // "Unknown", "Unknown (not researched)" and blanks become "Not documented"; an unknown with
  // detail ("Unknown. The book says…") keeps its wording, since that detail is the useful part.
  function maybe(v, note) {
    v = (v || '').trim();
    if (!v || BARE_UNKNOWN.test(v)) return { known: false, text: 'Not documented' };
    if (UNKNOWN.test(v)) return { known: false, text: v };
    return note ? { known: true, value: v, note } : { known: true, value: v };
  }
  // entry_fee_bdt: a number > 0 is a price; 0 means no ticket was reported (never "Free"); blank is unknown.
  function fee(v, note) {
    if (v === '' || v == null) return { known: false, text: 'Not documented' };
    if (Number(v) === 0) return { known: false, text: 'No ticket reported' };
    return note ? { known: true, value: Number(v), note } : { known: true, value: Number(v) };
  }

  // ---------------------------------------------------------------- lookups
  const sites = T.sites;
  const siteById = new Map(sites.map(s => [s.site_id, s]));
  const hidden = s => !isMappable(s);
  const visitorBySite = new Map(T.visitor_info.map(v => [v.site_id, v]));
  const routesBySite = groupBy(T.travel_routes, 'site_id');
  const costsBySite = groupBy(T.costs, 'site_id');
  const costById = new Map(T.costs.map(c => [c.cost_id, c]));
  const historyBySite = groupBy(T.history_events, 'site_id');
  const legendsBySite = groupBy(T.legends, 'site_id');
  const claimsBySite = groupBy(T.claims, 'site_id');
  const linksByClaim = groupBy(T.claim_source_links, 'claim_id');
  const siteSourcesBySite = groupBy(T.site_sources, 'site_id');
  const sourceById = new Map(T.sources.map(s => [s.source_id, s]));
  const stopsByTrip = groupBy(T.itinerary_stops, 'itinerary_id');
  const placeByStop = new Map(T.itinerary_places.map(p => [`${p.itinerary_id}#${p.stop_order}`, p]));
  const legsByTrip = groupBy(T.itinerary_legs, 'itinerary_id');
  const featuresBySite = groupBy(T.features, 'site_id');

  // Images: only publication_readiness "Ready…" may leave the CSV.
  const BOILERPLATE_ALT = /^This is a photo of a monument in Bangladesh identified by the ID/i;
  const readyImages = leadFirst(T.images.filter(isReadyImage)); // the lead photo first (scripts/lib/rules.mjs)
  const imagesBySite = groupBy(readyImages, 'site_id');
  let boilerplateAlt = 0;
  function imageRecord(im) {
    let alt = im.caption_alt_text;
    if (!alt || BOILERPLATE_ALT.test(alt)) { boilerplateAlt++; alt = `${im.view_category.replace(/ \(.*\)$/, '')}: ${siteById.get(im.site_id)?.name_en ?? im.site_name}`; }
    return {
      id: im.image_id,
      thumb: `/thumbs/${im.image_id}.webp`,
      full: (im.direct_image_url || '').replace(/[?&]utm_[^#]*$/, ''),
      alt, altLang: /[ঀ-৿]/.test(alt) ? 'bn' : 'en',
      view: im.view_category,
      credit: im.required_credit,
      sourcePage: im.source_page_url
    };
  }
  const firstThumb = id => (imagesBySite.get(id)?.[0] ? `/thumbs/${imagesBySite.get(id)[0].image_id}.webp` : undefined);

  const tripsBySite = new Map();
  for (const it of T.itineraries) {
    for (const sid of new Set([it.anchor_site_id, ...list(it.linked_site_ids)])) {
      if (!tripsBySite.has(sid)) tripsBySite.set(sid, []);
      tripsBySite.get(sid).push(it);
    }
  }

  // Route modes come from the reviewed label table (scripts/lib/rules.mjs); nothing defaults to bus.
  const modeCount = {};
  let modeInferred = 0;

  // unverified_fields → plain words for "Still to confirm".
  const FIELD_WORDS = {
    'location.coordinates': 'Map location', 'location.union': 'Union', 'location.village': 'Village', 'location.village_bn': 'Village name in Bangla',
    'location.upazila': 'Upazila', 'location.google_maps_url': 'Google Maps link',
    'history.established_era': 'When it was built', 'history.founder': 'Who built it', 'history.architectural_style': 'Architectural style',
    'history.preservation_status': 'Present condition', 'history.key_features': 'Main features', 'history.key_dates': 'Key dates',
    'filters.condition_category': 'Condition', 'filters.site_type': 'Type of site', 'filters.travel_time_bucket': 'Travel time from Dhaka',
    'travel_from_dhaka.estimated_one_way_cost_bdt': 'Cost of getting there', 'travel_from_dhaka.approx_travel_time_hours': 'Travel time from Dhaka',
    'travel_from_dhaka.route': 'Route from Dhaka', 'travel_from_dhaka.last_mile_transport': 'Last stretch of the journey',
    'travel_from_dhaka.alternatives': 'Other routes', travel_from_dhaka: 'Route from Dhaka',
    'visiting_info.entry_fee_bdt': 'Entry fee', 'visiting_info.visiting_hours': 'Opening hours', visiting_info: 'Visiting details',
    'name.english': 'English name', 'name.bangla': 'Bangla name'
  };
  function plainField(f) {
    const m = f.match(/^([a-z_]+(?:\.[a-z_]+)*)\s*(.*)$/);
    if (m && FIELD_WORDS[m[1]]) return `${FIELD_WORDS[m[1]]}${m[2] ? ' ' + m[2] : ''}`;
    return f.charAt(0).toUpperCase() + f.slice(1);
  }

  // Each claim's links, one per source, in CSV order.
  const claimLinks = id => [...new Map((linksByClaim.get(id) ?? []).map(l => [l.source_id, l])).values()];

  // Conflicts: "Style: colonial bungalow (Banglapedia) vs Indo-Saracenic (Wikipedia)."
  // A source goes on the one version whose text names its publisher; otherwise it is listed for the
  // disagreement as a whole. It is never copied onto several versions.
  const conflictStats = { versionsWithSources: 0, versionsWithoutSources: 0, unattributedLinks: 0 };
  function conflict(c, refFor) {
    const text = c.claim_text.replace(/\.$/, '');
    const colon = text.indexOf(': ');
    const field = colon > 0 && colon < 40 ? text.slice(0, colon) : 'Record';
    const body = colon > 0 && colon < 40 ? text.slice(colon + 2) : text;
    const parts = body.split(/\s+vs\.?\s+/);
    const versions = parts.map(p => ({ text: p, sources: [] }));
    const unattributed = [];
    for (const l of claimLinks(c.claim_id)) {
      const ref = refFor(l.source_id, l.relation);
      if (!ref) continue;
      const hits = parts.length > 1 ? matchVersions(parts, sourceById.get(l.source_id).author_or_organization) : [];
      if (hits.length === 1) versions[hits[0]].sources.push(ref);
      else unattributed.push(ref);
    }
    for (const v of versions) conflictStats[v.sources.length ? 'versionsWithSources' : 'versionsWithoutSources']++;
    conflictStats.unattributedLinks += unattributed.length;
    return { field, versions, ...(unattributed.length && { unattributedSources: unattributed }) };
  }

  // Fact fields and the claim field that sources each one (2.3).
  const FACT_FIELD = { era: 'history.established_era', founder: 'history.founder', style: 'history.architectural_style', preservation: 'history.preservation_status' };

  // A hidden site's map link must not carry coordinates (no guessed pin); search by name instead.
  const nameSearch = s => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name_en}, ${s.district}`)}`;

  const editorialPlan = [], editorialClosed = [], bnMissing = [], placeholderEvents = [], reversedYears = [];
  const cell = (table, row, column, outs) => ({ table, key: rowKey(table, row), column, line: row[LINE], value: row[column], outputs: outs });

  // ---------------------------------------------------------------- sites/<id>.json
  const records = [];
  for (const s of sites) {
    const id = s.site_id;
    const v = visitorBySite.get(id) ?? {};
    if (!visitorBySite.has(id)) warn(`${id}: no Visitor_Info row`);

    // Footnotes: Site_Sources order first, then any source cited only by an event, claim, legend or feature.
    const notes = [];
    const nOf = new Map();
    const refFor = (sid, relation) => {
      if (!sourceById.has(sid)) return null;
      if (!nOf.has(sid)) { nOf.set(sid, notes.length + 1); notes.push(sid); }
      return relation ? { id: sid, n: nOf.get(sid), relation } : { id: sid, n: nOf.get(sid) };
    };
    const siteSources = siteSourcesBySite.get(id) ?? [];
    siteSources.forEach(ss => refFor(ss.source_id));

    const routes = (routesBySite.get(id) ?? []).map(r => {
      const steps = r.route_description.split(/\s*->\s*/).filter(Boolean).map(label => ({ label }));
      if (r.last_mile && steps.length) steps[steps.length - 1].note = r.last_mile;
      const m = routeMode(r.transport_mode, r.route_description);
      modeCount[m.mode] = (modeCount[m.mode] ?? 0) + 1;
      if (m.inferred) modeInferred++;
      const route = { kind: r.route_kind === 'primary' ? 'primary' : 'alternative', mode: m.mode, ...(m.inferred && { inferred: true }), steps, description: r.route_description };
      if (num(r.duration_hours_one_way) !== undefined) route.hours = num(r.duration_hours_one_way);
      if (num(r.cost_bdt_one_way)) route.cost = num(r.cost_bdt_one_way);
      if (r.cost_basis && r.cost_basis !== 'Not estimated separately') route.costBasis = r.cost_basis;
      if (r.estimate_date) route.estimateDate = r.estimate_date;
      return route;
    }).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'primary' ? -1 : 1));

    // Placeholder events are dropped and reversed year ranges shortened (spec 05 FR-51, FR-52); both are reported.
    const history = (historyBySite.get(id) ?? []).filter(e => {
      if (!isPlaceholderEvent(e.description)) return true;
      placeholderEvents.push(e.event_id);
      return false;
    }).map(e => {
      if (e.year_start && e.year_end && Number(e.year_end) < Number(e.year_start)) reversedYears.push(e.event_id);
      const year = e.year_start
        ? eventYear(e, e.date_approximate === 'TRUE')
        : e.date_text.length <= 30 && !UNKNOWN.test(e.date_text) ? e.date_text : '';
      return { year, type: e.event_type, text: e.description, status: e.verification_status, sources: srcIds(e.source_ids).map(x => refFor(x)).filter(Boolean) };
    });

    // Fact sources: the fact claims for the field, joined to their source links.
    const claims = claimsBySite.get(id) ?? [];
    const factSources = field => {
      const refs = new Map();
      for (const c of claims) if (c.claim_type === 'fact' && c.field === field)
        for (const l of claimLinks(c.claim_id)) if (!refs.has(l.source_id)) { const ref = refFor(l.source_id, l.relation); if (ref) refs.set(l.source_id, ref); }
      return [...refs.values()];
    };
    const fact = (value, key) => ({ ...maybe(value), sources: factSources(FACT_FIELD[key]) });

    // Legend sources: the SRC- IDs in its attribution, then the reported_by links of its claim.
    const legends = (legendsBySite.get(id) ?? []).map(l => {
      const ids = srcIds(l.attribution);
      const attribution = ids.length
        ? ids.map(x => sourceById.get(x)?.author_or_organization.split(/[.(;]/)[0].trim() || x).join('; ')
        : 'Not attributed to a named source';
      const linked = l.claim_id ? claimLinks(l.claim_id).filter(x => x.relation === 'reported_by').map(x => x.source_id) : [];
      const sources = [...new Set([...ids, ...linked])].map(x => refFor(x, 'reported_by')).filter(Boolean);
      return { text: l.narrative, evidence: l.evidence_type, attribution, note: l.verification_note, sources };
    });

    const conflicts = claims.filter(c => c.claim_type === 'conflict').map(c => conflict(c, refFor));

    // Features (2.14): only from features.csv. Competing measurements of one feature are also a conflict.
    const featureRows = featuresBySite.get(id) ?? [];
    const features = featureRows.map(f => ({
      text: f.feature, ...(f.feature_bn && { textBn: f.feature_bn }), ...(f.measurement && { measurement: f.measurement }), ...(f.unit && { unit: f.unit }),
      status: f.status, sources: srcIds(f.source_ids).map(x => refFor(x)).filter(Boolean)
    }));
    for (const [name, rows] of groupBy(featureRows, 'feature')) {
      if (new Set(rows.map(r => `${r.measurement} ${r.unit}`)).size < 2) continue;
      const versions = rows.map(r => ({ text: [r.measurement, r.unit].filter(Boolean).join(' '), sources: srcIds(r.source_ids).map(x => refFor(x)).filter(Boolean) }));
      conflicts.push({ field: name, versions });
    }

    // One entry per other site. A pair listed twice keeps the relation that is not combine_on_trip (FR-50).
    const related = [];
    const byOther = new Map();
    for (const r of T.site_relationships) {
      const other = r.site_id === id ? r.related_site_id : r.related_site_id === id ? r.site_id : null;
      if (!other) continue;
      const prev = byOther.get(other);
      if (prev) {
        if (prev.relation === 'combine_on_trip' && r.relation_type !== 'combine_on_trip') Object.assign(prev, { relation: r.relation_type, note: r.note });
        continue;
      }
      const o = siteById.get(other);
      const item = { id: o.site_id, slug: o.dataset_slug, en: o.name_en, ...(o.name_bn && { bn: o.name_bn }), c: o.condition_category };
      if (num(o.travel_time_hours_from_dhaka) !== undefined) item.h = num(o.travel_time_hours_from_dhaka);
      if (firstThumb(other)) item.thumb = firstThumb(other);
      item.relation = r.relation_type;
      item.note = r.note;
      byOther.set(other, item);
      related.push(item);
    }
    for (const item of related) if (!item.note) delete item.note;

    const images = (imagesBySite.get(id) ?? []).map(imageRecord);
    // An outbound photo link when there is no open photo (O10). A hidden pin gets a name-only search.
    let externalPhotos;
    if (!images.length) {
      const gm = T.images.find(im => im.site_id === id && im.google_maps_url);
      if (hidden(s)) externalPhotos = { label: 'Search for visitor photos', url: nameSearch(s) };
      else if (gm) externalPhotos = { label: 'See visitor photos on Google Maps', url: gm.google_maps_url };
    }

    // Closing days (2.11): only the reviewed closed_days column; a blank is unknown and editorial.
    const closedDays = parseClosedDays(v.closed_days ?? '');
    if (closedDays.blank && visitorBySite.has(id)) editorialClosed.push(cell('visitor_info', v, 'closed_days', [`sites/${id}.json visiting.closedDays`]));
    if (!s.name_bn) bnMissing.push(id);

    const record = {
      id, slug: s.dataset_slug,
      name: { en: s.name_en, ...(s.name_bn && { bn: s.name_bn }), alt: list(s.alternate_names) },
      ...(!s.name_bn && { bnMissing: true }),
      place: {
        division: s.division, divisionBn: s.division_bn, district: s.district, districtBn: s.district_bn,
        upazila: s.upazila, upazilaBn: s.upazila_bn,
        ...(s.union && { union: s.union }), ...(s.union_bn && { unionBn: s.union_bn }),
        ...(s.locality && { locality: s.locality }), ...(s.locality_bn && { localityBn: s.locality_bn })
      },
      location: {
        ...(latlon(s) && { latlon: latlon(s) }),
        status: s.coordinates_status, flagged: s.map_display === 'show_flagged',
        // A hidden pin's note often names nearby landmarks with their coordinates (spec 05 FR-53): left out.
        ...(!hidden(s) && { note: s.coordinates_note }),
        googleMapsUrl: hidden(s) && COORD_PAIR.test(s.google_maps_url) ? nameSearch(s) : s.google_maps_url
      },
      summary: s.short_description,
      era: fact(s.established_era, 'era'), founder: fact(s.founder_or_family, 'founder'), style: fact(s.architectural_style, 'style'),
      condition: s.condition_category, preservation: fact(s.preservation_status, 'preservation'),
      access: s.visitor_access,
      visiting: {
        hours: maybe(v.opening_hours), hoursKnown: hoursKnown(v.opening_hours), ...(v.hours_note && { hoursNote: v.hours_note }),
        closed: maybe(v.weekly_closing_days),
        closedDays: closedDays.known ? { known: true, days: closedDays.days } : { known: false },
        fee: fee(v.entry_fee_bdt ?? s.entry_fee_bdt), ...(v.entry_fee_note && { feeNote: v.entry_fee_note }),
        restrictions: maybe(v.restrictions_and_permissions), photography: maybe(v.photography_rules),
        facilities: maybe(v.facilities), accessibility: maybe(v.accessibility), bestTime: maybe(v.best_time_to_visit),
        ...(v.last_verified && { date: v.last_verified })
      },
      travel: {
        ...(num(s.travel_time_hours_from_dhaka) !== undefined && { hours: num(s.travel_time_hours_from_dhaka) }),
        bucket: BUCKET[s.travel_time_bucket] ?? 'unknown',
        ...(s.day_trip_from_dhaka in BOOL && { dayTrip: BOOL[s.day_trip_from_dhaka] }),
        ...(num(s.one_way_cost_bdt_estimate) && { oneWayCost: num(s.one_way_cost_bdt_estimate) }),
        routes
      },
      history,
      features,
      legends, conflicts, images,
      ...(externalPhotos && { externalPhotos }),
      related,
      itineraries: (tripsBySite.get(id) ?? []).map(it => ({ id: it.itinerary_id, title: tripTitle(it.title), duration: it.duration })),
      sources: notes.map((sid, k) => {
        const src = sourceById.get(sid);
        const ss = siteSources.find(x => x.source_id === sid);
        const out = { n: k + 1, id: sid, title: ss?.citation_title || src.title, publisher: ss?.citation_publisher || src.author_or_organization };
        const date = ss?.citation_date || src.publication_date;
        if (date) out.date = date;
        if (src.url) out.url = src.url;
        return out;
      }),
      stillToConfirm: list(s.unverified_fields).map(plainField),
      confidence: s.record_confidence,
      lastVerified: s.last_verified
    };
    records.push(record);
  }

  // ---------------------------------------------------------------- trips
  // Budget rows come from costs.csv columns only; amount_text is display prose and is never parsed.
  const COST_LABEL = { food: 'Food', local_guide: 'Local guide', accommodation: 'Accommodation' };
  function budgetRow(c, item, category) {
    if (!c) return { item, category, status: 'unknown', sources: [] };
    const row = { item, category: c.category };
    const amount = num(c.amount_bdt);
    if (amount > 0) row.amount = amount;
    else if (c.category === 'entry_fee' && amount === 0) row.noTicket = true;
    if (c.currency) row.currency = c.currency;
    if (UNIT[c.unit]) row.unit = UNIT[c.unit];
    if (c.fare_basis) row.basis = c.fare_basis;
    if (c.legs) row.legs = parseLegs(c.legs);
    if (c.basis_and_assumptions) row.note = c.basis_and_assumptions;
    if (c.estimate_date) row.date = c.estimate_date;
    row.status = c.status || 'unknown';
    row.sources = srcIds(c.source_ids);
    return row;
  }
  const planSuggestions = { timed: [], circuit: [], incomplete: [] };
  const trips = [];
  const tripSummaries = [];
  for (const it of T.itineraries) {
    const id = it.itinerary_id;
    const anchor = siteById.get(it.anchor_site_id);
    const siteIds = list(it.linked_site_ids);
    const stopRows = (stopsByTrip.get(id) ?? []).sort((a, b) => Number(a.stop_order) - Number(b.stop_order));
    planSuggestions[suggestPlanStatus(stopRows)].push(id);
    const stops = stopRows.map(st => {
      const site = siteById.get(st.site_id);
      const out = { order: Number(st.stop_order), kind: st.site_id ? 'site' : 'place', name: st.stop_name, note: st.notes };
      if (st.time_or_day) out.time = st.time_or_day;
      if (st.site_id) {
        out.siteId = st.site_id;
        if (site && latlon(site)) out.latlon = latlon(site);
        const checked = visitorBySite.get(st.site_id)?.last_verified;
        if (checked) out.visitingChecked = checked;
      } else {
        // A place gets coordinates only from a researched itinerary_places row with sources.
        const p = placeByStop.get(`${id}#${st.stop_order}`);
        if (p) { out.latlon = [Number(Number(p.latitude).toFixed(5)), Number(Number(p.longitude).toFixed(5))]; out.sources = srcIds(p.source_ids); }
      }
      return out;
    });
    const legs = (legsByTrip.get(id) ?? []).map(l => ({
      from: Number(l.from_stop), to: Number(l.to_stop), mode: l.mode,
      ...(num(l.duration) !== undefined && { hours: num(l.duration) }),
      ...(l.cost_row && costById.has(l.cost_row) && { costRow: l.cost_row }),
      sources: srcIds(l.source_ids)
    })).sort((a, b) => a.from - b.from || a.to - b.to);

    const anchorCosts = costsBySite.get(anchor.site_id) ?? [];
    const byCat = (rows, cat) => rows.find(c => c.category === cat);
    const rows = [budgetRow(byCat(anchorCosts, 'transport_dhaka_one_way'), `Dhaka → ${anchor.name_en}, one way`, 'transport_dhaka_one_way')];
    for (const sid of siteIds.length ? siteIds : [anchor.site_id])
      rows.push(budgetRow(byCat(costsBySite.get(sid) ?? [], 'entry_fee'), `Entry: ${siteById.get(sid).name_en}`, 'entry_fee'));
    for (const cat of ['food', 'local_guide', ...(it.duration === 'Overnight / multi-day' ? ['accommodation'] : [])])
      rows.push(budgetRow(byCat(anchorCosts, cat), COST_LABEL[cat], cat));
    const perPerson = rows.filter(r => r.amount !== undefined && r.unit === 'per_person');
    const omitted = rows.filter(r => r.amount === undefined && !r.noTicket && r.status !== 'not_applicable').map(r => r.item);
    const dates = rows.map(r => r.date).filter(Boolean).sort();
    const budget = { rows, ...(perPerson.length && { known: perPerson.reduce((n, r) => n + r.amount, 0) }), omitted };

    const title = tripTitle(it.title);
    if (!it.plan_status) editorialPlan.push(cell('itineraries', it, 'plan_status', [`trips/${id}.json planStatus`, `trips.json ${id}`]));
    const trip = {
      id, title,
      duration: ['One day', 'Overnight / multi-day'].includes(it.duration) ? it.duration : 'Not stated',
      ...(PLAN_STATUS.includes(it.plan_status) && { planStatus: it.plan_status }),
      anchor: anchor.site_id, siteIds, stops, legs, schematic: legs.length === 0,
      notes: it.planning_notes ? [it.planning_notes] : [],
      budget,
      ...(dates.length && { costsEstimated: { from: dates[0], to: dates.at(-1) } })
    };
    trips.push(trip);
    const summary = {
      id, title, duration: trip.duration, ...(trip.planStatus && { planStatus: trip.planStatus }),
      anchor: anchor.site_id, anchorSlug: anchor.dataset_slug, anchorEn: anchor.name_en, ...(anchor.name_bn && { anchorBn: anchor.name_bn }),
      division: anchor.division, district: anchor.district, siteIds, stopCount: stops.length, bucket: BUCKET[anchor.travel_time_bucket] ?? 'unknown'
    };
    if (num(anchor.travel_time_hours_from_dhaka) !== undefined) summary.hours = num(anchor.travel_time_hours_from_dhaka);
    if (it.day_trip_from_dhaka in BOOL) summary.dayTrip = BOOL[it.day_trip_from_dhaka];
    if (firstThumb(anchor.site_id)) summary.thumb = firstThumb(anchor.site_id);
    tripSummaries.push(summary);
  }

  // ---------------------------------------------------------------- divisions, districts
  const conditionCounts = rows => Object.fromEntries(CONDITIONS.map(c => [c, rows.filter(s => s.condition_category === c).length]));
  const noPin = rows => rows.filter(hidden).map(s => s.site_id);
  const sitesByDistrict = groupBy(sites, 'district');
  const districts = [...sitesByDistrict].map(([name, rows]) => ({
    slug: slugify(name), en: name, bn: rows[0].district_bn, division: rows[0].division, divisionSlug: slugify(rows[0].division),
    count: rows.length, onMap: rows.length - noPin(rows).length, conditions: conditionCounts(rows), noPin: noPin(rows), siteIds: rows.map(s => s.site_id)
  })).sort((a, b) => DIVISIONS.indexOf(a.division) - DIVISIONS.indexOf(b.division) || a.en.localeCompare(b.en));
  const divisions = [...groupBy(sites, 'division')].map(([name, rows]) => ({
    slug: slugify(name), en: name, bn: rows[0].division_bn, count: rows.length, onMap: rows.length - noPin(rows).length,
    conditions: conditionCounts(rows), noPin: noPin(rows),
    districts: districts.filter(d => d.division === name).map(({ slug, en, bn, count }) => ({ slug, en, bn, count })),
    tripCount: tripSummaries.filter(t => t.division === name).length
  })).sort((a, b) => DIVISIONS.indexOf(a.en) - DIVISIONS.indexOf(b.en));

  // ---------------------------------------------------------------- sources, credits
  const sitesBySource = groupBy(T.site_sources, 'source_id');
  const BIB = { author: 'author', publisher: 'publisher', edition: 'edition', isbn: 'isbn', verification_method: 'verificationMethod' };
  const sourcesOut = T.sources.map(src => {
    const cites = sitesBySource.get(src.source_id) ?? [];
    const byDivision = {};
    for (const d of DIVISIONS) {
      const n = cites.filter(x => siteById.get(x.site_id).division === d).length;
      if (n) byDivision[d] = n;
    }
    const bib = Object.fromEntries(Object.entries(BIB).filter(([col]) => src[col]).map(([col, key]) => [key, src[col]]));
    const out = {
      id: src.source_id, type: src.source_type, typeLabel: src.source_type_label, title: src.title, publisher: src.author_or_organization,
      readStatus: src.read_status, notes: src.reliability_notes,
      // Project working files (master lists, audits) are grouped as such on /sources.
      projectFile: src.source_type.startsWith('project_upload'),
      sites: [...new Set(cites.map(x => x.site_id))].sort()
        .map(x => ({ id: x, slug: siteById.get(x).dataset_slug, en: siteById.get(x).name_en, ...(siteById.get(x).name_bn && { bn: siteById.get(x).name_bn }) })),
      citationsByDivision: byDivision
    };
    if (Object.keys(bib).length) out.bib = bib;
    if (src.publication_date) out.date = src.publication_date;
    if (src.access_date) out.accessed = src.access_date;
    if (src.url) out.url = src.url;
    return out;
  });
  // Accepted credit forms: "Photo: Author / Source, Licence (url)" and "Author, public domain, via Wikimedia Commons".
  const STANDARD_CREDIT = /^Photo: [^/]+ \/ [^,]+, .+|^[^,]+, public domain, via Wikimedia Commons$/;
  const credits = readyImages.map(im => {
    const s = siteById.get(im.site_id);
    return {
      imageId: im.image_id, thumb: `/thumbs/${im.image_id}.webp`, siteId: im.site_id, siteSlug: s.dataset_slug, siteEn: s.name_en, ...(s.name_bn && { siteBn: s.name_bn }),
      creator: im.creator, license: im.license_rights_status.replace(/^Open license:\s*/i, ''), credit: im.required_credit, sourcePage: im.source_page_url
    };
  });

  // ---------------------------------------------------------------- meta
  const lastVerified = [...sites.map(s => s.last_verified), ...T.visitor_info.map(v => v.last_verified)].filter(Boolean).sort().at(-1);
  const notices = [];
  const meta = {
    lastVerified, compiledAt: compiledAt(env, lastVerified, notices),
    counts: {
      sites: sites.length, onMap: sites.filter(s => !hidden(s)).length, noPin: sites.filter(hidden).length, flagged: sites.filter(s => s.map_display === 'show_flagged').length,
      withPhotos: sites.filter(s => imagesBySite.has(s.site_id)).length, images: readyImages.length,
      trips: trips.length, dayTrips: trips.filter(t => t.duration === 'One day').length,
      sources: T.sources.length, divisions: divisions.length, districts: districts.length,
      historyEvents: T.history_events.length, legends: T.legends.length,
      hoursKnown: records.filter(r => r.visiting.hoursKnown).length,
      conditions: conditionCounts(sites),
      confidence: Object.fromEntries(CONFIDENCE.map(c => [c, sites.filter(s => s.record_confidence === c).length]))
    }
  };
  notices.forEach(n => result.info.push(`notice: ${n}`));

  // ---------------------------------------------------------------- safety rules (every mode)
  result.gates = safetyChecks({ sites, readyImageIds: readyImages.map(im => im.image_id), records, trips, credits });
  const gate = g => result.gates.push(g);

  const scanned = [
    ...records.map(r => ({ file: `sites/${r.id}.json`, id: r.id, value: r })),
    ...trips.map(t => ({ file: `trips/${t.id}.json`, id: t.id, value: t })),
    ...sourcesOut.map(s => ({ file: `sources.json ${s.id}`, id: s.id, value: s })),
    ...credits.map(c => ({ file: `credits.json ${c.imageId}`, id: c.imageId, value: c })),
    ...divisions.map(d => ({ file: `divisions.json ${d.slug}`, id: d.slug, value: d })),
    ...districts.map(d => ({ file: `districts.json ${d.slug}`, id: d.slug, value: d }))
  ];
  const { notes, freeEntry } = scanOutputs(scanned);
  freeEntry.forEach(gate);

  // ---------------------------------------------------------------- editorial (release only)
  const { cells, unpublished } = notesByCell(T, notes);
  result.editorial = {
    notes: cells,
    unpublishedNotes: unpublished,
    credits: readyImages.filter(im => !STANDARD_CREDIT.test(im.required_credit))
      .map(im => cell('images', im, 'required_credit', [`credits.json ${im.image_id}`, `sites/${im.site_id}.json images`])),
    unclassified: sites.filter(s => s.site_type === 'unclassified')
      .map(s => cell('sites', s, 'site_type', [`sites/${s.site_id}.json`, `index.json ${s.site_id}`])),
    planStatus: editorialPlan,
    closedDays: editorialClosed
  };

  // ---------------------------------------------------------------- build notes (report only)
  const ids = xs => (xs.length ? xs.join(', ') : 'none');
  result.notes.push(
    { title: 'Conflict attribution', lines: [
      `Versions with their own sources: ${conflictStats.versionsWithSources}`,
      `Versions without sources: ${conflictStats.versionsWithoutSources}`,
      `Source links not matched to a version (listed for the disagreement): ${conflictStats.unattributedLinks}`] },
    { title: 'Route modes', lines: [
      ...Object.entries(modeCount).sort(([a], [b]) => a.localeCompare(b)).map(([m, n]) => `${m}: ${n}`),
      `inferred from the description (label "Other / mixed"): ${modeInferred}`] },
    { title: 'Suggested plan_status (O11; only the editor\'s value is published)', lines: PLAN_STATUS.map(p => `${p} (${planSuggestions[p].length}): ${ids(planSuggestions[p])}`) },
    { title: 'Sites without a Bangla name', lines: [ids(bnMissing)] },
    { title: 'History events dropped as placeholders ("Not documented" only)', lines: [`${placeholderEvents.length}: ${ids(placeholderEvents)}`] },
    { title: 'History events with year_end before year_start (shown as year_start)', lines: [`${reversedYears.length}: ${ids(reversedYears)}`] }
  );

  // ---------------------------------------------------------------- write
  OUTPUT_DIRS.forEach(d => { rmSync(join(outDir, d), { recursive: true, force: true }); mkdirSync(join(outDir, d), { recursive: true }); });
  const write = (p, v) => writeFileSync(join(outDir, p), JSON.stringify(v));
  records.forEach(r => write(`sites/${r.id}.json`, r));
  trips.forEach(t => write(`trips/${t.id}.json`, t));
  write('trips.json', tripSummaries);
  write('divisions.json', divisions);
  write('districts.json', districts);
  write('sources.json', sourcesOut);
  write('credits.json', credits);
  write('meta.json', meta);

  result.counts = meta.counts;
  result.stats = { ...conflictStats, modes: modeCount, modeInferred, plan: Object.fromEntries(PLAN_STATUS.map(p => [p, planSuggestions[p].length])), bnMissing: bnMissing.length };
  result.info.push(
    `sites/<id>.json  ${records.length}`,
    `trips/<id>.json  ${trips.length}   trips.json ${tripSummaries.length} rows`,
    `divisions.json   ${divisions.length}   districts.json ${districts.length}`,
    `sources.json     ${sourcesOut.length}   credits.json ${credits.length} (Ready images; ${T.images.length - readyImages.length} others kept out)`,
    `meta.json        lastVerified ${meta.lastVerified}; on map ${meta.counts.onMap}, no pin ${meta.counts.noPin}, with photos ${meta.counts.withPhotos}, hours known ${meta.counts.hoursKnown}`,
    `conflicts: ${conflictStats.versionsWithSources} versions with sources, ${conflictStats.versionsWithoutSources} without, ${conflictStats.unattributedLinks} unattributed links`,
    `notes: ${boilerplateAlt} images had boilerplate or empty alt text (replaced with "<view>: <site name>"); ${modeInferred} routes had their mode inferred from the description`
  );
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { runCli } = await import('./lib/cli.mjs');
  const [csvDir, outDir] = process.argv.slice(2);
  runCli([() => buildData({ csvDir, outDir })]);
}
