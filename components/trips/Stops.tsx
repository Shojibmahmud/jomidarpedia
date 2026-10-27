// The stops of an itinerary (roadmap task 9.4, spec 09 FR-23 to FR-26). Clock times only for a reviewed timed
// plan (D1); otherwise the order alone, even when the data has times. A site stop links to its page, with its
// Bangla name where it has one; a place (a terminal, a lunch stop, a ghat) is labelled and has no page.
// In print the list becomes the stop table with a checkbox column (FR-47).

import Link from 'next/link';
import { Both, Prose, T } from '@/components/T';
import { Badge } from '@/components/site/Badges';
import { both, formatCount } from '@/lib/format';
import { siteHref } from '@/lib/site-url';
import { showTimes } from '@/lib/trips';
import type { Itinerary } from '@/lib/types';

export type StopSite = { slug: string; en: string; bn?: string };

export function StopNumber({ order, kind }: { order: number; kind: 'site' | 'place' }) {
  return (
    <span aria-hidden="true" className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${kind === 'site' ? 'border-primary bg-primary text-on-primary' : 'border-ink bg-surface text-ink'}`}>
      <Both value={both(formatCount, order)} />
    </span>
  );
}

export function StopName({ stop, site }: { stop: Itinerary['stops'][number]; site?: StopSite }) {
  if (stop.kind === 'site' && stop.siteId && site) {
    return (
      <Link prefetch={false} href={siteHref(stop.siteId, site.slug)} className="font-semibold text-primary underline">
        <span lang="en" data-l={site.bn ? 'en' : undefined}>{site.en}</span>
        {site.bn ? <span lang="bn" data-l="bn">{site.bn}</span> : null}
      </Link>
    );
  }
  return <span className="font-semibold"><Prose en={stop.name} bn={stop.nameBn} /></span>;
}

export function Stops({ trip, sites }: { trip: Itinerary; sites: Record<string, StopSite> }) {
  const timed = showTimes(trip);
  return (
    <ol className="space-y-0" data-stops data-timed={timed || undefined}>
      {trip.stops.map((s, k) => (
        <li key={s.order} data-stop={s.order} data-kind={s.kind}
          className={`relative grid gap-x-3 pb-5 ${timed ? 'grid-cols-[4.5rem_2rem_minmax(0,1fr)_auto]' : 'grid-cols-[2rem_minmax(0,1fr)_auto]'} print:break-inside-avoid print:border-b print:border-line print:py-2`}>
          {timed ? <span className="pt-1 font-mono text-sm" lang="en" data-time>{s.time ?? ''}</span> : null}
          <span className="relative flex justify-center">
            {k < trip.stops.length - 1 ? <span aria-hidden="true" className="absolute top-8 -bottom-5 w-px bg-line-strong print:hidden" /> : null}
            <StopNumber order={s.order} kind={s.kind} />
          </span>
          <div className="min-w-0 space-y-1 pt-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="sr-only"><T k="trip.stopN" vars={{ n: both(formatCount, s.order) }} />:</span>
              <StopName stop={s} site={s.siteId ? sites[s.siteId] : undefined} />
              {s.kind === 'place' ? <Badge><T k="trip.place" /></Badge> : null}
            </p>
            {s.note ? <p className="text-sm text-muted"><Prose en={s.note} bn={s.noteBn} /></p> : null}
          </div>
          <span aria-hidden="true" className="hidden h-5 w-5 border-2 border-ink print:mt-1 print:inline-block" />
        </li>
      ))}
    </ol>
  );
}
