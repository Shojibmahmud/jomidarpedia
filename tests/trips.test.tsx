// Trips units (roadmap Phase 9, spec 09 AC-4 to AC-8, AC-10, AC-12, AC-13, AC-18): the listing's URL state,
// filters and sorts; what an itinerary may claim (times, pins, closing days, budget); and the real data.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readdirSync, readFileSync } from 'node:fs';
import { ItineraryCard } from '@/components/trips/ItineraryCard';
import { Budget } from '@/components/trips/Budget';
import { Stops } from '@/components/trips/Stops';
import { getTrips } from '@/lib/data';
import { tripCards, tripPage } from '@/lib/trip-data';
import {
  budgetLine, cssString, dayCheck, dayPicker, exploreStopsHref, filterTrips, hasTimed, lenCounts, mapStops, NO_FILTERS, parseTrips,
  rowValue, serializeTrips, showTimes, sortTrips, timeRange, type DayStop, type TripCard,
} from '@/lib/trips';
import type { BudgetRow, Itinerary } from '@/lib/types';

const DIVS = ['dhaka', 'chattogram', 'rajshahi', 'khulna', 'barishal', 'sylhet', 'rangpur', 'mymensingh'];
const lang = (html: string, l: 'en' | 'bn') => [...html.matchAll(new RegExp(`data-l="${l}">([^<]*)<`, 'g'))].map(m => m[1]).join(' ');
const card = (over: Partial<TripCard>): TripCard => ({
  id: 'IT-DHK-001-1', title: 'Test loop', duration: 'One day', anchorSlug: 'a', anchorEn: 'Test House', division: 'Dhaka', district: 'Dhaka',
  stopCount: 3, bucket: '1-2', divSlug: 'dhaka', ...over,
});
const trip = (over: Partial<Itinerary>): Itinerary => ({
  id: 'IT-DHK-001-1', title: 'Test loop', duration: 'One day', anchor: 'JB-DHK-001', siteIds: ['JB-DHK-001'],
  stops: [
    { order: 1, kind: 'place', name: 'Leave Gabtoli', note: '', time: '7:00 AM' },
    { order: 2, kind: 'site', siteId: 'JB-DHK-001', name: 'Test House', note: 'Ask first', time: '9:30 AM', latlon: [23.9, 90.1] },
    { order: 3, kind: 'site', siteId: 'JB-DHK-002', name: 'Second House', note: '', time: '1:00 PM', latlon: [23.8, 90.0] },
    { order: 4, kind: 'place', name: 'Return to Dhaka', note: '', time: '5:00 PM' },
  ],
  legs: [], schematic: true, notes: [], budget: { rows: [], omitted: [] }, ...over,
});

describe('listing URL (FR-3 to FR-9)', () => {
  it('reads every key and writes one canonical form', () => {
    const v = parseTrips('sort=name&plan=timed&div=sylhet,dhaka&tt=1-2&len=not-stated,one-day', DIVS);
    expect(v.dropped).toBe(false);
    expect(serializeTrips(v)).toBe('len=one-day,not-stated&tt=1-2&div=dhaka,sylhet&plan=timed&sort=name');
    expect(serializeTrips(parseTrips('', DIVS))).toBe('');
  });
  it('drops unknown keys and values and says so', () => {
    for (const q of ['len=weekend', 'tt=9', 'div=atlantis', 'plan=yes', 'sort=price', 'zz=1', 'len=one-day&len=multi-day']) {
      expect(parseTrips(q, DIVS).dropped, q).toBe(true);
    }
    expect(parseTrips('len=one-day,weekend', DIVS).filters.len).toEqual(['one-day']);
  });
});

describe('filters and sorts', () => {
  const trips = [
    card({ id: 'A', duration: 'One day', bucket: '2-3', hours: 2.5, title: 'Zeta' }),
    card({ id: 'B', duration: 'Not stated', bucket: 'unknown', title: 'Alpha' }),
    card({ id: 'C', duration: 'Overnight / multi-day', bucket: '0-1', hours: 0.5, divSlug: 'sylhet', planStatus: 'timed', title: 'Beta' }),
  ];
  it('filters by length, travel time, division and timed plan', () => {
    expect(filterTrips(trips, { ...NO_FILTERS, len: ['one-day', 'not-stated'] }).map(t => t.id)).toEqual(['A', 'B']);
    expect(filterTrips(trips, { ...NO_FILTERS, tt: 'unknown' }).map(t => t.id)).toEqual(['B']);
    expect(filterTrips(trips, { ...NO_FILTERS, div: ['sylhet'] }).map(t => t.id)).toEqual(['C']);
    expect(filterTrips(trips, { ...NO_FILTERS, plan: true }).map(t => t.id)).toEqual(['C']);
  });
  it('counts each length with the other filters applied', () => {
    expect(lenCounts(trips, { ...NO_FILTERS, div: ['dhaka'], len: ['one-day'] })).toEqual({ 'one-day': 1, 'multi-day': 0, 'not-stated': 1 });
  });
  it('sorts by travel time with unknown last, or by title', () => {
    expect(sortTrips(trips, 'time', 'en').map(t => t.id)).toEqual(['C', 'A', 'B']);
    expect(sortTrips(trips, 'name', 'en').map(t => t.id)).toEqual(['B', 'C', 'A']);
  });
  it('offers "Has a timed plan" only once a trip is timed (D1)', () => {
    expect(hasTimed(trips)).toBe(true);
    expect(hasTimed(trips.map(({ planStatus: _p, ...t }) => t))).toBe(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  });
});

describe('what an itinerary may claim', () => {
  it('shows times and a time range only for a reviewed timed plan (FR-19, FR-24)', () => {
    expect(showTimes(trip({}))).toBe(false);
    expect(timeRange(trip({ planStatus: 'circuit' }))).toBeUndefined();
    expect(timeRange(trip({ planStatus: 'timed' }))).toEqual(['7:00 AM', '5:00 PM']);
    const html = (t: Itinerary) => renderToStaticMarkup(<Stops trip={t} sites={{ 'JB-DHK-001': { slug: 'test-house', en: 'Test House', bn: 'টেস্ট বাড়ি' } }} />);
    expect(html(trip({}))).not.toContain('data-time');
    expect(html(trip({ planStatus: 'timed' }))).toContain('9:30 AM');
  });
  it('labels place stops and links site stops (FR-25)', () => {
    const html = renderToStaticMarkup(<Stops trip={trip({})} sites={{ 'JB-DHK-001': { slug: 'test-house', en: 'Test House' } }} />);
    expect(html).toMatch(/href="\/site\/JB-DHK-001\/test-house\/?"/); // next/link drops the slash outside the app build
    expect((html.match(/data-kind="place"/g) ?? []).length).toBe(2);
    expect(lang(html, 'en')).toContain('Place');
  });
  it('maps only stops with pins, and needs 2 of them (FR-28, FR-30)', () => {
    expect(mapStops(trip({})).show).toBe(true);
    expect(mapStops(trip({})).unpinned.map(s => s.order)).toEqual([1, 4]);
    expect(mapStops(trip({ stops: trip({}).stops.slice(0, 2) })).show).toBe(false);
  });
  it('opens the site stops in Explore, selecting the first with a pin (FR-42)', () => {
    expect(exploreStopsHref(trip({}))).toBe('/explore/?view=map&sel=JB-DHK-001&ids=JB-DHK-001,JB-DHK-002');
    const noPin = trip({ stops: trip({}).stops.map(({ latlon: _l, ...s }) => s) }); // eslint-disable-line @typescript-eslint/no-unused-vars
    expect(exploreStopsHref(noPin)).toBe('/explore/?view=map&ids=JB-DHK-001,JB-DHK-002');
    expect(exploreStopsHref(trip({ stops: [trip({}).stops[0]] }))).toBeUndefined();
  });
  it('checks a day against reviewed closing days only (FR-39 to FR-41)', () => {
    const stops: DayStop[] = [
      { order: 2, name: 'Baliati', closedDays: { known: true, days: ['sun'] } },
      { order: 4, name: 'Teota', closedDays: { known: false } },
    ];
    expect(dayPicker(stops)).toBe(true);
    expect(dayPicker([stops[1]])).toBe(false);
    expect(dayCheck(stops, 'sun')).toEqual({ closed: [stops[0]], unknown: [stops[1]] });
    expect(dayCheck(stops, 'fri').closed).toEqual([]);
  });
  it('escapes the running header for CSS', () => {
    expect(cssString('A "quoted" </style> title\\')).toBe('"A \\"quoted\\" \\3C /style> title\\\\"');
  });
});

describe('budget (FR-34 to FR-38, D16)', () => {
  const row = (r: Partial<BudgetRow>): BudgetRow => ({ item: 'Item', category: 'entry_fee', status: 'reported', sources: [], ...r });
  it('gives each row an amount, "No ticket reported", "Not applicable" or "Not estimated yet"', () => {
    expect(rowValue(row({ amount: 90, status: 'estimate' }))).toEqual({ kind: 'amount', amount: 90, estimate: true });
    expect(rowValue(row({ amount: 30 }))).toEqual({ kind: 'amount', amount: 30, estimate: false });
    expect(rowValue(row({ noTicket: true }))).toEqual({ kind: 'noTicket' });
    expect(rowValue(row({ status: 'not_applicable' }))).toEqual({ kind: 'notApplicable' });
    expect(rowValue(row({ status: 'unknown' }))).toEqual({ kind: 'none' });
  });
  it('closes with what is known and what it leaves out, never a total', () => {
    const rows = [row({ item: 'Bus', amount: 150, status: 'estimate', unit: 'per_person' }), row({ item: 'Entry', amount: 30, unit: 'per_person' }), row({ item: 'Food', status: 'unknown' })];
    const html = renderToStaticMarkup(<Budget trip={trip({ budget: { rows, known: 180, omitted: ['Food'] } })} correctionHref="https://example.org" />);
    expect(lang(html, 'en')).toContain('~Tk 150');
    expect(html).toContain('data-known="180"');
    expect(html).toContain('Food');
    expect(html).not.toMatch(/total/i);
    const none = renderToStaticMarkup(<Budget trip={trip({ budget: { rows: [rows[2]], omitted: ['Food'] } })} correctionHref="https://example.org" />);
    expect(lang(none, 'en')).toContain('No costs known yet');
    expect(budgetLine({ rows: [], known: 0, omitted: [] }).known).toBeUndefined();
  });
});

describe('card (FR-12 to FR-15)', () => {
  it('shows a status badge only when reviewed, and a footer with no clock time', () => {
    const none = renderToStaticMarkup(<ItineraryCard trip={card({})} />);
    expect(none).not.toContain('data-plan=');
    expect(lang(none, 'en')).toContain('One day');
    const timed = renderToStaticMarkup(<ItineraryCard trip={card({ planStatus: 'timed' })} />);
    expect(lang(timed, 'en')).toContain('Timed plan');
    expect(lang(renderToStaticMarkup(<ItineraryCard trip={card({ duration: 'Not stated' })} />), 'en')).toContain('Length not stated');
  });
  it('puts credits behind the camera button only when there are photos', () => {
    expect(renderToStaticMarkup(<ItineraryCard trip={card({})} />)).not.toContain('data-photo-credits');
    const html = renderToStaticMarkup(<ItineraryCard trip={card({ photos: [{ n: 2, thumb: '/thumbs/x.webp', credit: 'Photo: A' }] })} />);
    expect(html).toContain('data-photo-credits');
    expect(html).toContain('/thumbs/x.webp');
  });
});

describe('real data', () => {
  const cards = tripCards();
  it('has a card for every trip, each with a known division', () => {
    expect(cards.length).toBe(getTrips().length);
    for (const c of cards) expect(DIVS, c.id).toContain(c.divSlug);
  });
  it('card photos: at most 4, each numbered by a site stop of its trip', () => {
    for (const t of getTrips()) {
      if (!t.photos) continue;
      expect(t.photos.length).toBeLessThanOrEqual(4);
      const sites = new Set(tripPage(t.id).trip.stops.filter(s => s.kind === 'site').map(s => s.order));
      for (const p of t.photos) expect(sites.has(p.n), `${t.id} stop ${p.n}`).toBe(true);
    }
  });
  it('no card footer names a time or a starting place (D15)', () => {
    for (const c of cards.slice(0, 50)) expect(lang(renderToStaticMarkup(<ItineraryCard trip={c} />), 'en')).not.toMatch(/\d:\d\d|\bfrom (?!Dhaka)/);
  });
  it('no trip file gives a hidden site coordinates (R5, NFR-4)', () => {
    const files = readdirSync('data/build/trips');
    const hidden = new Set(JSON.parse(readFileSync('public/data/index.json', 'utf8')).filter((s: { ll?: unknown }) => !s.ll).map((s: { i: string }) => s.i));
    for (const f of files) {
      const t: Itinerary = JSON.parse(readFileSync(`data/build/trips/${f}`, 'utf8'));
      for (const s of t.stops) if (s.siteId && hidden.has(s.siteId)) expect(s.latlon, `${t.id} ${s.siteId}`).toBeUndefined();
    }
  });
});
