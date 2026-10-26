// Home page (roadmap Phase 11, spec .claude/specs/11-Home-page.md): the hero with search and quick chips, four
// category tiles, the numbers strip, the static map of Bangladesh, the division tiles, three featured trips and the
// trust band. Every number comes from build data (FR-1); every photo prints its credit; the page loads no Leaflet,
// and no Fuse.js until the search box is used (NFR-1). The header lies over the hero (app/tokens.css, FR-19).

import type { Metadata } from 'next';
import { T } from '@/components/T';
import { MapTeaser } from '@/components/areas/AreaParts';
import { CategoryTiles, DivisionTiles, FeaturedTrips, Hero, STAT_ICONS, StatStrip, TrustBand } from '@/components/home/HomeParts';
import { getDistricts } from '@/lib/data';
import { both, formatCount } from '@/lib/format';
import { CHIP_HREF } from '@/lib/home';
import { homeData, homePhoto } from '@/lib/home-data';
import HOME_IMAGES from '@/lib/home-images.json';
import { getMeta } from '@/lib/data';
import { pageMeta } from '@/lib/seo';

// The home page shares the hero photo (spec 13 FR-38, D8); the layout's default title is kept.
export function generateMetadata(): Metadata {
  const hero = homePhoto(HOME_IMAGES.hero);
  const { counts } = getMeta();
  const meta = pageMeta({
    title: 'Jomidarpedia · জমিদারপিডিয়া', path: '/',
    description: `The zamindar palaces of Bangladesh: ${counts.sites} sites with sources, conditions and day trips from Dhaka.`,
    image: { url: hero.src, width: hero.width, height: hero.height, alt: hero.alt },
  });
  return { ...meta, title: { absolute: 'Jomidarpedia · জমিদারপিডিয়া' } };
}

export default function Home() {
  const { counts, hero, categories, divisions, trips, mapSvg } = homeData();
  const districts = getDistricts().map(d => ({ slug: d.slug, en: d.en, bn: d.bn, divisionSlug: d.divisionSlug, count: d.count }));
  return (
    <main id="main" data-home>
      <Hero photo={hero} sites={counts.sites} dayTrips={counts.dayTripSites} open={counts.openToVisitors} districts={districts} />

      <div className="mx-auto max-w-page space-y-12 px-4 py-12 lg:space-y-16 lg:px-8 lg:py-16">
        <CategoryTiles photos={categories} counts={{
          dayTrips: counts.dayTripSites, preserved: counts.conditions.preserved,
          ruins: counts.conditions.in_ruins, newUse: counts.conditions.preserved_adaptive_reuse,
        }} />
        <StatStrip stats={[
          { value: counts.sites, label: 'home.stat.sites', tone: 'bg-primary-tint text-primary-tint-ink', icon: STAT_ICONS.palace },
          { value: counts.dayTripSites, label: 'home.stat.dayTrips', tone: 'bg-indigo-tint text-indigo', icon: STAT_ICONS.sun },
          { value: counts.images, label: 'home.stat.photos', tone: 'bg-moss-tint text-moss-ink', icon: STAT_ICONS.camera },
          { value: counts.sources, label: 'home.stat.sources', href: '/sources/', tone: 'bg-teal-tint text-teal-ink', icon: STAT_ICONS.book },
          { value: counts.legends, label: 'home.stat.legends', tone: 'bg-gold-tint text-gold', icon: STAT_ICONS.speech },
        ]} />
      </div>

      <div className="bg-surface-2">
        <div className="mx-auto grid max-w-page gap-10 px-4 py-12 lg:grid-cols-[1fr_1.25fr] lg:gap-8 lg:px-8 lg:py-16">
          <section aria-labelledby="jp-home-map" className="space-y-3" data-home-map>
            <h2 id="jp-home-map" className="sr-only"><T k="home.mapTitle" /></h2>
            <MapTeaser svg={mapSvg} onMap={counts.onMap} total={counts.sites} href={CHIP_HREF.map} name={{ en: 'Bangladesh', bn: 'বাংলাদেশ' }}
              label={<T k="common.sitesOnMap" vars={{ count: both(formatCount, counts.onMap) }} />} caption="home.mapLegend" button="home.openMap" />
          </section>
          <DivisionTiles tiles={divisions} count={counts.divisions} />
        </div>
      </div>

      <div className="mx-auto max-w-page px-4 py-12 lg:px-8 lg:py-16">
        <FeaturedTrips trips={trips} total={counts.trips} />
      </div>

      <TrustBand disagreements={counts.disagreements} legends={counts.legends} sources={counts.sources} />
    </main>
  );
}
