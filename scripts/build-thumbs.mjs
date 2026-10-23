#!/usr/bin/env node
// `npm run thumbs`: maintenance command (roadmap tasks 3.5, O12). Never part of `build` or `data`.
// Makes public/thumbs/<image_id>.webp for every Ready row of images.csv: EXIF orientation applied,
// centre-cropped to 4:3 at 480×360, sRGB, WebP, with all metadata (EXIF, GPS, XMP) stripped.
// The thumbnails and public/thumbs/manifest.json are committed, so a fresh clone builds without the originals.
//
// Originals are read from JP_IMAGES_DIR (default ../images) via relative_file_path.
// The manifest records each source's SHA-256, the encoding parameters and the output's SHA-256, so only
// new or changed originals are processed. Thumbnails outside the Ready set are deleted.
// A missing or corrupt original is reported by ID; the run finishes the rest and exits non-zero,
// keeping any thumbnail that already exists for that ID.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { parseCsv } from './csv.mjs';

// Changing any value here regenerates every thumbnail. background is --surface (light), for transparent PNGs.
export const PARAMS = { width: 480, height: 360, fit: 'cover', position: 'centre', format: 'webp', quality: 75, effort: 6, background: '#FFFCF5' };
const sha256 = buf => createHash('sha256').update(buf).digest('hex');
const paramsHash = sha256(JSON.stringify(PARAMS)).slice(0, 12);
export const isReady = im => (im.publication_readiness || '').startsWith('Ready');

export function readManifest(path) {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, 'utf8')).images ?? {};
}

// One entry per line, keys sorted, so the committed file diffs cleanly.
function writeManifest(path, images) {
  const ids = Object.keys(images).sort();
  const lines = ids.map((id, i) => `    ${JSON.stringify(id)}: ${JSON.stringify(images[id])}${i < ids.length - 1 ? ',' : ''}`);
  writeFileSync(path, `{\n  "params": ${JSON.stringify(PARAMS)},\n  "images": {\n${lines.join('\n')}\n  }\n}\n`);
}

async function encode(src) {
  const meta = await sharp(src).metadata();
  const rotated = (meta.orientation ?? 1) >= 5;
  const [w, h] = rotated ? [meta.height, meta.width] : [meta.width, meta.height];
  const output = await sharp(src)
    .rotate()
    .flatten({ background: PARAMS.background })
    .resize(PARAMS.width, PARAMS.height, { fit: PARAMS.fit, position: PARAMS.position })
    .toColourspace('srgb')
    .webp({ quality: PARAMS.quality, effort: PARAMS.effort })
    .toBuffer();
  return { output, small: w < PARAMS.width || h < PARAMS.height, size: `${w}×${h}` };
}

/** @param {{ csvPath?: string, imagesDir?: string, outDir?: string, concurrency?: number }} [options] */
export async function buildThumbs({
  csvPath = 'data/csv/images.csv', imagesDir = process.env.JP_IMAGES_DIR || '../images', outDir = 'public/thumbs', concurrency = 4
} = {}) {
  const { rows, errors } = parseCsv(readFileSync(csvPath, 'utf8'));
  if (errors.length) return { problems: errors.map(e => `${csvPath}, line ${e.line}: ${e.message}`), warnings: [], made: [], kept: 0, removed: [] };
  const ready = rows.filter(isReady).sort((a, b) => a.image_id.localeCompare(b.image_id));
  const readyIds = new Set(ready.map(im => im.image_id));
  mkdirSync(outDir, { recursive: true });
  const manifestPath = join(outDir, 'manifest.json');
  const old = readManifest(manifestPath);
  const images = {}, problems = [], warnings = [], made = [];
  let kept = 0;

  const one = async im => {
    const id = im.image_id;
    const file = join(outDir, `${id}.webp`);
    const src = join(imagesDir, im.relative_file_path);
    const keepOld = () => { if (old[id] && existsSync(file)) images[id] = old[id]; };
    if (!existsSync(src)) { problems.push(`${id}: original not found (${src})`); keepOld(); return; }
    const source = sha256(readFileSync(src));
    const prev = old[id];
    if (prev && prev.source === source && prev.params === paramsHash && existsSync(file) && sha256(readFileSync(file)) === prev.output) {
      images[id] = prev; kept++; return;
    }
    try {
      const { output, small, size } = await encode(src);
      if (small) warnings.push(`${id}: original is only ${size}, upscaled to ${PARAMS.width}×${PARAMS.height}`);
      writeFileSync(file, output);
      images[id] = { source, params: paramsHash, output: sha256(output), bytes: output.length };
      made.push(id);
    } catch (e) {
      problems.push(`${id}: could not read the original (${src}): ${e.message}`);
      keepOld();
    }
  };
  for (let i = 0; i < ready.length; i += concurrency) await Promise.all(ready.slice(i, i + concurrency).map(one));

  // Thumbnails outside the Ready set must not stay in public/ (R4).
  const removed = readdirSync(outDir).filter(f => f.endsWith('.webp') && !readyIds.has(f.slice(0, -5))).sort();
  removed.forEach(f => rmSync(join(outDir, f)));
  writeManifest(manifestPath, images);
  return { problems: problems.sort(), warnings: warnings.sort(), made, kept, removed, total: ready.length, images };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const r = await buildThumbs();
  const bytes = Object.values(r.images ?? {}).reduce((n, x) => n + (x.bytes ?? 0), 0);
  const count = Object.keys(r.images ?? {}).length;
  console.log(`thumbs: ${r.made.length} made, ${r.kept} unchanged, ${r.removed.length} removed; ${count} of ${r.total ?? 0} Ready images` +
    (count ? `, average ${(bytes / count / 1024).toFixed(1)} KB, total ${(bytes / 1024 / 1024).toFixed(1)} MB` : ''));
  r.removed.forEach(f => console.log(`removed: ${f} (not Ready)`));
  r.warnings.forEach(w => console.log(`warning: ${w}`));
  if (r.problems.length) {
    console.log(`\nFAIL: ${r.problems.length} problems:`);
    r.problems.forEach(p => console.log('  ' + p));
    process.exitCode = 1;
  }
}
