// Checks run on the builders' own output, after it is generated (roadmap tasks 1.8, 1.10, 1.11).

import { LINE } from '../csv.mjs';
import { COORD_PAIR } from './validate.mjs';
import { internalTerm } from './internal-terms.mjs';
import { rowKey } from './structure.mjs';

// Every string in a value, with its JSON path.
export function* strings(value, path = '') {
  if (typeof value === 'string') yield [path, value];
  else if (Array.isArray(value)) for (let k = 0; k < value.length; k++) yield* strings(value[k], `${path}[${k}]`);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) yield* strings(v, path ? `${path}.${k}` : k);
}

// Fee meaning: nothing may tell a visitor that entry is free.
export const FREE_ENTRY = /\bfree\s+entry\b|\bentry\s*:\s*free\b/i;
// In a fee or budget field, a known amount must be a real price: never 0 and never "free".
export const ZERO_OR_FREE = /^(tk\s*)?0+(\.0+)?\b|\bfree\b/i;

// outputs: [{ file, id, value }], where id is the record's own ID (site, trip, source, image or area).
// Returns the strings that carry an internal term, and the free-entry phrases.
export function scanOutputs(outputs) {
  const notes = [], freeEntry = [];
  for (const { file, id, value } of outputs) {
    for (const [path, s] of strings(value)) {
      const hit = internalTerm(s);
      if (hit) notes.push({ file, id, path, value: s, term: hit.term });
      if (FREE_ENTRY.test(s)) freeEntry.push(`${file} ${path}: says "${s.match(FREE_ENTRY)[0]}"`);
    }
  }
  return { notes, freeEntry };
}

// A hidden site's output must carry no coordinates: no lat/lon fields and no coordinate pair in any URL.
export function coordinateLeaks(file, value, latlonKeys) {
  const leaks = [];
  for (const k of latlonKeys) if (value[k] !== undefined) leaks.push(`${file}: hidden site has "${k}"`);
  for (const [path, s] of strings(value)) if (/^https?:|^geo:/i.test(s) && COORD_PAIR.test(s)) leaks.push(`${file} ${path}: hidden site's URL carries coordinates`);
  return leaks;
}

// The IDs a CSV row belongs to, used to trace an output back to its own row.
const ID_COLUMNS = ['site_id', 'source_id', 'claim_id', 'itinerary_id', 'image_id', 'relation_id', 'anchor_site_id'];
const rowIds = r => new Set(ID_COLUMNS.map(k => r[k]).filter(Boolean));
// Internal columns that never reach the output (roadmap I7), so no output is traced to them.
export const NEVER_PUBLISHED = {
  site_sources: ['citation_note'], sources: ['local_path'], images: ['identity_verification', 'license_evidence', 'notes']
};

// Groups flagged output strings by the CSV cell they came from (table, row ID, column).
// A string is traced to a flagged cell when one contains the other. When several cells match (the same
// wording is often repeated across sites), the cells in rows of the output's own record win, and an
// exact match wins over a cell that merely contains the string.
// Strings that match no cell are generated text and are grouped under their output path instead.
export function notesByCell(T, notes) {
  const cells = [];
  const idsOf = new Map();
  let unpublished = 0;
  for (const [table, rows] of Object.entries(T)) {
    for (const r of rows) for (const [column, v] of Object.entries(r)) {
      const hit = internalTerm(v);
      if (hit && NEVER_PUBLISHED[table]?.includes(column)) { unpublished++; continue; }
      if (!hit) continue;
      const c = { table, key: rowKey(table, r), column, line: r[LINE], value: v, term: hit.term, outputs: [] };
      cells.push(c);
      idsOf.set(c, rowIds(r));
    }
  }
  const generated = new Map();
  for (const n of notes) {
    const all = cells.filter(c => c.value.includes(n.value) || n.value.includes(c.value));
    const self = all.filter(c => c.key === n.id);
    const own = all.filter(c => idsOf.get(c).has(n.id));
    const exact = cs => cs.filter(c => c.value === n.value);
    const from = [exact(self), exact(own), self, own, exact(all), all].find(cs => cs.length) ?? [];
    if (from.length) from.forEach(c => c.outputs.push(`${n.file} ${n.path}`));
    else {
      const k = `${n.file.split('/')[0]} ${n.path.replace(/\[\d+\]/g, '[]')}`;
      if (!generated.has(k)) generated.set(k, { table: '(generated)', key: k, column: '', line: 0, value: n.value, term: n.term, outputs: [] });
      generated.get(k).outputs.push(`${n.file} ${n.path}`);
    }
  }
  const published = cells.filter(c => c.outputs.length);
  return { cells: [...published, ...generated.values()], unpublished: unpublished + cells.length - published.length };
}
