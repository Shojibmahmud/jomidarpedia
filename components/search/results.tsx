// Pieces shared by the search overlay and /search/ (spec 08): where a site matched, family and district
// destinations (FR-8, FR-9, FR-10, FR-34). No hooks.

import { T } from '@/components/T';
import { EMPTY } from '@/lib/filters';
import { both, formatCount } from '@/lib/format';
import { text, type Lang, type StringKey } from '@/lib/i18n';
import { exploreHref } from '@/lib/urlState';
import { searchHref } from '@/lib/searchUrl';
import type { SearchDistrict, SearchResult, SiteHit } from '@/lib/search';
import { Marked } from './Marked';

/** A district result leads to Explore filtered to it, until district pages exist (A-1). */
export const districtHref = (d: SearchDistrict) =>
  exploreHref({ state: { ...EMPTY, div: [d.divisionSlug], dist: [d.slug] }, sort: 'time', extras: {} });

/** A family result lists the sites whose founder or family field names it (FR-10, FR-11). */
export const familyHref = (phrase: string) => searchHref({ q: phrase, field: 'family' });

/** "matched in name", "matched in other name: …", "matched in district", "matched in founder or family: …" (FR-8). */
export function MatchNote({ hit }: { hit: SiteHit }) {
  switch (hit.field) {
    case 'e': case 'b': return <T k="search.in.name" />;
    case 'd': return <T k="search.in.district" />;
    case 'a': return <><T k="search.in.alt" /> <span lang="en" className="font-semibold text-ink"><Marked text={hit.detail ?? ''} terms={hit.terms} /></span></>;
    case 'fm': return <><T k="search.in.family" /> <span lang="en" className="font-semibold text-ink"><Marked text={hit.detail ?? ''} terms={hit.terms} /></span></>;
  }
}

const plural = (key: 'sites' | 'families' | 'districts', n: number, lang: Lang) =>
  text((n === 1 ? `search.count.${key}.one` : `search.count.${key}`) as StringKey, lang, { count: both(formatCount, n) });

/** "5 sites, 1 family, 0 districts", or "No matches", for the live regions (FR-16). */
export function announce(r: SearchResult, lang: Lang): string {
  if (!r.sites.length && !r.families.length && !r.districts.length) return text('search.noMatches', lang);
  return [plural('sites', r.sites.length, lang), plural('families', r.families.length, lang), plural('districts', r.districts.length, lang)].join(', ');
}
