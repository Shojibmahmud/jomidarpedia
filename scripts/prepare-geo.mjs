#!/usr/bin/env node
// One-off maintenance step (roadmap task 3.8): turns the downloaded geoBoundaries files into the small,
// committed data/geo/bgd.json that scripts/build-maps.mjs reads. Not part of any build.
//
// Usage: node scripts/prepare-geo.mjs <ADM0.geojson> <ADM1.geojson> <ADM2.geojson> [out.json]
// Source, release and licences: data/geo/SOURCE.md. No dependencies.

import { readFileSync, writeFileSync } from 'node:fs';

export const TOLERANCE = 0.004;   // degrees, about 400 m: invisible at teaser size
export const MIN_AREA = 0.0004;   // square degrees, about 4 km²: smaller islands and slivers are dropped
export const DECIMALS = 3;        // about 110 m

// Douglas–Peucker on one ring (first point equals last).
export function simplify(points, tol) {
  if (points.length <= 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a], [bx, by] = points[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    let max = 0, at = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const d = len ? Math.abs(dy * px - dx * py + bx * ay - by * ax) / len : Math.hypot(px - ax, py - ay);
      if (d > max) { max = d; at = i; }
    }
    if (max > tol) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return points.filter((_, i) => keep[i]);
}

const area = ring => Math.abs(ring.reduce((s, [x1, y1], i) => {
  const [x2, y2] = ring[(i + 1) % ring.length];
  return s + x1 * y2 - x2 * y1;
}, 0)) / 2;

const round = v => Number(v.toFixed(DECIMALS));

// A feature's rings (outer rings and holes together; build-maps fills them even-odd).
function rings(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polys.flat()
    .map(r => simplify(r, TOLERANCE).map(([x, y]) => [round(x), round(y)]))
    .filter(r => r.length >= 4 && area(r) >= MIN_AREA);
}

// Misspelt shapeName values in the source, corrected here. Older official spellings (Chittagong,
// Jessore, Comilla …) are not typos; data/geo/names.csv maps those.
export const NAME_FIXES = { Rajshani: 'Rajshahi', Brahamanbaria: 'Brahmanbaria' };

export function prepare(adm0, adm1, adm2) {
  const byName = fc => Object.fromEntries(fc.features
    .map(f => [NAME_FIXES[f.properties.shapeName] ?? f.properties.shapeName, rings(f.geometry)])
    .sort(([a], [b]) => a.localeCompare(b)));
  return { adm0: rings(adm0.features[0].geometry), adm1: byName(adm1), adm2: byName(adm2) };
}

if (process.argv[1]?.endsWith('prepare-geo.mjs')) {
  const [p0, p1, p2, out = 'data/geo/bgd.json'] = process.argv.slice(2);
  if (!p2) { console.error('usage: node scripts/prepare-geo.mjs ADM0.geojson ADM1.geojson ADM2.geojson [out.json]'); process.exit(2); }
  const read = p => JSON.parse(readFileSync(p, 'utf8'));
  const geo = prepare(read(p0), read(p1), read(p2));
  writeFileSync(out, JSON.stringify(geo) + '\n');
  const points = v => (typeof v[0] === 'number' ? 1 : v.reduce((n, x) => n + points(x), 0));
  console.log(`${out}: ${Object.keys(geo.adm1).length} divisions, ${Object.keys(geo.adm2).length} districts, ` +
    `${points([geo.adm0, ...Object.values(geo.adm1), ...Object.values(geo.adm2)])} points`);
}
