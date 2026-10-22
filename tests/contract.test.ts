// The Phase 2 data contract on fixtures (spec .claude/specs/02-Data-contracts.md).
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkIndex } from './index-contract';
import { fixtureDir, hashDir, readJson, readTable, reportText, runBuilders, writeTable } from './helpers';

const built = (dir = fixtureDir()) => {
  const { out, results } = runBuilders(dir);
  const site = (id: string) => readJson(join(out, 'build', 'sites', `${id}.json`));
  return { out, results, site, trip: readJson(join(out, 'build', 'trips', 'IT-DHK-001-1.json')), index: readJson(join(out, 'public', 'index.json')) };
};
const valid = built();
const ids = (refs: { id: string }[] = []) => refs.map(r => r.id);

describe('index contract (2.1, 2.4)', () => {
  it('the validator accepts the built index', () => expect(checkIndex(valid.index)).toBeNull());
  it('the validator names the site and key of a bad row', () => {
    expect(checkIndex([{ ...valid.index[0], zz: 1 }])).toBe('JB-DHK-001: unknown key zz');
    const noType = { ...valid.index[0] };
    delete noType.ty;
    expect(checkIndex([noType])).toBe('JB-DHK-001: missing ty');
    expect(checkIndex([{ ...valid.index[0], oc: 0 }])).toMatch(/bad oc/);
  });
  it('adds fm, ty, hv, oc and img only where they apply', () => {
    const [one, two] = valid.index;
    expect(one).toMatchObject({ fm: 'Roy family', ty: 'zamindar_house', hv: 1, oc: 200, img: { id: 'IMG-DHK-001-001' } });
    expect(one.img.credit).toMatch(/^Photo: A\. Person/);
    expect(two.ty).toBe('royal_palace');
    for (const k of ['hv', 'oc', 'img', 'p']) expect(two[k], k).toBeUndefined();
  });
});

describe('conflict attribution (2.2)', () => {
  const [style, built_, name] = valid.site('JB-DHK-001').conflicts;
  it('puts a source on the one version that names its publisher', () => {
    expect(style.versions.map((v: { sources: { id: string }[] }) => ids(v.sources))).toEqual([[], ['SRC-0002']]);
    expect(style.versions[1].sources[0].relation).toBe('disputed_by');
  });
  it('lists an unmatched source for the disagreement', () => expect(ids(style.unattributedSources)).toEqual(['SRC-0001']));
  it('leaves a source that names two versions unattributed', () => {
    expect(built_.versions.every((v: { sources: unknown[] }) => v.sources.length === 0)).toBe(true);
    expect(ids(built_.unattributedSources)).toEqual(['SRC-0002']);
  });
  it('gives a one-version conflict no version sources', () => {
    expect(name.versions).toEqual([{ text: 'the house may be the Roy family seat (A Newspaper)', sources: [] }]);
    expect(ids(name.unattributedSources)).toEqual(['SRC-0002']);
  });
  it('reports the counts', () => {
    const text = reportText(valid.results, 'local');
    expect(text).toContain('Versions with their own sources: 1');
    expect(text).toContain('Versions without sources: 4');
    expect(text).toContain('Source links not matched to a version (listed for the disagreement): 3');
  });
});

describe('legend and fact sources (2.3)', () => {
  const s = valid.site('JB-DHK-001');
  it('a legend lists its attribution and its reported_by links', () => expect(ids(s.legends[0].sources)).toEqual(['SRC-0001', 'SRC-0002']));
  it('a fact carries the sources of its fact claims, and only those', () => {
    expect(s.founder.sources).toEqual([{ id: 'SRC-0001', n: 1, relation: 'supports' }]);
    expect(s.era.sources).toEqual([]);
  });
});

describe('trips (2.6–2.8, 2.10, 2.16)', () => {
  const t = valid.trip;
  it('shortens only a two-group title', () => expect(t.title).toBe('Saturia loop'));
  it('budget rows carry numbers, units and dates; totals list what they omit', () => {
    const row = (item: string) => t.budget.rows.find((r: { item: string }) => r.item === item);
    expect(row('Dhaka → Test House One, one way')).toMatchObject({ amount: 150, unit: 'per_person', currency: 'BDT', date: '2026-09-20', status: 'estimate', sources: [] });
    expect(row('Entry: Test House One')).toMatchObject({ amount: 20, note: 'Ticket price at the gate.', sources: ['SRC-0002'] });
    expect(row('Entry: Test House Two')).toMatchObject({ noTicket: true });
    expect(row('Entry: Test House Two').amount).toBeUndefined();
    expect(t.budget.known).toBe(170);
    expect(t.budget.omitted).toEqual(['Food', 'Local guide']);
    expect(t.costsEstimated).toEqual({ from: '2026-09-20', to: '2026-10-02' });
  });
  it('has no single lastChecked; site stops carry their own date', () => {
    expect(t.lastChecked).toBeUndefined();
    expect(t.stops.map((s: { visitingChecked?: string }) => s.visitingChecked)).toEqual(['2026-10-01', '2026-10-02', undefined]);
  });
  it('marks stops as site or place; a place has coordinates only from a sourced row', () => {
    expect(t.stops.map((s: { kind: string }) => s.kind)).toEqual(['site', 'site', 'place']);
    expect(t.stops[2]).toMatchObject({ latlon: [23.915, 90.125], sources: ['SRC-0002'] });
  });
  it('builds legs and is not schematic when legs exist; publishes the reviewed plan status', () => {
    expect(t.legs).toEqual([{ from: 1, to: 2, mode: 'car', hours: 0.5, costRow: 'CO-DHK-001-02', sources: ['SRC-0002'] }]);
    expect(t.schematic).toBe(false);
    expect(t.planStatus).toBe('circuit');
  });
  it('a place without an itinerary_places row has no coordinates, and a trip without legs is schematic', () => {
    const dir = fixtureDir();
    writeTable(dir, 'itinerary_places', [], ['itinerary_id', 'stop_order', 'latitude', 'longitude', 'source_ids']);
    writeTable(dir, 'itinerary_legs', [], ['itinerary_id', 'from_stop', 'to_stop', 'mode', 'duration', 'cost_row', 'source_ids']);
    const t2 = built(dir).trip;
    expect(t2.stops[2].latlon).toBeUndefined();
    expect([t2.legs, t2.schematic]).toEqual([[], true]);
  });
  it('carries a shared fare basis and its legs from the cost columns', () => {
    const dir = fixtureDir();
    writeTable(dir, 'costs', readTable(dir, 'costs').map(c => (c.cost_id === 'CO-DHK-001-02' ? { ...c, fare_basis: 'shared', legs: '1-2;2-3' } : c)));
    const row = built(dir).trip.budget.rows[0];
    expect(row).toMatchObject({ basis: 'shared', legs: [[1, 2], [2, 3]] });
  });
});

describe('visiting (2.8, 2.9, 2.11)', () => {
  it('closing days come only from the reviewed column', () => {
    expect(valid.site('JB-DHK-001').visiting).toMatchObject({ closedDays: { known: true, days: ['fri'] }, hoursKnown: true, date: '2026-10-01' });
    expect(valid.site('JB-DHK-002').visiting).toMatchObject({ closedDays: { known: false }, hoursKnown: false });
  });
  it('none means no closing day; a blank is unknown', () => {
    const dir = fixtureDir();
    writeTable(dir, 'visitor_info', readTable(dir, 'visitor_info').map((v, k) => ({ ...v, closed_days: k ? '' : 'none' })));
    const b = built(dir);
    expect(b.site('JB-DHK-001').visiting.closedDays).toEqual({ known: true, days: [] });
    expect(b.site('JB-DHK-002').visiting.closedDays).toEqual({ known: false });
  });
  it('meta separates compiledAt from lastVerified and counts hours known', () => {
    const meta = readJson(join(valid.out, 'build', 'meta.json'));
    expect(meta).toMatchObject({ lastVerified: '2026-10-02', compiledAt: '2026-10-02' });
    expect(meta.generatedAt).toBeUndefined();
    expect(meta.counts.hoursKnown).toBe(1);
  });
});

describe('photos, names, features, sources (2.12–2.15)', () => {
  it('a hidden pin without photos gets a name-only search link', () => {
    const ext = valid.site('JB-DHK-002').externalPhotos;
    expect(ext.label).toBe('Search for visitor photos');
    expect(ext.url).toBe('https://www.google.com/maps/search/?api=1&query=Test%20House%20Two%2C%20Manikganj');
    expect(ext.url).not.toMatch(/\d+\.\d+/);
  });
  it('a missing Bangla name is optional and flagged', () => {
    const dir = fixtureDir();
    writeTable(dir, 'sites', readTable(dir, 'sites').map(s => (s.site_id === 'JB-DHK-002' ? { ...s, name_bn: '' } : s)));
    const b = built(dir);
    expect(b.site('JB-DHK-002').bnMissing).toBe(true);
    expect(b.site('JB-DHK-002').name.bn).toBeUndefined();
    expect(b.index[1].b).toBeUndefined();
    expect(checkIndex(b.index)).toBeNull();
    expect(reportText(b.results, 'local')).toMatch(/### Sites without a Bangla name\n\n- JB-DHK-002/);
  });
  it('features come only from features.csv; competing measurements become a conflict', () => {
    expect(valid.site('JB-DHK-001').features).toEqual([]);
    const dir = fixtureDir();
    writeTable(dir, 'features', [
      { site_id: 'JB-DHK-001', feature: 'Area', feature_bn: '', measurement: '46', unit: 'acres', source_ids: 'SRC-0001', status: 'reported' },
      { site_id: 'JB-DHK-001', feature: 'Area', feature_bn: '', measurement: '50', unit: 'acres', source_ids: 'SRC-0002', status: 'reported' }
    ], ['site_id', 'feature', 'feature_bn', 'measurement', 'unit', 'source_ids', 'status']);
    const s = built(dir).site('JB-DHK-001');
    expect(s.features).toHaveLength(2);
    expect(s.features[0]).toMatchObject({ text: 'Area', measurement: '46', unit: 'acres', status: 'reported' });
    const area = s.conflicts.find((c: { field: string }) => c.field === 'Area');
    expect(area.versions.map((v: { text: string; sources: { id: string }[] }) => [v.text, ids(v.sources)])).toEqual([['46 acres', ['SRC-0001']], ['50 acres', ['SRC-0002']]]);
  });
  it('structured source fields and citations by division', () => {
    const [one, two] = readJson(join(valid.out, 'build', 'sources.json'));
    expect(one.bib).toEqual({ author: 'A. Author', publisher: 'House Press', edition: 'First edition', isbn: '978-0-00-000000-0', verificationMethod: 'Checked in print' });
    expect(two.bib).toBeUndefined();
    expect(one.citationsByDivision).toEqual({ Dhaka: 1 });
  });
});

describe('field whitelist (I7)', () => {
  it('internal columns never reach any output', () => {
    const MARK = 'zzinternalmarkerzz';
    const dir = fixtureDir();
    const add = (table: string, cols: string[]) => writeTable(dir, table, readTable(dir, table).map(r => ({ ...r, ...Object.fromEntries(cols.map(c => [c, MARK])) })));
    add('site_sources', ['citation_note', 'cited_in']);
    add('sources', ['local_path', 'cited_by_site_ids']);
    add('images', ['identity_verification', 'license_evidence', 'notes']);
    const { out } = runBuilders(dir);
    const files = Object.keys(hashDir(out));
    expect(files.length).toBeGreaterThan(5);
    for (const f of files) expect(readFileSync(join(out, f), 'utf8'), f).not.toContain(MARK);
  });
});

describe('editorial: unreviewed columns', () => {
  it('a blank plan_status is unknown in the output', () => {
    const dir = fixtureDir();
    writeTable(dir, 'itineraries', readTable(dir, 'itineraries').map(r => ({ ...r, plan_status: '' })));
    const { out } = runBuilders(dir);
    expect(readJson(join(out, 'build', 'trips', 'IT-DHK-001-1.json')).planStatus).toBeUndefined();
    expect(readdirSync(join(out, 'build', 'trips'))).toEqual(['IT-DHK-001-1.json']);
  });
});
