// Pure rules behind /sources/ (roadmap task 10.3; spec .claude/specs/10-Areas-sources-about-and-system-states.md
// FR-19 to FR-24). The URL state follows docs/URLS.md (`q`, `type`, `sort`, `page`): parseSources() drops and
// reports anything unknown, serializeSources() writes the one canonical form. The type chips group the
// sources.csv types as on the Sources board; a type missing from TYPE_GROUPS fails a unit test (FR-21).

import { fold } from './fold';
import { formatDate } from './format';
import type { Lang, StringKey } from './i18n';
import type { SourceEntry } from './types';
import { Q_MAX } from './urlState';

export const TYPE_GROUPS = [
  { token: 'news', types: ['news'] },
  { token: 'wiki', types: ['wiki'] },
  { token: 'government', types: ['government'] },
  { token: 'travel', types: ['travel_guide'] },
  { token: 'encyclopedia', types: ['encyclopedia'] },
  { token: 'blog', types: ['blog'] },
  { token: 'map', types: ['map_service'] },
  { token: 'academic', types: ['academic'] },
  { token: 'book', types: ['book'] },
  { token: 'project', types: ['project_upload_list', 'project_upload_audit', 'project_communication'] },
  { token: 'other', types: ['web_other', 'secondary_citation', 'social_media', 'international'] },
] as const;
export type TypeToken = (typeof TYPE_GROUPS)[number]['token'];
export const TYPE_TOKENS: readonly TypeToken[] = TYPE_GROUPS.map(g => g.token);

/** The chip a sources.csv type belongs to, or undefined for a type the table does not know. */
export const typeToken = (type: string): TypeToken | undefined =>
  TYPE_GROUPS.find(g => (g.types as readonly string[]).includes(type))?.token;
export const typeKey = (token: TypeToken): StringKey => `srctype.${token}`;

/** A project working file: the flag from the build, or a type in the project group (FR-29). */
export const isProjectFile = (s: Pick<SourceEntry, 'projectFile' | 'type'>) => s.projectFile || typeToken(s.type) === 'project';

/** One table row: what the listing needs from sources.json. */
export interface SourceRow { id: string; title: string; publisher: string; type: TypeToken; date?: string; cited: number }

export function sourceRow(s: SourceEntry): SourceRow {
  const type = typeToken(s.type);
  if (!type) throw new Error(`sources: type "${s.type}" of ${s.id} has no chip in TYPE_GROUPS`);
  return { id: s.id, title: s.title, publisher: s.publisher, type, ...(s.date && { date: s.date }), cited: s.sites.length };
}

export const SOURCE_SORTS = ['cited', 'title', 'date'] as const;
export type SourceSort = (typeof SOURCE_SORTS)[number];
export const SOURCE_KEYS = ['q', 'type', 'sort', 'page'] as const;
export const SOURCES_PAGE = 25;

export interface SourcesView { q?: string; type?: TypeToken; sort: SourceSort; page: number }
export const SOURCES_DEFAULT: SourcesView = { sort: 'cited', page: 1 };

export function parseSources(search: string): SourcesView & { dropped: boolean } {
  const params = new URLSearchParams(search);
  const out: SourcesView & { dropped: boolean } = { ...SOURCES_DEFAULT, dropped: false };
  const seen = new Set<string>();
  for (const [key, raw] of params) {
    if (!(SOURCE_KEYS as readonly string[]).includes(key) || seen.has(key)) { out.dropped = true; continue; }
    seen.add(key);
    switch (key) {
      case 'q': {
        const q = raw.trim().slice(0, Q_MAX).trim();
        if (q) out.q = q;
        break;
      }
      case 'type':
        if ((TYPE_TOKENS as readonly string[]).includes(raw)) out.type = raw as TypeToken;
        else out.dropped = true;
        break;
      case 'sort':
        if ((SOURCE_SORTS as readonly string[]).includes(raw)) out.sort = raw as SourceSort;
        else out.dropped = true;
        break;
      case 'page':
        // Page 1 is the default, so it is never written; anything but a whole number from 2 is dropped.
        if (/^[1-9]\d{0,4}$/.test(raw) && Number(raw) >= 2) out.page = Number(raw);
        else out.dropped = true;
        break;
    }
  }
  return out;
}

/** The canonical query string, without "?"; empty for the default view. */
export function serializeSources(v: SourcesView): string {
  const pairs: string[] = [];
  if (v.q) pairs.push(`q=${encodeURIComponent(v.q)}`);
  if (v.type) pairs.push(`type=${v.type}`);
  if (v.sort !== 'cited') pairs.push(`sort=${v.sort}`);
  if (v.page > 1) pairs.push(`page=${v.page}`);
  return pairs.join('&');
}

export const sourcesHref = (v: SourcesView) => {
  const qs = serializeSources(v);
  return qs ? `/sources/?${qs}` : '/sources/';
};

/** Rows matching the query (title, publisher or ID, folded as in Search) and the type. */
export function filterSources(rows: readonly SourceRow[], v: Pick<SourcesView, 'q' | 'type'>): SourceRow[] {
  const q = v.q ? fold(v.q) : '';
  return rows.filter(r => (!v.type || r.type === v.type) && (!q || fold(`${r.id} ${r.title} ${r.publisher}`).includes(q)));
}

const titles = new Intl.Collator('en');
const byId = (a: SourceRow, b: SourceRow) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** cited: most sites first; title: A to Z; date: newest first, undated last. Ties by ID. */
export function sortSources(rows: readonly SourceRow[], sort: SourceSort): SourceRow[] {
  const list = [...rows];
  if (sort === 'title') return list.sort((a, b) => titles.compare(a.title, b.title) || byId(a, b));
  if (sort === 'date') return list.sort((a, b) => (a.date === b.date ? 0 : !a.date ? 1 : !b.date ? -1 : a.date < b.date ? 1 : -1) || byId(a, b));
  return list.sort((a, b) => b.cited - a.cited || byId(a, b));
}

/** A source date: YYYY, YYYY-MM, YYYY-MM-DD, or a range written "<date> to <date>" (2 sources). */
export const sourceDate = (date: string, lang: Lang) => date.split(' to ').map(d => formatDate(d.trim(), lang)).join('–');

export const pageCount = (total: number) => Math.max(1, Math.ceil(total / SOURCES_PAGE));

/** Counts per chip, under the current query (the chips' numbers). */
export function typeCounts(rows: readonly SourceRow[], q?: string): Record<TypeToken | 'all', number> {
  const matched = filterSources(rows, { q });
  const out = { all: matched.length } as Record<TypeToken | 'all', number>;
  for (const t of TYPE_TOKENS) out[t] = matched.filter(r => r.type === t).length;
  return out;
}

/** The page links to show: first, last, and up to two either side of the current page, with gaps as null. */
export function pageLinks(page: number, pages: number): (number | null)[] {
  const keep = new Set([1, pages, page - 2, page - 1, page, page + 1, page + 2].filter(p => p >= 1 && p <= pages));
  const out: (number | null)[] = [];
  let last = 0;
  for (const p of [...keep].sort((a, b) => a - b)) {
    if (p - last > 1) out.push(null);
    out.push(p);
    last = p;
  }
  return out;
}
