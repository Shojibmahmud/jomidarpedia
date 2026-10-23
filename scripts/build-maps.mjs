#!/usr/bin/env node
// Builds the static preview maps (roadmap task 3.8): public/maps/bd.svg, division/<slug>.svg and
// district/<slug>.svg. No tiles: admin outlines from data/geo/bgd.json, plus a pin for every mappable site.
// Runs inside `npm run data`, after build-data.mjs (it reads data/build/divisions.json and districts.json).
//
// Colours are CSS token references (rgb(var(--…))), so a map inlined into a page follows the theme and
// print styles. Pin styles: see pin(). Hidden pins never reach an SVG (R5). Output is byte-identical between runs.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseCsv } from './csv.mjs';
import { isMappable } from './lib/validate.mjs';
import { loadTables } from './lib/structure.mjs';
import { simplify } from './prepare-geo.mjs';

export const MAP_CREDIT = 'Boundaries: geoBoundaries; districts BBS/OCHA, CC BY 3.0 IGO';
export const SIZE_TARGET = { bd: 150 * 1024, area: 30 * 1024 }; // reported, never fatal (NFR-6)

const WIDTH = 600, PAD = 12, CREDIT_BAND = 18;
const PIXEL_TOLERANCE = 0.8; // outline detail finer than this is invisible at the drawn size
const CONDITION_COLOUR = { preserved: 'moss', preserved_adaptive_reuse: 'teal', in_ruins: 'primary', lost: 'lost', unknown: 'unknown' };
const tok = name => `rgb(var(--${name}))`;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Equirectangular with a cos(latitude) correction, fitted to a bounding box.
function projection([lonMin, latMin, lonMax, latMax]) {
  const k = Math.cos(((latMin + latMax) / 2) * Math.PI / 180);
  const scale = (WIDTH - 2 * PAD) / ((lonMax - lonMin) * k);
  const height = Math.round((latMax - latMin) * scale + 2 * PAD + CREDIT_BAND);
  const px = ([lon, lat]) => [+((lon - lonMin) * k * scale + PAD).toFixed(1), +((latMax - lat) * scale + PAD).toFixed(1)];
  return { px, height };
}

function bbox(ringSets, margin) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const rings of ringSets) for (const r of rings) for (const [x, y] of r) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  const m = Math.max(x1 - x0, y1 - y0) * margin;
  return [x0 - m, y0 - m, x1 + m, y1 + m];
}
const overlaps = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];

function path(rings, px) {
  return rings.map(r => {
    // Whole pixels and relative moves keep the files small; outlines need no finer detail.
    const pts = [];
    for (const [x, y] of simplify(r.map(px), PIXEL_TOLERANCE)) {
      const p = [Math.round(x), Math.round(y)];
      if (!pts.length || pts.at(-1)[0] !== p[0] || pts.at(-1)[1] !== p[1]) pts.push(p);
    }
    if (pts.length < 3) return '';
    const rel = pts.slice(1).map((p, i) => `${p[0] - pts[i][0]} ${p[1] - pts[i][1]}`.replace(/ -/g, '-'));
    return `M${pts[0].join(' ')}l${rel.join(' ').replace(/ -/g, '-')}z`;
  }).join('');
}

// Pins as on the "Design system · components" board: confirmed = filled, one source = outlined,
// approximate = hatched, all in the condition colour; a gold "?" badge marks flagged and unverified (O9).
function pin(site, px, r, key) {
  const [x, y] = px([site.lon, site.lat]);
  const c = CONDITION_COLOUR[site.condition] ?? 'unknown';
  const colour = tok(c);
  const fill = site.status === 'verified' ? colour : site.status === 'approximate' ? `url(#${key}-hatch-${c})` : tok('surface');
  const parts = [`<g data-site-id="${esc(site.id)}" data-location="${esc(site.status)}"><title>${esc(site.name)}</title>`,
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${site.status === 'verified' ? tok('surface') : colour}" stroke-width="${site.status === 'verified' ? 1 : 1.75}"/>`];
  if (site.status === 'unverified' || site.flagged) {
    const b = +(r * 0.7).toFixed(1), bx = +(x + r * 0.8).toFixed(1), by = +(y - r * 0.8).toFixed(1);
    parts.push(`<circle cx="${bx}" cy="${by}" r="${b}" fill="${tok('gold-tint')}" stroke="${tok('gold')}" stroke-width="0.75"/>`,
      `<text x="${bx}" y="${+(by + b * 0.55).toFixed(1)}" font-size="${+(b * 1.5).toFixed(1)}" font-weight="700" text-anchor="middle" fill="${tok('gold')}">?</text>`);
  }
  parts.push('</g>');
  return parts.join('');
}

// One hatch pattern per condition colour used by an approximate pin.
const hatches = (key, sites) => [...new Set(sites.filter(s => s.status === 'approximate').map(s => CONDITION_COLOUR[s.condition] ?? 'unknown'))].sort()
  .map(c => `<pattern id="${key}-hatch-${c}" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="3" fill="${tok('surface')}"/><rect width="1.4" height="3" fill="${tok(c)}"/></pattern>`).join('');

// One SVG. context: rings drawn faintly; area: the rings of the place the map is about; inner: borders inside it.
function svg({ key, title, box, context = [], area, inner = [], sites, r }) {
  const { px, height } = projection(box);
  const id = `jp-${key.replace(/[^a-z0-9-]/g, '-')}`;
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${height}" role="img" aria-label="${esc(title)}" data-map="${esc(key)}">`,
    `<title>${esc(title)}</title>`,
    `<defs>${hatches(id, sites)}</defs>`,
    `<rect width="${WIDTH}" height="${height}" fill="${tok('surface-2')}"/>`
  ];
  if (context.length) out.push(`<path d="${context.map(c => path(c, px)).join('')}" fill="${tok('map-land')}" fill-opacity="0.55" stroke="${tok('line')}" stroke-width="0.75" fill-rule="evenodd"/>`);
  out.push(`<path d="${path(area, px)}" fill="${tok('map-land')}" stroke="${tok('line-strong')}" stroke-width="1.5" fill-rule="evenodd"/>`);
  if (inner.length) out.push(`<path d="${inner.map(c => path(c, px)).join('')}" fill="none" stroke="${tok('line')}" stroke-width="0.75"/>`);
  for (const s of sites) out.push(pin(s, px, r, id));
  out.push(`<text x="${WIDTH - PAD}" y="${height - 6}" font-size="10" text-anchor="end" fill="${tok('muted')}">${esc(MAP_CREDIT)}</text>`, '</svg>');
  return out.join('\n') + '\n';
}

/** @param {{ csvDir?: string, buildDir?: string, geoDir?: string, outDir?: string }} [options] */
export function buildMaps({ csvDir = 'data/csv', buildDir = 'data/build', geoDir = 'data/geo', outDir = 'public/maps' } = {}) {
  const result = { name: 'build-maps', structural: [], gates: [], editorial: {}, warnings: [], info: [], outputs: [outDir] };
  const divisionsPath = join(buildDir, 'divisions.json'), districtsPath = join(buildDir, 'districts.json');
  if (!existsSync(divisionsPath) || !existsSync(districtsPath)) {
    rmSync(outDir, { recursive: true, force: true });
    result.info.push('maps: skipped (no data/build output)');
    return result;
  }
  const divisions = JSON.parse(readFileSync(divisionsPath, 'utf8'));
  const districts = JSON.parse(readFileSync(districtsPath, 'utf8'));
  const geo = JSON.parse(readFileSync(join(geoDir, 'bgd.json'), 'utf8'));
  const names = parseCsv(readFileSync(join(geoDir, 'names.csv'), 'utf8')).rows;
  const gbName = new Map(names.map(n => [`${n.level}/${n.slug}`, n.gb_name]));

  // Every division and district needs reviewed geometry (data/geo/names.csv).
  const ringsOf = (level, slug) => {
    const name = gbName.get(`${level}/${slug}`);
    const rings = name && (level === 'division' ? geo.adm1 : geo.adm2)[name];
    if (!rings) result.structural.push({ file: 'data/geo/names.csv', column: 'gb_name', message: `${level} "${slug}" has no boundary geometry`, value: name ?? '' });
    return rings;
  };
  const divRings = new Map(divisions.map(d => [d.slug, ringsOf('division', d.slug)]));
  const distRings = new Map(districts.map(d => [d.slug, ringsOf('district', d.slug)]));
  if (result.structural.length) { rmSync(outDir, { recursive: true, force: true }); return result; }

  // Pins: only sites that pass isMappable, in ID order.
  const { T, errors } = loadTables(csvDir, ['sites']);
  if (errors.length) { result.structural.push(...errors); return result; }
  const districtOf = new Map(districts.flatMap(d => d.siteIds.map(id => [id, d.slug])));
  const pins = T.sites.filter(isMappable).sort((a, b) => a.site_id.localeCompare(b.site_id)).map(s => ({
    id: s.site_id, name: s.name_en, lat: Number(s.latitude), lon: Number(s.longitude), condition: s.condition_category,
    status: s.coordinates_status, flagged: s.map_display === 'show_flagged', district: districtOf.get(s.site_id)
  }));
  const divisionOf = new Map(districts.map(d => [d.slug, d.divisionSlug]));

  const files = [];
  const country = geo.adm0;
  files.push(['bd.svg', 'bd', svg({ key: 'bd', title: `Map of Bangladesh: ${pins.length} sites with a map location`, box: bbox([country], 0.01),
    area: country, inner: [...divRings.values()], sites: pins, r: 3.5 })]);

  for (const d of divisions) {
    const own = districts.filter(x => x.divisionSlug === d.slug).map(x => distRings.get(x.slug));
    const box = bbox([divRings.get(d.slug)], 0.06);
    const context = [...divRings.entries()].filter(([s, r]) => s !== d.slug && overlaps(bbox([r], 0), box)).map(([, r]) => r);
    const sites = pins.filter(p => divisionOf.get(p.district) === d.slug);
    files.push([`division/${d.slug}.svg`, `division-${d.slug}`, svg({ key: `division-${d.slug}`, title: `Map of ${d.en} Division: ${sites.length} sites with a map location`,
      box, context, area: divRings.get(d.slug), inner: own, sites, r: 5 })]);
  }
  for (const d of districts) {
    const box = bbox([distRings.get(d.slug)], 0.12);
    const context = [...distRings.entries()].filter(([s, r]) => s !== d.slug && overlaps(bbox([r], 0), box)).map(([, r]) => r);
    const sites = pins.filter(p => p.district === d.slug);
    files.push([`district/${d.slug}.svg`, `district-${d.slug}`, svg({ key: `district-${d.slug}`, title: `Map of ${d.en} District: ${sites.length} sites with a map location`,
      box, context, area: distRings.get(d.slug), sites, r: 6 })]);
  }

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(outDir, 'division'), { recursive: true });
  mkdirSync(join(outDir, 'district'), { recursive: true });
  let largest = ['', 0];
  for (const [file, key, body] of files) {
    writeFileSync(join(outDir, file), body);
    const bytes = Buffer.byteLength(body);
    const target = key === 'bd' ? SIZE_TARGET.bd : SIZE_TARGET.area;
    if (bytes > target) result.warnings.push(`public/maps/${file} is ${(bytes / 1024).toFixed(1)} KB, over the ${(target / 1024).toFixed(0)} KB target`);
    if (key !== 'bd' && bytes > largest[1]) largest = [file, bytes];
  }
  const bdBytes = Buffer.byteLength(files[0][2]);
  result.counts = { maps: files.length, pins: pins.length };
  result.info.push(`maps             ${files.length} SVGs (bd ${(bdBytes / 1024).toFixed(1)} KB; largest area map ${largest[0]} ${(largest[1] / 1024).toFixed(1)} KB); ${pins.length} pins`);
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { runCli } = await import('./lib/cli.mjs');
  runCli([() => buildMaps()]);
}
