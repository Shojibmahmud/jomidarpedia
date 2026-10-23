// Thumbnail check (roadmap task 3.6), run by `npm run data` after build-data.mjs. Fatal in every mode:
// - every /thumbs/<id>.webp referenced in data/build/** or index.json (img.id) exists in public/thumbs/;
// - public/thumbs/ holds no .webp outside the Ready set (credits.json), since any file there is published (R4).
// It never reads the originals (JP_IMAGES_DIR), so a fresh clone passes on the committed thumbnails.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { strings } from './checks.mjs';

const THUMB = /^\/thumbs\/([^/]+)\.webp$/;

function* jsonFiles(dir) {
  for (const f of readdirSync(dir).sort()) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* jsonFiles(p);
    else if (f.endsWith('.json')) yield p;
  }
}

/** @param {{ buildDir?: string, indexPath?: string, thumbsDir?: string }} [options] */
export function checkThumbs({ buildDir = 'data/build', indexPath = 'public/data/index.json', thumbsDir = 'public/thumbs' } = {}) {
  const result = { name: 'thumbs', structural: [], gates: [], editorial: {}, warnings: [], info: [], outputs: [] };
  const creditsPath = join(buildDir, 'credits.json');
  if (!existsSync(creditsPath)) { result.info.push('thumbs: skipped (no data/build output)'); return result; }

  const ready = new Set(JSON.parse(readFileSync(creditsPath, 'utf8')).map(c => c.imageId));
  const onDisk = new Set(existsSync(thumbsDir) ? readdirSync(thumbsDir).filter(f => f.endsWith('.webp')).map(f => f.slice(0, -5)) : []);

  // First file that refers to each thumbnail, for the message.
  const referenced = new Map();
  for (const file of jsonFiles(buildDir)) {
    for (const [, s] of strings(JSON.parse(readFileSync(file, 'utf8')))) {
      const m = THUMB.exec(s);
      if (m && !referenced.has(m[1])) referenced.set(m[1], relative('.', file));
    }
  }
  if (existsSync(indexPath)) {
    for (const row of JSON.parse(readFileSync(indexPath, 'utf8'))) {
      if (row.img?.id && !referenced.has(row.img.id)) referenced.set(row.img.id, `${relative('.', indexPath)} ${row.i}`);
    }
  }

  for (const [id, file] of [...referenced].sort(([a], [b]) => a.localeCompare(b))) {
    if (!onDisk.has(id)) result.gates.push(`${file}: thumbnail /thumbs/${id}.webp is missing from ${thumbsDir}/ (run npm run thumbs)`);
  }
  for (const id of [...onDisk].sort()) {
    if (!ready.has(id)) result.gates.push(`${thumbsDir}/${id}.webp is not a Ready image and must not be published (run npm run thumbs)`);
  }
  result.counts = { thumbs: onDisk.size, referenced: referenced.size };
  result.info.push(`thumbs           ${onDisk.size} in ${thumbsDir}/; ${referenced.size} referenced`);
  return result;
}
