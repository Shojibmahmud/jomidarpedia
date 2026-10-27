// The parts shared by the division and district pages (roadmap tasks 10.1, 10.2; spec 10 FR-3 to FR-8):
// breadcrumb, condition bar, location tiles, the static map teaser, the "no pin yet" list and the trips row.
// Server components: every count is passed in from divisions.json or districts.json (FR-1). The no-pin list
// names sites only, never coordinates (R5); its "See all" works without JavaScript (<details>).

import Link from 'next/link';
import { Both, T } from '@/components/T';
import { ItineraryCard } from '@/components/trips/ItineraryCard';
import { CONDITION_ORDER, locationTiles } from '@/lib/areas';
import type { NoPinSite } from '@/lib/area-data';
import { both, formatCount } from '@/lib/format';
import { dual, type Dual, type StringKey } from '@/lib/i18n';
import { divisionHref } from '@/lib/nav';
import { siteHref } from '@/lib/site-url';
import type { TripCard } from '@/lib/trips';
import type { Condition, LocationCounts } from '@/lib/types';

const n = (v: number) => both(formatCount, v);
export interface AreaName { slug: string; en: string; bn: string }

export function AreaBreadcrumb({ division, current }: { division?: AreaName; current: Dual }) {
  return (
    <nav aria-label={dual('site.breadcrumb').en} className="text-sm" data-breadcrumb>
      <ol className="flex flex-wrap items-center gap-x-2 text-muted">
        <li className="after:ml-2 after:content-['/']"><T k="nav.divisions" /></li>
        {division ? (
          <li className="after:ml-2 after:content-['/']">
            <Link prefetch={false} href={divisionHref(division.slug)} className="text-primary underline" data-crumb="division">
              <Both value={{ en: division.en, bn: division.bn }} />
            </Link>
          </li>
        ) : null}
        <li aria-current="page" className="text-ink"><Both value={current} /></li>
      </ol>
    </nav>
  );
}

const SEGMENT: Record<Condition, string> = {
  in_ruins: 'bg-primary',
  unknown: 'bg-[repeating-linear-gradient(45deg,rgb(var(--unknown))_0_2px,rgb(var(--surface))_2px_5px)]',
  preserved_adaptive_reuse: 'bg-teal',
  preserved: 'bg-moss',
  lost: 'bg-lost',
};

/** One bar with a legend in words (FR-3): zero counts are left out; colour is never the only cue. */
export function ConditionBar({ counts, total }: { counts: Record<Condition, number>; total: number }) {
  const shown = CONDITION_ORDER.filter(c => counts[c] > 0);
  return (
    <section aria-labelledby="jp-condition" className="space-y-3" data-condition-bar>
      <h2 id="jp-condition" className="font-serif text-h3"><T k="condition.label" /></h2>
      <div aria-hidden="true" className="flex h-4 overflow-hidden rounded-sm border border-line">
        {shown.map(c => <span key={c} className={SEGMENT[c]} style={{ width: `${(counts[c] / total) * 100}%` }} />)}
      </div>
      <ul className="grid gap-x-6 gap-y-1 text-sm md:grid-cols-2">
        {shown.map(c => (
          <li key={c} className="flex items-center gap-2" data-condition={c}>
            <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-sm ${SEGMENT[c]}`} />
            <span className="flex-1"><T k={`condition.${c}`} /></span>
            <span className="font-semibold"><Both value={n(counts[c])} /></span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "How sure we are of locations" (FR-4): one tile per status, each linking to the explanation on About. */
export function LocationSummary({ counts }: { counts: LocationCounts }) {
  return (
    <section aria-labelledby="jp-locations" className="space-y-3" data-locations>
      <h2 id="jp-locations" className="font-serif text-h3"><T k="area.locationsTitle" /></h2>
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-5">
        {locationTiles(counts).map(k => (
          <li key={k}>
            <a href="/about/#locations" data-location-tile={k}
              className={`flex h-full min-h-tap flex-col rounded-lg border bg-surface p-3 hover:bg-surface-2 ${k === 'noPin' ? 'border-dashed border-line-strong' : 'border-line'}`}>
              <span className="font-serif text-h3"><Both value={n(counts[k])} /></span>
              <span className="text-sm text-muted"><T k={`area.loc.${k}` as StringKey} /></span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The static SVG from 3.8, linking to Explore's map (FR-5). No Leaflet. No pins at all: one line instead.
 * Home's national teaser (spec 11 FR-11) gives its own label, caption and button wording.
 */
export function MapTeaser({ svg, onMap, total, href, name, label, caption = 'area.mapCaption', button = 'area.openMap' }: {
  svg: string; onMap: number; total: number; href: string; name: Dual; label?: React.ReactNode; caption?: StringKey; button?: StringKey;
}) {
  if (!onMap) return <p className="rounded-lg border border-dashed border-line-strong bg-surface p-4 text-muted" data-no-map><T k="area.noMap" /></p>;
  return (
    <figure className="space-y-2" data-map-teaser>
      <Link prefetch={false} href={href} className="relative block overflow-hidden rounded-lg border border-line bg-surface-2 hover:border-line-strong">
        <span className="sr-only"><T k="area.mapOf" vars={{ name }} /></span>
        <span aria-hidden="true" className="block [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <span className="absolute left-3 top-3 rounded-full bg-surface px-3 py-1 text-sm font-semibold text-primary-tint-ink shadow-1" data-on-map>
          {label ?? <T k="area.onMap" vars={{ count: n(onMap), total: n(total) }} />}
        </span>
        <span aria-hidden="true" className="absolute right-3 top-3 rounded-full border border-line-strong bg-surface px-3 py-1 text-sm font-semibold"><T k={button} /></span>
      </Link>
      <figcaption className="text-sm text-muted"><T k={caption} /></figcaption>
    </figure>
  );
}

const SHOWN = 5;

function NoPinItem({ s }: { s: NoPinSite }) {
  return (
    <li className="border-b border-line py-2 text-sm last:border-0">
      <Link prefetch={false} href={siteHref(s.id, s.slug)} className="text-primary underline">
        <span lang="en" data-l={s.bn ? 'en' : undefined}>{s.en}</span>
        {s.bn ? <span lang="bn" data-l="bn">{s.bn}</span> : null}
      </Link>
      <span className="text-muted"> · <Both value={{ en: s.district, bn: s.districtBn }} /></span>
    </li>
  );
}

/** "N sites without a pin yet" (FR-6): the first 5, then the rest behind "See all N". */
export function NoPinList({ sites, correctionHref }: { sites: NoPinSite[]; correctionHref: string }) {
  if (!sites.length) return null;
  const count = { count: n(sites.length) };
  return (
    <section aria-labelledby="jp-nopin" className="space-y-3 rounded-lg border border-dashed border-line-strong p-5" data-nopin-list={sites.length}>
      <h2 id="jp-nopin" className="flex items-center gap-2 font-serif text-h3">
        <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M8.5 5.5A6 6 0 0 1 18 10c0 1.6-.5 3.2-1.3 4.6M14.5 17.8C13.2 19.6 12 21 12 21s-6-5.6-6-11c0-.7.1-1.4.3-2" /><path d="M3 3l18 18" />
        </svg>
        <T k={sites.length === 1 ? 'nopin.title.one' : 'nopin.title'} vars={count} />
      </h2>
      <p className="text-sm text-muted"><T k="nopin.body" /></p>
      <ul>{sites.slice(0, SHOWN).map(s => <NoPinItem key={s.id} s={s} />)}</ul>
      {sites.length > SHOWN ? (
        <details className="group" data-nopin-more>
          <summary className="flex min-h-tap cursor-pointer list-none items-center justify-center rounded-md border border-line-strong bg-surface px-4 font-semibold group-open:hidden [&::-webkit-details-marker]:hidden">
            <T k="nopin.seeAll" vars={count} />
          </summary>
          <ul>{sites.slice(SHOWN).map(s => <NoPinItem key={s.id} s={s} />)}</ul>
        </details>
      ) : null}
      <p><a href={correctionHref} className="text-sm font-semibold text-primary underline" data-nopin-tell><T k="nopin.tell" /></a></p>
    </section>
  );
}

/** Up to four trip cards and a link to every plan in the division (FR-7, FR-18). Nothing without trips. */
export function TripsRow({ trips, name, division, divisionTrips }: { trips: TripCard[]; name: Dual; division: AreaName; divisionTrips: number }) {
  if (!trips.length) return null;
  return (
    <section aria-labelledby="jp-trips" className="space-y-4" data-area-trips>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted"><T k="area.tripsEyebrow" /></p>
          <h2 id="jp-trips" className="font-serif text-h2"><T k="area.tripsTitle" vars={{ name }} /></h2>
        </div>
        <Link prefetch={false} href={`/trips/?div=${division.slug}`} className="font-semibold text-primary underline" data-all-trips>
          <T k={divisionTrips === 1 ? 'area.allTrips.one' : 'area.allTrips'} vars={{ count: n(divisionTrips), name: { en: division.en, bn: division.bn } }} /> →
        </Link>
      </div>
      <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {trips.map(t => <li key={t.id} className="flex"><ItineraryCard trip={t} headingLevel={3} /></li>)}
      </ul>
    </section>
  );
}

/** "N sites. K can be visited in a day from Dhaka." (FR-2): counts only, no descriptive prose (D1). */
export function AreaIntro({ count, districts, dayTrip }: { count: number; districts?: number; dayTrip: number }) {
  return (
    <p className="max-w-3xl text-lg" data-area-intro>
      {districts !== undefined
        ? <T k="area.intro.division" vars={{ count: n(count), districts: n(districts) }} />
        : <T k={count === 1 ? 'area.intro.district.one' : 'area.intro.district'} vars={{ count: n(count) }} />}
      {dayTrip ? <> <T k="area.intro.dayTrip" vars={{ count: n(dayTrip) }} /></> : null}
    </p>
  );
}

