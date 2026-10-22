// Combines builder results into data/reports/release-problems.md and one pass/fail decision.
// The report has no timestamps, so two runs on the same data write the same bytes.

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { editorialIsFatal } from '../data-mode.mjs';
import { formatStructural } from './structure.mjs';

export const REPORT_PATH = 'data/reports/release-problems.md';

const EDITORIAL = {
  notes: 'Internal notes in public text',
  credits: 'Credit lines not in the standard form',
  unclassified: 'Sites with type "unclassified"',
  planStatus: 'Itineraries without a reviewed plan_status',
  closedDays: 'Sites without reviewed closed_days'
};

const cellId = c => `${c.table} / ${c.key}${c.column ? ` / ${c.column}` : ''}`;
const byCell = (a, b) => cellId(a).localeCompare(cellId(b));
const excerpt = (v, max = 200) => v.replace(/\s+/g, ' ').slice(0, max) + (v.length > max ? '…' : '');

// results: what buildData and buildIndex return. Cells from several builders are merged.
export function combine(results, mode) {
  const structural = [...new Set(results.flatMap(r => r.structural.map(formatStructural)))];
  const gates = results.flatMap(r => r.gates);
  const warnings = [...new Set(results.flatMap(r => r.warnings))];
  const editorial = {};
  for (const kind of Object.keys(EDITORIAL)) {
    const merged = new Map();
    for (const c of results.flatMap(r => r.editorial?.[kind] ?? [])) {
      const id = cellId(c);
      if (!merged.has(id)) merged.set(id, { ...c, outputs: [] });
      merged.get(id).outputs.push(...c.outputs);
    }
    editorial[kind] = [...merged.values()].map(c => ({ ...c, outputs: [...new Set(c.outputs)].sort() })).sort(byCell);
  }
  const unpublished = Math.max(0, ...results.map(r => r.editorial?.unpublishedNotes ?? 0));
  const cells = Object.values(editorial).reduce((n, cs) => n + cs.filter(c => c.table !== '(generated)').length, 0);
  // Distinct output locations: one output string traced to two cells counts once.
  const occurrences = new Set(editorial.notes.flatMap(c => c.outputs)).size;
  const editorialCount = Object.values(editorial).reduce((n, cs) => n + cs.length, 0);
  const fatal = structural.length > 0 || gates.length > 0 || (editorialIsFatal(mode) && editorialCount > 0);
  const notes = results.flatMap(r => r.notes ?? []);
  return { mode, fatal, structural, gates, editorial, warnings, cells, occurrences, unpublished, editorialCount, notes };
}

export function summaryLine(c) {
  return `${c.cells} cells to edit, ${c.occurrences} output occurrences; ${c.structural.length} structural errors; ` +
    `${c.gates.length} safety-rule failures; ${c.warnings.length} warnings`;
}

export function formatReport(c) {
  const out = ['# Release problems', ''];
  const verdict = c.fatal ? 'FAILED' : c.editorialCount ? 'passed (editorial problems would fail a release build)' : 'passed';
  out.push(`Mode: **${c.mode}**. Result: **${verdict}**.`, '', `Summary: ${summaryLine(c)}.`, '');
  out.push('Structural errors and safety rules fail every mode. Editorial problems fail only release builds.', '');

  out.push(`## Structural errors (${c.structural.length})`, '');
  c.structural.forEach(s => out.push(`- ${s}`));
  if (!c.structural.length) out.push('None.');
  out.push('', `## Safety rules (${c.gates.length})`, '');
  c.gates.forEach(s => out.push(`- ${s}`));
  if (!c.gates.length) out.push('None.');

  out.push('', `## Editorial problems (${c.editorialCount} cells)`, '');
  for (const [kind, title] of Object.entries(EDITORIAL)) {
    const cells = c.editorial[kind];
    const occ = new Set(cells.flatMap(x => x.outputs)).size;
    const generated = cells.filter(x => x.table === '(generated)').length;
    out.push(`### ${title}: ${cells.length - generated} cells${generated ? ` and ${generated} generated text${generated === 1 ? '' : 's'}` : ''}, ${occ} output occurrences`, '');
    if (kind === 'notes' && c.unpublished) out.push(`${c.unpublished} more flagged cells never reach the output (internal columns, or text the build does not publish); they need no edit.`, '');
    for (const x of cells) {
      out.push(`#### ${cellId(x)}${x.line ? ` (line ${x.line})` : ''}${x.term ? ` [${x.term}]` : ''}`, '', `> ${excerpt(x.value)}`, '');
      x.outputs.forEach(o => out.push(`- ${o}`));
      out.push('');
    }
    if (!cells.length) out.push('None.', '');
  }
  out.push(`## Warnings (${c.warnings.length})`, '', 'These never fail a build.', '');
  c.warnings.forEach(w => out.push(`- ${w}`));
  if (c.notes.length) {
    out.push('', '## Build notes', '', 'Counts and suggestions for the editor. They never fail a build.');
    for (const n of c.notes) { out.push('', `### ${n.title}`, ''); n.lines.forEach(l => out.push(`- ${l}`)); }
  }
  return out.join('\n') + '\n';
}

// A structural error in any table invalidates every builder's output, so all of it is removed.
export function discardOutputs(results) {
  for (const p of results.flatMap(r => r.outputs ?? [])) rmSync(p, { recursive: true, force: true });
}

export function writeReport(c, path = REPORT_PATH) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, formatReport(c));
}

// Console output: everything fatal in full, editorial problems as counts (the report has the detail).
export function printSummary(c, path = REPORT_PATH) {
  if (c.structural.length) { console.log(`\nFAIL: ${c.structural.length} structural errors:`); c.structural.forEach(s => console.log('  ' + s)); }
  if (c.gates.length) { console.log(`\nFAIL: ${c.gates.length} safety-rule failures:`); c.gates.forEach(s => console.log('  ' + s)); }
  for (const [kind, title] of Object.entries(EDITORIAL)) if (c.editorial[kind].length) console.log(`${editorialIsFatal(c.mode) ? 'FAIL' : 'editorial'}: ${title}: ${c.editorial[kind].length} cells`);
  if (c.warnings.length) console.log(`${c.warnings.length} warnings (build continues)`);
  console.log(`\nmode ${c.mode}: ${summaryLine(c)}`);
  console.log(`report: ${path}`);
  console.log(c.fatal ? 'Build failed.' : 'Data checks passed.');
}
