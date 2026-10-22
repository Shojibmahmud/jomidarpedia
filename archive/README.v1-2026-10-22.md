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
| `scripts/build-index.mjs` | Builds `public/data/index.json` from `sites.csv`. Runs today: **399 sites, 34.2 KB gzipped** (budget 150 KB) |

## Build pipeline

```
data/csv/*.csv            source of truth, edited in GitHub
   │  npm run data  (scripts/build-index.mjs + scripts/build-data.mjs)
   ▼
public/data/index.json    the ONLY file the browser fetches (Explore, Search, Lite list)
data/build/**/*.json      read at build time only, via fs, by generateStaticParams + page.tsx
   │  next build  (output: 'export')
   ▼
out/                      ~2,400 static pages (399 sites + 399 ID redirects + 385 trips + 1,136 sources + 72 areas + 8 others) + assets → Vercel
```

`build-data.mjs` is not written yet. It reads the other CSV tables and writes the build-time files below. Right now only `sites.csv` is a CSV; the other tables are sheets in `jomidar-bari-database2.xlsx`. Export each sheet to `data/csv/<sheet>.csv` (lower-case names, as in the brief).

`build-data.mjs` must fail the build when it finds:
- internal notes in public text,
- an image that isn't `Ready`,
- a fee of 0 shown as a price.

Hard rules it enforces:
- Only images with `publication_readiness = Ready` are written; `Needs review` and `Permission required` never leave the CSV.
- `entry_fee_bdt = 0` becomes `{ known: false, text: 'No ticket reported' }`. The word "Free" never appears.
- `map_display = hide` sites get no coordinates in `index.json`, so no guessed pin is possible.

## Data files

| File | Built from | Count | Read by |
|---|---|---|---|
| `public/data/index.json` | sites, images | 399 rows, 34 KB gz | **Browser**: `<ExploreApp>`, `<SearchApp>`, `<SearchBox>` dropdown, Lite list |
| `data/build/sites/<id>.json` | sites, visitor_info, travel_routes, costs, history_events, legends, claims, claim_source_links, site_sources, sources, images, site_relationships, itineraries | 399 | `/site/[id]/[slug]` |
| `data/build/trips/<id>.json` | itineraries, itinerary_stops, costs, sites (names, coords) | 385 | `/trips/[id]` |
| `data/build/trips.json` | itineraries (summary) | 385 rows | `/trips`, `/`, site page "Itineraries" |
| `data/build/divisions.json` | sites (counts by division and district, condition counts, no-pin lists) | 8 | `/`, `/division/[slug]`, filter picker |
| `data/build/districts.json` | sites | 64 | `/district/[slug]`, filter picker |
| `data/build/sources.json` | sources, site_sources | 1,136 | `/sources`, `/sources/[id]` |
| `data/build/credits.json` | images (Ready) | 934 | `/credits` |
| `data/build/meta.json` | all | 1 | footer "Data last updated", Home stats strip, About numbers |
| `public/thumbs/<image_id>.webp` | images (Ready), resized to 4:3 | 934 | `<SiteCard>`, `<Gallery>`, `<SummaryCard>` |
| `public/maps/<id>.svg` | static preview maps | Home teaser, division, district | `<MapTeaser>` (no Leaflet on first load) |

## Routes

All routes are statically generated. Dynamic segments export `generateStaticParams()` and `export const dynamicParams = false`.

| Route | File | Params from | Pages | Data | Client parts |
|---|---|---|---|---|---|
| `/` | `app/page.tsx` | | 1 | meta, divisions, trips (3 featured), 4 featured sites | `<SearchBox>` |
| `/explore` | `app/explore/page.tsx` | | 1 | index.json (fetched) | `<ExploreApp>`: whole page. Filters live in the URL query |
| `/site/[id]/[slug]` | `app/site/[id]/[slug]/page.tsx` | index.json | 399 | sites/<id>.json | `<Gallery>`, `<Lightbox>`, `<MiniMap>`, `<ShareButton>` |
| `/site/[id]` | `app/site/[id]/page.tsx` | index.json | 399 | | none: `<meta http-equiv="refresh">` to the canonical slug URL (static export can't redirect) |
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

Bangla mode is a client-side switch. It sets `<html lang="bn">` plus a stored preference, and swaps UI strings from `lib/i18n.ts`. All names are already bilingual in the HTML. Long text is English-only in the data today. Separate `/bn/...` routes can come later if search engines need them.

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

Found while preparing this handoff. `build-index.mjs` reports the first one.

1. **68 sites have internal research notes in `short_description`** (mentions of "Orca", "this thread", AI tools), for example JB-RAJ-002. They need public wording; the build should refuse them.
2. **`entry_fee_bdt = 0` means "no ticket reported"** (for example Teota, Ruplal House). Never display it as a price.
3. **`site_type = unclassified` for 79 sites**, including Baliati. It weakens the site-type filter.
4. **Source records carry internal provenance** (for example SRC-1079 "read by Claude in Orca's Brave browser", "Project upload: AI audit"). Show a public title, and group project working files as such.
5. **15 image credit lines don't follow the standard format** ("This work was made by…"). Check them before they go on `/credits`.
6. **Itinerary titles embed the anchor site**: "Suggested day-trip circuit (Manikganj heritage loop) (Baliati Palace …)". The build should keep the middle part only.
7. **Only `sites.csv` exists as CSV**; the other tables are workbook sheets. Export them.
8. **New fares from the editor (20 Oct 2026)** for the Manikganj loop aren't in the data yet: Teota → Aricha rickshaw Tk 15 shared / Tk 30 reserved; Aricha → Utholi shared auto Tk 10; Utholi → Gabtoli bus Tk 200.
