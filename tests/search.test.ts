// Search units (roadmap tasks 8.1 and 8.2; spec 08 AC-1 to AC-4, AC-7, AC-12, AC-16). Folding on fixed
// strings; matching on the real index.json, with expected sets computed from the data, never typed (I6).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import Fuse from 'fuse.js';
import { fold, foldWithMap, GENERIC, tokens, variantsUsed, VARIANTS, words } from '@/lib/fold';
import { createMatcher, exampleSearches, marks, searchAll, type SearchDistrict } from '@/lib/search';
import { parseSearch, serializeSearch } from '@/lib/searchUrl';
import type { District, IndexSite } from '@/lib/types';

const index: IndexSite[] = JSON.parse(readFileSync('public/data/index.json', 'utf8'));
const districts: SearchDistrict[] = (JSON.parse(readFileSync('data/build/districts.json', 'utf8')) as District[])
  .map(d => ({ slug: d.slug, en: d.en, bn: d.bn, divisionSlug: d.divisionSlug, count: d.count }));
const m = createMatcher(index, Fuse);
const byName = (re: RegExp) => index.find(s => re.test(s.e))!;
const BALIATI = byName(/^Baliati Palace/);
const TEOTA = byName(/^Teota Zamindar Bari/);

describe('fold (8.1, FR-1 to FR-4)', () => {
  it('folds every Latin variant to its canonical word', () => {
    for (const group of VARIANTS) for (const w of group) expect(fold(w), w).toBe(group[0]);
    expect(fold('Jomidar BADI Choudhury')).toBe('zamindar bari chowdhury');
    expect(fold('Choudhury')).toBe(fold('CHOWDHURY'));
  });
  it('changes variants on whole words only', () => {
    expect(fold('Badiul')).toBe('badiul');
    expect(fold('Barishal')).toBe('barishal');
  });
  it('folds Bangla vowel length, nukta letters and joiners', () => {
    expect(fold('বাড়ী')).toBe(fold('বাড়ি'));
    expect(fold('জমীদার')).toBe(fold('জমিদার'));
    expect(fold('য়')).toBe(fold('য়')); // য়
    expect(fold('ড়')).toBe(fold('ড়')); // ড়
    expect(fold('ঢ়')).toBe(fold('ঢ়')); // ঢ়
    expect(fold('ক্‍ষ')).toBe(fold('ক্ষ'));
    expect(fold('মূল')).toBe(fold('মুল'));
  });
  it('lower-cases, strips Latin accents, and turns punctuation into single spaces', () => {
    expect(fold('  Ráj-BÁRI,  (Dhaka) ')).toBe('raj bari dhaka');
    expect(fold("Prashanta Karmakar's House")).toBe('prashanta karmakar s house');
  });
  it('folds Bangla digits to English ones (spec 15 FR-13, amending FR-2)', () => {
    expect(fold('১৯৪৭')).toBe(fold('1947'));
  });
  it('is idempotent, on fixed strings and on every name in the index', () => {
    for (const s of ['Jomidar BADI', 'বাড়ী জমীদার', 'Ráj-BÁRI']) expect(fold(fold(s))).toBe(fold(s));
    for (const site of index) for (const v of [site.e, site.b, site.a, site.fm]) if (v) expect(fold(fold(v))).toBe(fold(v));
  });
  it('maps every folded character to a valid source range', () => {
    for (const site of index.slice(0, 80)) {
      for (const v of [site.e, site.b, site.fm]) {
        if (!v) continue;
        const f = foldWithMap(v);
        expect(f.start).toHaveLength(f.text.length);
        f.start.forEach((s, k) => { expect(s).toBeGreaterThanOrEqual(0); expect(f.end[k]).toBeLessThanOrEqual(v.length); expect(f.end[k]).toBeGreaterThan(s); });
      }
    }
  });
  it('maps a substituted variant back to the whole source word', () => {
    expect(tokens('Jomidar Bari').map(t => [t.word, t.start, t.end])).toEqual([['zamindar', 0, 7], ['bari', 8, 12]]);
  });
  it('lists generic words in folded form, in both scripts', () => {
    for (const w of ['zamindar', 'bari', 'rajbari', 'palace', fold('জমিদার'), fold('বাড়ি')]) expect(GENERIC.has(w), w).toBe(true);
  });
  it('names the variant groups a query used (FR-21)', () => {
    expect(variantsUsed('jamidar badi choudhury').map(g => g[0])).toEqual(['zamindar', 'bari', 'chowdhury']);
    expect(variantsUsed('zamindar bari')).toEqual([]);
  });
});

describe('matching (8.2, FR-5 to FR-8, FR-12)', () => {
  it('"baliyati" is corrected to Baliati, which comes first', () => {
    const r = m.search('baliyati');
    expect(r.corrected).toBe('Baliati');
    expect(r.sites[0].site.i).toBe(BALIATI.i);
  });
  it('"jamidar bari teota" finds Teota first, ignoring the generic words', () => {
    const r = m.search('jamidar bari teota');
    expect(r.corrected).toBeUndefined();
    expect(r.words).toEqual(['teota']);
    expect(r.sites[0].site.i).toBe(TEOTA.i);
  });
  it('Bangla finds Baliati, with either vowel length', () => {
    for (const q of ['বালিয়াটি', 'বালিয়াটী']) expect(m.search(q).sites[0].site.i, q).toBe(BALIATI.i);
  });
  it('generic words alone still match, exactly and without correction', () => {
    const r = m.search('zamindar bari');
    expect(r.corrected).toBeUndefined();
    expect(r.sites.length).toBe(index.filter(s => [s.e, s.b, s.a, s.d, s.db, s.fm].some(v => v && words(v).some(w => w === 'zamindar' || w === 'bari'))).length);
  });
  it('a query with no close name returns nothing', () => {
    const r = searchAll(m, districts, 'lalbagh kella');
    expect(r.corrected).toBeUndefined();
    expect(r.sites.length + r.families.length + r.districts.length).toBe(0);
  });
  it('exact mode makes no correction and finds nothing for a misspelling (FR-12)', () => {
    const r = m.search('baliyati', { exact: true });
    expect(r.corrected).toBeUndefined();
    expect(r.sites).toEqual([]);
  });
  it('ranks by words hit, then score, and says which field matched', () => {
    const r = m.search('teota saha');
    for (let k = 1; k < r.sites.length; k++) expect(r.sites[k - 1].words).toBeGreaterThanOrEqual(r.sites[k].words);
    const d = m.search('manikganj').sites.find(h => h.field === 'd');
    expect(d?.detail).toBe('Manikganj');
  });
  it('a prefix finds a name while typing', () => {
    expect(m.search('teo').sites[0].site.i).toBe(TEOTA.i);
  });
  it('queries shorter than two characters return nothing (FR-13)', () => {
    expect(m.search('a').sites).toEqual([]);
    expect(m.search(' - ').sites).toEqual([]);
  });
  it('every site is found by its own English and Bangla names, in the top 3 or behind identical names (A-3)', () => {
    for (const site of index) {
      for (const name of [site.e, site.b]) {
        if (!name || !words(name).some(w => !GENERIC.has(w))) continue;
        const ids = m.search(name).sites.map(h => h.site);
        const rank = ids.findIndex(s => s.i === site.i);
        expect(rank, `${site.i} by "${name}"`).toBeGreaterThanOrEqual(0);
        if (rank >= 3) {
          const ahead = ids.slice(0, rank);
          expect(ahead.every(s => fold(s.e) === fold(site.e) || (s.b && site.b && fold(s.b) === fold(site.b))), `${site.i} by "${name}" at ${rank}`).toBe(true);
        }
      }
    }
  });
});

describe('districts and families (FR-9 to FR-11)', () => {
  it('"manikganj" and "মানিকগঞ্জ" give the Manikganj district with its count', () => {
    const manikganj = districts.find(d => d.slug === 'manikganj')!;
    for (const q of ['manikganj', 'মানিকগঞ্জ']) {
      const r = searchAll(m, districts, q);
      expect(r.districts.map(d => d.district.slug), q).toEqual(['manikganj']);
      expect(r.districts[0].district.count).toBe(manikganj.count);
    }
  });
  it('a generic word never picks a district', () => {
    expect(searchAll(m, districts, 'bari').districts).toEqual([]);
  });
  it('"chowdhury" yields a Roy Chowdhury family whose count is the sites naming it', () => {
    const r = m.search('chowdhury');
    const roy = r.families.find(f => f.key === 'roy chowdhury');
    expect(roy).toBeDefined();
    const naming = index.filter(s => s.fm && ` ${fold(s.fm)} `.includes(' roy chowdhury '));
    expect(roy!.count).toBe(naming.length);
    const family = m.search(roy!.phrase, { field: 'family' });
    expect(family.sites.map(h => h.site.i).sort()).toEqual(naming.map(s => s.i).sort());
    expect(family.families).toEqual([]);
    expect(family.sites.every(h => h.field === 'fm' && fold(h.detail!) === 'roy chowdhury')).toBe(true);
  });
  it('a family phrase is never a generic word, a title or a place', () => {
    for (const q of ['zamindar bari', 'dhaka', 'saha', 'chowdhury', 'roy']) {
      for (const f of m.search(q).families) {
        const w = f.key.split(' ');
        expect(GENERIC.has(w[0]) || GENERIC.has(w[w.length - 1]), f.key).toBe(false);
        expect(['raja', 'zamindars', 'dhaka'].includes(f.key), f.key).toBe(false);
        expect(w.length).toBeLessThanOrEqual(3);
      }
    }
  });
  it('families are ordered by count, then name', () => {
    const fams = m.search('chowdhury').families;
    for (let k = 1; k < fams.length; k++) {
      expect(fams[k - 1].count > fams[k].count || (fams[k - 1].count === fams[k].count && fams[k - 1].phrase.localeCompare(fams[k].phrase, 'en') <= 0)).toBe(true);
    }
  });
});

describe('Bengali digits in queries (spec 15 FR-13, AC-7)', () => {
  const ids = (q: string) => searchAll(m, districts, q).sites.map(h => h.site.i);
  it('fold turns Bengali digits into Latin ones, one character each', () => {
    expect(fold('১৮৪০')).toBe('1840');
    expect(foldWithMap('বাড়ি-২').text).toBe(fold('বাড়ি-2'));
  });
  it('a query typed with Bengali digits finds what the Latin one finds', () => {
    expect(ids('১৮৪০')).toEqual(ids('1840'));
    expect(ids('1840')).toContain('JB-DHK-016');
    expect(ids('ডাবুয়া ২')).toEqual(ids('ডাবুয়া 2'));
    expect(ids('ডাবুয়া ২')).toContain('JB-CTG-046');
  });
  it('marks the Bengali digits in a name for a Latin-digit query', () => {
    const name = index.find(s => s.i === 'JB-CTG-046')!.b!;
    const parts = marks(name, new Set(words('2')));
    expect(parts.find(p => p.mark)?.text).toBe('২');
    expect(parts.map(p => p.text).join('')).toBe(name);
  });
});

describe('marks (FR-17)', () => {
  it('marks whole words, mapped back through variant folding', () => {
    const parts = marks('Chowdhury Bari', new Set(words('choudhury')));
    expect(parts).toEqual([{ text: 'Chowdhury', mark: true }, { text: ' Bari', mark: false }]);
    expect(marks('Jomidar Bari', new Set(['zamindar']))[0]).toEqual({ text: 'Jomidar', mark: true });
  });
  it('never splits a Bangla grapheme cluster', () => {
    const name = BALIATI.b!;
    const parts = marks(name, new Set(words('বালিয়াটী')));
    expect(parts.map(p => p.text).join('')).toBe(name);
    const marked = parts.find(p => p.mark)!;
    expect(fold(marked.text)).toBe(fold('বালিয়াটি'));
    const after = name.slice(name.indexOf(marked.text) + marked.text.length);
    expect(after === '' || !/^\p{M}/u.test(after)).toBe(true);
  });
});

describe('performance (FR-38)', () => {
  // The CI-tolerant bound (AC-12): GitHub's runners are about 3x slower than a dev machine, where the worst
  // query (a no-match that falls through to fuzzy search) takes about 20 ms.
  const bound = process.env.CI ? 100 : 50;
  it(`answers 100 queries in under ${bound} ms each once built`, () => {
    const queries = index.slice(0, 100).map((s, k) => (k % 3 === 0 ? s.e.slice(0, 6) : k % 3 === 1 ? (s.b ?? s.e) : `${s.d} ${s.e.split(' ')[0]}x`));
    searchAll(m, districts, 'warm up');
    // Best of three runs per query, so a GC pause or a busy worker doesn't fail a fast query.
    for (const q of queries) {
      let best = Infinity;
      for (let run = 0; run < 3; run++) {
        const t = performance.now();
        searchAll(m, districts, q);
        best = Math.min(best, performance.now() - t);
      }
      expect(best, q).toBeLessThan(bound);
    }
  });
});

describe('/search/ URL (FR-33, AC-16)', () => {
  it('round-trips the canonical form, keys in table order', () => {
    for (const qs of ['q=saha', 'q=Roy%20Chowdhury&field=family', 'q=saha&in=families', 'q=baliyati&exact=1', 'q=x%20y&field=family&in=sites&exact=1']) {
      expect(serializeSearch(parseSearch(qs))).toBe(qs);
    }
  });
  it('canonicalises order and encoding, and drops defaults', () => {
    expect(serializeSearch(parseSearch('exact=1&in=sites&q=Roy+Chowdhury'))).toBe('q=Roy%20Chowdhury&in=sites&exact=1');
  });
  it('drops unknown keys and values with the notice', () => {
    for (const qs of ['q=a&foo=1', 'q=a&in=trips', 'q=a&field=name', 'q=a&exact=yes', 'q=a&q=b']) expect(parseSearch(qs).dropped, qs).toBe(true);
  });
  it('drops another group with field=family, with the notice', () => {
    const p = parseSearch('q=Saha&field=family&in=districts');
    expect(p.dropped).toBe(true);
    expect(serializeSearch(p)).toBe('q=Saha&field=family');
  });
  it('drops field and exact silently without a query', () => {
    const p = parseSearch('field=family&exact=1');
    expect(p.dropped).toBe(false);
    expect(serializeSearch(p)).toBe('');
  });
  it('trims and caps q at 100 characters', () => {
    expect(parseSearch(`q=${'a'.repeat(120)}`).q).toHaveLength(100);
    expect(parseSearch('q=%20%20').q).toBeUndefined();
  });
});

describe('example searches (FR-25)', () => {
  it('picks a Latin name, a Bangla name and a family, each of which finds something', () => {
    const ex = exampleSearches(index);
    expect(ex.latin).toMatch(/^\p{Script=Latin}/u);
    expect(ex.bangla).toMatch(/^\p{Script=Bengali}/u);
    expect(ex.family.split(' ')).toHaveLength(2);
    expect(m.search(ex.latin).sites.length).toBeGreaterThan(0);
    expect(m.search(ex.bangla).sites.length).toBeGreaterThan(0);
    expect(m.search(ex.family, { field: 'family' }).sites.length).toBeGreaterThan(1);
  });
});
