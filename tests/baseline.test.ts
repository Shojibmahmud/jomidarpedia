// The real data against the reviewed baseline (roadmap tasks 1.9 and I6) and the invariants that
// must hold whatever the counts are. Builds data/csv into a temp folder in local mode.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../scripts/csv.mjs';
import { isMappable } from '../scripts/lib/validate.mjs';
import { measures } from './measures';
import { readJson, report, runBuilders } from './helpers';

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
    const now = flat(measures(CSV, join(out, 'public', 'index.json')));
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
