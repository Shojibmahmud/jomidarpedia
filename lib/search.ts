// Search over the index (roadmap task 8.2, spec 08 FR-5 to FR-13). Pure: createMatcher() takes the rows
// and the Fuse.js class, so the browser can import Fuse.js only when a search box is used (FR-19) and the
// tests can pass it in directly. Everything is matched in folded form (lib/fold.ts).
//
// How a query matches (D4): it is folded and split into words; generic words ("zamindar", "bari") are
// dropped unless nothing else was typed. A word hits a site when one of the site's words equals it, starts
// with it, or (outside exact mode) is a close spelling found by Fuse.js over the vocabulary of every word in
// the index. A site is a result when at least one word hits; results rank by how many words hit, then by the
// weighted quality of the hits plus how much of the site's name they cover, then by English name (A-9). Fuse.js runs on single words rather than on
// whole fields, so a short word never "fuzzily" matches somewhere inside a paragraph of family history.

import type FuseClass from 'fuse.js';
import type { FuseResult } from 'fuse.js';
import { fold, GENERIC, tokens, words, type Token } from './fold';
import type { IndexSite } from './types';

export type FuseCtor = typeof FuseClass;

/** The fields searched (A-2); `d` covers the district in both languages. */
export type Field = 'e' | 'b' | 'a' | 'd' | 'fm';
export const WEIGHTS: Record<Field, number> = { e: 3, b: 3, a: 2, d: 1, fm: 1 };
const FIELD_ORDER: Field[] = ['e', 'b', 'a', 'd', 'fm'];
/** Fuse.js threshold for a close spelling (FR-5): 0 is exact, 1 matches anything. */
export const THRESHOLD = 0.3;
/** Words shorter than this are matched exactly or as a prefix only. */
const FUZZY_MIN = 4;
const QUALITY = { exact: 1, prefix: 0.8, close: 0.6 };
/** How much covering a whole name adds to the score: more than any one hit in a lesser field. */
const COVER_WEIGHT = 2;
/** A family phrase is at most this many words (A-5). */
const PHRASE_MAX = 3;

/** A district as /search/ needs it: from data/build/districts.json, passed as props (FR-9). */
export interface SearchDistrict { slug: string; en: string; bn: string; divisionSlug: string; count: number }

export interface SiteHit {
  site: IndexSite;
  /** How many of the query's words hit this site. */
  words: number;
  score: number;
  /** The highest-weight field that matched (FR-8), or 'id' for a site-ID query (spec 10 FR-53). */
  field: Field | 'id';
  /** What matched outside the name: the other name, district or family phrase (FR-8). */
  detail?: string;
  /** Folded words to mark in this site's text (FR-17). */
  terms: ReadonlySet<string>;
}
export interface FamilyHit { key: string; phrase: string; count: number }
export interface DistrictHit { district: SearchDistrict; terms: ReadonlySet<string> }

export interface SearchResult {
  /** The folded words matched (FR-6). */
  words: string[];
  /** Set when no word matched as typed and close spellings did (FR-12): the query shown and searched instead. */
  corrected?: string;
  sites: SiteHit[];
  families: FamilyHit[];
  districts: DistrictHit[];
}
export const NO_RESULT: SearchResult = { words: [], sites: [], families: [], districts: [] };

export interface SearchOptions { exact?: boolean; field?: 'family' }

interface Entry {
  site: IndexSite;
  /** The distinctive words of the English and the Bangla name, for how much of a name a query covers. */
  names: Set<string>[];
  fm: Token[];
  /** The folded founder or family text, padded with spaces for whole-word tests. */
  fmPadded: string;
}

type Expansion = Map<string, number>; // vocabulary word → quality

export interface Matcher {
  search(query: string, options?: SearchOptions): SearchResult;
  /** Sites a query keeps in Explore (FR-29), without correction: site ID → words to mark. */
  match(query: string): Map<string, ReadonlySet<string>>;
  /** Districts matched by a query's words (FR-9). */
  districts(list: readonly SearchDistrict[], query: string, options?: SearchOptions): DistrictHit[];
}

/** Queries shorter than this after folding return nothing (FR-13, A-4). */
export const MIN_QUERY = 2;

/** A query that is exactly a site ID, in any case (spec 10 FR-53): the ID in canonical form. */
export const siteIdQuery = (query: string): string | undefined => {
  const q = query.trim().toUpperCase();
  return /^JB-[A-Z]{3}-\d{3}$/.test(q) ? q : undefined;
};

const isCapitalised = (s: string) => /^[\p{Lu}\p{Script=Bengali}]/u.test(s);
/** Words that can't begin or end a family phrase: generic words and titles ("Raja", "Zamindars"). */
const NOT_A_NAME: ReadonlySet<string> = new Set([...GENERIC, ...['zamindars', 'raja', 'rani', 'maharaja', 'maharani', 'nawab', 'babu', 'bahadur', 'sir', 'sri', 'shri', 'late', 'family'].map(fold)]);

export function createMatcher(sites: readonly IndexSite[], Fuse: FuseCtor): Matcher {
  const entries: Entry[] = [];
  /** word → entry index → fields it occurs in. */
  const postings = new Map<string, Map<number, Set<Field>>>();
  /** Words of names and districts, with a source spelling: the vocabulary for "Did you mean" (FR-12). */
  const nameForms = new Map<string, string>();

  const post = (word: string, k: number, field: Field) => {
    let bySite = postings.get(word);
    if (!bySite) postings.set(word, (bySite = new Map()));
    let fields = bySite.get(k);
    if (!fields) bySite.set(k, (fields = new Set()));
    fields.add(field);
  };

  sites.forEach((site, k) => {
    const fm = site.fm ? tokens(site.fm) : [];
    const names = [site.e, site.b].filter((v): v is string => !!v).map(v => new Set(words(v).filter(w => !GENERIC.has(w))));
    entries.push({ site, names, fm, fmPadded: ` ${fm.map(t => t.word).join(' ')} ` });
    const named: [Field, string | undefined][] = [['e', site.e], ['b', site.b], ['a', site.a], ['d', site.d], ['d', site.db]];
    for (const [field, value] of named) {
      if (!value) continue;
      for (const t of tokens(value)) {
        post(t.word, k, field);
        if (field !== 'a' && !nameForms.has(t.word)) nameForms.set(t.word, value.slice(t.start, t.end));
      }
    }
    for (const t of fm) post(t.word, k, 'fm');
  });

  /** District names: a phrase that is only a place ("Dhaka") is not a family. */
  const places = new Set(sites.flatMap(s => [fold(s.d), fold(s.db), fold(s.dv)]));
  const vocabulary = [...postings.keys()].sort();
  const nameVocabulary = [...nameForms.keys()].sort();
  const fuseOptions = { includeScore: true, threshold: THRESHOLD, ignoreLocation: true, isCaseSensitive: true };
  type WordFuse = FuseClass<string>;
  let vocabFuse: WordFuse | undefined;
  let nameFuse: WordFuse | undefined;

  /**
   * Close spellings of a word in a vocabulary, best first, with Fuse's score turned into a quality. The
   * length may differ by one letter (two from eight letters up), so "baliyati" finds "baliati" but
   * "kella" doesn't become "kallani".
   */
  function close(word: string, fuse: WordFuse): [string, number][] {
    if (word.length < FUZZY_MIN) return [];
    const slack = word.length >= 8 ? 2 : 1;
    return (fuse.search(word) as FuseResult<string>[])
      .filter(r => (r.score ?? 1) <= THRESHOLD && Math.abs(r.item.length - word.length) <= slack)
      .map(r => [r.item, (1 - (r.score ?? 0)) * QUALITY.close]);
  }

  /**
   * The vocabulary words a query word stands for: itself and the words it starts; only when there are
   * none, and not in exact mode, its close spellings. So an exact hit is never outranked by a near miss.
   */
  function expand(word: string, exact: boolean): { all: Expansion; typed: boolean } {
    const all: Expansion = new Map();
    // A generic word stands only for itself: "bari" must not pull in "Barishal".
    if (GENERIC.has(word)) {
      if (postings.has(word)) all.set(word, QUALITY.exact);
      return { all, typed: all.size > 0 };
    }
    for (const v of vocabulary) {
      if (v === word) all.set(v, QUALITY.exact);
      else if (v.startsWith(word)) all.set(v, QUALITY.prefix);
    }
    const typed = all.size > 0;
    if (!typed && !exact) {
      vocabFuse ??= new Fuse(vocabulary, fuseOptions);
      for (const [v, q] of close(word, vocabFuse)) all.set(v, q);
    }
    return { all, typed };
  }

  /** The words a query matches on (FR-6): the distinctive ones, or all of them when none is. */
  function queryWords(query: string): string[] {
    const all = [...new Set(words(query.slice(0, 100)))];
    const distinctive = all.filter(w => !GENERIC.has(w));
    return distinctive.length ? distinctive : all;
  }

  const familyCounts = new Map<string, number>();
  /** Sites whose founder or family field holds a folded phrase as whole words (FR-10, FR-11). */
  function familyCount(key: string): number {
    let n = familyCounts.get(key);
    if (n === undefined) {
      n = entries.filter(e => e.fmPadded.includes(` ${key} `)).length;
      familyCounts.set(key, n);
    }
    return n;
  }

  /**
   * The family phrase around a hit in `fm` (A-5): the run of capitalised words holding it, cut to at most
   * three. Of the windows that include the hit, the longest one shared by two or more sites wins
   * ("Roy Chowdhury" rather than "Bandhu Roy Chowdhury"); if none is shared, the longest window.
   */
  function familyPhrase(entry: Entry, terms: ReadonlySet<string>): { key: string; phrase: string } | undefined {
    const fm = entry.site.fm ?? '';
    const t = entry.fm;
    const at = t.findIndex(x => terms.has(x.word) && !NOT_A_NAME.has(x.word) && isCapitalised(fm.slice(x.start, x.end)));
    if (at < 0) return undefined;
    const joined = (a: number, b: number) => /^\s+$/.test(fm.slice(t[a].end, t[b].start));
    let lo = at, hi = at;
    while (lo > 0 && isCapitalised(fm.slice(t[lo - 1].start, t[lo - 1].end)) && joined(lo - 1, lo)) lo--;
    while (hi < t.length - 1 && isCapitalised(fm.slice(t[hi + 1].start, t[hi + 1].end)) && joined(hi, hi + 1)) hi++;
    while (lo < at && NOT_A_NAME.has(t[lo].word)) lo++;
    while (hi > at && NOT_A_NAME.has(t[hi].word)) hi--;
    let best: { from: number; to: number; count: number } | undefined;
    for (let len = Math.min(PHRASE_MAX, hi - lo + 1); len >= 1 && !best?.count; len--) {
      for (let from = Math.max(lo, at - len + 1); from <= Math.min(at, hi - len + 1); from++) {
        if (NOT_A_NAME.has(t[from].word) || NOT_A_NAME.has(t[from + len - 1].word)) continue;
        const key = t.slice(from, from + len).map(x => x.word).join(' ');
        if (places.has(key)) continue;
        const count = familyCount(key);
        if (count >= 2 && (!best || count > best.count)) best = { from, to: from + len - 1, count };
      }
    }
    if (!best) {
      const len = Math.min(PHRASE_MAX, hi - lo + 1);
      const from = Math.max(lo, Math.min(at, hi - len + 1));
      best = { from, to: from + len - 1, count: 0 };
      if (places.has(t.slice(best.from, best.to + 1).map(x => x.word).join(' '))) return undefined;
    }
    return {
      key: t.slice(best.from, best.to + 1).map(x => x.word).join(' '),
      phrase: fm.slice(t[best.from].start, t[best.to].end),
    };
  }

  /** What matched outside the name, for "matched in …" (FR-8). */
  function detailFor(entry: Entry, field: Field, terms: ReadonlySet<string>): string | undefined {
    const { site } = entry;
    if (field === 'a') return site.a?.split(';').map(s => s.trim()).find(part => tokens(part).some(x => terms.has(x.word)));
    if (field === 'd') return site.d;
    if (field === 'fm') {
      const family = familyPhrase(entry, terms);
      if (family) return family.phrase;
      // Not a name: a few words around the hit.
      const at = entry.fm.findIndex(x => terms.has(x.word));
      if (at < 0) return undefined;
      const from = entry.fm[Math.max(0, at - 3)], to = entry.fm[Math.min(entry.fm.length - 1, at + 3)];
      return site.fm!.slice(from.start, to.end);
    }
    return undefined;
  }

  function run(used: string[], exact: boolean): { sites: SiteHit[]; families: FamilyHit[]; typed: boolean; expansions: Expansion[] } {
    const hits = new Map<number, { words: number; score: number; fields: Set<Field>; terms: Set<string>; fmTerms: Set<string> }>();
    let typed = false;
    const expansions: Expansion[] = [];
    for (const w of used) {
      const { all, typed: t } = expand(w, exact);
      expansions.push(all);
      typed ||= t;
      const best = new Map<number, number>();
      for (const [v, quality] of all) {
        for (const [k, fields] of postings.get(v) ?? []) {
          let h = hits.get(k);
          if (!h) hits.set(k, (h = { words: 0, score: 0, fields: new Set(), terms: new Set(), fmTerms: new Set() }));
          h.terms.add(v);
          if (fields.has('fm')) h.fmTerms.add(v);
          for (const f of fields) {
            h.fields.add(f);
            best.set(k, Math.max(best.get(k) ?? 0, WEIGHTS[f] * quality));
          }
        }
      }
      for (const [k, score] of best) {
        const h = hits.get(k)!;
        h.words++;
        h.score += score;
      }
    }
    const out: SiteHit[] = [];
    const groups = new Map<string, { phrases: Map<string, number> }>();
    for (const [k, h] of hits) {
      const entry = entries[k];
      const field = FIELD_ORDER.find(f => h.fields.has(f))!;
      // A name the query covers whole ("Chandra Zamindar Bari" for "chandra") outranks one that only
      // shares a word ("Bhagaban Chandra Saha Zamindar Bari").
      const cover = Math.max(0, ...entry.names.filter(n => n.size).map(n => [...n].filter(w => h.terms.has(w)).length / n.size));
      const score = h.score + COVER_WEIGHT * cover;
      out.push({ site: entry.site, words: h.words, score, field, detail: detailFor(entry, field, h.terms), terms: h.terms });
      if (h.fmTerms.size) {
        const family = familyPhrase(entry, h.fmTerms);
        if (family) {
          let g = groups.get(family.key);
          if (!g) groups.set(family.key, (g = { phrases: new Map() }));
          g.phrases.set(family.phrase, (g.phrases.get(family.phrase) ?? 0) + 1);
        }
      }
    }
    out.sort((x, y) => y.words - x.words || y.score - x.score || x.site.e.localeCompare(y.site.e, 'en') || x.site.i.localeCompare(y.site.i));
    const families = [...groups].map(([key, g]) => ({
      key,
      // The spelling most of these sites use; ties alphabetically.
      phrase: [...g.phrases].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en'))[0][0],
      count: familyCount(key),
    })).sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase, 'en'));
    return { sites: out, families, typed, expansions };
  }

  /** field=family (FR-11): the whole folded phrase in the founder or family field; Sites only. */
  function family(query: string): SearchResult {
    const key = fold(query.slice(0, 100));
    if (key.length < MIN_QUERY) return NO_RESULT;
    const terms = new Set(key.split(' '));
    const sites = entries.filter(e => e.fmPadded.includes(` ${key} `)).map((entry): SiteHit => {
      const at = entry.fm.findIndex((x, k) => entry.fm.slice(k, k + terms.size).map(y => y.word).join(' ') === key);
      return {
        site: entry.site, words: terms.size, score: 1, field: 'fm', terms,
        detail: entry.site.fm!.slice(entry.fm[at].start, entry.fm[at + terms.size - 1].end),
      };
    }).sort((x, y) => x.site.e.localeCompare(y.site.e, 'en') || x.site.i.localeCompare(y.site.i));
    return { words: key.split(' '), sites, families: [], districts: [] };
  }

  function correct(query: string, used: string[]): string | undefined {
    nameFuse ??= new Fuse(nameVocabulary, fuseOptions);
    const replace = new Map<string, string>();
    for (const w of used) {
      const best = close(w, nameFuse)[0];
      if (best) replace.set(w, nameForms.get(best[0])!);
    }
    if (!replace.size) return undefined;
    return tokens(query).map(t => replace.get(t.word) ?? query.slice(t.start, t.end)).join(' ');
  }

  /** A site ID finds that site alone, with no correction; an ID that names no site finds nothing (FR-53). */
  function byId(id: string): SearchResult {
    const entry = entries.find(e => e.site.i === id);
    return { words: [], sites: entry ? [{ site: entry.site, words: 1, score: 1, field: 'id', terms: new Set() }] : [], families: [], districts: [] };
  }

  function search(query: string, options: SearchOptions = {}): SearchResult {
    if (options.field === 'family') return family(query);
    const id = siteIdQuery(query);
    if (id) return byId(id);
    if (fold(query).length < MIN_QUERY) return NO_RESULT;
    const used = queryWords(query);
    const first = run(used, !!options.exact);
    // Did you mean (FR-12): nothing matched as typed, so search the closest names instead.
    if (!options.exact && !first.typed) {
      const corrected = correct(query, used);
      if (corrected) {
        const second = run(queryWords(corrected), false);
        return { words: queryWords(corrected), corrected, sites: second.sites, families: second.families, districts: [] };
      }
    }
    return { words: used, sites: first.sites, families: first.families, districts: [] };
  }

  function districts(list: readonly SearchDistrict[], query: string, options: SearchOptions = {}): DistrictHit[] {
    if (options.field === 'family' || fold(query).length < MIN_QUERY || siteIdQuery(query)) return [];
    // A generic word ("bari") never picks a district ("Barishal").
    const used = queryWords(query).filter(w => !GENERIC.has(w));
    const expanded = used.map(w => expand(w, !!options.exact).all);
    return list.flatMap(district => {
      const dw = [...words(district.en), ...words(district.bn)];
      const terms = new Set(dw.filter(x => used.some((w, k) => x === w || x.startsWith(w) || expanded[k].has(x))));
      return terms.size ? [{ district, terms }] : [];
    });
  }

  return {
    search,
    districts,
    match: query => {
      const id = siteIdQuery(query);
      if (id) return new Map(byId(id).sites.map(h => [h.site.i, h.terms]));
      return new Map(fold(query).length < MIN_QUERY ? [] : run(queryWords(query), false).sites.map(h => [h.site.i, h.terms]));
    },
  };
}

/** The whole search for one query: sites and families, then the districts of the query actually searched. */
export function searchAll(m: Matcher, list: readonly SearchDistrict[], query: string, options: SearchOptions = {}): SearchResult {
  const r = m.search(query, options);
  return { ...r, districts: m.districts(list, r.corrected ?? query, r.corrected ? {} : options) };
}

/** Text split into plain and marked parts: whole words whose folded form is in `terms` (FR-17). */
export function marks(text: string, terms: ReadonlySet<string>): { text: string; mark: boolean }[] {
  const out: { text: string; mark: boolean }[] = [];
  let at = 0;
  for (const t of tokens(text)) {
    if (!terms.has(t.word)) continue;
    if (t.start > at) out.push({ text: text.slice(at, t.start), mark: false });
    out.push({ text: text.slice(t.start, t.end), mark: true });
    at = t.end;
  }
  if (at < text.length) out.push({ text: text.slice(at), mark: false });
  return out;
}

/** Three example searches for the empty page and the no-results state (FR-25, FR-26), chosen by rule. */
export function exampleSearches(sites: readonly IndexSite[]): { latin: string; bangla: string; family: string } {
  // Well-documented, photographed day trips, nearest first: their first distinctive name word.
  const pool = sites.filter(s => s.lc === 'verified' && s.img && s.b && s.dt === 1)
    .sort((a, b) => (a.h ?? 99) - (b.h ?? 99) || a.i.localeCompare(b.i));
  const firstWord = (value: string) => tokens(value).find(t => !GENERIC.has(t.word) && t.word.length > 2);
  const pick = (value: string) => { const t = firstWord(value); return t ? value.slice(t.start, t.end) : value; };
  const latin = pool.length ? pick(pool[0].e) : sites[0]?.e ?? '';
  const bangla = pool.length > 1 ? pick(pool[1].b!) : pool[0]?.b ?? '';
  // The two-word family phrase named by the most sites.
  const counts = new Map<string, { n: number; phrase: string }>();
  for (const s of sites) {
    if (!s.fm) continue;
    const t = tokens(s.fm);
    const seen = new Set<string>();
    for (let k = 0; k + 1 < t.length; k++) {
      const a = s.fm.slice(t[k].start, t[k].end), b = s.fm.slice(t[k + 1].start, t[k + 1].end);
      if (!/^\p{Lu}/u.test(a) || !/^\p{Lu}/u.test(b) || !/^\s+$/.test(s.fm.slice(t[k].end, t[k + 1].start))) continue;
      const key = `${t[k].word} ${t[k + 1].word}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const c = counts.get(key) ?? { n: 0, phrase: `${a} ${b}` };
      c.n++;
      counts.set(key, c);
    }
  }
  const family = [...counts.values()].sort((a, b) => b.n - a.n || a.phrase.localeCompare(b.phrase, 'en'))[0]?.phrase ?? '';
  return { latin, bangla, family };
}
