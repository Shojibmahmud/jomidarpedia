// The top of the site page (roadmap task 5.4, spec 05 FR-3 to FR-7): breadcrumb, both names, the badge row
// and, for sparse records, the "Little is documented" banner.

import { Both, Latin, T } from '@/components/T';
import { dual } from '@/lib/i18n';
import { both, formatCount } from '@/lib/format';
import type { SiteRecord } from '@/lib/types';
import { AccessBadge, Badge, ConditionBadge, DayTripBadge, LocationBadge } from './Badges';

/** Both names (R10). Without a Bangla name (O13) the English name stands alone and the note sits outside the <h1>. */
export function BilingualName({ site }: { site: SiteRecord }) {
  return (
    <>
      <h1 className="font-serif text-h1">
        <span lang="en" className="block">{site.name.en}</span>
        {site.name.bn ? <span lang="bn" className="block font-bn-serif text-bn-h3 text-muted">{site.name.bn}</span> : null}
      </h1>
      {site.bnMissing ? <p className="text-sm text-muted"><T k="common.bnNameMissing" /></p> : null}
    </>
  );
}

/** Division, district and upazila as text: their pages arrive in Phase 10. */
export function Breadcrumb({ site }: { site: SiteRecord }) {
  const p = site.place;
  const crumbs = [{ en: `${p.division} Division`, bn: `${p.divisionBn} বিভাগ` }, { en: p.district, bn: p.districtBn }, { en: p.upazila, bn: p.upazilaBn }]
    .filter(c => c.en.trim());
  return (
    <nav aria-label={dual('site.breadcrumb').en} className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-x-2">
        {crumbs.map((c, k) => <li key={k} className="after:ml-2 after:content-['/']"><Both value={{ en: c.en, bn: c.bn || c.en }} /></li>)}
        <li aria-current="page" className="text-ink"><Latin>{site.name.en}</Latin></li>
      </ol>
    </nav>
  );
}

const count = (n: number) => ({ count: both(formatCount, n) });

export function BadgeRow({ site, disagree, questions }: { site: SiteRecord; disagree: number; questions: number }) {
  const fee = site.visiting.fee.known ? site.visiting.fee.value : undefined;
  return (
    <ul className="flex flex-wrap gap-2">
      <li><ConditionBadge condition={site.condition} /></li>
      <li><AccessBadge access={site.access} fee={fee} /></li>
      <li><DayTripBadge dayTrip={site.travel.dayTrip} hours={site.travel.hours} /></li>
      <li><LocationBadge status={site.location.status} mappable={!!site.location.latlon} flagged={site.location.flagged} /></li>
      {site.sources.length ? <li><Badge>{site.sources.length === 1 ? <T k="pill.sources.one" vars={count(1)} /> : <T k="pill.sources" vars={count(site.sources.length)} />}</Badge></li> : null}
      {disagree ? <li><a href="#where-sources-disagree"><Badge tone="gold">{disagree === 1 ? <T k="pill.disagree.one" vars={count(1)} /> : <T k="pill.disagree" vars={count(disagree)} />}</Badge></a></li> : null}
      {questions ? <li><a href="#open-questions"><Badge tone="gold">{questions === 1 ? <T k="pill.questions.one" vars={count(1)} /> : <T k="pill.questions" vars={count(questions)} />}</Badge></a></li> : null}
    </ul>
  );
}

/** For sparse records only (lib/site-page.ts isSparse). */
export function RecordBanner() {
  return (
    <aside className="flex flex-wrap items-start gap-3 rounded-lg border border-gold/40 bg-gold-tint p-4" aria-labelledby="sparse-title">
      <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" className="mt-0.5 shrink-0 text-gold" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx={12} cy={12} r={9} /><path d="M12 11v5M12 7.5v.5" strokeLinecap="round" />
      </svg>
      <div className="min-w-0 flex-1">
        <p id="sparse-title" className="font-semibold"><T k="sparse.title" /></p>
        <p className="text-sm"><T k="sparse.body" /></p>
      </div>
      <a href="#what-we-know" className="inline-flex min-h-tap items-center rounded-md border border-line-strong bg-surface px-3 text-sm font-semibold"><T k="known.title" /></a>
    </aside>
  );
}
