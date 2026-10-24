// Explore sort orders (roadmap task 6.4, spec 06 FR-15, D8, A-8). Pure and stable: every order ends
// with the site ID, so the same sites give the same list whatever order they arrive in.
// - time: travel-time bucket, then exact hours, then sites with a bucket but no exact time; unknown last.
//   Ties by English name in both languages, so the default order is the same in English and Bangla.
// - name, district: in the interface language (Bangla names fall back to English when missing).

import { BUCKET_ORDER } from './filters';
import type { Lang } from './i18n';
import type { IndexSite } from './types';
import type { Sort } from './urlState';

const collators: Partial<Record<Lang, Intl.Collator>> = {};
const collator = (lang: Lang) => (collators[lang] ??= new Intl.Collator(lang));

const byId = (a: IndexSite, b: IndexSite) => (a.i < b.i ? -1 : a.i > b.i ? 1 : 0);
const name = (s: IndexSite, lang: Lang) => (lang === 'bn' ? s.b ?? s.e : s.e);
const byName = (lang: Lang) => (a: IndexSite, b: IndexSite) => collator(lang).compare(name(a, lang), name(b, lang)) || byId(a, b);

function byTime(a: IndexSite, b: IndexSite) {
  return BUCKET_ORDER.indexOf(a.tb) - BUCKET_ORDER.indexOf(b.tb)
    || (a.h ?? Infinity) - (b.h ?? Infinity)
    || collator('en').compare(a.e, b.e)
    || byId(a, b);
}

export function sortSites(sites: readonly IndexSite[], sort: Sort, lang: Lang): IndexSite[] {
  const list = [...sites];
  if (sort === 'time') return list.sort(byTime);
  if (sort === 'name') return list.sort(byName(lang));
  const district = (s: IndexSite) => (lang === 'bn' ? s.db : s.d);
  const names = byName(lang);
  return list.sort((a, b) => collator(lang).compare(district(a), district(b)) || names(a, b));
}
