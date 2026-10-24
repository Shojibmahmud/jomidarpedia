// Site card (roadmap task 6.1, spec 06 FR-4, FR-5) in three layouts: full (Home), compact (the Phase 7
// sheet) and row (the Explore list). No hooks and no server-only imports, so client lists can render it.
// One link, on the name, stretched over the card. Unknowns are words: no blank time, no "Free" or "Tk 0" (R6),
// and a hidden pin says "No map location yet" (R5).

import Link from 'next/link';
import { Both, T } from '@/components/T';
import { PlaceholderArt } from '@/components/art/PlaceholderArt';
import { AccessBadge, ConditionBadge } from '@/components/site/Badges';
import { bucketLabel } from '@/lib/explore-labels';
import { both, formatHours } from '@/lib/format';
import { siteHref } from '@/lib/site-url';
import type { IndexSite } from '@/lib/types';

export type CardVariant = 'full' | 'compact' | 'row';

function Photo({ site, variant }: { site: IndexSite; variant: CardVariant }) {
  const size = variant === 'row' ? 'w-20 shrink-0' : 'w-full';
  if (!site.img) return <PlaceholderArt size={variant === 'row' ? 'thumb' : 'card'} tint={site.c} className={`rounded-md ${variant === 'row' ? 'shrink-0' : ''}`} />;
  // Decorative (alt=""): the name follows.
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export: committed, pre-sized thumbnails
    <img src={`/thumbs/${site.img.id}.webp`} alt="" width={480} height={360} loading="lazy" decoding="async"
      className={`aspect-[4/3] rounded-md bg-surface-2 object-cover ${size}`} />
  );
}

function TravelTime({ site }: { site: IndexSite }) {
  if (site.h !== undefined) return <Both value={both(formatHours, site.h)} />;
  if (site.tb !== 'unknown') return <Both value={bucketLabel(site.tb)} />;
  return <T k="card.timeUnknown" />;
}

/** `action` is a control above the stretched link, such as Explore's "Show on map" (spec 07 FR-20). */
export function SiteCard({ site, variant, highlight = false, headingLevel = 3, action }: {
  site: IndexSite; variant: CardVariant; highlight?: boolean; headingLevel?: 2 | 3 | 4; action?: React.ReactNode;
}) {
  const Heading = `h${headingLevel}` as const;
  const place = { en: site.u ? `${site.u}, ${site.d}` : site.d, bn: site.u ? `${site.u}, ${site.db}` : site.db };
  const row = variant === 'row';
  return (
    <article data-card={variant} data-site={site.i}
      className={`relative flex gap-3 rounded-lg ${row ? 'flex-row items-start p-3' : 'flex-col p-2'} ${highlight ? 'bg-surface-2 ring-2 ring-ink' : 'bg-surface'} hover:bg-surface-2`}>
      <Photo site={site} variant={variant} />
      <div className="min-w-0 flex-1 space-y-1">
        <Heading className={variant === 'full' ? 'font-serif text-h3' : 'text-lg font-semibold'}>
          <Link prefetch={false} href={siteHref(site.i, site.s)} className="after:absolute after:inset-0 after:rounded-lg hover:underline">
            <span lang="en" className="block">{site.e}</span>
            {site.b ? <span lang="bn" className="block font-bn text-bn-sm font-normal text-muted">{site.b}</span> : null}
          </Link>
        </Heading>
        {site.b ? null : <p className="text-xs text-muted"><T k="common.bnNameMissing" /></p>}
        <p className="text-sm text-muted"><Both value={place} /> · <TravelTime site={site} /></p>
        <p className="flex flex-wrap gap-1.5">
          <ConditionBadge condition={site.c} />
          <AccessBadge access={site.ac} fee={site.fe} />
        </p>
        {site.ll ? null : (
          <p className="flex items-center gap-1 text-sm text-muted" data-nopin>
            <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <path d="M8.5 5.5A6 6 0 0 1 18 10c0 1.6-.5 3.2-1.3 4.6M14.5 17.8C13.2 19.6 12 21 12 21s-6-5.6-6-11c0-.7.1-1.4.3-2" /><path d="M3 3l18 18" />
            </svg>
            <T k="location.noPin" />
          </p>
        )}
        {site.img ? <p lang="en" className="text-xs text-muted [overflow-wrap:anywhere]" data-credit>{site.img.credit}</p> : null}
        {action ? <div className="relative z-10 pt-1">{action}</div> : null}
      </div>
    </article>
  );
}
