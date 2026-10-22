// The real data against the reviewed baseline (roadmap tasks 1.9 and I6) and the invariants that
// must hold whatever the counts are. Builds data/csv into a temp folder in local mode.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../scripts/csv.mjs';
import { isMappable } from '../scripts/lib/validate.mjs';
import { measures } from './measures';
import { gzipSync } from 'node:zlib';
import { checkIndex } from './index-contract';
import { readJson, report, reportText, runBuilders } from './helpers';

const CSV = fileURLToPath(new URL('../data/csv', import.meta.url));
const BASELINE = fileURLToPath(new URL('./baseline.json', import.meta.url));

const { out, results } = runBuilders(CSV);
const build = (...p: string[]) => join(out, 'build', ...p);
const index: { i: string; ll?: number[] }[] = readJson(join(out, 'public', 'index.json'));
const sites: Record<string, string>[] = parseCsv(readFileSync(join(CSV, 'sites.csv'), 'utf8')).rows;
const hidden = new Set(sites.filter(s => !isMappable(s)).map(s => s.site_id));

// Flattens nested measures to "a.b: value" lines so a difference reads one measure per line.
const flat = (o: object, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [`${p}${k}: ${v}`]));

describe('real data', () => {
  it('passes structural validation and the safety rules (local build succeeds)', () => {
    const r = report(results, 'local');
    expect(r.structural, r.structural.join('\n')).toEqual([]);
    expect(r.gates, r.gates.join('\n')).toEqual([]);
    expect(r.fatal).toBe(false);
  });

  it('matches tests/baseline.json', () => {
    const now = flat(measures(CSV, join(out, 'public', 'index.json'), join(out, 'build')));
    const base = flat(JSON.parse(readFileSync(BASELINE, 'utf8')));
    const diff = [...base.filter(l => !now.includes(l)).map(l => `- ${l}`), ...now.filter(l => !base.includes(l)).map(l => `+ ${l}`)];
    expect(diff, `The data no longer matches tests/baseline.json. If this change is intended, update the file.\n${diff.join('\n')}`).toEqual([]);
  });
});

describe('invariants', () => {
  const meta = readJson(build('meta.json'));

  it('onMap + noPin = sites', () => {
    expect(meta.counts.onMap + meta.counts.noPin).toBe(meta.counts.sites);
    expect(meta.counts.sites).toBe(sites.length);
    expect(index.filter(r => r.ll).length).toBe(meta.counts.onMap);
  });

  it('no hidden site has ll or latlon, anywhere', () => {
    for (const row of index) if (hidden.has(row.i)) expect(row.ll, row.i).toBeUndefined();
    for (const id of hidden) expect(readJson(build('sites', `${id}.json`)).location.latlon, id).toBeUndefined();
    for (const f of readdirSync(build('trips')))
      for (const st of readJson(build('trips', f)).stops) if (hidden.has(st.siteId)) expect(st.latlon, `${f} stop ${st.order}`).toBeUndefined();
  });

  it('Ready images in the output equal the Ready rows in the CSV', () => {
    const ready = parseCsv(readFileSync(join(CSV, 'images.csv'), 'utf8')).rows.filter(i => i.publication_readiness.startsWith('Ready')).map(i => i.image_id).sort();
    const inSites = readdirSync(build('sites')).flatMap(f => readJson(build('sites', f)).images.map((im: { id: string }) => im.id)).sort();
    const inCredits = readJson(build('credits.json')).map((c: { imageId: string }) => c.imageId).sort();
    expect(inSites).toEqual(ready);
    expect(inCredits).toEqual(ready);
  });

  it('every index row has a site file, and every site file an index row', () => {
    const files = readdirSync(build('sites')).map(f => f.replace(/\.json$/, '')).sort();
    expect(index.map(r => r.i).sort()).toEqual(files);
    for (const r of index) expect(existsSync(build('sites', `${r.i}.json`))).toBe(true);
  });
});

// The Phase 2 contract on the real data (spec .claude/specs/02-Data-contracts.md §8).
describe('data contract on the real data', () => {
  const siteFiles = readdirSync(build('sites')).sort().map(f => readJson(build('sites', f)));
  const trips = readdirSync(build('trips')).sort().map(f => readJson(build('trips', f)));
  type Ref = { id: string };

  it('index.json matches IndexSite and stays under the 120 KB early warning (AC-1, AC-4)', () => {
    expect(checkIndex(index)).toBeNull();
    expect(gzipSync(readFileSync(join(out, 'public', 'index.json'))).length).toBeLessThanOrEqual(120 * 1024);
  });

  it('no source sits on two versions of a conflict (AC-2)', () => {
    for (const s of siteFiles) for (const c of s.conflicts) {
      const on = c.versions.flatMap((v: { sources: Ref[] }) => v.sources.map(r => r.id));
      expect(new Set(on).size, `${s.id} ${c.field}`).toBe(on.length);
      for (const r of c.unattributedSources ?? []) expect(on, `${s.id} ${c.field}`).not.toContain(r.id);
    }
    expect(reportText(results, 'local')).toMatch(/Versions with their own sources: \d+/);
  });

  it('a route is bus only when its label is Bus (AC-5)', () => {
    const labels = new Map(parseCsv(readFileSync(join(CSV, 'travel_routes.csv'), 'utf8')).rows.map(r => [`${r.site_id} ${r.route_description}`, r.transport_mode]));
    for (const s of siteFiles) for (const r of s.travel.routes) {
      const label = labels.get(`${s.id} ${r.description}`);
      if (r.mode === 'bus') expect(label === 'Bus' || (label === 'Other / mixed' && r.inferred), `${s.id}: ${label}`).toBe(true);
      if (label === 'Unknown') expect(r.mode).toBe('unknown');
    }
  });

  it('Manikganj loop budget: Tk 180 known; food and guide omitted; Teota no ticket (AC-6)', () => {
    const t = readJson(build('trips', 'IT-DHK-064-1.json'));
    expect(t.budget.known).toBe(180);
    expect(t.budget.omitted).toEqual(['Food', 'Local guide']);
    const teota = t.budget.rows.find((r: { item: string }) => r.item === 'Entry: Teota Zamindar Bari');
    expect(teota.noTicket).toBe(true);
    expect(t.budget.rows[0].item).toBe('Dhaka → Baliati Palace (Baliati Zamindar Bari), one way');
    for (const r of t.budget.rows) expect(r.date, r.item).toBe('2026-10-13');
    for (const r of t.budget.rows.filter((x: { amount?: number }) => x.amount)) expect(r.unit, r.item).toBe('per_person');
  });

  it('hours known for 12 sites (AC-7)', () => expect(siteFiles.filter(s => s.visiting.hoursKnown).length).toBe(12));

  it('trips have per-fact dates, no lastChecked, and are schematic with no place coordinates (AC-8, AC-9)', () => {
    const meta = readJson(build('meta.json'));
    expect(meta.compiledAt).toBeDefined();
    expect(meta.lastVerified).toBeDefined();
    for (const t of trips) {
      expect(t.lastChecked, t.id).toBeUndefined();
      expect([t.legs, t.schematic], t.id).toEqual([[], true]);
      for (const st of t.stops) if (st.kind === 'place') expect(st.latlon, `${t.id} ${st.order}`).toBeUndefined();
      expect(t.planStatus, t.id).toBeUndefined();
    }
  });

  it('hidden pins without photos have a name-only link (AC-11)', () => {
    const linked = siteFiles.filter(s => hidden.has(s.id) && !s.images.length);
    expect(linked.length).toBeGreaterThan(0);
    for (const s of linked) {
      expect(s.externalPhotos.label, s.id).toBe('Search for visitor photos');
      expect(s.externalPhotos.url, s.id).not.toMatch(/\d+\.\d+/);
    }
  });

  it('missing Bangla names are flagged and reported (AC-12)', () => {
    for (const id of ['JB-RAJ-059', 'JB-RAJ-071']) {
      expect(readJson(build('sites', `${id}.json`)).bnMissing, id).toBe(true);
      expect(index.find(r => r.i === id)).not.toHaveProperty('b');
    }
    expect(reportText(results, 'local')).toContain('- JB-RAJ-059, JB-RAJ-071');
  });

  it('SRC-0001 alone carries structured fields; citations by division add up (AC-14)', () => {
    const sources = readJson(build('sources.json'));
    expect(sources.filter((s: { bib?: object }) => s.bib).map((s: { id: string }) => s.id)).toEqual(['SRC-0001']);
    expect(sources[0].bib).toEqual({ author: 'Md. Mahmud Ali', publisher: 'Dibyaprakash', edition: 'First edition, February 2024', isbn: '978-984-97277-4-3',
      verificationMethod: 'Appendix checked in print (Oct 2026); chapter entries via master-list transcriptions' });
    const cites = parseCsv(readFileSync(join(CSV, 'site_sources.csv'), 'utf8')).rows;
    for (const s of sources) {
      const total = Object.values(s.citationsByDivision as Record<string, number>).reduce((a, b) => a + b, 0);
      expect(total, s.id).toBe(cites.filter(c => c.source_id === s.id).length);
    }
  });

  it('the release report lists unreviewed plan_status and closed_days cells (AC-16)', () => {
    const r = report(results, 'release');
    const editorial = r.editorial as Record<string, unknown[]>;
    expect(editorial.planStatus.length).toBe(385);
    expect(editorial.closedDays.length).toBe(413);
    expect(r.fatal).toBe(true);
    expect(report(results, 'local').fatal).toBe(false);
  });
});
