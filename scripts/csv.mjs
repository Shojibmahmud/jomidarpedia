// Small RFC 4180 CSV reader shared by build-index.mjs and build-data.mjs (no dependencies).
// Returns { rows, errors }: one object per row, keyed by the trimmed header, values trimmed,
// plus every malformed-input problem found (the reader never stops at the first one).
// Each row carries its starting line number (header = line 1) under the LINE symbol.

export const LINE = Symbol('line');

export function parseCsv(text) {
  const records = [];   // [fields, line]
  const errors = [];
  let row = [], field = '', i = 0, quoted = false, line = 1, rowLine = 1, quoteLine = 0;
  text = text.replace(/^﻿/, '');
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (c === '"') { quoted = false; i++; continue; }
      if (c === '\n') line++;
      if (c !== '\r' || text[i + 1] !== '\n') field += c;
      i++; continue;
    }
    if (c === '"') { quoted = true; quoteLine = line; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); records.push([row, rowLine]); row = []; field = ''; i++; line++; rowLine = line; continue; }
    field += c; i++;
  }
  if (quoted) errors.push({ line: quoteLine, message: 'quote opened here is never closed' });
  if (field !== '' || row.length) { row.push(field); records.push([row, rowLine]); }

  const isBlank = r => r.length === 1 && r[0].trim() === '';
  const [headRec, ...body] = records;
  if (!headRec) return { rows: [], errors };
  const head = headRec[0].map(h => h.trim());
  const seen = new Set();
  head.forEach((h, k) => {
    if (!h) errors.push({ line: 1, message: `header ${k + 1} is empty` });
    else if (seen.has(h)) errors.push({ line: 1, column: h, message: `header "${h}" appears more than once` });
    seen.add(h);
  });

  const rows = [];
  for (const [r, at] of body) {
    if (isBlank(r)) continue;
    if (r.length !== head.length) errors.push({ line: at, message: `has ${r.length} fields; the header has ${head.length}` });
    const obj = Object.fromEntries(head.map((h, k) => [h, (r[k] ?? '').trim()]));
    Object.defineProperty(obj, LINE, { value: at, enumerable: false });
    rows.push(obj);
  }
  return { rows, errors };
}
