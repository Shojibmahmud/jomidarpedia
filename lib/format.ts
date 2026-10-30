// Number and date formatting for both languages (roadmap task 3.2). Each function takes (value, lang)
// and returns a string; pages render both forms at build time (components/T.tsx <Both>), so the
// browser never formats anything. Bangla uses the digits ০–৯.
// Nothing here invents a value: an unknown, zero fee or unparseable date throws, so the build fails
// instead of showing something wrong. Callers show the contract's text for unknowns ("Not documented").
// IDs and coordinates always keep Latin digits (formatId, formatCoords).

import type { Dual, Lang } from './i18n';

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const bnDigits = (s: string) => s.replace(/[0-9]/g, d => BN_DIGITS[Number(d)]);
const digits = (s: string, lang: Lang) => (lang === 'bn' ? bnDigits(s) : s);

// Spans of Bangla prose whose digits stay Latin (spec 15 FR-10): URLs, decimal coordinate pairs, phone numbers
// (docs/TRANSLATION_BN.md; and so a phone still offers to call them), and any whitespace-delimited token with a
// Latin letter or a degree sign (JB-DHK-088, bdnews24, HG57+87, 23°44‘N).
const KEEP_LATIN = [
  /https?:\/\/\S+/g,
  /-?\d{1,3}\.\d{3,},\s*-?\d{1,3}\.\d{3,}/g,
  /(?:\+?880[- ]?)?0?1[3-9]\d{2}[- ]?\d{6}(?!\d)/g,
  /\S*[A-Za-z°]\S*/g,
];

/**
 * Bangla prose from the translations, as shown in Bangla mode (spec 15 FR-8 to FR-11): digits become ০–৯,
 * except in IDs, codes, URLs and coordinates. The translations themselves keep Latin digits (D-3).
 */
export function bnProseDigits(s: string): string {
  if (!/[0-9]/.test(s)) return s;
  const keep = new Uint8Array(s.length);
  for (const re of KEEP_LATIN) {
    for (const m of s.matchAll(re)) if (/[0-9]/.test(m[0])) keep.fill(1, m.index, m.index + m[0].length);
  }
  return s.replace(/[0-9]/g, (d, at: number) => (keep[at] ? d : BN_DIGITS[Number(d)]));
}

const MONTHS: Record<Lang, string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  bn: ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'],
};

function finite(value: number, fn: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${fn}: not a finite number (${value})`);
}

// Thousands separated by commas in both languages (1,136 / ১,১৩৬), as on the boards.
const grouped = (n: number, decimals = 0) => {
  const [int, frac] = Math.abs(n).toFixed(decimals).split('.');
  const body = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (frac && Number(frac) ? `.${frac.replace(/0+$/, '')}` : '');
  return (n < 0 ? '-' : '') + body;
};

/** 1,136 / ১,১৩৬ */
export function formatCount(value: number, lang: Lang): string {
  finite(value, 'formatCount');
  if (!Number.isInteger(value) || value < 0) throw new Error(`formatCount: not a count (${value})`);
  return digits(grouped(value), lang);
}

/** Tk 30 / ৩০ টাকা. Throws on 0 or less: a zero or unknown fee is never shown as a price (R6). */
export function formatMoney(value: number, lang: Lang): string {
  finite(value, 'formatMoney');
  if (value <= 0) throw new Error(`formatMoney: ${value} is not a price; show the contract's text instead`);
  const n = grouped(value, 2);
  return lang === 'bn' ? `${bnDigits(n)} টাকা` : `Tk ${n}`;
}

/** 2.5 h / ২.৫ ঘণ্টা (travel time). */
export function formatHours(value: number, lang: Lang): string {
  finite(value, 'formatHours');
  if (value < 0) throw new Error(`formatHours: negative (${value})`);
  const n = grouped(value, 2);
  return lang === 'bn' ? `${bnDigits(n)} ঘণ্টা` : `${n} h`;
}

/** YYYY-MM-DD → 21 October 2026 / ২১ অক্টোবর ২০২৬; YYYY-MM → October 2026; YYYY → 2026. */
export function formatDate(value: string, lang: Lang): string {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value ?? '');
  if (!m) throw new Error(`formatDate: not YYYY, YYYY-MM or YYYY-MM-DD ("${value}")`);
  const [, y, mo, d] = m;
  const month = mo ? Number(mo) : undefined;
  if (month !== undefined && (month < 1 || month > 12)) throw new Error(`formatDate: no month ${mo} ("${value}")`);
  if (d) {
    const day = Number(d);
    const last = new Date(Date.UTC(Number(y), month!, 0)).getUTCDate();
    if (day < 1 || day > last) throw new Error(`formatDate: no day ${d} in ${y}-${mo} ("${value}")`);
  }
  const parts = [d ? String(Number(d)) : '', month ? MONTHS[lang][month - 1] : '', y].filter(Boolean).join(' ');
  return digits(parts, lang);
}

/** Site, image and source IDs: always Latin digits. Render inside lang="en" (components/T.tsx <Latin>). */
export function formatId(id: string): string {
  if (!/^[A-Z0-9-]+$/.test(id ?? '')) throw new Error(`formatId: not an ID ("${id}")`);
  return id;
}

/** 23.95678° N, 90.12345° E: always Latin digits. Pass coordinates of mappable records only (R5). */
export function formatCoords(lat: number, lon: number): string {
  finite(lat, 'formatCoords'); finite(lon, 'formatCoords');
  const f = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(5)}° ${v >= 0 ? pos : neg}`;
  return `${f(lat, 'N', 'S')}, ${f(lon, 'E', 'W')}`;
}

/** Both languages of one formatter call, for <Both> and i18n placeholders. */
export function both<V>(fn: (value: V, lang: Lang) => string, value: V): Dual {
  return { en: fn(value, 'en'), bn: fn(value, 'bn') };
}
