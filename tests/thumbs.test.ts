import { describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { buildThumbs, isReady, readManifest } from '../scripts/build-thumbs.mjs';
import { checkThumbs } from '../scripts/lib/thumbs-check.mjs';
import { parseCsv } from '../scripts/csv.mjs';
import { combine } from '../scripts/lib/report.mjs';
import { fixtureDir, MODES, runBuilders, tempDir, writeTable } from './helpers';

// A small images.csv and generated originals: a landscape photo with EXIF and GPS, a portrait, a tiny one.
async function setup() {
  const dir = tempDir('thumbs');
  const images = join(dir, 'images');
  mkdirSync(join(images, 'dhaka'), { recursive: true });
  const make = (w: number, h: number, colour: string) => sharp({ create: { width: w, height: h, channels: 3, background: colour } });
  await make(1200, 800, '#a3422a').withExif({ IFD0: { Copyright: 'someone' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '23/1 54/1 0/1' } }).jpeg().toFile(join(images, 'dhaka', 'a.jpg'));
  await make(600, 900, '#466636').jpeg().toFile(join(images, 'dhaka', 'b.jpg'));
  await make(200, 150, '#2b6a6a').png().toFile(join(images, 'dhaka', 'c.png'));
  const csv = join(dir, 'images.csv');
  writeTable(dir, 'images', [
    { image_id: 'IMG-DHK-001-001', relative_file_path: 'dhaka/a.jpg', publication_readiness: 'Ready' },
    { image_id: 'IMG-DHK-001-002', relative_file_path: 'dhaka/b.jpg', publication_readiness: 'Ready for publication' },
    { image_id: 'IMG-DHK-001-003', relative_file_path: 'dhaka/c.png', publication_readiness: 'Ready' },
    { image_id: 'IMG-DHK-002-001', relative_file_path: 'dhaka/b.jpg', publication_readiness: 'Permission required' },
  ]);
  return { dir, images, csv, out: join(dir, 'thumbs') };
}
const webps = (dir: string) => readdirSync(dir).filter(f => f.endsWith('.webp')).sort();

describe('npm run thumbs (task 3.5)', () => {
  it('makes 480×360 WebP thumbnails of the Ready rows only, with no metadata', async () => {
    const s = await setup();
    const r = await buildThumbs({ csvPath: s.csv, imagesDir: s.images, outDir: s.out });
    expect(r.problems).toEqual([]);
    expect(r.made.sort()).toEqual(['IMG-DHK-001-001', 'IMG-DHK-001-002', 'IMG-DHK-001-003']);
    expect(webps(s.out)).toEqual(['IMG-DHK-001-001.webp', 'IMG-DHK-001-002.webp', 'IMG-DHK-001-003.webp']);
    for (const f of webps(s.out)) {
      const m = await sharp(join(s.out, f)).metadata();
      expect([m.format, m.width, m.height], f).toEqual(['webp', 480, 360]);
      expect([m.exif, m.xmp, m.iptc, m.icc], f).toEqual([undefined, undefined, undefined, undefined]);
    }
    expect(r.warnings).toEqual(['IMG-DHK-001-003: original is only 200×150, upscaled to 480×360']);
    expect(Object.keys(readManifest(join(s.out, 'manifest.json')))).toHaveLength(3);
  });

  it('changes nothing on a second run, and rebuilds only a changed original', async () => {
    const s = await setup();
    await buildThumbs({ csvPath: s.csv, imagesDir: s.images, outDir: s.out });
    const before = Object.fromEntries(webps(s.out).map(f => [f, readFileSync(join(s.out, f))]));
    const manifest = readFileSync(join(s.out, 'manifest.json'), 'utf8');
    const again = await buildThumbs({ csvPath: s.csv, imagesDir: s.images, outDir: s.out });
    expect([again.made, again.kept]).toEqual([[], 3]);
    expect(readFileSync(join(s.out, 'manifest.json'), 'utf8')).toBe(manifest);
    for (const f of webps(s.out)) expect(readFileSync(join(s.out, f)).equals(before[f])).toBe(true);

    await sharp({ create: { width: 900, height: 600, channels: 3, background: '#7a5a12' } }).jpeg().toFile(join(s.images, 'dhaka', 'b.jpg'));
    const changed = await buildThumbs({ csvPath: s.csv, imagesDir: s.images, outDir: s.out });
    expect(changed.made).toEqual(['IMG-DHK-001-002']);
  });

  it('removes thumbnails outside the Ready set', async () => {
    const s = await setup();
    await buildThumbs({ csvPath: s.csv, imagesDir: s.images, outDir: s.out });
    writeFileSync(join(s.out, 'IMG-DHK-002-001.webp'), 'stray');
    const r = await buildThumbs({ csvPath: s.csv, imagesDir: s.images, outDir: s.out });
    expect(r.removed).toEqual(['IMG-DHK-002-001.webp']);
    expect(existsSync(join(s.out, 'IMG-DHK-002-001.webp'))).toBe(false);
  });

  it('reports a missing or corrupt original by ID, keeps its old thumbnail and still does the rest', async () => {
    const s = await setup();
    await buildThumbs({ csvPath: s.csv, imagesDir: s.images, outDir: s.out });
    rmSync(join(s.images, 'dhaka', 'a.jpg'));
    writeFileSync(join(s.images, 'dhaka', 'c.png'), 'not an image');
    const r = await buildThumbs({ csvPath: s.csv, imagesDir: s.images, outDir: s.out });
    expect(r.problems).toHaveLength(2);
    expect(r.problems[0]).toMatch(/^IMG-DHK-001-001: original not found/);
    expect(r.problems[1]).toMatch(/^IMG-DHK-001-003: could not read the original/);
    expect(existsSync(join(s.out, 'IMG-DHK-001-001.webp'))).toBe(true);
    expect(Object.keys(readManifest(join(s.out, 'manifest.json'))).sort()).toEqual(['IMG-DHK-001-001', 'IMG-DHK-001-002', 'IMG-DHK-001-003']);
  });
});

describe('thumbnail check (task 3.6)', () => {
  function project() {
    const { out } = runBuilders(fixtureDir());
    const thumbs = join(out, 'thumbs');
    mkdirSync(thumbs);
    writeFileSync(join(thumbs, 'IMG-DHK-001-001.webp'), '');
    return { out, thumbs, check: () => checkThumbs({ buildDir: join(out, 'build'), indexPath: join(out, 'public', 'index.json'), thumbsDir: thumbs }) };
  }

  it('passes when every referenced thumbnail exists and nothing else is there', () => {
    expect(project().check().gates).toEqual([]);
  });

  it('fails in every mode on a missing thumbnail, naming it', () => {
    const p = project();
    rmSync(join(p.thumbs, 'IMG-DHK-001-001.webp'));
    const r = p.check();
    expect(r.gates.join('\n')).toMatch(/thumbnail \/thumbs\/IMG-DHK-001-001\.webp is missing/);
    for (const mode of MODES) expect(combine([r], mode).fatal).toBe(true);
  });

  it('fails in every mode on a stray .webp, which would publish a non-Ready image (R4)', () => {
    const p = project();
    writeFileSync(join(p.thumbs, 'IMG-DHK-002-001.webp'), '');
    const r = p.check();
    expect(r.gates).toEqual([expect.stringMatching(/IMG-DHK-002-001\.webp is not a Ready image/)]);
    for (const mode of MODES) expect(combine([r], mode).fatal).toBe(true);
  });
});

describe('committed thumbnails (O12)', () => {
  // Checks public/thumbs against images.csv and the manifest, without the originals (fresh clone).
  const rows = parseCsv(readFileSync('data/csv/images.csv', 'utf8')).rows.filter(isReady);
  const files = webps('public/thumbs');

  it('holds exactly one thumbnail per Ready image, each in the manifest', () => {
    expect(files).toEqual(rows.map(r => `${r.image_id}.webp`).sort());
    const manifest = readManifest('public/thumbs/manifest.json');
    expect(Object.keys(manifest).sort()).toEqual(rows.map(r => r.image_id).sort());
    for (const f of files.slice(0, 50)) expect(statSync(join('public/thumbs', f)).size).toBe(manifest[f.slice(0, -5)].bytes);
  });

  it('averages 40 KB or less (NFR-6)', () => {
    const total = files.reduce((n, f) => n + statSync(join('public/thumbs', f)).size, 0);
    expect(total / files.length).toBeLessThanOrEqual(40 * 1024);
  });
});
