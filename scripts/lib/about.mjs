// The About page's text (roadmap tasks 10.5, 10.6; spec .claude/specs/10-Areas-sources-about-and-system-states.md
// FR-35 to FR-37, D10). content/about.en.md holds the prose with count tokens such as {{counts.sites}}; the
// build fills them from meta.json, so the page never types a number. Its front matter says whether the owner has
// reviewed the text: `reviewed: false` is an editorial problem, which fails only release builds. An unknown
// token is a structural error and fails every build.
//
// Used by app/about/page.tsx (rendering) and by `npm run data` (checkAbout, the gate). No dependencies.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ABOUT_PATH = 'content/about.en.md';
// The Bangla text (spec 14 FR-20): optional, same sections and ids. Its review state is reported, never fatal (D-9).
export const ABOUT_BN_PATH = 'content/about.bn.md';

/** Tokens that are not counts: links the page passes in (lib/nav.ts). */
export const LINK_TOKENS = ['url.corrections', 'url.photoOffer'];

/** `---\nreviewed: true\n---\nbody` → { reviewed, body }. Anything else in the front matter is an error; `path` names the file in messages. */
export function parseAbout(text, path = ABOUT_PATH) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) throw new Error(`${path}: no front matter (---\\nreviewed: true|false\\n---)`);
  const fields = Object.fromEntries(m[1].split('\n').filter(l => l.trim()).map(l => {
    const [k, ...v] = l.split(':');
    return [k.trim(), v.join(':').trim()];
  }));
  for (const k of Object.keys(fields)) if (k !== 'reviewed') throw new Error(`${path}: unknown front matter field "${k}"`);
  if (!['true', 'false'].includes(fields.reviewed)) throw new Error(`${path}: reviewed must be true or false`);
  return { reviewed: fields.reviewed === 'true', body: text.slice(m[0].length) };
}

// 1136 → "1,136": the prose is English (O6), so its numbers are too.
const grouped = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/**
 * The token values: every number in meta.json counts as counts.<path>, plus book.sites (the sites citing the
 * core book, SRC-0001) and the link tokens.
 */
export function aboutValues(meta, sources, links) {
  const values = {};
  const walk = (obj, path) => {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'number') values[`${path}.${k}`] = grouped(v);
      else if (v && typeof v === 'object') walk(v, `${path}.${k}`);
    }
  };
  walk(meta.counts, 'counts');
  const book = sources.find(s => s.id === 'SRC-0001');
  if (book) values['book.sites'] = grouped(book.sites.length);
  for (const k of LINK_TOKENS) if (links[k] !== undefined) values[k] = links[k];
  return values;
}

/** Fills {{token}}s. Throws on a token with no value, naming it (FR-36). */
export function fillTokens(body, values, path = ABOUT_PATH) {
  const unknown = new Set();
  const out = body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name) => {
    if (!(name in values)) { unknown.add(name); return ''; }
    return values[name];
  });
  if (unknown.size) throw new Error(`${path}: unknown token${unknown.size > 1 ? 's' : ''} ${[...unknown].map(t => `{{${t}}}`).join(', ')}`);
  return out;
}

// The section headings' {#ids}, in order: the Bangla text must have the English ones, so links work in both.
const sectionIds = body => [...body.matchAll(/^##\s.*\{#([\w-]+)\}\s*$/gm)].map(m => m[1]);

/** Throws unless two parsed documents have the same section ids in the same order. */
export function sameSections(en, bn) {
  const a = en.map(s => s.id).join(', '), b = bn.map(s => s.id).join(', ');
  if (a !== b) throw new Error(`${ABOUT_BN_PATH}: sections must match ${ABOUT_PATH} (${a}); found ${b}`);
}

/** The data step's check: the text parses, every token is known, and (release only) it has been reviewed. */
export function checkAbout({ path = ABOUT_PATH, bnPath = ABOUT_BN_PATH, buildDir = 'data/build' } = {}) {
  const result = { name: 'check-about', structural: [], gates: [], editorial: {}, warnings: [], info: [] };
  const structural = message => result.structural.push({ file: path, column: '', message, value: '' });
  if (!existsSync(path)) { structural('missing: the About page has no text'); return result; }
  const metaPath = join(buildDir, 'meta.json'), sourcesPath = join(buildDir, 'sources.json');
  if (!existsSync(metaPath) || !existsSync(sourcesPath)) { result.info.push('about: skipped (no data/build output)'); return result; }
  try {
    const { reviewed, body } = parseAbout(readFileSync(path, 'utf8'));
    const links = Object.fromEntries(LINK_TOKENS.map(k => [k, 'https://example.invalid/']));
    fillTokens(body, aboutValues(JSON.parse(readFileSync(metaPath, 'utf8')), JSON.parse(readFileSync(sourcesPath, 'utf8')), links));
    if (!reviewed) result.editorial.about = [{ table: '(content)', key: path, column: 'reviewed', value: 'reviewed: false', outputs: ['/about/'] }];
    result.info.push(`about            ${reviewed ? 'reviewed' : 'draft (reviewed: false; fails a release build)'}`);
    if (existsSync(bnPath)) {
      const bn = parseAbout(readFileSync(bnPath, 'utf8'), bnPath);
      fillTokens(bn.body, aboutValues(JSON.parse(readFileSync(metaPath, 'utf8')), JSON.parse(readFileSync(sourcesPath, 'utf8')), links), bnPath);
      const a = sectionIds(body).join(', '), b = sectionIds(bn.body).join(', ');
      if (a !== b) throw new Error(`${bnPath}: sections must match ${path} (${a}); found ${b}`);
      result.info.push(`about (Bangla)   ${bn.reviewed ? 'reviewed' : 'draft: shows the "not yet checked" note'}`);
      result.notes = [{ title: 'Bangla translation: About page', lines: [`${bnPath}: ${bn.reviewed ? 'reviewed' : 'draft'}`] }];
    } else {
      result.notes = [{ title: 'Bangla translation: About page', lines: [`${bnPath}: missing (Bangla mode shows the English with a note)`] }];
    }
  } catch (e) {
    structural(e.message);
  }
  return result;
}
