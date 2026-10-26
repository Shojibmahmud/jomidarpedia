// Bangla translations of public prose (spec 14, Phase 11a). One file per source table in data/translations/bn/,
// with the columns key, column, bn, status, en_hash. A translation is used only while en_hash matches the
// current English (FR-4, FR-6); otherwise the English shows. Nothing here fails a build except a malformed
// file (FR-5): gaps are reported, never fatal (FR-8).

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCsv, LINE } from '../csv.mjs';
import { internalTerm } from './internal-terms.mjs';
import { rowKey } from './structure.mjs';
import { isMappable, list } from './validate.mjs';
import { BARE_UNKNOWN, BOILERPLATE_ALT, isPlaceholderEvent, isReadyImage } from './rules.mjs';

export const TRANSLATIONS_DIR = 'data/translations/bn';
export const COLUMNS = ['key', 'column', 'bn', 'status', 'en_hash'];
export const STATUSES = ['draft', 'reviewed'];

// The columns that may be translated: public prose only (spec 14 §6). Batches set drafting order, not validity.
export const ALLOW = {
  sites: ['short_description', 'established_era', 'founder_or_family', 'architectural_style', 'preservation_status', 'coordinates_note', 'unverified_fields'],
  visitor_info: ['opening_hours', 'hours_note', 'weekly_closing_days', 'entry_fee_note', 'restrictions_and_permissions', 'photography_rules',
    'facilities', 'accessibility', 'best_time_to_visit'],
  travel_routes: ['route_description', 'last_mile', 'cost_basis'],
  history_events: ['description', 'date_text'],
  itineraries: ['title', 'planning_notes'],
  itinerary_stops: ['stop_name', 'notes'],
  claims: ['claim_text'],
  costs: ['basis_and_assumptions'],
  legends: ['narrative'],
  images: ['caption_alt_text'],
  site_relationships: ['note']
};
// Rows whose cell no page shows are left out of the work and the coverage (fact claims, placeholder events,
// unpublished photos). A translation for one is an orphan.
const SHOWN = {
  'claims.claim_text': r => r.claim_type === 'conflict',
  'history_events.description': r => !isPlaceholderEvent(r.description),
  'history_events.date_text': r => !isPlaceholderEvent(r.description) && !r.year_start && r.date_text.length <= 30,
  'images.caption_alt_text': r => isReadyImage(r) && !BOILERPLATE_ALT.test(r.caption_alt_text),
  'itinerary_stops.stop_name': r => !r.site_id,               // a site stop shows the site's own names
  'sites.coordinates_note': r => isMappable(r),               // a hidden pin's note is never published (R5)
  'sites.unverified_fields': r => list(r.unverified_fields).some(f => !BARE_FIELD.test(f)), // bare names have Bangla labels
  'travel_routes.cost_basis': r => r.cost_basis !== 'Not estimated separately',
  'visitor_info.entry_fee_note': r => Number(r.entry_fee_bdt) > 0  // shown only beside a known fee
};
// A bare field name in unverified_fields ("history.founder"); scripts/build-data.mjs labels these in both languages.
export const BARE_FIELD = /^[a-z_]+(?:\.[a-z_]+)*$/;
export const BATCH_1 = ['sites', 'visitor_info', 'travel_routes', 'history_events', 'itineraries', 'itinerary_stops'];

/** The English fingerprint (FR-4): LF line endings, NFC, trimmed; the first 12 hex digits of SHA-256. */
export function enHash(text) {
  const norm = String(text ?? '').replace(/\r\n?/g, '\n').normalize('NFC').trim();
  return createHash('sha256').update(norm, 'utf8').digest('hex').slice(0, 12);
}

// Splits that must give the same number of parts in both languages (A-3); a mismatch makes the translation invalid.
export const ROUTE_STEPS = /\s*->\s*/;
export const VERSUS = /\s+(?:vs\.?|বনাম)\s+/;
// The site never says entry is free (R6, scripts/lib/checks.mjs FREE_ENTRY); the same holds in Bangla.
export const FREE_BN = /বিনা\s*মূল্যে|বিনামূল্যে|ফ্রি|প্রবেশ\s*ফি\s*নেই/;
const parts = (text, re) => text.split(re).filter(Boolean).length;
const SHAPE = {
  'travel_routes.route_description': (en, bn) => parts(en, ROUTE_STEPS) === parts(bn, ROUTE_STEPS) || 'route steps (->) differ from the English',
  'sites.unverified_fields': (en, bn) => list(en).length === list(bn).length || 'item count (;) differs from the English',
  'claims.claim_text': (en, bn) => parts(en, VERSUS) === parts(bn, VERSUS) || 'versions (vs) differ from the English'
};

/**
 * @typedef {{ file: string, line: number, column?: string, value?: string, message: string }} TranslationError
 * @typedef {{ table: string, key: string, column: string, en?: string, bn?: string, status?: string, line?: number,
 *   state: 'reviewed' | 'draft' | 'outdated' | 'invalid' | 'missing' | 'orphan', reason?: string, site?: string, trip?: string }} Cell
 */

/**
 * Reads data/translations/bn/*.csv and checks it against the loaded tables.
 * Returns structural errors (FR-5), a lookup for valid translations and the per-cell states for the report.
 * @param {object} T the source tables (table name → rows), as loaded by loadTables
 * @returns {{ errors: TranslationError[], cells: Cell[], orphans: Cell[], lookup: (table: string, row: any, column: string) => { bn: string, draft: boolean } | undefined }}
 */
export function loadTranslations(T, dir = TRANSLATIONS_DIR) {
  /** @type {TranslationError[]} */
  const errors = [];
  const entries = [];
  const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.csv')).sort() : [];
  for (const file of files) {
    const table = file.slice(0, -4);
    const where = `translations/bn/${file}`;
    if (!ALLOW[table]) { errors.push({ file: where, line: 0, message: `"${table}" is not a table with translatable columns` }); continue; }
    const text = readFileSync(join(dir, file), 'utf8');
    const { rows, errors: e } = parseCsv(text);
    e.forEach(x => errors.push({ file: where, ...x }));
    const header = text.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0].split(',').map(h => h.trim());
    const missing = COLUMNS.filter(c => !header.includes(c));
    if (missing.length) { missing.forEach(c => errors.push({ file: where, line: 1, column: c, message: 'required column is missing' })); continue; }
    const seen = new Set();
    for (const r of rows) {
      const err = (column, message) => errors.push({ file: where, line: r[LINE], column, value: r[column], message });
      if (!ALLOW[table].includes(r.column)) err('column', `not a translatable column of ${table}`);
      if (!STATUSES.includes(r.status)) err('status', `must be ${STATUSES.join(' or ')}`);
      if (!/^[0-9a-f]{12}$/.test(r.en_hash)) err('en_hash', 'must be 12 lower-case hex digits');
      const id = `${r.key}\u0000${r.column}`;
      if (seen.has(id)) err('key', `${r.key} / ${r.column} appears more than once`);
      seen.add(id);
      entries.push({ table, key: r.key, column: r.column, bn: r.bn, status: r.status, enHash: r.en_hash, line: r[LINE] });
    }
  }
  return { errors, ...resolve(T, errors.length ? [] : entries) };
}

// Matches entries to rows and decides each one's state: reviewed | draft | outdated | invalid | orphan.
function resolve(T, entries) {
  const byCell = new Map(entries.map(e => [`${e.table}\u0000${e.key}\u0000${e.column}`, e]));
  const cells = [];   // every allow-listed cell with English text, with its state (missing when no entry)
  const used = new Set();
  const valid = new Map();
  for (const [table, columns] of Object.entries(ALLOW)) {
    for (const row of T[table] ?? []) {
      const key = rowKey(table, row);
      for (const column of columns) {
        const en = row[column] ?? '';
        // The contract's "Not documented" is an interface string (FR-13), so a bare unknown is no work.
        if (!en.trim() || BARE_UNKNOWN.test(en.trim()) || SHOWN[`${table}.${column}`]?.(row) === false) continue;
        const id = `${table}\u0000${key}\u0000${column}`;
        const e = byCell.get(id);
        // The page that shows the cell, for the review page's links.
        const page = row.site_id ? { site: row.site_id } : row.itinerary_id ? { trip: row.itinerary_id } : {};
        const cell = { table, key, column, en, state: 'missing', ...page };
        if (e) {
          used.add(id);
          Object.assign(cell, { bn: e.bn, status: e.status, line: e.line });
          const shape = SHAPE[`${table}.${column}`]?.(en, e.bn);
          if (!e.bn.trim()) cell.state = 'missing';
          else if (e.enHash !== enHash(en)) cell.state = 'outdated';
          else if (internalTerm(e.bn)) Object.assign(cell, { state: 'invalid', reason: `internal-note term "${internalTerm(e.bn).term}"` });
          else if (FREE_BN.test(e.bn)) Object.assign(cell, { state: 'invalid', reason: `says entry is free ("${e.bn.match(FREE_BN)[0]}")` });
          else if (typeof shape === 'string') Object.assign(cell, { state: 'invalid', reason: shape });
          else { cell.state = e.status; valid.set(id, { bn: e.bn, draft: e.status === 'draft' }); }
        }
        cells.push(cell);
      }
    }
  }
  const orphans = entries.filter(e => !used.has(`${e.table}\u0000${e.key}\u0000${e.column}`))
    .map(e => ({ table: e.table, key: e.key, column: e.column, bn: e.bn, line: e.line, state: 'orphan' }));
  /** The valid translation of a cell, or undefined. */
  const lookup = (table, row, column) => valid.get(`${table}\u0000${rowKey(table, row)}\u0000${column}`);
  return { lookup, cells, orphans };
}

/**
 * A per-page tracker (FR-10): `bn(table, row, column)` returns the Bangla for a cell, and, when the page
 * shows that cell (`shown`), records whether the page uses a draft or falls back to English.
 */
export function pageTracker(lookup) {
  const state = { draft: false, english: false };
  const bn = (table, row, column, shown = true) => {
    if (!row || !(row[column] ?? '').trim()) return undefined;
    const t = lookup(table, row, column);
    if (shown && !t) state.english = true;
    if (shown && t?.draft) state.draft = true;
    return t?.bn;
  };
  return { bn, state };
}

/** Coverage and problem lists for the report (FR-26). */
export function translationReport({ cells, orphans }) {
  const tally = new Map();
  for (const c of cells) {
    const id = `${c.table}.${c.column}`;
    if (!tally.has(id)) tally.set(id, { reviewed: 0, draft: 0, outdated: 0, invalid: 0, missing: 0 });
    tally.get(id)[c.state]++;
  }
  const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '–');
  const lines = [...tally].sort(([a], [b]) => a.localeCompare(b)).map(([id, t]) => {
    const total = Object.values(t).reduce((a, b) => a + b, 0);
    return `${id}: ${pct(t.reviewed + t.draft, total)} translated (${t.reviewed} reviewed, ${t.draft} draft, ${t.missing} missing, ${t.outdated} outdated, ${t.invalid} invalid) of ${total}`;
  });
  const all = cells.length, done = cells.filter(c => c.state === 'reviewed' || c.state === 'draft').length;
  const listOf = (state, extra = () => '') => {
    const xs = [...cells, ...orphans].filter(c => c.state === state);
    return xs.length ? xs.map(c => `${c.table} / ${c.key} / ${c.column}${extra(c)}`) : ['none'];
  };
  return [
    { title: 'Bangla translation: coverage', lines: [`all columns: ${pct(done, all)} translated (${done} of ${all} cells)`, ...lines] },
    { title: 'Bangla translation: outdated (the English changed; the English shows until re-translated)', lines: listOf('outdated') },
    { title: 'Bangla translation: invalid (the English shows)', lines: listOf('invalid', c => `: ${c.reason}`) },
    { title: 'Bangla translation: orphans (no matching row or no English; ignored)', lines: listOf('orphan') }
  ];
}
