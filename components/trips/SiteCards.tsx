// A card for each site on an itinerary (spec 09 FR-33, D5), from the site records at build time: the stop
// number, the first Ready photo with its exact credit (or the placeholder), the condition, the visitor access
// with the fee only as a known price (R6), the closing days only when reviewed, and a link to the site page.
// The same cards fill the printout's second page.

import Link from 'next/link';
import { Both, T } from '@/components/T';
import { PlaceholderArt } from '@/components/art/PlaceholderArt';
import { AccessBadge, Badge, ConditionBadge } from '@/components/site/Badges';
import { both, formatCount } from '@/lib/format';
import { dual, type Dual } from '@/lib/i18n';
import { siteHref } from '@/lib/site-url';
import { DAYS } from '@/lib/trips';
import type { ClosedDays, SiteRecord } from '@/lib/types';
import { StopNumber } from './Stops';

/** "Closed Sunday, Monday" or "No weekly closing day"; nothing when the reviewed column is empty. */
export function closedLabel(closed: ClosedDays): Dual | undefined {
  if (!closed.known) return undefined;
  if (!closed.days.length) return dual('trip.noClosingDay');
  const days = DAYS.filter(d => closed.days.includes(d)).map(d => dual(`day.${d}`));
  return dual('trip.closedOn', { days: { en: days.map(d => d.en).join(', '), bn: days.map(d => d.bn).join(', ') } });
}

export function SiteCards({ sites }: { sites: { order: number; site: SiteRecord }[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 print:grid-cols-2" data-site-cards>
      {sites.map(({ order, site }) => {
        const img = site.images[0];
        const closed = closedLabel(site.visiting.closedDays);
        return (
          <li key={site.id} className="overflow-hidden rounded-lg border border-line bg-surface print:break-inside-avoid" data-site-card={site.id}>
            <figure>
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element -- static export: committed, pre-sized thumbnails
                <img src={img.thumb} alt={img.alt} lang={img.altLang} width={480} height={360} loading="lazy" className="aspect-[16/9] w-full object-cover print:aspect-auto print:h-32" />
              ) : <PlaceholderArt size="card" tint={site.condition} className="!aspect-[16/9] print:hidden" />}
              {img ? <figcaption lang="en" className="px-3 pt-1 text-xs text-muted [overflow-wrap:anywhere]" data-credit>{img.credit}</figcaption> : null}
            </figure>
            <div className="space-y-2 p-3">
              <h3 className="flex items-center gap-2 font-serif text-h3">
                <StopNumber order={order} kind="site" />
                <span className="sr-only"><T k="trip.stopN" vars={{ n: both(formatCount, order) }} />:</span>
                <Link prefetch={false} href={siteHref(site.id, site.slug)} className="hover:underline">
                  <span lang="en" className="block">{site.name.en}</span>
                  {site.name.bn ? <span lang="bn" className="block font-bn text-bn-sm font-normal text-muted">{site.name.bn}</span> : null}
                </Link>
              </h3>
              <p className="flex flex-wrap gap-1.5">
                <ConditionBadge condition={site.condition} />
                <AccessBadge access={site.access} fee={site.visiting.fee.known ? site.visiting.fee.value : undefined} />
                {closed ? <Badge tone="gold"><Both value={closed} /></Badge> : null}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
