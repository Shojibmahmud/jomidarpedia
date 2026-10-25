// Trip card (roadmap task 9.1, spec 09 FR-12 to FR-16) for the listing, and later Home (11.5) and division
// pages (10.1). No hooks and no server-only imports, so the listing's client part can render it.
// A status badge only for a reviewed plan_status (D1); the footer gives the anchor's travel time, never a start
// place or clock time (D15); the photo strip numbers each photo by its stop (D4), with credits behind a button.

import Link from 'next/link';
import { Both, T } from '@/components/T';
import { PlaceholderArt } from '@/components/art/PlaceholderArt';
import { Badge } from '@/components/site/Badges';
import { both, formatCount, formatHours } from '@/lib/format';
import type { PlanStatus } from '@/lib/types';
import type { TripCard } from '@/lib/trips';
import { PhotoCredits } from './PhotoCredits';

const n = (v: number) => both(formatCount, v);
export const tripHref = (id: string) => `/trips/${id}/`;

export function DurationBadge({ duration }: { duration: TripCard['duration'] }) {
  return <Badge tone={duration === 'Not stated' ? 'plain' : 'indigo'}><T k={`trip.${duration}`} /></Badge>;
}

const PLAN_TONE = { timed: 'moss', circuit: 'plain', incomplete: 'gold' } as const;
/** Nothing until the editor has reviewed plan_status (D1). */
export function PlanBadge({ status }: { status?: PlanStatus }) {
  if (!status) return null;
  return <span data-plan={status}><Badge tone={PLAN_TONE[status]}><T k={`plan.${status}`} /></Badge></span>;
}

export function StopsBadge({ count }: { count: number }) {
  return <Badge><T k={count === 1 ? 'trip.stops.one' : 'trip.stops'} vars={{ count: n(count) }} /></Badge>;
}

export function ItineraryCard({ trip, headingLevel = 2 }: { trip: TripCard; headingLevel?: 2 | 3 }) {
  const Heading = `h${headingLevel}` as const;
  const photos = trip.photos ?? [];
  return (
    <article className="relative flex w-full flex-col overflow-hidden rounded-lg border border-line bg-surface hover:bg-surface-2" data-trip={trip.id}>
      <div className="relative">
        {/* Each photo fills its cell absolutely, so the strip is 2:1 however many photos it has (one 4:3 photo used to stretch it). */}
        {photos.length ? (
          <div className="grid aspect-[2/1] grid-flow-col auto-cols-fr gap-px bg-line" data-photos={photos.length}>
            {photos.map(p => (
              <div key={p.n} className="relative min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- static export: committed, pre-sized thumbnails */}
                <img src={p.thumb} alt="" width={480} height={360} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                <span aria-hidden="true" className="absolute bottom-2 left-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-primary px-1 text-xs font-bold text-white">
                  <Both value={n(p.n)} />
                </span>
              </div>
            ))}
          </div>
        ) : <PlaceholderArt size="card" tint="unknown" className="!aspect-[2/1]" />}
        <ul className="absolute left-2 top-2 flex flex-wrap gap-1.5">
          <li><DurationBadge duration={trip.duration} /></li>
          {trip.planStatus ? <li><PlanBadge status={trip.planStatus} /></li> : null}
          <li><StopsBadge count={trip.stopCount} /></li>
        </ul>
        {photos.length ? <PhotoCredits photos={photos} /> : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Heading className="font-serif text-h3">
          <Link prefetch={false} href={tripHref(trip.id)} lang="en" className="after:absolute after:inset-0 hover:underline">{trip.title}</Link>
        </Heading>
        <p className="text-sm text-muted">
          <T k="trip.mainSite" />{' '}
          <span lang="en" data-l="en">{trip.anchorEn}</span>
          <span lang={trip.anchorBn ? 'bn' : 'en'} data-l="bn">{trip.anchorBn ?? trip.anchorEn}</span>
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 text-sm">
          <span className="text-muted" data-trip-footer>
            {trip.hours !== undefined ? <T k="trip.fromDhaka" vars={{ hours: both(formatHours, trip.hours) }} /> : <T k="card.timeUnknown" />}
          </span>
          <span aria-hidden="true" className="font-semibold text-primary underline"><T k="trip.seePlan" /> →</span>
        </div>
      </div>
    </article>
  );
}
