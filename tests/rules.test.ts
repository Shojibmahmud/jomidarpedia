import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMappable, isIsoDay, isCitationDate, isNonNegativeNumber, COORD_PAIR } from '../scripts/lib/validate.mjs';
import { internalTerm } from '../scripts/lib/internal-terms.mjs';
import { FREE_ENTRY, ZERO_OR_FREE, coordinateLeaks } from '../scripts/lib/checks.mjs';
import { safetyChecks } from '../scripts/build-data.mjs';

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
    expect(safetyChecks({ ...base, trips: [{ id: 'IT-DHK-001-1', stops: [{ order: 1, siteId: 'JB-DHK-002', latlon: [23.9, 90.1] }], budget: [] }] })[0]).toContain('hidden site'));
  it('fails a non-Ready image in a site record or in credits', () => {
    expect(safetyChecks({ ...base, records: [record('JB-DHK-001', { images: [{ id: 'IMG-DHK-001-002' }] })] })[0]).toContain('not Ready');
    expect(safetyChecks({ ...base, credits: [{ imageId: 'IMG-DHK-001-002' }] })[0]).toContain('not Ready');
  });
  it('fails a fee of 0 marked as known', () =>
    expect(safetyChecks({ ...base, records: [record('JB-DHK-001', { visiting: { fee: { known: true, value: 0 } } })] })[0]).toContain('fee shown as a price'));
  it('fails a budget line showing Tk 0', () =>
    expect(safetyChecks({ ...base, trips: [{ id: 'IT-DHK-001-1', stops: [], budget: [{ item: 'Entry: X', amount: { known: true, value: 'Tk 0' } }] }] })[0]).toContain('Tk 0'));
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
