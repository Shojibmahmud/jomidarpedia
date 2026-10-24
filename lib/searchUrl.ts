// /search/ URL state (spec 08 FR-20, FR-33), to the contract in docs/URLS.md. Pure, like lib/urlState.ts:
// parse() reads q, field, in and exact and reports anything dropped; serialize() writes the one canonical
// form (keys in table order, defaults left out).

import { Q_MAX } from './urlState';

export const GROUPS = ['sites', 'families', 'districts'] as const;
export type Group = (typeof GROUPS)[number];

export interface SearchView { q?: string; field?: 'family'; in?: Group; exact?: boolean }
export interface ParsedSearch extends SearchView { dropped: boolean }

export const SEARCH_KEYS = ['q', 'field', 'in', 'exact'] as const;

export function parseSearch(search: string): ParsedSearch {
  const params = new URLSearchParams(search);
  const out: ParsedSearch = { dropped: false };
  const seen = new Set<string>();
  for (const [key, raw] of params) {
    if (!(SEARCH_KEYS as readonly string[]).includes(key) || seen.has(key)) { out.dropped = true; continue; }
    seen.add(key);
    switch (key) {
      case 'q': {
        const q = raw.trim().slice(0, Q_MAX).trim();
        if (q) out.q = q;
        break;
      }
      case 'field':
        if (raw === 'family') out.field = 'family';
        else out.dropped = true;
        break;
      case 'in':
        if ((GROUPS as readonly string[]).includes(raw)) out.in = raw as Group;
        else out.dropped = true;
        break;
      case 'exact':
        if (raw === '1') out.exact = true;
        else out.dropped = true;
        break;
    }
  }
  // A family search lists sites only (FR-11): another group is dropped with the notice.
  if (out.field && out.in && out.in !== 'sites') { delete out.in; out.dropped = true; }
  // Without a query, field and exact mean nothing: dropped silently (spec 08 §7).
  if (!out.q) { delete out.field; delete out.exact; }
  return out;
}

/** The canonical query string, without "?"; empty for the empty search page. */
export function serializeSearch(v: SearchView): string {
  const pairs: string[] = [];
  if (v.q) pairs.push(`q=${encodeURIComponent(v.q)}`);
  if (v.q && v.field) pairs.push(`field=${v.field}`);
  if (v.in && !(v.field && v.in !== 'sites')) pairs.push(`in=${v.in}`);
  if (v.q && v.exact) pairs.push('exact=1');
  return pairs.join('&');
}

/** The /search/ path for a view. */
export const searchHref = (v: SearchView) => {
  const qs = serializeSearch(v);
  return qs ? `/search/?${qs}` : '/search/';
};
