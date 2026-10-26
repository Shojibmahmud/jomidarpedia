// Division page (roadmap task 10.1; spec .claude/specs/10-Areas-sources-about-and-system-states.md FR-1 to FR-13).
// One page per division in divisions.json. Every count is from that file (one source, I6): the intro sentence,
// the map label, the condition bar, the location tiles and the district list. The sites themselves are listed in
// Explore, filtered to the division (D4); only the sites without a pin are named here.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Both, T } from '@/components/T';
import { AreaBreadcrumb, AreaIntro, ConditionBar, LocationSummary, MapTeaser, NoPinList, TripsRow } from '@/components/areas/AreaParts';
import { areaExploreHref, districtHref, pickTrips } from '@/lib/areas';
import { areaSvg, divisionPage } from '@/lib/area-data';
import { getDivisions } from '@/lib/data';
import { both, formatCount } from '@/lib/format';
import { dual } from '@/lib/i18n';
import { divisionHref } from '@/lib/nav';
import { pageCorrectionUrl } from '@/lib/site-page';
import { pageMeta } from '@/lib/seo';
import { canonicalUrl } from '@/lib/site-url';

type Params = { slug: string };
const n = (v: number) => both(formatCount, v);

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getDivisions().map(d => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const { div, districts } = divisionPage(slug);
  return pageMeta({
    title: `${div.en} Division`, path: divisionHref(div.slug), canonical: false,
    description: `${div.count} zamindar ${div.count === 1 ? 'site' : 'sites'} in ${districts.length} districts of ${div.en} Division, Bangladesh: conditions, map locations and day trips.`,
  });
}

export default async function DivisionPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const { div, districts, noPin, trips } = divisionPage(slug);
  const name = { en: div.en, bn: div.bn };
  const title = dual('area.division', { name });
  const pageUrl = canonicalUrl(divisionHref(div.slug));
  const most = Math.max(...districts.map(d => d.count));

  return (
    <main id="main" className="mx-auto max-w-page space-y-12 px-4 py-6 lg:px-8 lg:py-10" data-division={div.slug}>
      <link rel="canonical" href={pageUrl} />
      <header className="space-y-4">
        <AreaBreadcrumb current={name} />
        <h1 className="flex flex-wrap items-baseline gap-x-4 font-serif text-h1">
          <span lang="en">{title.en}</span>
          <span lang="bn" className="font-bn-serif text-bn-h3 font-normal text-muted">{title.bn}</span>
        </h1>
        <AreaIntro count={div.count} districts={districts.length} dayTrip={div.dayTrip} />
        <p className="flex flex-wrap gap-3">
          <Link prefetch={false} href={areaExploreHref(div.slug, undefined, true)} className="inline-flex min-h-tap items-center rounded-md bg-primary px-4 font-semibold text-on-primary" data-explore-map>
            <T k="area.exploreMap" vars={{ name }} />
          </Link>
          {div.tripCount ? (
            <Link prefetch={false} href={`/trips/?div=${div.slug}`} className="inline-flex min-h-tap items-center rounded-md border border-line-strong bg-surface px-4 font-semibold" data-trip-plans>
              <T k={div.tripCount === 1 ? 'area.tripPlans.one' : 'area.tripPlans'} vars={{ count: n(div.tripCount) }} />
            </Link>
          ) : null}
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <MapTeaser svg={areaSvg('division', div.slug)} onMap={div.onMap} total={div.count} href={areaExploreHref(div.slug, undefined, true)} name={title} />
        <div className="space-y-10">
          <ConditionBar counts={div.conditions} total={div.count} />
          <LocationSummary counts={div.locations} />
          <section aria-labelledby="jp-districts" className="space-y-3" data-district-list>
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="jp-districts" className="font-serif text-h3"><T k="area.districtsTitle" vars={{ count: n(districts.length) }} /></h2>
              <span className="text-sm text-muted"><T k="area.sitesHeader" /></span>
            </div>
            <ul>
              {districts.map(d => (
                <li key={d.slug} className="flex items-center gap-4 border-b border-line py-2">
                  <Link prefetch={false} href={districtHref(d.slug)} className="min-w-0 flex-1 font-semibold text-primary underline-offset-4 hover:underline" data-district={d.slug}>
                    <span lang="en">{d.en}</span> <span lang="bn" className="font-bn font-normal text-ink">{d.bn}</span>
                  </Link>
                  <span aria-hidden="true" className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${(d.count / most) * 100}%` }} />
                  </span>
                  <span className="w-8 shrink-0 text-right font-semibold"><Both value={n(d.count)} /></span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <TripsRow trips={pickTrips(trips)} name={title} division={div} divisionTrips={div.tripCount} />

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="jp-all-sites" className="space-y-3" data-all-sites>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="jp-all-sites" className="font-serif text-h2"><T k="area.allSites" vars={{ count: n(div.count) }} /></h2>
            <Link prefetch={false} href={areaExploreHref(div.slug)} className="font-semibold text-primary underline" data-filter-explore><T k="area.filterExplore" /> →</Link>
          </div>
          <p className="text-muted"><T k="area.allSitesBody" vars={{ name }} /></p>
        </section>
        <NoPinList sites={noPin} correctionHref={pageCorrectionUrl(pageUrl, 'location')} />
      </div>
    </main>
  );
}
