// Site page units (roadmap tasks 5.1–5.3, 5.13; spec 05 FR-6, FR-8 to FR-11, FR-16, FR-17, FR-39, FR-56).
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccessBadge, ConditionBadge, DayTripBadge, LocationBadge } from '@/components/site/Badges';
import { Unknown } from '@/components/site/Unknown';
import { CONDITIONS } from '@/components/art/ConditionGlyph';
import { STRINGS } from '@/lib/i18n';
import { correctionContext, correctionUrl, pageCorrectionUrl, directionsUrl, coordsText, isSparse, isStale, knownItems, sectionHint, disagreements, openQuestions, conflictSection } from '@/lib/site-page';
import { getSite } from '@/lib/data';
import type { Access, LocationStatus, SiteRecord } from '@/lib/types';

// The text of one language: <T> renders both, tagged data-l="en" and data-l="bn".
const lang = (html: string, l: 'en' | 'bn') => [...html.matchAll(new RegExp(`data-l="${l}">([^<]*)<`, 'g'))].map(m => m[1]).join(' ');
const ACCESS: Access[] = ['ticketed', 'open_no_ticket_reported', 'restricted_or_permission', 'unknown', 'not_applicable_lost'];
const STATUS: LocationStatus[] = ['verified', 'single_source', 'approximate', 'unverified'];

describe('badges (5.1)', () => {
  it('every condition, access, day-trip and location label renders in both languages', () => {
    const html = [
      ...CONDITIONS.map(c => <ConditionBadge key={c} condition={c} />),
      ...ACCESS.map(a => <AccessBadge key={a} access={a} />),
      ...[true, false, undefined].map(d => <DayTripBadge key={String(d)} dayTrip={d} />),
      ...STATUS.map(s => <LocationBadge key={s} status={s} mappable flagged={false} />),
      <LocationBadge key="nopin" status="not_found" mappable={false} flagged={false} />,
    ].map(el => renderToStaticMarkup(el));
    for (const h of html) {
      expect(lang(h, 'en').trim(), h).not.toBe('');
      expect(lang(h, 'bn').trim(), h).not.toBe('');
    }
    expect(lang(html[CONDITIONS.length], 'en')).toBe(STRINGS['access.ticketed'].en);
  });
  it('a fee shows only as a price above 0 (R6)', () => {
    expect(lang(renderToStaticMarkup(<AccessBadge access="ticketed" fee={30} />), 'en')).toBe('Ticketed · Tk 30');
    expect(lang(renderToStaticMarkup(<AccessBadge access="ticketed" fee={0} />), 'en')).toBe('Ticketed');
  });
  it('an unstated day trip is never "no"', () => {
    expect(lang(renderToStaticMarkup(<DayTripBadge />), 'en')).toBe('Day trip not stated');
  });
  it('unverified is outlined with "?" and never reads as verified (O9)', () => {
    const h = renderToStaticMarkup(<LocationBadge status="unverified" mappable flagged />);
    expect(lang(h, 'en')).toBe('Location unverified');
    expect(h).toContain('border-dashed');
    expect(h).toContain('>?<');
    expect(lang(renderToStaticMarkup(<LocationBadge status="verified" mappable={false} flagged={false} />), 'en')).toBe('No map location yet');
  });
});

describe('Unknown (5.2)', () => {
  it('renders a value, an unknown as words, and a note', () => {
    expect(renderToStaticMarkup(<Unknown value={{ known: true, value: 'October to March' }} />)).toContain('October to March');
    const unknown = renderToStaticMarkup(<Unknown value={{ known: false, text: 'Not documented' }} />);
    expect(lang(unknown, 'en')).toBe('Not documented');
    expect(lang(unknown, 'bn')).toBe(STRINGS['common.notDocumented'].bn);
    expect(renderToStaticMarkup(<Unknown value={{ known: false, text: 'Unknown. The book says 1890.' }} />)).toContain('The book says 1890.');
    expect(renderToStaticMarkup(<Unknown value={{ known: true, value: 'Daylight', note: 'Ask first.' }} />)).toContain('Ask first.');
  });
});

describe('freshness (5.3)', () => {
  it('is stale only after 12 months', () => {
    expect(isStale('2026-10-13', new Date('2027-10-12T00:00:00Z'))).toBe(false);
    expect(isStale('2026-10-13', new Date('2027-10-14T00:00:00Z'))).toBe(true);
    expect(isStale('2026-10-13', new Date('2026-11-01T00:00:00Z'))).toBe(false);
  });
});

describe('sparse records (FR-6)', () => {
  const base = getSite('JB-DHK-064');
  const without = (n: number): SiteRecord => {
    const s: SiteRecord = structuredClone(base);
    const drop = [
      () => { delete s.place.union; },
      () => { s.founder = { known: false, text: 'Not documented', sources: [] }; },
      () => { s.travel.routes = []; },
      () => { s.location.status = 'approximate'; },
    ];
    drop.slice(0, n).forEach(f => f());
    return s;
  };
  it('needs 3 or more unknown items', () => {
    expect(Object.values(knownItems(base)).every(Boolean)).toBe(true);
    expect(isSparse(without(2))).toBe(false);
    expect(isSparse(without(3))).toBe(true);
  });
  it('Elangi is sparse and Baliati is not', () => {
    expect(isSparse(getSite('JB-RAJ-002'))).toBe(true);
    expect(isSparse(base)).toBe(false);
  });
  it('section hints follow the data', () => {
    const elangi = getSite('JB-RAJ-002');
    expect(sectionHint(elangi, 'location')).toBe('noPin');
    expect(sectionHint(elangi, 'history')).toBe('notYet');
    expect(sectionHint(base, 'location')).toBeUndefined();
  });
});

describe('conflicts (FR-34 to FR-36)', () => {
  it('split by version count', () => {
    for (const id of ['JB-DHK-064', 'JB-RAJ-002', 'JB-MYM-019']) {
      const s = getSite(id);
      expect(disagreements(s).length + openQuestions(s).length).toBe(s.conflicts.length);
      expect(disagreements(s).every(c => c.versions.length > 1)).toBe(true);
    }
  });
  it('are placed by field', () => {
    const c = (field: string) => conflictSection({ field, versions: [] });
    expect(c('Founder')).toBe('history');
    expect(c('Site area')).toBe('architecture');
    expect(c('Upazila')).toBe('location');
    expect(c('Record')).toBe('sources');
  });
});

describe('outbound links (FR-19, FR-39)', () => {
  it('prefill the correction and photo-offer forms', () => {
    const u = new URL(correctionUrl('JB-DHK-064', '/site/JB-DHK-064/baliati-palace/', 'visiting'), 'https://example.org');
    expect([u.pathname, u.searchParams.get('site_id'), u.searchParams.get('field'), u.searchParams.get('page_url')])
      .toEqual(['/correction/', 'JB-DHK-064', 'visiting', '/site/JB-DHK-064/baliati-palace/']);
    const p = new URL(correctionUrl('JB-RAJ-002', '/x/', 'photo'), 'https://example.org');
    expect(p.searchParams.get('field')).toBe('photo');
    expect(correctionContext(p.searchParams)).toEqual({ siteId: 'JB-RAJ-002', field: 'photo', pageUrl: '/x/' });
    expect(pageCorrectionUrl('/division/dhaka/')).toBe('/correction/?page_url=%2Fdivision%2Fdhaka%2F');
  });
  it('directions and copied coordinates use Latin digits and 5 decimals', () => {
    expect(directionsUrl([23.99444, 90.0425])).toBe('https://www.google.com/maps/dir/?api=1&destination=23.99444,90.04250');
    expect(coordsText([23.99444, 90.0425])).toBe('23.99444, 90.04250');
  });
});
