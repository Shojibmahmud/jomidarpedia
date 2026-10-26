// District page (roadmap task 10.2; spec .claude/specs/10-Areas-sources-about-and-system-states.md FR-14 to FR-18).
// One page per district in districts.json, built like the division page from the same file. Every site is listed
// as a card in the order of siteIds (travel time, then name), numbered to match the pins on the district map
// (FR-15, FR-16). Trips are the ones whose main site is in the district; Trips has no district key, so
// "All N trip plans" leads to the division's plans (FR-18).

import type { Metadata } from 'next';
import { T } from '@/components/T';
import { AreaBreadcrumb, AreaIntro, ConditionBar, LocationSummary, MapTeaser, NoPinList, TripsRow } from '@/components/areas/AreaParts';
import { DistrictSites } from '@/components/areas/DistrictSites';
import { areaExploreHref, districtHref, pickTrips } from '@/lib/areas';
import { areaSvg, districtPage } from '@/lib/area-data';
import { getDistricts } from '@/lib/data';
import { both, formatCount } from '@/lib/format';
import { pageCorrectionUrl } from '@/lib/site-page';
import { pageMeta } from '@/lib/seo';
import { canonicalUrl } from '@/lib/site-url';

type Params = { slug: string };
const n = (v: number) => both(formatCount, v);

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getDistricts().map(d => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const { dist, div } = districtPage(slug);
  return pageMeta({
    title: `${dist.en} District`, path: districtHref(dist.slug), canonical: false,
    description: `${dist.count} zamindar ${dist.count === 1 ? 'site' : 'sites'} in ${dist.en} District, ${div.en} Division, Bangladesh, in travel-time order with a map.`,
  });
}

export default async function DistrictPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const { dist, div, sites, noPin, trips } = districtPage(slug);
  const name = { en: dist.en, bn: dist.bn };
  const pageUrl = canonicalUrl(districtHref(dist.slug));
  const mapHref = areaExploreHref(div.slug, dist.slug, true);

  return (
    <main id="main" className="mx-auto max-w-page space-y-12 px-4 py-6 lg:px-8 lg:py-10" data-district={dist.slug}>
      <link rel="canonical" href={pageUrl} />
      <header className="space-y-4">
        <AreaBreadcrumb division={div} current={name} />
        <p className="text-xs font-bold uppercase tracking-wider text-muted"><T k="area.district" /></p>
        <h1 className="font-serif text-h1">
          <span lang="en" className="block">{dist.en}</span>
          <span lang="bn" className="block font-bn-serif text-bn-h2 font-normal text-muted">{dist.bn}</span>
        </h1>
        <AreaIntro count={dist.count} dayTrip={dist.dayTrip} />
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <MapTeaser svg={areaSvg('district', dist.slug)} onMap={dist.onMap} total={dist.count} href={mapHref} name={name} />
        <div className="space-y-10">
          <ConditionBar counts={dist.conditions} total={dist.count} />
          <LocationSummary counts={dist.locations} />
        </div>
      </div>

      <section aria-labelledby="jp-sites" className="space-y-4" data-sites-section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="jp-sites" className="font-serif text-h2"><T k={dist.count === 1 ? 'area.sitesTitle.one' : 'area.sitesTitle'} vars={{ count: n(dist.count) }} /></h2>
          <span className="text-sm text-muted"><T k="area.byTime" />{dist.onMap ? <> · <T k="area.numbers" /></> : null}</span>
        </div>
        <DistrictSites sites={sites} />
      </section>

      <TripsRow trips={pickTrips(trips)} name={name} division={div} divisionTrips={div.tripCount} />
      <NoPinList sites={noPin} correctionHref={pageCorrectionUrl(pageUrl, 'location')} />
    </main>
  );
}
