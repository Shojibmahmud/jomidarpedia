// Itinerary page (roadmap tasks 9.3 to 9.12; spec .claude/specs/09-Trips-and-itineraries.md FR-17 to FR-50).
// One page per trip in trips.json. It shows only what the data supports: a status badge and clock times only
// for a reviewed plan_status (D1), pins without drawn roads while there are no legs (D3), the day picker only
// with reviewed closing days (D2), and a budget with no total (D16).
//
// Print (FR-46 to FR-50): the browser's own print. The two columns become one flow, ordered like the print
// boards: map and stops, then "Check before you go", the sites, the budget, notes and sources. Controls are
// hidden; the running header repeats the title from the second page on, and pages are numbered.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Both, Latin, T } from '@/components/T';
import { LiteNotices } from '@/components/explore/LiteNotices';
import { ShareButton } from '@/components/site/CopyButton';
import { AccessBadge, Badge } from '@/components/site/Badges';
import { SuggestCorrection } from '@/components/site/SuggestCorrection';
import { Budget, DateSpan } from '@/components/trips/Budget';
import { DayCheck, DayNote } from '@/components/trips/DayCheck';
import { DurationBadge, PlanBadge, StopsBadge } from '@/components/trips/ItineraryCard';
import { Legs } from '@/components/trips/Legs';
import { PageUrl } from '@/components/trips/PageUrl';
import { PrintButton } from '@/components/trips/PrintButton';
import { RouteMap } from '@/components/trips/RouteMap';
import type { RoutePoint } from '@/components/trips/RouteMapView';
import { closedLabel, SiteCards } from '@/components/trips/SiteCards';
import { Stops, type StopSite } from '@/components/trips/Stops';
import { getTrips } from '@/lib/data';
import { both, formatCount } from '@/lib/format';
import { dual, type StringKey } from '@/lib/i18n';
import { correctionUrl } from '@/lib/site-page';
import { pageMeta, thumbImage } from '@/lib/seo';
import { canonicalUrl, siteHref } from '@/lib/site-url';
import { tripPage } from '@/lib/trip-data';
import { cssString, dayPicker, exploreStopsHref, mapStops, timeRange, type DayStop } from '@/lib/trips';
import { districtHref } from '@/lib/areas';
import { divisionHref } from '@/lib/nav';

type Params = { id: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getTrips().map(t => ({ id: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const { trip, card, place, anchor } = tripPage(id);
  const photo = card.photos?.[0]?.thumb ?? anchor.images[0]?.thumb;
  const where = place.dist ? `${place.dist.en}, ${place.div.en} Division` : `${place.div.en} Division`;
  const length = trip.duration === 'Not stated' ? 'A trip' : trip.duration === 'One day' ? 'A one-day trip' : 'An overnight trip';
  return pageMeta({
    // Several trips share a title, so the anchor site makes each one unique (spec 13 FR-34).
    title: `${trip.title} (${card.anchorEn})`, path: `/trips/${trip.id}/`, type: 'article', canonical: false,
    description: `${length} around ${card.anchorEn} in ${where}, Bangladesh: ${card.stopCount} stops, with travel times, known costs and sources.`,
    ...(photo && { image: thumbImage(photo, card.anchorEn) }),
  });
}

function Heading({ id, k, icon, className = '' }: { id: string; k: StringKey; icon: React.ReactNode; className?: string }) {
  return (
    <h2 id={id} className={`flex items-center gap-3 font-serif text-h2 ${className}`}>
      <span aria-hidden="true" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-primary print:hidden">{icon}</span>
      <T k={k} />
    </h2>
  );
}

const svg = (d: string) => (
  <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const ICON = {
  clock: svg('M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'),
  palace: svg('M3 21h18M5 21V10m14 11V10M9 21v-6h6v6M3 10l9-6 9 6M8 10v3m4-3v3m4-3v3'),
  taka: svg('M8 4c2 0 3 1 3 3v9a3 3 0 0 0 6 0M6 9h9'),
  note: svg('M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4'),
  map: svg('M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14'),
  book: svg('M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5ZM8 7h7'),
  check: svg('M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z'),
};

export default async function TripPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const { trip, place, anchor, sites, sources } = tripPage(id);
  const path = `/trips/${trip.id}/`;
  const pageUrl = canonicalUrl(path);
  const correction = correctionUrl(anchor.id, pageUrl, 'general');

  const stopSites: Record<string, StopSite> = Object.fromEntries(sites.map(({ site }) => [site.id, { slug: site.slug, en: site.name.en, ...(site.name.bn && { bn: site.name.bn }) }]));
  const dayStops: DayStop[] = sites.map(({ order, site }) => ({ order, name: site.name.en, closedDays: site.visiting.closedDays }));
  const map = mapStops(trip);
  const points: RoutePoint[] = map.pinned.map(s => ({ order: s.order, kind: s.kind, latlon: s.latlon!, label: s.siteId ? stopSites[s.siteId]?.en ?? s.name : s.name }));
  const onMap = exploreStopsHref(trip);
  const range = timeRange(trip);
  // The division and district pages (spec 10 FR-62, replacing spec 09 D12's Explore links).
  const divHref = divisionHref(place.div.slug);
  const distHref = place.dist ? districtHref(place.dist.slug) : undefined;
  const printCss = `@media print{@page{@top-left{content:${cssString(trip.title)};font-size:9pt;color:#5c5448}@bottom-right{content:counter(page) " / " counter(pages);font-size:9pt;color:#5c5448}}@page:first{@top-left{content:none}}}`;

  return (
    <main id="main" className="mx-auto max-w-page space-y-8 px-4 py-6 [overflow-wrap:break-word] lg:px-8 lg:py-10 print:max-w-none print:space-y-5 print:p-0" data-trip-page={trip.id}>
      <link rel="canonical" href={pageUrl} />
      <style dangerouslySetInnerHTML={{ __html: printCss }} />
      <p className="hidden items-center gap-2 border-b border-line pb-2 text-sm print:flex" data-print-brand>
        <span className="font-serif font-bold tracking-wide">JOMIDARPEDIA</span> · <T k="print.brand" />
      </p>

      <header className="space-y-4">
        <nav aria-label={dual('site.breadcrumb').en} className="text-sm print:hidden" data-breadcrumb>
          <ol className="flex flex-wrap items-center gap-x-2">
            <li className="after:ml-2 after:text-muted after:content-['/']"><Link prefetch={false} href="/trips/" className="text-primary underline"><T k="nav.dayTrips" /></Link></li>
            <li className={place.dist ? "after:ml-2 after:text-muted after:content-['/']" : ''}>
              <Link prefetch={false} href={divHref} className="text-primary underline" data-crumb="division">
                <Both value={{ en: `${place.div.en} Division`, bn: `${place.div.bn} বিভাগ` }} />
              </Link>
            </li>
            {place.dist && distHref ? (
              <li><Link prefetch={false} href={distHref} className="text-primary underline" data-crumb="district"><Both value={{ en: place.dist.en, bn: place.dist.bn }} /></Link></li>
            ) : null}
          </ol>
        </nav>
        <ul className="flex flex-wrap gap-2" data-trip-badges>
          <li><DurationBadge duration={trip.duration} /></li>
          {trip.planStatus ? <li><PlanBadge status={trip.planStatus} /></li> : null}
          <li><StopsBadge count={trip.stops.length} /></li>
          {range ? <li><Badge><Latin>{range[0]}–{range[1]}</Latin></Badge></li> : null}
        </ul>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <h1 lang="en" className="font-serif text-h1">{trip.title}</h1>
            <p className="text-muted">
              <T k="trip.mainSite" />{' '}
              <Link prefetch={false} href={siteHref(anchor.id, anchor.slug)} className="font-semibold text-primary underline print:text-ink print:no-underline">
                <span lang="en" data-l={anchor.name.bn ? 'en' : undefined}>{anchor.name.en}</span>
                {anchor.name.bn ? <span lang="bn" data-l="bn">{anchor.name.bn}</span> : null}
              </Link>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2" data-no-print>
            <ShareButton url={path} title={trip.title} />
            <PrintButton />
          </div>
          <p className="hidden text-sm print:block"><T k="print.date" /> ____________________</p>
        </div>
      </header>

      <div data-no-print>{dayPicker(dayStops) ? <DayCheck stops={dayStops} /> : sites.length ? <DayNote /> : null}</div>

      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] print:flex print:gap-5">
        <div className="contents lg:block lg:min-w-0 lg:space-y-10 print:contents">
          {map.show ? (
            <section className="order-1 space-y-2" data-map-section>
              <div data-no-print><LiteNotices /></div>
              <RouteMap points={points} legs={trip.legs} />
              {trip.schematic ? <p className="text-sm text-muted" data-schematic><T k="trip.schematic" /></p> : <Legs trip={trip} />}
              {map.unpinned.length ? (
                <p className="text-sm text-muted" data-not-on-map>
                  <T k="trip.notOnMap" />{' '}
                  {map.unpinned.map((s, k) => <span key={s.order}>{k ? ' · ' : ''}<Both value={both(formatCount, s.order)} /> <Latin>{s.name}</Latin></span>)}
                </p>
              ) : null}
            </section>
          ) : null}

          {sites.length ? (
            <section aria-labelledby="jp-sites" className="order-4 space-y-4" data-sites-section>
              <Heading id="jp-sites" k="trip.sites" icon={ICON.palace} />
              <SiteCards sites={sites} />
            </section>
          ) : null}

          <section aria-labelledby="jp-budget" className="space-y-3 rounded-lg border border-line bg-surface p-5 order-5 print:border-0 print:p-0" data-budget-section>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <Heading id="jp-budget" k="budget.title" icon={ICON.taka} />
              <span className="text-muted"><T k="budget.perPerson" /></span>
            </div>
            <Budget trip={trip} correctionHref={correction} />
          </section>
        </div>

        <div className="contents lg:block lg:min-w-0 lg:space-y-10 print:contents">
          <section aria-labelledby="jp-stops" className="order-2 space-y-4" data-stops-section>
            <Heading id="jp-stops" k={range || trip.planStatus === 'timed' ? 'trip.dayTitle' : 'trip.orderTitle'} icon={ICON.clock} />
            {trip.planStatus === 'timed' ? null : <p className="text-sm text-muted"><T k="trip.orderNote" /></p>}
            <Stops trip={trip} sites={stopSites} />
          </section>

          {trip.notes.length ? (
            <section aria-labelledby="jp-notes" className="space-y-3 rounded-lg border border-line bg-surface p-5 order-6 print:border-0 print:p-0" data-notes>
              <Heading id="jp-notes" k="trip.notes" icon={ICON.note} />
              {trip.notes.map((note, k) => <p key={k} lang="en">{note}</p>)}
            </section>
          ) : null}

          {onMap ? (
            <p className="order-6" data-no-print>
              <Link prefetch={false} href={onMap} className="inline-flex min-h-tap items-center gap-2 rounded-md border border-line-strong bg-surface px-4 font-semibold" data-open-on-map>
                {ICON.map}<T k="trip.openOnMap" />
              </Link>
            </p>
          ) : null}
        </div>

        <section aria-labelledby="jp-before" className={`order-3 hidden space-y-4 print:block ${map.show ? 'print:break-before-page' : ''}`} data-before-you-go>
          <p className="border-b border-line pb-2 text-sm"><Latin><strong className="font-serif">{trip.title}</strong></Latin> · <T k="print.beforeSub" /></p>
          <div className="space-y-2 rounded-lg border-2 border-gold p-4">
            <h2 id="jp-before" className="font-serif text-h3"><T k="print.before" /></h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {sites.map(({ order, site }) => {
                const closed = closedLabel(site.visiting.closedDays);
                const hours = site.visiting.hours;
                return (
                  <li key={site.id}>
                    <strong><Latin>{site.name.en}</Latin></strong> (<T k="trip.stopN" vars={{ n: both(formatCount, order) }} />):{' '}
                    {closed ? <><Both value={closed} />. </> : null}
                    {hours.known ? <><T k="print.hours" /> <Latin>{hours.value}</Latin>. </> : null}
                    <AccessBadge access={site.access} fee={site.visiting.fee.known ? site.visiting.fee.value : undefined} />
                  </li>
                );
              })}
              {!dayPicker(dayStops) && sites.length ? <li><T k="daycheck.none" /></li> : null}
              <li><T k="print.footer" /></li>
            </ul>
          </div>
        </section>

        <section aria-labelledby="jp-sources" className="order-7 space-y-3" data-trip-sources>
          {sources.length ? (
            <>
              <h2 id="jp-sources" className="font-serif text-h3"><T k="trip.sources" /></h2>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {sources.map(s => (
                  <li key={s.id} lang="en">
                    {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.title}</a> : s.title}
                    {s.publisher ? <span className="text-muted"> · {s.publisher}</span> : null}
                    {s.url ? <span className="hidden break-all text-muted print:inline"> · {s.url}</span> : null}
                  </li>
                ))}
              </ol>
            </>
          ) : null}
          <div className="hidden space-y-2 print:block" data-print-footer>
            <div className="h-24 rounded-md border border-dashed border-line-strong p-2 text-sm text-muted"><T k="print.notes" /></div>
            <p className="text-sm"><T k="print.url" /> <PageUrl path={pageUrl} /></p>
            <p className="text-sm text-muted"><T k="print.licence" /></p>
          </div>
          <p className="text-sm text-muted" data-trip-footer>
            <T k="trip.fromProfile" />
            {trip.costsEstimated ? <> · <DateSpan span={trip.costsEstimated} one="trip.costsChecked" range="trip.costsRange" /></> : null}
            <span data-no-print> · <SuggestCorrection siteId={anchor.id} pageUrl={pageUrl} field="general" /></span>
          </p>
        </section>
      </div>
    </main>
  );
}

