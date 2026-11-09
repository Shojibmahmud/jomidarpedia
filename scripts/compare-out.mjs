#!/usr/bin/env node
// `npm run compare:out -- <reference> [<candidate>]`: the fresh-clone check (roadmap task 14.4; spec 16 FR-5, FR-6).
// Compares two build trees, each holding data/build/, public/data/index.json and out/. The reference is usually
// the CI release job's `release-build` artifact, and the candidate (default: this folder) a fresh clone's build.
//   - data/build/** and public/data/index.json: the same files, byte for byte;
//   - out/: the same set of paths, once Next's build ID and hashed chunk names are normalised away;
//     text files (.html .json .txt .xml .csv .md) the same once normalised; any other file the same bytes, except
//     framework code under _next/static (its names carry its hash, so the path set already covers it);
//   - a zip: the same bytes, or the same entries with the same contents (deflate output can differ between
//     zlib builds; spec 16 A-1).
// Exits 1 with a summary (missing and extra paths first, then the first differing line per file) on any difference.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readZip } from './lib/zip.mjs';

const TEXT = new Set(['.html', '.json', '.txt', '.xml', '.csv', '.md']);
const MAX_SHOWN = 20;

function walk(dir) {
  const files = [];
  if (!existsSync(dir)) return files;
  const go = d => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) go(p);
      else files.push(relative(dir, p).split(sep).join('/'));
    }
  };
  go(dir);
  return files.sort();
}

/** Next's build ID: the folder under out/_next/static that is not chunks, css or media. */
export function buildId(outDir) {
  const dir = join(outDir, '_next/static');
  if (!existsSync(dir)) return undefined;
  return readdirSync(dir).find(n => !['chunks', 'css', 'media'].includes(n) && statSync(join(dir, n)).isDirectory());
}

// A hashed file under static/chunks or static/css is all hash: 0cz1d0mv5g_q7.js → #.js. A font under static/media
// keeps its name and loses the hash after it: 08ae2c4e3062689e.2sqz4r3xqg91l.woff2 → 08ae2c4e3062689e.#.woff2.
const HASHED = /(static\/(chunks|css|media)\/)((?:[A-Za-z0-9_-]+\/)*)([A-Za-z0-9_.-]+?)(\.(?:js|css|woff2?|ttf|otf|map|svg|png|jpg|webp))(?![A-Za-z0-9])/g;
const hashPart = (kind, stem) => (kind === 'media' ? stem.replace(/\.[A-Za-z0-9_-]+$/, '.#') : '#');

/** Replaces the build ID and the hashed static names in a path or a text. */
export function normalise(text, id) {
  let out = id ? text.split(id).join('BUILD_ID') : text;
  out = out.replace(HASHED, (_, base, kind, sub, stem, ext) => `${base}${sub}${hashPart(kind, stem)}${ext}`);
  return out;
}

const firstDiff = (a, b) => {
  const la = a.split('\n');
  const lb = b.split('\n');
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) {
      const col = [...(la[i] ?? '')].findIndex((c, j) => c !== [...(lb[i] ?? '')][j]);
      const from = Math.max(0, col - 60);
      return `line ${i + 1}: reference "${(la[i] ?? '').slice(from, from + 160)}" vs candidate "${(lb[i] ?? '').slice(from, from + 160)}"`;
    }
  }
  return 'differs';
};

function zipSame(a, b) {
  if (a.equals(b)) return null;
  const ea = readZip(a);
  const eb = readZip(b);
  const names = x => x.map(e => e.name).join('\n');
  if (names(ea) !== names(eb)) return `different entries: [${ea.map(e => e.name)}] vs [${eb.map(e => e.name)}]`;
  for (let i = 0; i < ea.length; i++) if (!ea[i].data.equals(eb[i].data)) return `${ea[i].name}: ${firstDiff(ea[i].data.toString('utf8'), eb[i].data.toString('utf8'))}`;
  return null;
}

/** @param {string} ref @param {string} [cand] */
export function compareOut(ref, cand = '.') {
  const problems = [];
  const notes = [];
  for (const [label, path] of [['reference', ref], ['candidate', cand]]) {
    for (const need of ['data/build/meta.json', 'public/data/index.json', 'out/index.html']) {
      if (!existsSync(join(path, need))) problems.push(`${label} ${path} has no ${need}: build first, or download the release-build artifact`);
    }
  }
  if (problems.length) return { problems, notes, compared: 0 };

  let compared = 0;
  // 1. data/build/** and index.json, byte for byte.
  const exact = root => [...walk(join(root, 'data/build')).map(f => `data/build/${f}`), 'public/data/index.json'];
  const ra = exact(ref);
  const ca = new Set(exact(cand));
  for (const f of ra) if (!ca.has(f)) problems.push(`missing in candidate: ${f}`);
  for (const f of ca) if (!ra.includes(f)) problems.push(`extra in candidate: ${f}`);
  for (const f of ra.filter(f => ca.has(f))) {
    compared++;
    const a = readFileSync(join(ref, f));
    const b = readFileSync(join(cand, f));
    if (!a.equals(b)) problems.push(`${f}: not byte-identical (${firstDiff(a.toString('utf8'), b.toString('utf8'))})`);
  }

  // 2. out/: the same normalised paths (as a multiset: several chunks normalise to the same name).
  const ida = buildId(join(ref, 'out'));
  const idb = buildId(join(cand, 'out'));
  const group = (root, id) => {
    const m = new Map();
    for (const f of walk(join(root, 'out'))) {
      const k = normalise(f, id);
      m.set(k, [...(m.get(k) ?? []), f]);
    }
    return m;
  };
  const oa = group(ref, ida);
  const ob = group(cand, idb);
  for (const [k, fs] of oa) {
    const n = ob.get(k)?.length ?? 0;
    if (n < fs.length) problems.push(`missing in candidate: out/${k}${fs.length > 1 ? ` (${fs.length - n} of ${fs.length})` : ''}`);
  }
  for (const [k, fs] of ob) {
    const n = oa.get(k)?.length ?? 0;
    if (n < fs.length) problems.push(`extra in candidate: out/${k}${fs.length > 1 ? ` (${fs.length - n} of ${fs.length})` : ''}`);
  }

  // 3. out/ contents, for paths that map one to one.
  for (const [k, fs] of oa) {
    const other = ob.get(k);
    if (fs.length !== 1 || other?.length !== 1) continue;
    if (k.startsWith('_next/static/')) continue;
    compared++;
    const a = readFileSync(join(ref, 'out', fs[0]));
    const b = readFileSync(join(cand, 'out', other[0]));
    const ext = extname(k);
    if (ext === '.zip') {
      const d = zipSame(a, b);
      if (d) problems.push(`out/${k}: ${d}`);
      else if (!a.equals(b)) notes.push(`out/${k}: the bytes differ but every entry is identical (a different zlib build)`);
    } else if (TEXT.has(ext)) {
      const ta = normalise(a.toString('utf8'), ida);
      const tb = normalise(b.toString('utf8'), idb);
      if (ta !== tb) problems.push(`out/${k}: ${firstDiff(ta, tb)}`);
    } else if (!a.equals(b)) problems.push(`out/${k}: not byte-identical`);
  }
  return { problems, notes, compared };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [ref, cand = '.'] = process.argv.slice(2);
  if (!ref) {
    console.log('usage: npm run compare:out -- <reference-dir> [<candidate-dir>]');
    process.exitCode = 2;
  } else {
    const { problems, notes, compared } = compareOut(ref, cand);
    console.log(`compared ${compared} files: reference ${ref}, candidate ${cand}`);
    for (const n of notes) console.log(`note: ${n}`);
    // Missing and extra paths first, then content differences.
    const sorted = [...problems.filter(p => /^(missing|extra) in candidate/.test(p)), ...problems.filter(p => !/^(missing|extra) in candidate/.test(p))];
    for (const p of sorted.slice(0, MAX_SHOWN)) console.log(`  ${p}`);
    if (sorted.length > MAX_SHOWN) console.log(`  … and ${sorted.length - MAX_SHOWN} more`);
    if (problems.length) {
      console.log(`${problems.length} difference(s)`);
      process.exitCode = 1;
    } else console.log('identical (after normalisation)');
  }
}
