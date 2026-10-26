// Bangla prose (spec 14): translation files, the build's Bangla siblings and page state, the report, the
// todo/merge/approve script, Bangla founder search and the page note. AC-1 to AC-5, AC-9, AC-11, AC-12.
import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import Fuse from 'fuse.js';
import { approve, formatTranslations, merge, todo } from '../scripts/bn.mjs';
import { enHash, loadTranslations } from '../scripts/lib/translations.mjs';
import { loadTables, TABLES } from '../scripts/lib/structure.mjs';
import { Prose } from '@/components/T';
import { bnNoteKey, ProseNote } from '@/components/shell/ProseNote';
import { createMatcher } from '@/lib/search';
import type { IndexSite } from '@/lib/types';
import { fixtureDir, readJson, readTable, report, reportText, runBuilders, translationsDirOf } from './helpers';

type Row = { key: string; column: string; bn: string; status?: string; en_hash?: string };

/** Writes a translation file for a fixture; en_hash defaults to the fixture's current English. */
function writeBn(csvDir: string, table: string, rows: Row[]) {
  const english = new Map(readTable(csvDir, table).map(r => [table === 'itinerary_stops' ? `${r.itinerary_id}#${r.stop_order}` : r[Object.keys(r)[0]], r]));
  const dir = translationsDirOf(csvDir);
  mkdirSync(dir, { recursive: true });
  const full = rows.map(r => ({ status: 'draft', en_hash: enHash(english.get(r.key)?.[r.column] ?? ''), ...r }));
  writeFileSync(join(dir, `${table}.csv`), formatTranslations(full));
}

/** The valid fixture with a translation of each kind. */
function translatedFixture() {
  const dir = fixtureDir();
  writeBn(dir, 'sites', [
    { key: 'JB-DHK-001', column: 'short_description', bn: 'উঠানসহ একটি দোতলা বাড়ি।', status: 'reviewed' },
    { key: 'JB-DHK-001', column: 'founder_or_family', bn: 'রায় পরিবার' },
    { key: 'JB-DHK-001', column: 'established_era', bn: 'আনু. 1850', en_hash: enHash('c. 1800') },        // outdated
    { key: 'JB-DHK-001', column: 'coordinates_note', bn: 'Claude এর নোট' },                              // internal term
    { key: 'JB-DHK-002', column: 'coordinates_note', bn: 'অবস্থান নিশ্চিত নয়।' },                     // hidden pin: orphan
    { key: 'JB-DHK-999', column: 'short_description', bn: 'নেই' },                                       // no such row
  ]);
  writeBn(dir, 'travel_routes', [{ key: 'TR-DHK-001-1', column: 'route_description', bn: 'গাবতলী থেকে সাটুরিয়া' }]); // one step, not two
  writeBn(dir, 'history_events', [{ key: 'HE-DHK-001-001', column: 'description', bn: 'বাড়িটি তৈরি হয়।' }]);
  writeBn(dir, 'claims', [{ key: 'CL-DHK-001-002', column: 'claim_text', bn: 'রীতি: ইন্দো-সারাসেনিক (A. Author) বনাম ঔপনিবেশিক (A Newspaper)।' }]);
  writeBn(dir, 'visitor_info', [{ key: 'JB-DHK-001', column: 'entry_fee_note', bn: 'প্রাপ্তবয়স্ক প্রতি।', status: 'reviewed' }]);
  writeBn(dir, 'itineraries', [{ key: 'IT-DHK-001-1', column: 'title', bn: 'প্রস্তাবিত ভ্রমণ (সাটুরিয়া চক্কর) (টেস্ট হাউস ওয়ান (রায় বাড়ি))' }]);
  writeBn(dir, 'itinerary_stops', [{ key: 'IT-DHK-001-1#3', column: 'stop_name', bn: 'সাটুরিয়া বাজারে দুপুরের খাবার' }]);
  return dir;
}

describe('fingerprint (FR-4, AC-2)', () => {
  it('ignores line endings, Unicode normal form and padding, and nothing else', () => {
    const base = enHash('বাড়ি one\ntwo');
    expect(enHash('বাড়ি one\r\ntwo')).toBe(base);
    expect(enHash('  বাড়ি one\ntwo \n')).toBe(base);
    expect(enHash('বাড়ি one\ntwo'.normalize('NFD'))).toBe(base);
    expect(enHash('বাড়ি one\ntwo.')).not.toBe(base);
    expect(base).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe('translation files (FR-1 to FR-7, AC-1)', () => {
  const errorsFor = (file: string, text: string) => {
    const dir = fixtureDir();
    mkdirSync(translationsDirOf(dir), { recursive: true });
    writeFileSync(join(translationsDirOf(dir), file), text);
    return loadTranslations(loadTables(dir, TABLES).T, translationsDirOf(dir)).errors.map(e => `${e.column ?? ''}: ${e.message}`);
  };
  const head = 'key,column,bn,status,en_hash\n';
  it('accepts no folder and an empty one', () => {
    const dir = fixtureDir();
    expect(loadTranslations(loadTables(dir, TABLES).T, translationsDirOf(dir)).errors).toEqual([]);
  });
  it('rejects an unknown table, column, status, hash and a repeated cell', () => {
    expect(errorsFor('sources.csv', head)).toEqual([': "sources" is not a table with translatable columns']);
    expect(errorsFor('sites.csv', `${head}JB-DHK-001,name_en,নাম,draft,0123456789ab\n`)).toEqual(['column: not a translatable column of sites']);
    expect(errorsFor('sites.csv', `${head}JB-DHK-001,short_description,x,done,0123456789ab\n`)).toEqual(['status: must be draft or reviewed']);
    expect(errorsFor('sites.csv', `${head}JB-DHK-001,short_description,x,draft,XYZ\n`)).toEqual(['en_hash: must be 12 lower-case hex digits']);
    expect(errorsFor('sites.csv', `${head}JB-DHK-001,short_description,x,draft,0123456789ab\nJB-DHK-001,short_description,y,draft,0123456789ab\n`))
      .toEqual(['key: JB-DHK-001 / short_description appears more than once']);
    expect(errorsFor('sites.csv', 'key,column,bn\n')).toEqual(['status: required column is missing', 'en_hash: required column is missing']);
  });
  it('fails the build in every mode on a malformed file', () => {
    const dir = fixtureDir();
    mkdirSync(translationsDirOf(dir), { recursive: true });
    writeFileSync(join(translationsDirOf(dir), 'sites.csv'), `${head}JB-DHK-001,short_description,x,done,0123456789ab\n`);
    const { results } = runBuilders(dir);
    for (const mode of ['local', 'release']) expect(report(results, mode).structural.length, mode).toBeGreaterThan(0);
  });
  it('sorts every cell into reviewed, draft, outdated, invalid, missing and orphan', () => {
    const dir = translatedFixture();
    const { cells, orphans } = loadTranslations(loadTables(dir, TABLES).T, translationsDirOf(dir));
    const state = (table: string, key: string, column: string) => cells.find(c => c.table === table && c.key === key && c.column === column)?.state;
    expect(state('sites', 'JB-DHK-001', 'short_description')).toBe('reviewed');
    expect(state('sites', 'JB-DHK-001', 'founder_or_family')).toBe('draft');
    expect(state('sites', 'JB-DHK-001', 'established_era')).toBe('outdated');
    expect(state('sites', 'JB-DHK-001', 'coordinates_note')).toBe('invalid');
    expect(state('travel_routes', 'TR-DHK-001-1', 'route_description')).toBe('invalid');
    expect(state('sites', 'JB-DHK-001', 'architectural_style')).toBe('missing');
    expect(state('claims', 'CL-DHK-001-005', 'claim_text')).toBeUndefined();      // a fact claim is never shown
    expect(state('sites', 'JB-DHK-002', 'coordinates_note')).toBeUndefined();     // a hidden pin's note is never shown
    expect(orphans.map(o => `${o.table}/${o.key}/${o.column}`).sort()).toEqual(['sites/JB-DHK-002/coordinates_note', 'sites/JB-DHK-999/short_description']);
  });
  it('rejects Bangla that says entry is free', () => {
    const dir = fixtureDir();
    writeBn(dir, 'visitor_info', [{ key: 'JB-DHK-001', column: 'entry_fee_note', bn: 'প্রবেশ বিনামূল্যে।' }]);
    const { cells } = loadTranslations(loadTables(dir, TABLES).T, translationsDirOf(dir));
    expect(cells.find(c => c.column === 'entry_fee_note')).toMatchObject({ state: 'invalid', reason: expect.stringMatching(/free/) });
  });
});

describe('build output (FR-8 to FR-14, AC-3 to AC-5)', () => {
  const dir = translatedFixture();
  const { out, results } = runBuilders(dir);
  const site = readJson(join(out, 'build', 'sites', 'JB-DHK-001.json'));
  const hidden = readJson(join(out, 'build', 'sites', 'JB-DHK-002.json'));
  const trip = readJson(join(out, 'build', 'trips', 'IT-DHK-001-1.json'));

  it('uses reviewed and draft translations only', () => {
    expect(site.summaryBn).toBe('উঠানসহ একটি দোতলা বাড়ি।');
    expect(site.founder.bn).toBe('রায় পরিবার');
    expect(site.era.bn).toBeUndefined();                       // outdated
    expect(site.location.noteBn).toBeUndefined();              // internal term
    expect(site.travel.routes[0].steps.some((s: { labelBn?: string }) => s.labelBn)).toBe(false); // step count differs
    expect(site.visiting.feeNoteBn).toBe('প্রাপ্তবয়স্ক প্রতি।');
    expect(site.history[0].textBn).toBe('বাড়িটি তৈরি হয়।');
  });
  it('splits a translated claim into the same versions', () => {
    const c = site.conflicts.find((x: { field: string }) => x.field === 'Style');
    expect(c.fieldBn).toBe('রীতি');
    expect(c.versions.map((v: { textBn?: string }) => v.textBn)).toEqual(['ইন্দো-সারাসেনিক (A. Author)', 'ঔপনিবেশিক (A Newspaper)']);
  });
  it('records whether a page shows drafts and English', () => {
    expect(site.bnState).toEqual({ draft: true, english: true });
    expect(hidden.bnState).toEqual({ draft: true, english: true }); // its trip's title is a draft; its summary is untranslated
  });
  it('never translates the contract texts, and keeps a hidden note out in both languages', () => {
    expect(hidden.visiting.hours).toEqual({ known: false, text: 'Not documented' });
    expect(hidden.location.note).toBeUndefined();
    expect(hidden.location.noteBn).toBeUndefined();
    expect(hidden.stillToConfirmBn).toEqual(['মানচিত্রে অবস্থান']); // a bare field name has a fixed label
  });
  it('gives trips Bangla titles, stop names and budget items', () => {
    expect(trip.titleBn).toBe('সাটুরিয়া চক্কর');
    expect(trip.stops.find((s: { order: number }) => s.order === 3).nameBn).toBe('সাটুরিয়া বাজারে দুপুরের খাবার');
    expect(trip.budget.rows.every((r: { itemBn?: string }) => r.itemBn)).toBe(true);
    expect(trip.budget.omittedBn).toHaveLength(trip.budget.omitted.length);
    expect(readJson(join(out, 'build', 'trips.json'))[0].titleBn).toBe('সাটুরিয়া চক্কর');
  });
  it('puts the Bangla card line and founder in the index', () => {
    const row = readJson(join(out, 'public', 'index.json')).find((r: { i: string }) => r.i === 'JB-DHK-001');
    expect(row.smb).toBe('উঠানসহ একটি দোতলা বাড়ি।');
    expect(row.fmb).toBe('রায় পরিবার');
  });
  it('never fails a release build for translation gaps (FR-8, AC-4)', () => {
    expect(report(results, 'release').fatal).toBe(false);
  });
  it('reports coverage and every problem row (FR-26, AC-12)', () => {
    const text = reportText(results, 'local');
    expect(text).toMatch(/### Bangla translation: coverage[\s\S]*sites\.short_description: 50% translated \(1 reviewed, 0 draft, 1 missing/);
    expect(text).toMatch(/outdated[^\n]*\n\n- sites \/ JB-DHK-001 \/ established_era/);
    expect(text).toContain('- travel_routes / TR-DHK-001-1 / route_description: route steps (->) differ from the English');
    expect(text).toContain('- sites / JB-DHK-001 / coordinates_note: internal-note term "Claude"');
    expect(text).toContain('- sites / JB-DHK-999 / short_description');
  });
  it('writes the review rows (FR-22)', () => {
    const t = readJson(join(out, 'build', 'translations.json'));
    expect(t.cells.find((c: { key: string; column: string }) => c.key === 'JB-DHK-001' && c.column === 'short_description'))
      .toMatchObject({ state: 'reviewed', site: 'JB-DHK-001', bn: 'উঠানসহ একটি দোতলা বাড়ি।' });
    expect(t.cells.find((c: { table: string }) => c.table === 'itineraries')).toMatchObject({ trip: 'IT-DHK-001-1' });
  });
});

describe('npm run bn (FR-23 to FR-25, AC-11)', () => {
  const opts = (dir: string) => ({ csvDir: dir, dir: translationsDirOf(dir) });
  const file = (dir: string, table: string) => readTable(translationsDirOf(dir), table);
  const save = (dir: string, table: string, rows: object[]) => {
    mkdirSync(translationsDirOf(dir), { recursive: true });
    writeFileSync(join(translationsDirOf(dir), `${table}.csv`), formatTranslations(rows));
  };

  it('lists missing, outdated and invalid cells, grouped by English', () => {
    const dir = translatedFixture();
    const groups = todo({ table: 'sites', column: 'short_description', ...opts(dir) });
    // Both sites share one summary: one group, and JB-DHK-001 is already reviewed.
    expect(groups).toEqual([{ en: 'A two-storey house with a courtyard.', cells: [{ key: 'JB-DHK-002', column: 'short_description', state: 'missing' }] }]);
    const era = todo({ table: 'sites', column: 'established_era', ...opts(dir) });
    expect(era[0].cells.find((c: { key: string }) => c.key === 'JB-DHK-001')).toMatchObject({ state: 'outdated', previous: 'আনু. 1850' });
  });
  it('merges by English into every shown cell, with hashes, as drafts, sorted, and twice gives the same file', () => {
    const dir = fixtureDir();
    const first = merge({ table: 'sites', drafts: [{ en: 'A two-storey house with a courtyard.', bn: 'উঠানসহ দোতলা বাড়ি।' }], ...opts(dir) });
    expect(first.counts).toEqual({ added: 2, changed: 0, unchanged: 0 });
    save(dir, 'sites', first.rows);
    const rows = file(dir, 'sites');
    expect(rows.map(r => r.key)).toEqual(['JB-DHK-001', 'JB-DHK-002']);
    expect(rows.every(r => r.status === 'draft' && r.en_hash === enHash('A two-storey house with a courtyard.'))).toBe(true);
    const text = readFileSync(join(translationsDirOf(dir), 'sites.csv'), 'utf8');
    const again = merge({ table: 'sites', drafts: [{ en: 'A two-storey house with a courtyard.', bn: 'উঠানসহ দোতলা বাড়ি।' }], ...opts(dir) });
    expect(again.counts).toEqual({ added: 0, changed: 0, unchanged: 2 });
    expect(formatTranslations(again.rows)).toBe(text);
  });
  it('keeps a reviewed row reviewed unless its Bangla changes', () => {
    const dir = fixtureDir();
    save(dir, 'sites', merge({ table: 'sites', drafts: [{ key: 'JB-DHK-001', column: 'short_description', bn: 'ক' }], ...opts(dir) }).rows);
    save(dir, 'sites', approve({ table: 'sites', column: 'short_description', dir: translationsDirOf(dir) }).rows);
    expect(file(dir, 'sites')[0].status).toBe('reviewed');
    save(dir, 'sites', merge({ table: 'sites', drafts: [{ key: 'JB-DHK-001', column: 'short_description', bn: 'ক' }], ...opts(dir) }).rows);
    expect(file(dir, 'sites')[0].status).toBe('reviewed');
    save(dir, 'sites', merge({ table: 'sites', drafts: [{ key: 'JB-DHK-001', column: 'short_description', bn: 'খ' }], ...opts(dir) }).rows);
    expect(file(dir, 'sites')[0].status).toBe('draft');
  });
  it('refuses rows that do not exist and columns that are not translatable', () => {
    const dir = fixtureDir();
    expect(merge({ table: 'sites', drafts: [{ key: 'JB-DHK-999', column: 'short_description', bn: 'ক' }], ...opts(dir) }).problems).toHaveLength(1);
    expect(() => merge({ table: 'sites', drafts: [{ key: 'JB-DHK-001', column: 'name_en', bn: 'ক' }], ...opts(dir) })).toThrow(/not a translatable column/);
  });
});

describe('Bangla founder search (FR-21, AC-9)', () => {
  const base = { s: 'x', dv: 'Dhaka', d: 'Dhaka', db: 'ঢাকা', lc: 'verified', c: 'unknown', ac: 'unknown', tb: 'unknown', rc: 'confirmed', t: 'house', ty: 'house' } as const;
  const sites: IndexSite[] = [
    { ...base, i: 'JB-DHK-001', e: 'Ukil Bari', fm: 'Lakshman Saha', fmb: 'লক্ষ্মণ সাহা', sm: 'A house.', smb: 'একটি পুকুরপাড়ের বাড়ি।' },
    { ...base, i: 'JB-DHK-002', e: 'Roy Bari', fm: 'Roy family' },
  ];
  const m = createMatcher(sites, Fuse);
  it('finds a site by its Bangla founder text, as a founder match', () => {
    const hit = m.search('সাহা').sites;
    expect(hit.map(h => h.site.i)).toEqual(['JB-DHK-001']);
    expect(hit[0]).toMatchObject({ field: 'fm', detail: expect.stringContaining('সাহা') });
  });
  it('still finds the English founder, and never searches the summary', () => {
    expect(m.search('Saha').sites.map(h => h.site.i)).toEqual(['JB-DHK-001']);
    expect(m.search('পুকুরপাড়ের').sites).toEqual([]);
  });
});

describe('rendering (FR-15, FR-16)', () => {
  it('shows Bangla beside English, or the English alone marked lang="en"', () => {
    expect(renderToStaticMarkup(<Prose en="A house." bn="একটি বাড়ি।" />))
      .toBe('<span lang="en" data-l="en">A house.</span><span lang="bn" data-l="bn">একটি বাড়ি।</span>');
    expect(renderToStaticMarkup(<Prose en="A house." />)).toBe('<span lang="en">A house.</span>');
  });
  it('picks one note for the page, or none', () => {
    expect(bnNoteKey({ draft: false, english: false })).toBeNull();
    expect(bnNoteKey({ draft: true, english: false })).toBe('bnNote.draft');
    expect(bnNoteKey({ draft: false, english: true })).toBe('bnNote.english');
    expect(bnNoteKey({ draft: true, english: true })).toBe('bnNote.both');
    expect(renderToStaticMarkup(<ProseNote state={{ draft: false, english: false }} />)).toBe('');
    expect(renderToStaticMarkup(<ProseNote state={{ draft: true, english: false }} />)).toMatch(/data-l="bn".*যাচাই হয়নি/);
  });
});
