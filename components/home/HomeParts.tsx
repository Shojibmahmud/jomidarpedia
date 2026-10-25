// The home page's sections (roadmap Phase 11, spec .claude/specs/11-Home-page.md): hero, category tiles, the numbers
// strip, division tiles, featured trips and the trust band. Server components: every number is passed in from
// meta.json or divisions.json (FR-1), every photo comes with its exact credit line, printed beside it (FR-4, AC-19).

import Link from 'next/link';
import { Both, T } from '@/components/T';
import { ItineraryCard } from '@/components/trips/ItineraryCard';
import { both, formatCount } from '@/lib/format';
import type { HomePhoto } from '@/lib/home-data';
import { CATEGORY_HREF, CHIP_HREF, type CategoryKey } from '@/lib/home';
import { dual, type Dual, type StringKey } from '@/lib/i18n';
import { CORRECTIONS_URL, divisionHref } from '@/lib/nav';
import type { SearchDistrict } from '@/lib/search';
import type { TripCard } from '@/lib/trips';
import type { Division } from '@/lib/types';
import { HeroSearch } from './HeroSearch';

const n = (v: number) => both(formatCount, v);
/** A tile's link covers the whole tile; its focus ring is drawn on the tile in white, which shows on any photo. */
const stretched = 'after:absolute after:inset-0 after:rounded-lg hover:underline focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-[3px] focus-visible:after:-outline-offset-[3px] focus-visible:after:outline-white';

/** The other language's version, below a title (as on the boards): Bangla under English, English under Bangla. */
export function Other({ value, className = '' }: { value: Dual; className?: string }) {
  return (
    <>
      <span lang="bn" data-l="en" className={className}>{value.bn}</span>
      <span lang="en" data-l="bn" className={`italic ${className}`}>{value.en}</span>
    </>
  );
}

/** A credit line exactly as written (required_credit), legible over the photo. */
export function PhotoCredit({ credit, className = '' }: { credit: string; className?: string }) {
  return (
    <p lang="en" data-credit className={`relative z-10 max-w-[85%] rounded bg-black/60 px-1.5 py-0.5 text-[11px] leading-tight text-white [overflow-wrap:anywhere] ${className}`}>
      {credit}
    </p>
  );
}

/** A curated photo: the srcset holds the 480 px thumbnail and the variants (FR-23). */
function Photo({ photo, sizes, eager = false, decorative = true, className = '' }: {
  photo: HomePhoto; sizes: string; eager?: boolean; decorative?: boolean; className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export: committed, pre-sized variants
    <img src={photo.src} srcSet={photo.srcSet} sizes={sizes} width={photo.width} height={photo.height}
      alt={decorative ? '' : photo.alt} lang={decorative ? undefined : photo.altLang}
      loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : undefined} decoding={eager ? 'sync' : 'async'}
      className={`absolute inset-0 h-full w-full object-cover ${className}`} />
  );
}

// ---------------------------------------------------------------- hero (11.1)
export function Hero({ photo, sites, dayTrips, open, districts }: {
  photo: HomePhoto; sites: number; dayTrips: number; open: number; districts: readonly SearchDistrict[];
}) {
  const title = dual('home.title');
  const chips: { href: string; k: StringKey; count?: number; icon: React.ReactNode }[] = [
    { href: CHIP_HREF.dayTrips, k: 'home.chip.dayTrips', count: dayTrips, icon: <SunIcon /> },
    { href: CHIP_HREF.open, k: 'home.chip.open', count: open, icon: null },
    { href: CHIP_HREF.map, k: 'home.chip.map', icon: <MapIcon /> },
  ];
  return (
    <section data-home-hero aria-labelledby="jp-home-title" className="relative isolate flex min-h-[600px] items-end overflow-hidden bg-ink text-white lg:min-h-[760px]">
      <Photo photo={photo} sizes="100vw" eager decorative={false} />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/5" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="relative mx-auto w-full max-w-page space-y-6 px-4 pb-16 pt-28 lg:px-8 lg:pb-24">
        <h1 id="jp-home-title" className="max-w-[640px] font-serif text-[44px] font-semibold leading-[1.05] lg:text-[72px]">
          <Both value={title} />
        </h1>
        <p className="font-serif text-2xl lg:text-[32px]"><Other value={title} /></p>
        <div className="relative max-w-[600px] [&_[role=listbox]]:absolute [&_[role=listbox]]:inset-x-0 [&_[role=listbox]]:z-dropdown [&_[role=listbox]]:mt-2 [&_[role=listbox]]:text-ink">
          <HeroSearch districts={districts} placeholder={dual('home.searchPlaceholder', { count: n(sites) })} />
        </div>
        <nav aria-labelledby="jp-home-quick">
          <span id="jp-home-quick" className="sr-only"><T k="home.quick" /></span>
          <ul className="flex flex-wrap gap-2">
            {chips.map(c => (
              <li key={c.k}>
                <Link prefetch={false} href={c.href} data-home-chip={c.k}
                  className="inline-flex min-h-tap items-center gap-2 rounded-full border border-white/60 bg-black/35 px-4 text-[15px] font-semibold text-white backdrop-blur hover:bg-black/55">
                  {c.icon}
                  <T k={c.k} vars={c.count === undefined ? undefined : { count: n(c.count) }} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <PhotoCredit credit={photo.credit} className="!absolute bottom-3 right-3 lg:right-4" />
    </section>
  );
}

function SunIcon() {
  return <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx={12} cy={12} r={4} /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
}
function MapIcon() {
  return <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" /><path d="M9 4v14M15 6v14" /></svg>;
}

// ---------------------------------------------------------------- category tiles (11.2)
const CATEGORY: Record<CategoryKey, { title: StringKey; badge: StringKey }> = {
  dayTrips: { title: 'home.cat.dayTrips', badge: 'home.badge.dayTrips' },
  preserved: { title: 'home.cat.preserved', badge: 'home.badge.preserved' },
  ruins: { title: 'home.cat.ruins', badge: 'home.badge.ruins' },
  newUse: { title: 'home.cat.newUse', badge: 'home.badge.newUse' },
};

export function CategoryTiles({ photos, counts }: { photos: Record<CategoryKey, HomePhoto>; counts: Record<CategoryKey, number> }) {
  const keys = Object.keys(CATEGORY) as CategoryKey[];
  return (
    <section aria-labelledby="jp-home-see" className="space-y-6" data-home-categories>
      <h2 id="jp-home-see" className="font-serif text-h2"><T k="home.seeTitle" /></h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-4">
        {keys.map(k => (
          // Below lg the tiles are too narrow for a credit over the photo, so it sits under the tile instead.
          <li key={k} className="relative flex flex-col gap-1" data-home-category={k}>
            <div className="relative isolate flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-lg bg-ink p-3 text-white lg:aspect-auto lg:h-[440px] lg:p-4">
              <Photo photo={photos[k]} sizes="(min-width: 1024px) 25vw, 50vw" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="relative space-y-1.5">
                <h3 className="font-serif text-xl leading-tight lg:text-h3">
                  <Link prefetch={false} href={CATEGORY_HREF[k]} className={stretched}><T k={CATEGORY[k].title} /></Link>
                </h3>
                <p className="text-sm text-white/90"><Other value={dual(CATEGORY[k].title)} /></p>
                <p><span className="badge bg-surface text-ink"><T k={CATEGORY[k].badge} vars={{ count: n(counts[k]) }} /></span></p>
              </div>
            </div>
            <PhotoCredit credit={photos[k].credit}
              className="max-lg:!max-w-none max-lg:!bg-transparent max-lg:!p-0 max-lg:!text-muted lg:!absolute lg:right-3 lg:top-3" />
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- numbers strip (11.2)
export interface Stat { value: number; label: StringKey; href?: string; tone: string; icon: React.ReactNode }

export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <section aria-labelledby="jp-home-numbers" className="rounded-xl border border-line bg-surface p-5 lg:p-8" data-stat-strip>
      <h2 id="jp-home-numbers" className="sr-only"><T k="home.numbers" /></h2>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 lg:grid-cols-5">
        {stats.map(s => {
          const body = (
            <>
              <span aria-hidden="true" className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md ${s.tone}`}>{s.icon}</span>
              <span className="block font-serif text-[36px] leading-none lg:text-[44px]"><Both value={n(s.value)} /></span>
              <span className="mt-2 block text-sm text-muted"><T k={s.label} /></span>
            </>
          );
          return (
            <li key={s.label} data-stat={s.label}>
              {s.href ? <Link prefetch={false} href={s.href} className="block rounded-md hover:bg-surface-2 [&>span:last-child]:underline">{body}</Link> : body}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
export const STAT_ICONS = {
  palace: icon('M3 21h18M5 21V10M19 21V10M9 21v-6h6v6M3 10l9-6 9 6'),
  sun: <SunIcon />,
  camera: icon('M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7'),
  book: icon('M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11'),
  speech: icon('M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z'),
};

// ---------------------------------------------------------------- divisions (11.4)
export function DivisionTiles({ tiles, count }: { tiles: { div: Division; photo: HomePhoto }[]; count: number }) {
  return (
    <section aria-labelledby="jp-home-divisions" className="min-w-0 space-y-5" data-home-divisions>
      <h2 id="jp-home-divisions" className="font-serif text-h2"><T k="home.divisionsTitle" vars={{ count: n(count) }} /></h2>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0">
        {tiles.map(({ div, photo }) => (
          <li key={div.slug} data-home-division={div.slug}
            className="relative isolate flex h-[200px] w-[72%] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-lg bg-ink p-3 text-white md:h-[150px] md:w-auto">
            <Photo photo={photo} sizes="(min-width: 768px) 25vw, 72vw" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <PhotoCredit credit={photo.credit} className="self-end" />
            <div className="relative flex items-end justify-between gap-3">
              <h3 className="font-serif text-h3 leading-tight">
                <Link prefetch={false} href={divisionHref(div.slug)} className={stretched}>
                  <Both value={{ en: div.en, bn: div.bn }} />
                </Link>
                <span className="block font-sans text-sm font-normal text-white/90"><Other value={{ en: div.en, bn: div.bn }} /></span>
              </h3>
              <span className="font-serif text-[32px] font-semibold leading-none"><Both value={n(div.count)} /></span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- featured trips (11.5)
export function FeaturedTrips({ trips, total }: { trips: TripCard[]; total: number }) {
  if (!trips.length) return null;
  return (
    <section aria-labelledby="jp-home-trips" className="space-y-6" data-home-trips>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="jp-home-trips" className="font-serif text-h2"><T k="home.tripsTitle" /></h2>
        <Link prefetch={false} href="/trips/" className="hidden min-h-tap items-center rounded-md border border-line-strong bg-surface px-4 font-semibold hover:bg-surface-2 md:inline-flex" data-all-plans>
          <T k="home.allPlans" vars={{ count: n(total) }} />
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0">
        {trips.map(t => <li key={t.id} className="flex w-[85%] shrink-0 snap-start md:w-auto"><ItineraryCard trip={t} headingLevel={3} /></li>)}
      </ul>
      <Link prefetch={false} href="/trips/" className="flex min-h-tap items-center justify-center rounded-md border border-line-strong bg-surface px-4 font-semibold md:hidden">
        <T k="home.allPlans" vars={{ count: n(total) }} />
      </Link>
    </section>
  );
}

// ---------------------------------------------------------------- trust band (11.6)
// Always dark, in both themes, as on the boards; its colours are the light theme's ink and tints.
export function TrustBand({ disagreements, legends, sources }: { disagreements: number; legends: number; sources: number }) {
  const item = 'flex items-center gap-3';
  const dot = (tone: string, d: React.ReactNode) => <span aria-hidden="true" className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`}>{d}</span>;
  const link = 'font-semibold underline underline-offset-2 hover:no-underline';
  return (
    <section aria-labelledby="jp-home-trust" className="bg-[#211D18] text-[#F7F2E8]" data-trust-band>
      <div className="mx-auto grid max-w-page gap-8 px-4 py-12 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1.2fr] lg:items-center lg:px-8">
        <div className="space-y-2">
          <h2 id="jp-home-trust" className="font-serif text-h3 lg:text-h2"><T k="home.trustTitle" /></h2>
          <Link prefetch={false} href="/about/" className={`text-sm text-[#F2B49D] ${link}`} data-trust="about"><T k="home.trustHow" /> →</Link>
        </div>
        <p className={item}>
          {dot('bg-[#3A2F17] text-[#D8B262]', STAT_ICONS.palace)}
          <Link prefetch={false} href="/about/#disagreements" className={link} data-trust="disagreements"><T k="home.trustDisagreements" vars={{ count: n(disagreements) }} /></Link>
        </p>
        <p className={item}>
          {dot('bg-[#20264A] text-[#A3B1EA]', STAT_ICONS.speech)}
          <Link prefetch={false} href="/about/#disagreements" className={link} data-trust="legends"><T k="home.trustLegends" vars={{ count: n(legends) }} /></Link>
        </p>
        <p className={item}>
          {dot('bg-[#22301C] text-[#BFD9AC]', STAT_ICONS.book)}
          <Link prefetch={false} href="/sources/" className={link} data-trust="sources"><T k="home.sourceCount" vars={{ count: n(sources) }} /></Link>
        </p>
        <p className={item}>
          {dot('bg-[#3A2620] text-[#F2B49D]', icon('M4 20h4L19 9l-4-4L4 16zM14 6l4 4'))}
          <span>
            <span className="block font-semibold"><T k="home.trustFamily" /></span>
            <a href={CORRECTIONS_URL} rel="noopener" className={`text-sm text-[#F2B49D] ${link}`} data-trust="correction"><T k="footer.correction" /></a>
          </span>
        </p>
      </div>
    </section>
  );
}
