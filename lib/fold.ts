// Spelling folding for search (roadmap task 8.1, spec 08 FR-1 to FR-4). Pure: the browser folds the index
// and the query with it, and the tests fold the data with it (A-3). Two spellings that should find each
// other fold to the same string: case, Latin accents, Bangla vowel length and nukta forms, and the Latin
// variants in VARIANTS. foldWithMap also says where each folded character came from, so a match in folded
// text can be marked in the original (FR-3, FR-17).

/** Latin spellings of one word, canonical first (FR-2). The only list of variants; whole words only. */
export const VARIANTS: readonly (readonly string[])[] = [
  ['zamindar', 'jomidar', 'jamidar', 'jamindar', 'zomindar', 'zamidar', 'jomindar'],
  ['bari', 'badi', 'bary'],
  ['chowdhury', 'choudhury', 'chaudhuri', 'chaudhury', 'choudhuri', 'chowdhuri'],
  ['rajbari', 'rajbadi'],
];
const CANONICAL = new Map(VARIANTS.flatMap(group => group.map(w => [w, group[0]] as const)));

// Bangla: ী → ি, ূ → ু; য়, ড়, ঢ় precomposed → base + nukta (D6). NFC already decomposes the three
// precomposed letters (they are composition exclusions), so the map only makes that explicit.
const BANGLA: Record<string, string> = { 'ী': 'ি', 'ূ': 'ু', 'য়': 'য়', 'ড়': 'ড়', 'ঢ়': 'ঢ়' };
// Bengali digits fold to Latin, so "১৮৯৯" finds 1899 (spec 15 FR-13); one character each, so marks stay aligned.
const BN_DIGIT: Record<string, string> = Object.fromEntries([...'০১২৩৪৫৬৭৮৯'].map((d, k) => [d, String(k)]));
const JOINERS = /[‌‍]/g;
const WORD_CHAR = /[\p{L}\p{M}\p{N}]/u;
const LATIN = /\p{Script=Latin}/u;

/** A folded string, and for each of its characters the source range [start, end) it came from. */
export interface Folded { text: string; start: number[]; end: number[] }

/**
 * One source unit at a time: a code point plus the combining marks and joiners after it, so a Bangla
 * vowel sign or hasanta always stays with its letter and a mark never splits from its base (FR-17).
 */
function units(source: string): [number, number][] {
  const out: [number, number][] = [];
  let i = 0;
  while (i < source.length) {
    const start = i;
    i += source.codePointAt(i)! > 0xffff ? 2 : 1;
    while (i < source.length && /[\p{M}‌‍]/u.test(source[i])) i++;
    out.push([start, i]);
  }
  return out;
}

function foldUnit(unit: string): string {
  let s = unit.normalize('NFC').replace(JOINERS, '').toLowerCase();
  if (LATIN.test(s)) s = s.normalize('NFD').replace(/\p{M}/gu, '');
  return [...s].map(ch => BANGLA[ch] ?? BN_DIGIT[ch] ?? ch).join('');
}

/** fold() with the source range of every folded character. */
export function foldWithMap(source: string): Folded {
  // 1. Characters: normalised, lower-cased, Latin accents removed; anything not a letter, mark or digit is a space.
  const chars: { ch: string; s: number; e: number }[] = [];
  for (const [s, e] of units(source)) {
    const f = foldUnit(source.slice(s, e));
    if (!f || !WORD_CHAR.test(f)) {
      if (chars.length && chars[chars.length - 1].ch !== ' ') chars.push({ ch: ' ', s, e });
      continue;
    }
    for (const ch of f) chars.push({ ch: WORD_CHAR.test(ch) ? ch : ' ', s, e });
  }
  while (chars.length && chars[chars.length - 1].ch === ' ') chars.pop();
  // 2. Words: a Latin variant becomes its canonical spelling, every character mapped to the source word.
  const out: Folded = { text: '', start: [], end: [] };
  let k = 0;
  while (k < chars.length) {
    if (chars[k].ch === ' ') {
      out.text += ' '; out.start.push(chars[k].s); out.end.push(chars[k].e); k++;
      continue;
    }
    let j = k;
    while (j < chars.length && chars[j].ch !== ' ') j++;
    const word = chars.slice(k, j).map(c => c.ch).join('');
    const canon = CANONICAL.get(word);
    if (canon) {
      for (const ch of canon) { out.text += ch; out.start.push(chars[k].s); out.end.push(chars[j - 1].e); }
    } else {
      for (let m = k; m < j; m++) { out.text += chars[m].ch; out.start.push(chars[m].s); out.end.push(chars[m].e); }
    }
    k = j;
  }
  return out;
}

/** The search form of a string: deterministic and idempotent (FR-1, FR-2). */
export const fold = (source: string): string => foldWithMap(source).text;

/** The folded words of a string. */
export const words = (source: string): string[] => {
  const f = fold(source);
  return f ? f.split(' ') : [];
};

/** A folded word with its source range. */
export interface Token { word: string; start: number; end: number }

/** The words of a string with where each one sits in the source. */
export function tokens(source: string): Token[] {
  const f = foldWithMap(source);
  const out: Token[] = [];
  let k = 0;
  while (k < f.text.length) {
    if (f.text[k] === ' ') { k++; continue; }
    let j = k;
    while (j < f.text.length && f.text[j] !== ' ') j++;
    out.push({ word: f.text.slice(k, j), start: f.start[k], end: f.end[j - 1] });
    k = j;
  }
  return out;
}

/**
 * Words too common to tell sites apart (D4): they count only when a query has nothing else (FR-6).
 * Written as people type them; folded when the module loads. The final list is OQ-2.
 */
const GENERIC_SOURCE = [
  'zamindar', 'bari', 'rajbari', 'palace', 'house', 'bhaban', 'kachari', 'the', 'of', 'and',
  'জমিদার', 'বাড়ি', 'রাজবাড়ি', 'ভবন', 'প্রাসাদ',
];
export const GENERIC: ReadonlySet<string> = new Set(GENERIC_SOURCE.map(fold));

/** The variant groups a query used, for the "Searching as" note (FR-21). */
export const variantsUsed = (query: string): (readonly string[])[] => {
  const raw = query.toLowerCase().split(/[^\p{L}\p{N}]+/u);
  return VARIANTS.filter(group => raw.some(w => w !== group[0] && group.includes(w)));
};
