import { describe, expect, it } from 'vitest';
import { cpSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMaps, MAP_CREDIT } from '../scripts/build-maps.mjs';
import { parseCsv } from '../scripts/csv.mjs';
import { isMappable } from '../scripts/lib/validate.mjs';
import { combine } from '../scripts/lib/report.mjs';
import { fixtureDir, hashDir, MODES, readJson, runBuilders, tempDir } from './helpers';

const GEO_FIXTURE = fileURLToPath(new URL('./fixtures/geo', import.meta.url));
const svgFiles = (dir: string) => Object.keys(hashDir(dir)).filter(f => f.endsWith('.svg'));
const markers = (svg: string) => [...svg.matchAll(/data-site-id="([^"]+)"/g)].map(m => m[1]);

function fixtureMaps(geoDir = GEO_FIXTURE) {
  const csvDir = fixtureDir();
  const { out } = runBuilders(csvDir);
  const maps = join(out, 'maps');
  return { csvDir, out, maps, run: () => buildMaps({ csvDir, buildDir: join(out, 'build'), geoDir, outDir: maps }) };
}

describe('static maps on the fixture (task 3.8)', () => {
  it('writes bd, division and district maps, pinning only mappable sites (R5)', () => {
    const f = fixtureMaps();
    const r = f.run();
    expect([r.structural, r.gates]).toEqual([[], []]);
    expect(svgFiles(f.maps)).toEqual(['bd.svg', 'district/manikganj.svg', 'division/dhaka.svg']);
    for (const file of svgFiles(f.maps)) {
      const svg = readFileSync(join(f.maps, file), 'utf8');
      expect(markers(svg), file).toEqual(['JB-DHK-001']);
      expect(svg, file).not.toContain('JB-DHK-002');   // map_display = hide
      expect(svg, file).not.toContain('Test House Two');
    }
  });

  it('is byte-identical between runs', () => {
    const f = fixtureMaps();
    f.run();
    const a = hashDir(f.maps);
    f.run();
    expect(hashDir(f.maps)).toEqual(a);
  });

  it('fails structurally, in every mode, when a district has no boundary', () => {
    const geo = tempDir('geo');
    cpSync(GEO_FIXTURE, geo, { recursive: true });
    writeFileSync(join(geo, 'names.csv'), 'level,slug,name_en,gb_name\ndivision,dhaka,Dhaka,Dhaka\n');
    const r = fixtureMaps(geo).run();
    expect(r.structural).toEqual([expect.objectContaining({ file: 'data/geo/names.csv', message: 'district "manikganj" has no boundary geometry' })]);
    for (const mode of MODES) expect(combine([r], mode).fatal).toBe(true);
  });
});

describe('static maps on the real data', () => {
  // Builds the real CSVs into a temp folder and draws them with the committed boundaries.
  const { out } = runBuilders('data/csv');
  const maps = join(out, 'maps');
  const r = buildMaps({ csvDir: 'data/csv', buildDir: join(out, 'build'), geoDir: 'data/geo', outDir: maps });
  const meta = readJson(join(out, 'build', 'meta.json'));
  const sites = parseCsv(readFileSync('data/csv/sites.csv', 'utf8')).rows;
  const hidden = sites.filter(s => !isMappable(s)).map(s => s.site_id);

  it('has geometry for every division and district', () => {
    expect(r.structural).toEqual([]);
    expect(readdirSync(join(maps, 'division'))).toHaveLength(meta.counts.divisions);
    expect(readdirSync(join(maps, 'district'))).toHaveLength(meta.counts.districts);
  });

  it('pins every mapped site on bd.svg, and no hidden site anywhere', () => {
    expect(markers(readFileSync(join(maps, 'bd.svg'), 'utf8'))).toHaveLength(meta.counts.onMap);
    const all = svgFiles(maps).map(f => readFileSync(join(maps, f), 'utf8')).join('\n');
    for (const id of hidden) expect(all.includes(`"${id}"`), id).toBe(false);
  });

  it('carries the credit and uses token colours only', () => {
    for (const f of svgFiles(maps)) {
      const svg = readFileSync(join(maps, f), 'utf8');
      expect(svg, f).toContain(MAP_CREDIT);
      expect(svg, f).toMatch(/<title>Map of /);
      expect(svg, f).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(\d/i);
    }
  });

  it('draws the one unverified site with a "?" badge (O9)', () => {
    const unverified = sites.filter(s => isMappable(s) && s.coordinates_status === 'unverified').map(s => s.site_id);
    const bd = readFileSync(join(maps, 'bd.svg'), 'utf8');
    for (const id of unverified) expect(bd).toMatch(new RegExp(`data-site-id="${id}" data-location="unverified">.*?>\\?</text>`));
  });
});
