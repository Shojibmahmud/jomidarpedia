// Related sites (spec 05 FR-12, FR-32, FR-44): identity notes under the summary ("Not the same place as …"),
// "Combine with" for combine_on_trip only, and the itineraries a site is part of: each links to its trip page,
// and a reviewed timed plan also shows its stops with clock times (spec 09 FR-51, FR-52, D7).

import Link from 'next/link';
import { Both, Latin, T } from '@/components/T';
import { PlaceholderArt } from '@/components/art/PlaceholderArt';
import { both, formatHours } from '@/lib/format';
import { getTrip } from '@/lib/data';
import { combineWith, identityNotes } from '@/lib/site-page';
import { showTimes } from '@/lib/trips';
import { siteHref } from '@/lib/site-url';
import type { Itinerary, SiteRecord } from '@/lib/types';
import { PlanBadge, tripHref } from '@/components/trips/ItineraryCard';
import { ConditionBadge } from './Badges';

export function IdentityNotes({ site }: { site: SiteRecord }) {
  const notes = identityNotes(site);
  if (!notes.length) return null;
  return (
    <ul className="space-y-2" data-identity-notes>
      {notes.map(r => (
        <li key={r.id} className="rounded-md border border-gold/40 bg-gold-tint p-3 text-sm">
          <span className="font-semibold"><T k={`relation.${r.relation as Exclude<typeof r.relation, 'combine_on_trip'>}`} /></span>{' '}
          <Link prefetch={false} href={siteHref(r.id, r.slug)} className="font-semibold text-primary underline">
            <span lang="en">{r.en}</span>{r.bn ? <> (<span lang="bn">{r.bn}</span>)</> : null}
          </Link>
          {r.note ? <span className="block text-muted"><Latin>{r.note}</Latin></span> : null}
        </li>
      ))}
    </ul>
  );
}

export function CombineWith({ site }: { site: SiteRecord }) {
  const sites = combineWith(site);
  if (!sites.length) return <p className="italic text-muted"><T k="combine.none" /></p>;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-combine>
      {sites.map(r => (
        <li key={r.id} className="overflow-hidden rounded-lg border border-line bg-surface">
          <Link prefetch={false} href={siteHref(r.id, r.slug)} className="block">
            {r.thumb
              // eslint-disable-next-line @next/next/no-img-element -- static export: committed, pre-sized thumbnails
              ? <img src={r.thumb} alt="" width={480} height={360} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              : <PlaceholderArt tint={r.c} />}
            <span className="block space-y-1 p-3">
              <span lang="en" className="block font-semibold text-primary underline">{r.en}</span>
              {r.bn ? <span lang="bn" className="block font-bn text-sm text-muted">{r.bn}</span> : <span className="block text-xs text-muted"><T k="common.bnNameMissing" /></span>}
              {r.h !== undefined ? <span className="block text-sm text-muted"><Both value={both(formatHours, r.h)} /></span> : null}
            </span>
          </Link>
          <div className="px-3 pb-3"><ConditionBadge condition={r.c} /></div>
        </li>
      ))}
    </ul>
  );
}

export function Itineraries({ site }: { site: SiteRecord }) {
  if (!site.itineraries.length) return <p className="italic text-muted"><T k="trip.none" /></p>;
  return (
    <ul className="divide-y divide-line rounded-lg border border-line bg-surface" data-itineraries>
      {site.itineraries.map(it => {
        const trip = getTrip(it.id);
        return (
          <li key={it.id} className="space-y-3 px-4 py-3" data-itinerary={it.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link prefetch={false} href={tripHref(it.id)} lang="en" className="font-semibold text-primary underline">{it.title}</Link>
              <span className="flex flex-wrap gap-1.5">
                <span className="badge bg-indigo-tint text-indigo"><T k={`trip.${it.duration as Itinerary['duration']}`} /></span>
                <PlanBadge status={trip.planStatus} />
              </span>
            </div>
            {showTimes(trip) ? <TimedPreview trip={trip} /> : null}
          </li>
        );
      })}
    </ul>
  );
}

/** The stop-by-stop preview with clock times, for a reviewed timed plan only (FR-52). */
function TimedPreview({ trip }: { trip: Itinerary }) {
  return (
    <div data-timed-preview>
      <p className="text-sm font-semibold text-muted"><T k="trip.preview" /></p>
      <ol className="mt-1 space-y-1 text-sm">
        {trip.stops.map(s => (
          <li key={s.order} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
            <span lang="en" className="font-mono">{s.time ?? ''}</span>
            <span lang="en">{s.name}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
