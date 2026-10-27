#!/usr/bin/env node
// `npm run bn -- <command>`: the Bangla translation workflow (spec 14 FR-23 to FR-25, A-4, A-5). No dependencies.
//
//   todo <table> [column]         Writes data/translations/todo/<table>[.<column>].json: the cells that are missing,
//                                 outdated or invalid, grouped by identical English text, for drafting.
//   merge <table> <drafts.json>   Merges drafts into data/translations/bn/<table>.csv. A draft is
//                                 { key, column, bn } for one cell, or { en, bn } for every cell of the table with
//                                 exactly that English (A-5). Hashes come from the current English. New and changed
//                                 rows are drafts; a reviewed row stays reviewed unless its Bangla changes.
//   approve <table> [column] [key …]
//                                 Marks drafts reviewed: the named keys, or every draft of the column (FR-25).
//
// Rows are written sorted by key, then column, so diffs stay small and the output is the same on every run.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseCsv } from './csv.mjs';
import { loadTables, validateTables, TABLES, rowKey } from './lib/structure.mjs';
import { ALLOW, COLUMNS, TRANSLATIONS_DIR, enHash, loadTranslations } from './lib/translations.mjs';

export const TODO_DIR = 'data/translations/todo';

const quote = v => (/[",\n\r]/.test(v) || v !== v.trim() ? `"${v.replace(/"/g, '""')}"` : v);
const byKey = (a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.column < b.column ? -1 : a.column > b.column ? 1 : 0);

/** The CSV text of a translation file. */
export function formatTranslations(rows) {
  return [COLUMNS.join(','), ...[...rows].sort(byKey).map(r => COLUMNS.map(c => quote(String(r[c] ?? ''))).join(','))].join('\n') + '\n';
}

function readFile(dir, table) {
  const path = join(dir, `${table}.csv`);
  return existsSync(path) ? parseCsv(readFileSync(path, 'utf8')).rows.map(r => ({ ...r })) : [];
}

function load(csvDir, dir) {
  const { T, errors } = loadTables(csvDir, TABLES);
  const structural = errors.length ? errors : validateTables(T);
  if (structural.length) throw new Error(`data/csv has ${structural.length} structural errors; run npm run data`);
  const tr = loadTranslations(T, dir);
  if (tr.errors.length) throw new Error(`translation files have errors: ${tr.errors.map(e => `${e.file}:${e.line} ${e.message}`).join('; ')}`);
  return { T, tr };
}

const checkTable = table => { if (!ALLOW[table]) throw new Error(`"${table}" has no translatable columns (${Object.keys(ALLOW).join(', ')})`); };
const checkColumn = (table, column) => { if (column && !ALLOW[table].includes(column)) throw new Error(`"${column}" is not a translatable column of ${table}`); };

/** The cells still to translate, grouped by identical English. */
export function todo({ table, column, csvDir = 'data/csv', dir = TRANSLATIONS_DIR }) {
  checkTable(table); checkColumn(table, column);
  const { tr } = load(csvDir, dir);
  const groups = new Map();
  for (const c of tr.cells) {
    if (c.table !== table || (column && c.column !== column) || !['missing', 'outdated', 'invalid'].includes(c.state)) continue;
    if (!groups.has(c.en)) groups.set(c.en, { en: c.en, cells: [] });
    groups.get(c.en).cells.push({ key: c.key, column: c.column, state: c.state, ...(c.reason && { reason: c.reason }), ...(c.bn && { previous: c.bn }) });
  }
  return [...groups.values()];
}

/** Merges drafts into the table's translation rows. Returns the rows and what changed. */
export function merge({ table, drafts, csvDir = 'data/csv', dir = TRANSLATIONS_DIR }) {
  checkTable(table);
  const { T, tr } = load(csvDir, dir);
  const rowsByKey = new Map(T[table].map(r => [rowKey(table, r), r]));
  // An { en, bn } draft fills only the cells a page shows (the work list's cells), never hidden ones.
  const byEnglish = new Map();
  for (const c of tr.cells) {
    if (c.table !== table) continue;
    const k = c.en.trim();
    if (!byEnglish.has(k)) byEnglish.set(k, []);
    byEnglish.get(k).push({ key: c.key, column: c.column });
  }
  const existing = new Map(readFile(dir, table).map(r => [`${r.key}\u0000${r.column}`, r]));
  const counts = { added: 0, changed: 0, unchanged: 0 };
  const problems = [];
  const put = (key, column, bn) => {
    checkColumn(table, column);
    const row = rowsByKey.get(key);
    if (!row) { problems.push(`${key} / ${column}: no such row in ${table}`); return; }
    if (!(row[column] ?? '').trim()) { problems.push(`${key} / ${column}: the English is empty`); return; }
    bn = String(bn ?? '').replace(/\r\n?/g, '\n').trim();
    if (!bn) { problems.push(`${key} / ${column}: empty Bangla`); return; }
    const id = `${key}\u0000${column}`;
    const prev = existing.get(id);
    const en_hash = enHash(row[column]);
    if (prev && prev.bn === bn && prev.en_hash === en_hash) { counts.unchanged++; return; }
    existing.set(id, { key, column, bn, status: prev && prev.bn === bn ? prev.status : 'draft', en_hash });
    counts[prev ? 'changed' : 'added']++;
  };
  for (const d of drafts) {
    if (d.key) put(d.key, d.column, d.bn);
    else if (d.en !== undefined) {
      const cells = byEnglish.get(String(d.en).trim());
      if (!cells) problems.push(`no ${table} cell has the English "${String(d.en).slice(0, 60)}…"`);
      else cells.forEach(c => put(c.key, c.column, d.bn));
    } else problems.push(`a draft without key or en: ${JSON.stringify(d).slice(0, 80)}`);
  }
  return { rows: [...existing.values()], counts, problems };
}

/** Marks drafts reviewed: the named keys, or every draft in the column. */
export function approve({ table, column, keys = [], dir = TRANSLATIONS_DIR }) {
  checkTable(table); checkColumn(table, column);
  const rows = readFile(dir, table);
  let n = 0;
  for (const r of rows) {
    if (r.status !== 'draft' || (column && r.column !== column) || (keys.length && !keys.includes(r.key))) continue;
    r.status = 'reviewed';
    n++;
  }
  return { rows, approved: n };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [command, table, ...rest] = process.argv.slice(2);
  const save = rows => { mkdirSync(TRANSLATIONS_DIR, { recursive: true }); writeFileSync(join(TRANSLATIONS_DIR, `${table}.csv`), formatTranslations(rows)); };
  try {
    if (command === 'todo') {
      const [column] = rest;
      const groups = todo({ table, column });
      mkdirSync(TODO_DIR, { recursive: true });
      const out = join(TODO_DIR, `${table}${column ? `.${column}` : ''}.json`);
      writeFileSync(out, JSON.stringify(groups, null, 1) + '\n');
      console.log(`${out}: ${groups.reduce((n, g) => n + g.cells.length, 0)} cells, ${groups.length} distinct English texts`);
    } else if (command === 'merge') {
      const { rows, counts, problems } = merge({ table, drafts: JSON.parse(readFileSync(rest[0], 'utf8')) });
      problems.forEach(p => console.log(`skipped: ${p}`));
      save(rows);
      console.log(`${table}: ${counts.added} added, ${counts.changed} changed, ${counts.unchanged} unchanged (${rows.length} rows)`);
      if (problems.length) process.exitCode = 1;
    } else if (command === 'approve') {
      const column = rest[0] && ALLOW[table]?.includes(rest[0]) ? rest[0] : undefined;
      const { rows, approved } = approve({ table, column, keys: column ? rest.slice(1) : rest });
      save(rows);
      console.log(`${table}: ${approved} rows marked reviewed`);
    } else {
      console.log('usage: npm run bn -- todo <table> [column] | merge <table> <drafts.json> | approve <table> [column] [key …]');
      process.exitCode = 1;
    }
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
