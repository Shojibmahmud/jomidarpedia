import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMappable, isIsoDay, isCitationDate, isNonNegativeNumber, COORD_PAIR } from '../scripts/lib/validate.mjs';
import { internalTerm } from '../scripts/lib/internal-terms.mjs';
import { FREE_ENTRY, ZERO_OR_FREE, coordinateLeaks } from '../scripts/lib/checks.mjs';
import { safetyChecks } from '../scripts/build-data.mjs';
import { hoursKnown, tripTitle, parseClosedDays, suggestPlanStatus, routeMode, MODE_LABEL, matchVersions, publisherName } from '../scripts/lib/rules.mjs';
import { parseCsv } from '../scripts/csv.mjs';

describe('isMappable', () => {
  const site = { latitude: '23.9', longitude: '90.1', map_display: 'show' };
  it('needs both coordinates inside Bangladesh and map_display other than hide', () => {
    expect(isMappable(site)).toBe(true);
    expect(isMappable({ ...site, map_display: 'show_flagged' })).toBe(true);
    expect(isMappable({ ...site, map_display: 'hide' })).toBe(false);
    expect(isMappable({ ...site, longitude: '' })).toBe(false);
    expect(isMappable({ ...site, latitude: '90.1', longitude: '23.9' })).toBe(false);
    expect(isMappable({ ...site, latitude: '0', longitude: '0' })).toBe(false);
    expect(isMappable({ ...site, latitude: 'abc' })).toBe(false);
  });
  it('accepts the edges of the box', () => {
    expect(isMappable({ ...site, latitude: '20.3', longitude: '92.7' })).toBe(true);
    expect(isMappable({ ...site, latitude: '26.71', longitude: '90' })).toBe(false);
  });
});

describe('dates and numbers', () => {
  it('system dates are real days', () => {
    expect(isIsoDay('2026-10-22')).toBe(true);
    expect(isIsoDay('2026-02-30')).toBe(false);
    expect(isIsoDay('2026-10')).toBe(false);
  });
  it('citation dates may be partial or a range', () => {
    for (const v of ['', '2019', '2019-02', '2019-02-03', '2019 to 2020', '2019-02-03 to 2019-03-01']) expect(isCitationDate(v)).toBe(true);
    for (const v of ['February 2019', '2019-13', '2019 to', '2019 to 2020 to 2021']) expect(isCitationDate(v)).toBe(false);
  });
  it('numbers are finite and not negative', () => {
    expect(['0', '20', '2.5'].every(isNonNegativeNumber)).toBe(true);
    expect(['-5', 'abc', '', 'Infinity'].some(isNonNegativeNumber)).toBe(false);
  });
});

describe('internal terms (task 1.11)', () => {
  it('flags notes, local paths and working files', () => {
    for (const v of ['Checked in this thread.', 'Pin from Orca', 'Seen in the Brave browser', 'Project upload: research list',
      'See /Users/x/file.xlsx', 'from master_list.md', 'C:\\data\\x.csv', 'file:///tmp/a']) expect(internalTerm(v)).not.toBeNull();
  });
  it('allows "Free", "audit" and ordinary text', () => {
    for (const v of ['Free Press Journal', 'An audit of the estate records', 'Md. Mahmud Ali', 'Gemstone house']) expect(internalTerm(v)).toBeNull();
  });
  it('checks URLs only for local paths and file: links', () => {
    expect(internalTerm('https://example.org/claude-orca-thread')).toBeNull();
    expect(internalTerm('https://example.org/README.md')).toBeNull();
    expect(internalTerm('file:///Users/x/a.xlsx')).not.toBeNull();
    expect(internalTerm('https://host/?p=/Users/x/a')).not.toBeNull();
  });
});

describe('fee wording (task 1.11)', () => {
  it('free entry is never allowed; Free elsewhere is', () => {
    expect(FREE_ENTRY.test('Free entry for all')).toBe(true);
    expect(FREE_ENTRY.test('Entry: free')).toBe(true);
    expect(FREE_ENTRY.test('Free Press, 2019')).toBe(false);
    expect(FREE_ENTRY.test('an entry fee audit')).toBe(false);
  });
  it('a fee field may not show 0 or free', () => {
    for (const v of ['0', 'Tk 0', 'Tk 0.00', 'Free', 'free of charge']) expect(ZERO_OR_FREE.test(v)).toBe(true);
    for (const v of ['20', 'Tk 20', 'Tk 100 per adult', '10']) expect(ZERO_OR_FREE.test(v)).toBe(false);
  });
});

describe('hidden coordinates', () => {
  it('finds coordinate pairs in URLs, plain or encoded', () => {
    expect(coordinateLeaks('f', { u: 'https://maps.google.com/?q=23.95678,90.15678' }, [])).toHaveLength(1);
    expect(coordinateLeaks('f', { u: 'https://www.google.com/maps/@23.95678,90.15678,15z' }, [])).toHaveLength(1);
    expect(coordinateLeaks('f', { u: 'https://x.org/?ll=23.95678%2C90.15678' }, [])).toHaveLength(1);
    expect(coordinateLeaks('f', { u: 'https://www.google.com/maps/search/?api=1&query=Baliati%2C%20Manikganj' }, [])).toEqual([]);
    expect(coordinateLeaks('f', { ll: [23.9, 90.1] }, ['ll'])).toHaveLength(1);
  });
  it('ignores coordinates in prose', () => {
    expect(COORD_PAIR.test('pin at 23.95678,90.15678')).toBe(true);
    expect(coordinateLeaks('f', { note: 'pin at 23.95678,90.15678' }, [])).toEqual([]);
  });
});

// Safety rules that the builder can't be made to break from the CSV, checked on crafted output.
describe('safetyChecks on hostile output', () => {
  const sites = [
    { site_id: 'JB-DHK-001', latitude: '23.9', longitude: '90.1', map_display: 'show' },
    { site_id: 'JB-DHK-002', latitude: '23.9', longitude: '90.1', map_display: 'hide' }
  ];
  const record = (id: string, extra = {}) => ({ id, location: {}, images: [], visiting: { fee: { known: false, text: 'Not documented' } }, ...extra });
  const base = { sites, readyImageIds: ['IMG-DHK-001-001'], records: [record('JB-DHK-001'), record('JB-DHK-002')], trips: [], credits: [] };

  it('passes clean output', () => expect(safetyChecks(base)).toEqual([]));
  it('fails a hidden site with latlon', () =>
    expect(safetyChecks({ ...base, records: [record('JB-DHK-002', { location: { latlon: [23.9, 90.1] } })] })[0]).toContain('location.latlon'));
  it('fails a trip stop at a hidden site with coordinates', () =>
    expect(safetyChecks({ ...base, trips: [{ id: 'IT-DHK-001-1', stops: [{ order: 1, siteId: 'JB-DHK-002', latlon: [23.9, 90.1] }], budget: { rows: [], omitted: [] } }] })[0]).toContain('hidden site'));
  it('fails a place stop with coordinates but no source', () =>
    expect(safetyChecks({ ...base, trips: [{ id: 'IT-DHK-001-1', stops: [{ order: 3, latlon: [23.9, 90.1] }], budget: { rows: [], omitted: [] } }] })[0]).toContain('without a source'));
  it('fails a non-Ready image in a site record or in credits', () => {
    expect(safetyChecks({ ...base, records: [record('JB-DHK-001', { images: [{ id: 'IMG-DHK-001-002' }] })] })[0]).toContain('not Ready');
    expect(safetyChecks({ ...base, credits: [{ imageId: 'IMG-DHK-001-002' }] })[0]).toContain('not Ready');
  });
  it('fails a fee of 0 marked as known', () =>
    expect(safetyChecks({ ...base, records: [record('JB-DHK-001', { visiting: { fee: { known: true, value: 0 } } })] })[0]).toContain('fee shown as a price'));
  it('fails a budget amount or subtotal of 0', () => {
    expect(safetyChecks({ ...base, trips: [{ id: 'IT-DHK-001-1', stops: [], budget: { rows: [{ item: 'Entry: X', amount: 0 }], omitted: [] } }] })[0]).toContain('shown as "0"');
    expect(safetyChecks({ ...base, trips: [{ id: 'IT-DHK-001-1', stops: [], budget: { rows: [], known: 0, omitted: [] } }] })[0]).toContain('subtotal');
  });
});

// Each shared rule is defined once (roadmap task 1.4), in scripts/lib.
describe('one definition per rule', () => {
  const dir = fileURLToPath(new URL('../scripts', import.meta.url));
  const files = [...readdirSync(dir).filter(f => f.endsWith('.mjs')).map(f => join(dir, f)), ...readdirSync(join(dir, 'lib')).map(f => join(dir, 'lib', f))];
  const where = (re: RegExp) => files.filter(f => re.test(readFileSync(f, 'utf8'))).map(f => f.slice(dir.length + 1)).sort();
  it('BUCKET, TYPE_GROUP and the bounding box live in lib/validate.mjs', () => {
    expect(where(/const BUCKET\s*=/)).toEqual(['lib/validate.mjs']);
    expect(where(/const TYPE_GROUP\s*=/)).toEqual(['lib/validate.mjs']);
    expect(where(/20\.3/)).toEqual(['lib/validate.mjs']);
  });
  it('the internal terms live in lib/internal-terms.mjs', () => {
    expect(where(/\\bOrca\\b/)).toEqual(['lib/internal-terms.mjs']);
  });
});

// Phase 2 rules (scripts/lib/rules.mjs).
describe('hours known (2.9)', () => {
  it('needs a clock time', () => {
    for (const v of ['10:00-17:00', '9 am to 5 pm', 'Winter 9:00 AM - 5:00 PM', 'Sat-Wed 10:00-16:30; closed Thursday', '10:00 AM - 6:00 PM, no weekly off day']) expect(hoursKnown(v), v).toBe(true);
    for (const v of ['', 'Daylight hours', 'Daylight hours, with permission', 'By permission', 'Unknown', 'Not documented', 'Office hours', 'Government office hours (not confirmed)']) expect(hoursKnown(v), v).toBe(false);
  });
  it('is true for exactly 12 sites in the real data', () => {
    const rows = parseCsv(readFileSync(fileURLToPath(new URL('../data/csv/visitor_info.csv', import.meta.url)), 'utf8')).rows;
    expect(rows.filter(v => hoursKnown(v.opening_hours)).map(v => v.site_id)).toEqual(['JB-CTG-003', 'JB-CTG-033', 'JB-DHK-002', 'JB-DHK-014', 'JB-DHK-064', 'JB-DHK-080', 'JB-DHK-101', 'JB-KHL-014', 'JB-KHL-024', 'JB-KHL-031', 'JB-RAJ-069', 'JB-RNG-040']);
  });
});

describe('itinerary titles (2.16, I5)', () => {
  const cases: [string, string][] = [
    ['Suggested day-trip circuit (Manikganj heritage loop) (Baliati Palace (Baliati Zamindar Bari))', 'Manikganj heritage loop'],
    ['Suggested trip (Pakutia loop) (Pakutia Zamindar Bari)', 'Pakutia loop'],
    ['Suggested day-trip circuit (Baishrashi Zamindar Bari)', 'Suggested day-trip circuit (Baishrashi Zamindar Bari)'],
    ['Old Dhaka (Lalbagh) walk', 'Old Dhaka (Lalbagh) walk'],
    ['Manikganj heritage loop', 'Manikganj heritage loop']
  ];
  for (const [title, want] of cases) it(`"${title}"`, () => {
    expect(tripTitle(title)).toBe(want);
    expect(tripTitle(tripTitle(title))).toBe(tripTitle(title));
  });
});

describe('closing days (2.11)', () => {
  it('accepts blank, unknown, none and day tokens only', () => {
    expect(parseClosedDays('')).toEqual({ blank: true });
    expect(parseClosedDays('unknown')).toEqual({ known: false });
    expect(parseClosedDays('none')).toEqual({ known: true, days: [] });
    expect(parseClosedDays('mon;sun')).toEqual({ known: true, days: ['sun', 'mon'] });
    for (const v of ['Sun', 'sunday', 'sun;sun', 'sun,mon', 'None reported']) expect(parseClosedDays(v), v).toBeNull();
  });
});

describe('plan status suggestion (O11)', () => {
  const st = (...t: string[]) => t.map(time_or_day => ({ time_or_day }));
  it('timed needs 2+ stops, all with clock times', () => {
    expect(suggestPlanStatus(st('7:00 AM', '9:30 AM'))).toBe('timed');
    expect(suggestPlanStatus(st('7:00 AM', 'End'))).toBe('circuit');
    expect(suggestPlanStatus(st('1', '2'))).toBe('circuit');
    expect(suggestPlanStatus(st('7:00 AM'))).toBe('incomplete');
  });
});

describe('route modes (2.5)', () => {
  it('maps single, combined, unknown and unlisted labels', () => {
    expect(routeMode('Bus', '')).toEqual({ mode: 'bus' });
    expect(routeMode('Private car', '')).toEqual({ mode: 'car' });
    expect(routeMode('Bus + CNG', '')).toEqual({ mode: 'mixed' });
    expect(routeMode('Bus or train', '')).toEqual({ mode: 'mixed' });
    expect(routeMode('Unknown', 'bus to the ghat')).toEqual({ mode: 'unknown' });
    expect(routeMode('Hovercraft', '')).toBeNull();
  });
  it('infers from "Other / mixed" only on exactly one mode keyword', () => {
    expect(routeMode('Other / mixed', 'Launch from Sadarghat to Barishal')).toEqual({ mode: 'launch', inferred: true });
    expect(routeMode('Other / mixed', 'Bus to Pabna, then CNG')).toEqual({ mode: 'mixed' });
    expect(routeMode('Other / mixed', 'Ask locally')).toEqual({ mode: 'mixed' });
    expect(routeMode('Other / mixed', 'Busy road to the bustand')).toEqual({ mode: 'mixed' });
  });
  it('covers every label in the real data', () => {
    const rows = parseCsv(readFileSync(fileURLToPath(new URL('../data/csv/travel_routes.csv', import.meta.url)), 'utf8')).rows;
    expect(rows.filter(r => !Object.hasOwn(MODE_LABEL, r.transport_mode))).toEqual([]);
  });
});

describe('publisher matching (2.2)', () => {
  it('matches the normalized publisher as a whole word', () => {
    expect(matchVersions(['about 46 acres (Daily Star 2016)', '2,500 hectares (Adar Bepari)'], 'The Daily Star')).toEqual([0]);
    expect(matchVersions(['Indo-Saracenic (Banglapedia)', 'colonial (Wikipedia)'], 'Banglapedia (Asiatic Society)')).toEqual([0]);
  });
  it('returns several versions when the name is in both, and none for short or absent names', () => {
    expect(matchVersions(['1584 (Bangla Banglapedia)', '1800s (English Banglapedia)'], 'Banglapedia')).toEqual([0, 1]);
    expect(matchVersions(['1950 (this record)', '1951 (Md. Ali)'], 'Md. Mahmud Ali')).toEqual([]);
    expect(matchVersions(['built by the Starling family'], 'Star')).toEqual([]);
  });
  it('uses no prefix or substring matching', () => {
    expect(publisherName('The Daily Star. Dhaka')).toBe('daily star');
    expect(matchVersions(['(Daily Starling)'], 'The Daily Star')).toEqual([]);
  });
});
