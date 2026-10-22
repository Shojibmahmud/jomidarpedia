# Jomidarpedia: developer handoff

Static Next.js (App Router) site, `output: 'export'`, Tailwind CSS v3.4, deployed on Vercel Hobby. No server code, no API routes, no database, no login.

Design canvas (all screens, light and dark, Bangla mode, print, accessibility pass): https://claude.ai/artifact/RWUDBkchSgq1mwrDe5LqqC

## Files in this folder

| File | What it is |
|---|---|
| `tailwind.config.ts` | Theme: colours as CSS variables, paired English/Bangla type scale, radii, shadows, z-index above Leaflet |
| `app/tokens.css` | Global CSS: light and dark tokens, base rules (focus ring, placeholder colour, Bangla line height), print rules |
| `app/fonts.ts` | `next/font/google` setup for Fraunces, Source Sans 3, Tiro Bangla, Hind Siliguri |
| `app/layout.tsx` | Root layout: font variables, no-flash theme/language script, skip link |
| `next.config.mjs` | Static export settings |
| `lib/types.ts` | TypeScript shapes of every generated JSON file |
| `scripts/build-index.mjs` | Builds `public/data/index.json` from `sites.csv` and `images.csv` (defaults: `data/csv/`, `public/data`). Last run (22 Oct 2026): **413 sites, 35.0 KB gzipped** (budget 150 KB) |
| `scripts/build-data.mjs` | Builds `data/build/**` from all 14 CSV tables |
| `scripts/data.mjs` | `npm run data`: runs both builders and writes `data/reports/release-problems.md` |
| `scripts/data-mode.mjs`, `scripts/lib/` | Build mode, CSV validation, safety and editorial checks, the report |
| `DEVELOPMENT_ROADMAP.md` | The build plan (v2). Decisions, build modes and data contracts there override this README where they differ |
| `DESIGN_COVERAGE.md` | Each design board mapped to routes, data and roadmap tasks |

## Build pipeline

```
data/csv/*.csv            source of truth, edited in GitHub
   │  npm run data  (scripts/build-index.mjs + scripts/build-data.mjs)
   ▼
public/data/index.json    the ONLY file the browser fetches (Explore, Search, Lite list)
data/build/**/*.json      read at build time only, via fs, by generateStaticParams + page.tsx
   │  next build  (output: 'export')
   ▼
out/                      ~2,430 static pages (413 sites + 413 ID redirects + 385 trips + 1,136 sources + 72 areas + ~10 others) + assets → Vercel
```

`build-data.mjs` reads all 14 tables in `data/csv/` (exported from the workbook; `scripts/export-xlsx.py` goes the other way) and writes the build-time files below. The spec is `.claude/specs/01-Data-pipeline-gates.md`.

The build mode comes from `scripts/data-mode.mjs` (roadmap §2.4). It is **`release` unless set otherwise**; Vercel production is always `release`. `npm run dev` and `npm run build:local` set `JP_DATA_MODE=local`.

| Problem | local / preview | release |
|---|---|---|
| Structural: malformed CSV, missing column, bad or duplicate ID, broken reference, bad enum, date or number, coordinates outside Bangladesh, duplicate slug, Ready image without a file | fail; nothing is written | fail; nothing is written |
| Safety: hidden-pin coordinates on any path, a non-`Ready` image, a fee of 0 or "free entry" shown as a price, `index.json` over 150 KB gzipped | fail | fail |
| Editorial: internal notes in public text, non-standard credit line, `unclassified` site type | reported | fail |

Every run writes `data/reports/release-problems.md`, which groups editorial problems by the CSV cell to edit. Outputs are deterministic: `meta.generatedAt` is `SOURCE_DATE_EPOCH` if set, otherwise the data's last-updated date.

Hard rules it enforces:
- Only images with `publication_readiness = Ready` are written; `Needs review` and `Permission required` never leave the CSV.
- `entry_fee_bdt = 0` becomes `{ known: false, text: 'No ticket reported' }`. The word "Free" never appears.
- Sites with `map_display = hide`, or without both coordinates, get no coordinates on any output path (index, site JSON, trip stops, map links), so no guessed pin is possible.

## Data files

| File | Built from | Count | Read by |
|---|---|---|---|
| `public/data/index.json` | sites, images | 413 rows, 35 KB gz | **Browser**: `<ExploreApp>`, `<SearchApp>`, `<SearchBox>` dropdown, Lite list |
| `data/build/sites/<id>.json` | sites, visitor_info, travel_routes, costs, history_events, legends, claims, claim_source_links, site_sources, sources, images, site_relationships, itineraries | 413 | `/site/[id]/[slug]` |
| `data/build/trips/<id>.json` | itineraries, itinerary_stops, costs, sites (names, coords) | 385 | `/trips/[id]` |
| `data/build/trips.json` | itineraries (summary) | 385 rows | `/trips`, `/`, site page "Itineraries" |
| `data/build/divisions.json` | sites (counts by division and district, condition counts, no-pin lists) | 8 | `/`, `/division/[slug]`, filter picker |
| `data/build/districts.json` | sites | 64 | `/district/[slug]`, filter picker |
| `data/build/sources.json` | sources, site_sources | 1,136 | `/sources`, `/sources/[id]` |
| `data/build/credits.json` | images (Ready) | 934 | `/credits` |
| `data/build/meta.json` | all | 1 | footer "Data last updated", Home stats strip, About numbers |
| `public/thumbs/<image_id>.webp` | images (Ready), resized to 4:3. **Not generated yet** (roadmap 3.5) | 934 | `<SiteCard>`, `<Gallery>`, `<SummaryCard>` |
| `public/maps/<id>.svg` | static preview maps. **Not generated yet** (roadmap 3.8) | Home teaser, division, district | `<MapTeaser>` (no Leaflet on first load) |

## Routes

All routes are statically generated. Dynamic segments export `generateStaticParams()` and `export const dynamicParams = false`.

| Route | File | Params from | Pages | Data | Client parts |
|---|---|---|---|---|---|
| `/` | `app/page.tsx` | | 1 | meta, divisions, trips (3 featured), 4 featured sites | `<SearchBox>` |
| `/explore` | `app/explore/page.tsx` | | 1 | index.json (fetched) | `<ExploreApp>`: whole page. Filters live in the URL query |
| `/site/[id]/[slug]` | `app/site/[id]/[slug]/page.tsx` | index.json | 413 | sites/<id>.json | `<Gallery>`, `<Lightbox>`, `<MiniMap>`, `<ShareButton>` |
| `/site/[id]` | `app/site/[id]/page.tsx` | index.json | 413 | | none: `<meta http-equiv="refresh">` to the canonical slug URL (static export can't redirect) |
| `/trips` | `app/trips/page.tsx` | | 1 | trips.json | `<TripsFilters>` |
| `/trips/[id]` | `app/trips/[id]/page.tsx` | trips.json | 385 | trips/<id>.json | `<RouteMap>`, `<DayCheck>`, `<PrintButton>` |
| `/division/[slug]` | `app/division/[slug]/page.tsx` | divisions.json | 8 | divisions.json, trips.json | none |
| `/district/[slug]` | `app/district/[slug]/page.tsx` | districts.json | 64 | districts.json, index rows for that district | `<MiniMap>` |
| `/search` | `app/search/page.tsx` | | 1 | index.json (fetched) | `<SearchApp>` reads `?q=`; wrap in `<Suspense>` (required for `useSearchParams` in a static export) |
| `/sources` | `app/sources/page.tsx` | | 1 | sources.json | `<SourcesTable>` (filter, sort, paginate client-side) |
| `/sources/[id]` | `app/sources/[id]/page.tsx` | sources.json | 1,136 | sources.json | none |
| `/about` | `app/about/page.tsx` | | 1 | meta.json | none |
| `/credits` | `app/credits/page.tsx` | | 1 | credits.json | `<CreditsFilter>` |
| 404 | `app/not-found.tsx` | | 1 | | `<SearchBox>` |

Slugs: division `dhaka, chattogram, rajshahi, khulna, barishal, sylhet, rangpur, mymensingh`; district = lower-case English name (`manikganj`); site = `dataset_slug`. Site IDs never change, so `/site/JB-DHK-064` always resolves even if a slug is renamed.

Bangla mode is a client-side switch. The boot script sets `<html lang>` and `data-lang` from the stored preference before paint. Planned rendering (roadmap I3, Phase 3): interface strings are server-rendered in both languages and CSS shows the active one, so Server Components need no language context. All names are already bilingual. Long text is English-only in the data; whether the MVP translates prose is owner decision O6. Separate `/bn/...` routes can come later.

## Component inventory

S = server component, C = client component. "Data" says where the props come from.

### Layout and shared

| Component | | Props | States | Data |
|---|---|---|---|---|
| `SiteHeader` | S | `current?: 'explore'\|'trips'\|'divisions'\|'about'` | sticky; mobile menu open/closed | none |
| `SiteFooter` | S | | | meta.json |
| `LanguageToggle` | C | | `en` / `bn` (localStorage `jp-lang`) | none |
| `ThemeToggle` | C | | system / light / dark (localStorage `jp-theme`) | none |
| `Breadcrumb` | S | `items: {label, labelBn?, href?}[]` | | page data |
| `SectionNav` | C | `sections: {id, label, empty?: 'no pin'\|'not yet'\|'none'}[]` | desktop sticky TOC with active section; mobile `<select>` jump | page data |
| `SuggestCorrection` | S | `siteId?, field?, variant: 'button'\|'link'` | builds a pre-filled GitHub issue URL; email fallback | none |
| `Skeleton` | S | `variant: 'row'\|'card'\|'map'` | | none |
| `OfflineNotice` | C | | online / slow (Lite suggested) / offline | `navigator.onLine`, `navigator.connection` |

### Names, badges and states of knowledge

| Component | | Props | States | Data |
|---|---|---|---|---|
| `BilingualName` | S | `en, bn, alt?: string[], size: 'page'\|'card'\|'compact', lead?: 'en'\|'bn'` | `lead='bn'` in Bangla mode | IndexSite / SiteRecord |
| `ConditionBadge` | S | `condition: Condition, label?: 'short'\|'long'` | 5 conditions, each with its own glyph | `c` / `condition` |
| `AccessBadge` | S | `access: Access, fee?: number` | ticketed shows "Tk 30"; never "Free" | `ac`, `fe` |
| `DayTripBadge` | S | `dayTrip?: boolean, hours?: number` | yes / overnight / unknown | `dt`, `h` |
| `LocationBadge` | S | `status: LocationStatus, flagged?: boolean` | confirmed / one source / approximate / no pin | `lc`, `f` |
| `ConflictNote` | C | `conflict: Conflict` | collapsed / expanded | SiteRecord.conflicts |
| `LastChecked` | S | `date: string` | fresh / older than 12 months: "May be out of date" | visiting.lastChecked |
| `RecordBanner` | S | `confidence: RecordConfidence, pinMissing: boolean` | shown for unconfirmed and partly confirmed records | SiteRecord |
| `Unknown` | S | `value: Maybe<T>, render?: (v) => ReactNode` | known: renders value; unknown: italic muted text | any `Maybe` |
| `StillToConfirm` | S | `fields: string[], siteId` | hidden when empty | stillToConfirm |
| `LegendBox` | S | `legends: SiteRecord['legends']` | stories list / "none recorded yet" | legends |

### Cards and lists

| Component | | Props | States | Data |
|---|---|---|---|---|
| `SiteCard` | S | `site: IndexSite, variant: 'full'\|'compact'\|'row', highlight?: boolean` | photo / no-photo placeholder; "No map location yet"; highlighted (selected pin) | index.json |
| `PlaceholderArt` | S | `size: 'card'\|'thumb'\|'band', tint?: Condition` | colonnade + chini-tikri dots | none |
| `ItineraryCard` | S | `trip: TripSummary` | one day / overnight / not stated | trips.json |
| `DivisionCard` | S | `division: Division` | | divisions.json |
| `StatStrip` | S | `stats: {value, label, labelBn}[]` | | meta.json |
| `ResultsList` | C | `sites: IndexSite[], sort: 'time'\|'name'\|'district', selectedId?` | loading skeleton, empty, paged by 24 ("Load more") | filtered index.json |
| `EmptyResults` | C | `suggestion?: {filter, gain}` | names the one filter to loosen | computed |

### Map (Leaflet, loaded with `next/dynamic` and `ssr: false`, never in Lite mode)

| Component | | Props | States | Data |
|---|---|---|---|---|
| `MapView` | C | `sites: IndexSite[], selectedId?, onSelect, basemap: 'osm'\|'positron', bounds?` | loading; clusters split as you zoom; approximate pins draw a 1.5 km circle from zoom 11 | index.json |
| `SitePin` | C | `site: IndexSite, selected?, focused?` | fill: solid / outlined / hatched; glyph by condition; `?` when flagged; hover name; focus ring | `c`, `lc`, `f` |
| `ClusterIcon` | C | `count: number` | 36 / 44 / 52 px by count | markercluster |
| `MapControls` | C | | zoom, locate, base-map menu open | none |
| `MapKey` | C | | collapsed / open | none |
| `SummaryCard` | C | `site: IndexSite` | desktop popover / mobile sheet body | index.json |
| `BottomSheet` | C | `snap: 'peek'\|'half'\|'full', onSnap` | drag, or tap the handle (a button with `aria-expanded`) | none |
| `MiniMap` | C | `latlon?, status, areaLabel?` | pin / approximate circle / no-pin area panel | SiteRecord.location |
| `MapTeaser` | S | `src, alt, href, count` | static SVG preview, no Leaflet | public/maps |
| `RouteMap` | C | `stops: Itinerary['stops'], legs` | numbered markers; solid, dashed, dotted legs | trips/<id>.json |

### Filters, search

| Component | | Props | States | Data |
|---|---|---|---|---|
| `ExploreApp` | C | | URL query ↔ filter state; map / list; Lite mode | index.json |
| `FilterRail` / `FilterDrawer` | C | `state, counts, onChange` | rail applies instantly; drawer applies on "Show N sites"; all groups collapsible | computed from index.json |
| `DayTripSwitch` | C | `checked, count` | on / off, `role="switch"` | `dt` |
| `TravelTimeSegmented` | C | `value: TravelBucket\|'any', counts` | single select; Unknown is its own segment | `tb` |
| `ChipGroup` | C | `options: {value, label, labelBn, count}[], selected[]` | each chip: default / selected (check glyph) / zero count | computed |
| `DivisionDistrictPicker` | C | `selected` | division open shows its districts | divisions.json, districts.json |
| `ActiveFilters` | C | `state, onRemove, onClear` | | URL |
| `SearchBox` | C | `variant: 'hero'\|'header'\|'page'` | empty / typing with results dropdown (Sites, Districts, Families) / no results | index.json (Fuse.js, lazy) |
| `SearchApp` | C | | results, "Did you mean", empty | index.json |

### Site page

| Component | | Props | States | Data |
|---|---|---|---|---|
| `Gallery` | C | `images: ImageRecord[]` | photos / `NoPhotoPanel` | SiteRecord.images |
| `Lightbox` | C | `images, index` | open, ←/→, Esc, swipe, focus trapped | SiteRecord.images |
| `NoPhotoPanel` | S | `externalPhotos?` | outbound link + "Share a photo" | SiteRecord |
| `AtAGlance` | S | `site: SiteRecord` | | SiteRecord |
| `LocationPanel` | S | `location, place` | confirmed / one source / approximate / no pin | SiteRecord |
| `HistoryTimeline` | S | `events` | events / empty state naming what is known | SiteRecord.history |
| `FeatureList` | S | `features, style: Maybe<string>` | list / "Not documented" boxes | SiteRecord |
| `VisitingInfo` | S | `visiting, access` | private-house notice when restricted | SiteRecord.visiting |
| `RouteSteps` | S | `route: Route` | horizontal (desktop) / vertical (mobile) | SiteRecord.travel |
| `RouteAccordion` | C | `routes: Route[]` | each alternative open/closed | SiteRecord.travel |
| `CombineWith` | S | `related` | | SiteRecord.related |
| `SourcesList` | S | `sources` | | SiteRecord.sources |

### Trips

| Component | | Props | States | Data |
|---|---|---|---|---|
| `TripsFilters` | C | | length, travel time, division, sort | trips.json |
| `ItineraryStops` | S | `stops` | timed / order only | trips/<id>.json |
| `DayCheck` | C | `rules` (closing days, breaks) | weekday selected → warning | site visiting rules |
| `BudgetTable` | S | `rows: Itinerary['budget']` | known total + count of unknown items | trips/<id>.json |
| `PrintButton` + `PrintLayout` | C / S | | `window.print()`; two A4 pages styled by `@media print` | trips/<id>.json |

## Accessibility and performance (the design depends on these)

- `:focus-visible` ring everywhere (in tokens.css). Pins are `<button>`s in Leaflet's marker pane with names like "Baliati Palace, preserved, location confirmed".
- `html { scroll-padding-top: 88px }`; when the bottom sheet is open, set `scroll-padding-bottom` to the sheet's height.
- The list is the accessible equivalent of the map and renders before the map loads. Leaflet, markercluster and Fuse.js are dynamic imports.
- Touch targets are 44 px; pins draw at 26–34 px inside a 44 px hit area.
- No animation libraries; CSS transitions only, off under `prefers-reduced-motion`.
- Bangla: `lang="bn"` on every Bangla string; Latin inside Bangla text needs `lang="en"`.

## Data issues to fix before launch

Status as of 22 Oct 2026. Tasks refer to `DEVELOPMENT_ROADMAP.md` v2.

1. **Internal research notes in public text.** The release report (`data/reports/release-problems.md`, 22 Oct 2026) lists **1,510 cells to edit**: 1,416 internal-note cells (1,489 output occurrences), 15 credit lines and 79 unclassified types. Largest groups: `site_sources.citation_publisher` (643), `sites.coordinates_note` (298), `site_sources.citation_title` (110), `claims.claim_text` (78), `sites.short_description` (71). Another 1,286 flagged cells never reach the output. Phase 12.
2. **`entry_fee_bdt = 0` means "no ticket reported"** (for example Teota, Ruplal House). Never display it as a price or as free entry. Enforced by the build (roadmap 1.11).
3. **`site_type = unclassified` for 79 sites**, including Baliati. Roadmap 12.6.
4. **Source records carry internal provenance** (for example SRC-1079). Public fields are rewritten in Phase 12; internal columns are never emitted (roadmap I7).
5. **15 image credit lines don't follow the standard format.** Fix without dropping any licence-required wording. Roadmap 12.7.
6. **Itinerary titles embed the anchor site.** Handled only in the build (`tripTitle`), made idempotent; CSV titles are not rewritten. Roadmap I5, 2.16.
7. ~~Only `sites.csv` exists as CSV.~~ Done: all 14 tables are in `data/csv/`.
8. **New fares from the editor (20 Oct 2026)** for the Manikganj loop aren't in the data yet: Teota → Aricha rickshaw Tk 15 shared / Tk 30 reserved; Aricha → Utholi shared auto Tk 10; Utholi → Gabtoli bus Tk 200. Roadmap 12.8.
9. **Builder defects to fix** (roadmap Phase 2): conflict versions lose their sources (576 of 1,196); unknown route modes are drawn as buses (37 routes); trip `lastChecked` takes the newest anchor date; `features` is always empty; budgets drop the numeric amount, unit and basis that `costs.csv` already has.
10. **Missing Bangla names:** JB-RAJ-059 and JB-RAJ-071. Roadmap 2.13 (no invented names).
11. **`app/layout.tsx` says "399 sites"** and refers to `/icon.svg` and `/apple-touch-icon.png`, which don't exist yet. Roadmap 3.8, 3.9.
12. **Print CSS:** in dark mode the dark tokens outrank the `@media print` override. Roadmap 9.11.
