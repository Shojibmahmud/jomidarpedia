# Code map

Where things are. Use this to find the file that does something. Every file also starts with a comment that explains it and names its roadmap task and spec, so open the file for the detail.

"Client" marks a component that runs in the browser (`'use client'`). Everything else is rendered at build time and ships no JavaScript.

## Top level

| Path | What it is |
|---|---|
| `next.config.mjs` | Static export, trailing slashes, unoptimised images, and the rule that builds `page.dev.tsx` files only outside release mode |
| `tailwind.config.ts` | Theme: colour tokens, fonts, the paired English and Bangla type scale, breakpoints, z-index |
| `vercel.json` | Security headers for production |
| `serve.json` | The same headers for the local test server. A test keeps the two identical |
| `playwright.config.ts`, `vitest.config.mts` | Test runners |
| `eslint.config.mjs`, `tsconfig.json`, `postcss.config.mjs` | Lint, TypeScript and CSS tooling |
| `.nvmrc` | Node 24, for CI and Vercel |
| `.github/workflows/ci.yml` | The two CI jobs |
| `CLAUDE.md`, `AGENTS.md` | Instructions for AI coding assistants |
| `CHANGELOG.md`, `CONTRIBUTING.md` | Release history; the editor's guide |
| `archive/` | Superseded versions of the README |

## `app/`: routes

| File | Route | Notes |
|---|---|---|
| `layout.tsx` | every page | Fonts, the boot script, skip link, header, footer, offline notice, correction popup, default metadata |
| `tokens.css` | every page | Colour tokens (light, dark, print), base rules, the language-hiding rule, print layout |
| `fonts.ts` | | The six font families, self-hosted by `next/font` |
| `font-files/` | | A digits-only subset of Noto Sans Bengali |
| `page.tsx` | `/` | Home |
| `explore/page.tsx` | `/explore/` | Shell for `ExploreApp` |
| `search/page.tsx` | `/search/` | Shell for `SearchApp` |
| `site/[id]/[slug]/page.tsx` | `/site/<id>/<slug>/` | The site page |
| `site/[id]/page.tsx` | `/site/<id>/` | Meta-refresh redirect to the current slug |
| `trips/page.tsx`, `trips/[id]/page.tsx` | `/trips/`, `/trips/<id>/` | Trips listing; itinerary with its print layout |
| `division/[slug]/page.tsx`, `district/[slug]/page.tsx` | area pages | 8 divisions, 64 districts |
| `sources/page.tsx`, `sources/[id]/page.tsx` | `/sources/…` | Sources list; one page per source |
| `about/page.tsx` | `/about/` | Renders `content/about.*.md` |
| `credits/page.tsx` | `/credits/` | Every photo credit |
| `correction/page.tsx` | `/correction/` | The correction form as a page (noindex) |
| `not-found.tsx` | `/404.html` | The 404 page |
| `dev/i18n/page.dev.tsx` | `/dev/i18n/` | Language and formatter test page. Local and preview only |
| `dev/bn-review/…/page.dev.tsx` | `/dev/bn-review/…` | Bangla translation review. Local and preview only |

## `components/`

### Shared

| File | What it does |
|---|---|
| `T.tsx` | `T`, `Both`, `Prose`, `Latin`, `SrT`: dual-language rendering. Used everywhere |
| `shell/SiteHeader.tsx`, `SiteFooter.tsx` | The page shell |
| `shell/Toggles.tsx` | Client. Language, theme and Lite mode toggles |
| `shell/Disclosure.tsx` | Client. A button that opens a panel (menus) |
| `shell/OfflineNotice.tsx` | Client. The offline toast |
| `shell/ProseNote.tsx` | The Bangla-mode note: "not checked yet" or "parts still in English" |
| `shell/Skeleton.tsx` | Loading placeholders |
| `shell/BrokenLinkReport.tsx` | Client. "Report a broken link" on the 404 page |
| `brand/Logo.tsx` | The mark and wordmark (geometry in `scripts/lib/logo.mjs`) |
| `art/ConditionGlyph.tsx`, `PlaceholderArt.tsx`, `EmptyStates.tsx` | SVG drawings: condition glyphs, the no-photo placeholder, empty states |
| `cards/SiteCard.tsx` | The site card, in three layouts |
| `correction/CorrectionDialog.tsx`, `CorrectionForm.tsx`, `CorrectionPageForm.tsx` | Client. The correction popup and form (Web3Forms) |

### Home, areas, About, credits, sources

| File | What it does |
|---|---|
| `home/HomeParts.tsx` | The home page's sections |
| `home/HeroSearch.tsx` | Client. A plain form that hands over to `SearchBox` on first focus |
| `home/CreditButton.tsx` | Client. A photo's credit behind a camera button |
| `areas/AreaParts.tsx` | Parts shared by division and district pages |
| `areas/DistrictSites.tsx` | Client. A district's site cards with chip filters |
| `about/AboutParts.tsx`, `Licences.tsx` | About's pictures; the licences block |
| `credits/CreditsFilter.tsx` | Client. Search and `?site=` on the credits page |
| `sources/SourcesTable.tsx` | Client. The sources table: search, chips, sort, paging |

### Explore and map

| File | What it does |
|---|---|
| `explore/ExploreApp.tsx` | Client. Owns Explore: URL state, the list, the map, sheets, Lite mode |
| `explore/FilterRail.tsx`, `FilterDrawer.tsx`, `FilterGroups.tsx`, `controls.tsx` | Client. Filters on desktop and mobile, and the individual controls |
| `explore/ActiveFilters.tsx`, `EmptyResults.tsx`, `ResultsList.tsx`, `ExploreSearch.tsx` | Client. Chips, the empty state, the list, search within results |
| `explore/LiteNotices.tsx` | Client. Notes about Lite mode on any page with a map |
| `map/MapLoader.tsx` | Client. Loads the map code only when a map is shown |
| `map/MapView.tsx` | Client. The Explore map: pins, clusters, selection |
| `map/MapControls.tsx`, `SummaryCard.tsx`, `BottomSheet.tsx` | Client. Controls and key; the selected site's card; the phone sheet |
| `map/MiniMap.tsx`, `MiniMapView.tsx` | Client. The site page's one-pin map, loaded when it nears the screen |
| `map/MapSprite.tsx`, `map.css` | Hatch patterns for approximate pins; map styles |

### Search

| File | What it does |
|---|---|
| `search/SearchApp.tsx` | Client. Owns `/search/` |
| `search/SearchBox.tsx` | Client. The combobox with grouped suggestions |
| `search/SearchButton.tsx`, `SearchOverlay.tsx` | Client. The header's search control and its overlay |
| `search/Marked.tsx`, `results.tsx`, `SearchIcon.tsx` | Match highlighting and shared result pieces |

### Site page

| File | Section |
|---|---|
| `site/Header.tsx`, `Badges.tsx`, `SiteNames.tsx` | Breadcrumb, both names, the badge row, the sparse-record banner |
| `site/AtAGlance.tsx` | "At a glance" and "What we know so far" |
| `site/Gallery.tsx` (client), `NoPhotoPanel.tsx` | Photos and lightbox; the no-photo panel |
| `site/LocationPanel.tsx` | Location, in its five states |
| `site/History.tsx` | History timeline, and legends kept apart from it |
| `site/FeatureList.tsx` | Architecture and grounds |
| `site/VisitingInfo.tsx`, `LastChecked.tsx`, `StaleNote.tsx` (client) | Visiting, and "last checked" with its staleness note |
| `site/Routes.tsx` | Getting there from Dhaka |
| `site/Related.tsx` | Identity notes, "Combine with", itineraries |
| `site/Conflicts.tsx`, `Sources.tsx`, `Footnotes.tsx` | Disagreements, sources and footnote markers |
| `site/SectionNav.tsx` (client) | "On this page" |
| `site/Unknown.tsx` | Renders a `Maybe` value or the words for unknown |
| `site/SuggestCorrection.tsx`, `CopyButton.tsx` (client) | Correction links; share and copy |

### Trips

| File | What it does |
|---|---|
| `trips/TripsApp.tsx` | Client. Owns the listing's filters, sort and paging |
| `trips/ItineraryCard.tsx`, `PhotoCredits.tsx` (client) | The trip card and its credits popover |
| `trips/Stops.tsx`, `Legs.tsx`, `SiteCards.tsx`, `Budget.tsx` | The itinerary's stops, legs, site cards and budget |
| `trips/DayCheck.tsx` | Client. "Which day are you going?" |
| `trips/RouteMap.tsx`, `RouteMapView.tsx` | Client. The itinerary map |
| `trips/PrintButton.tsx`, `PageUrl.tsx` | Client. Print; the page address on the printout |

### Development only

`dev/ReviewTable.tsx` (client): the rows of the Bangla review pages.

## `lib/`

Pure rules unless marked "server only" (reads files) or "client" (uses hooks).

| File | What it holds |
|---|---|
| `types.ts` | The shape of every generated JSON file. Changes together with `docs/DATA_CONTRACT.md` |
| `data.ts` | Server only. Typed, cached readers: `getSite`, `getTrip`, `getIndex`, `getMeta`… A missing file or unknown ID throws |
| `area-data.ts`, `home-data.ts`, `trip-data.ts` | Server only. Joins that prepare props for area pages, Home and trips |
| `i18n.ts` | Every interface string in both languages; `text()`, `dual()` |
| `format.ts` | Numbers, money, hours, dates and clock times in both languages; Bengali digits |
| `prefs.ts` | Language, theme and Lite mode: storage keys, the boot script, apply functions |
| `use-ui-lang.ts` | Client. Hooks that follow `<html>`: `useUiLang`, `useTheme`, `useLite`, `useMedia`, `useDark` |
| `filters.ts` | Explore's filter state, matching and facet counts |
| `sort.ts` | Explore's sort orders |
| `urlState.ts` | Explore's URL: `parse()` and `serialize()` |
| `explore-labels.ts` | Labels for filter options and chips |
| `fold.ts` | Spelling folding for search, and the list of Latin variants |
| `search.ts` | The search matcher and ranking |
| `search-client.ts` | Client. Loads `index.json` and Fuse.js once, on demand |
| `searchUrl.ts` | `/search/`'s URL state |
| `map-config.ts` | Tile providers, attribution, zoom thresholds and other map numbers |
| `pins.ts` | Pin and cluster markup and accessible names |
| `site-page.ts` | Rules behind the site page: sparse records, section hints, staleness |
| `trips.ts` | Trips listing URL state and what an itinerary page may claim |
| `areas.ts` | Ordering and links for division and district pages |
| `home.ts`, `home-images.json` | Home's rules; the curated photo list |
| `sources.ts` | Sources URL state, type chips, sorting |
| `seo.ts` | `pageMeta()`: title, description, canonical and share tags |
| `site-url.ts` | Site URLs, `canonicalUrl()`, and whether the build is indexable |
| `nav.ts` | Header and footer links, the correction URL, contact address and Web3Forms settings |
| `licences.ts` | Which licences the site lists |
| `markdown.tsx` | The small Markdown subset used by the About page |

## `scripts/`

| File | Command | What it does |
|---|---|---|
| `data.mjs` | `npm run data` | Runs every step of the data build and writes the report |
| `data-mode.mjs` | | Resolves `local`, `preview` or `release` |
| `build-index.mjs` | `npm run data:index` | Writes `public/data/index.json` |
| `build-data.mjs` | `npm run data:build` | Writes `data/build/**` |
| `build-maps.mjs` | | Writes the static SVG maps |
| `build-export.mjs` | | Writes the data download (release only) |
| `build-seo.mjs` | `npm run seo` | Writes `robots.txt` and `sitemap.xml` into `out/` |
| `build-thumbs.mjs` | `npm run thumbs` | Maintenance. Makes thumbnails and home photos from the originals |
| `build-icons.mjs` | `npm run icons` | Maintenance. Makes the icons and the default share image |
| `prepare-geo.mjs` | | One-off. Simplifies boundary files into `data/geo/bgd.json` |
| `export-xlsx.py` | | One-off. Exported the original workbook to CSV |
| `bn.mjs` | `npm run bn` | The Bangla translation workflow |
| `check-out.mjs` | `npm run check:out` | Link and leak checks over `out/` |
| `check-budgets.mjs` | `npm run check:budgets` | Size budgets |
| `check-prod.mjs` | `npm run check:prod` | The same checks against the deployed site |
| `check-tile-key.mjs` | | Fails a release build without the tile key |
| `compare-out.mjs` | `npm run compare:out` | Compares two build trees |
| `lighthouse.mjs` | `npm run lighthouse` | Lighthouse with pass thresholds |
| `screenshots.mjs` | `npm run screenshots` | Screenshots for visual review |
| `csv.mjs` | | The CSV reader |

### `scripts/lib/`

| File | What it holds |
|---|---|
| `structure.mjs` | Structural validation: tables, required columns, IDs, references |
| `validate.mjs` | Shared rules: ID patterns, enums, the Bangladesh bounding box, `isMappable`, site type groups |
| `rules.mjs` | Reviewed data rules: unknown values, transport modes, cost units, relations, card summaries |
| `checks.mjs` | Safety checks on the builders' own output |
| `internal-terms.mjs` | The words and paths that mark an internal note |
| `translations.mjs` | Loading and validating Bangla translations; the fingerprint |
| `about.mjs` | The About text: front matter and count tokens |
| `thumbs-check.mjs`, `home-check.mjs` | Photo checks |
| `report.mjs` | Combines results into `release-problems.md` and one pass or fail |
| `cli.mjs` | The shared command-line wrapper |
| `zip.mjs` | A small deterministic zip writer and reader |
| `logo.mjs` | The logo's geometry |

## `data/`, `content/`, `public/`

| Path | Committed? | What it is |
|---|---|---|
| `data/csv/*.csv` | yes | The 17 source tables |
| `data/translations/bn/*.csv` | yes | Bangla translations, 11 tables |
| `data/translations/todo/` | no | Work files written by `npm run bn -- todo` |
| `data/geo/bgd.json`, `names.csv`, `SOURCE.md` | yes | Boundary outlines and where they came from |
| `data/reference/` | yes | Contents and appendix of the core book, for future research |
| `data/reports/release-problems.md` | no | The latest build report |
| `data/reports/classification-*.md`, `spot-check-*.md` | yes | Records of Phase 12 content work |
| `data/build/` | no | Build-time JSON |
| `content/about.en.md`, `about.bn.md` | yes | The About page's text |
| `public/thumbs/`, `public/home/` | yes | WebP photos and their manifests |
| `public/icon.svg`, `apple-touch-icon.png`, `og-default.png`, `placeholder.svg` | yes | Icons, the share card, the photo fallback |
| `public/data/`, `public/maps/` | no | `index.json`, the data download, static maps |

## `tests/` and `e2e/`

| Path | What it is |
|---|---|
| `tests/*.test.ts(x)` | Unit tests, named after what they cover (`search.test.ts`, `pipeline.test.ts`, `release-checks.test.ts`…) |
| `tests/baseline.json`, `baseline.test.ts`, `measures.ts` | The reviewed counts of the real data, and the invariants |
| `tests/fixtures/csv/` | Generated fixture data sets, by `tests/fixtures/make-fixtures.mjs` |
| `tests/helpers.ts`, `index-contract.ts`, `stubs/` | Shared helpers |
| `e2e/*.spec.ts` | Page tests, one file per area of the site |
| `e2e/fixtures.ts` | The shared `test` with the CSP guard |
| `e2e/tiles.ts` | Answers tile requests locally |

## Documentation and planning

| Path | What it is |
|---|---|
| `docs/` | See `docs/README.md` |
| `docs/testing/*.pdf` | Step-by-step phone test guides for the owner |
| `roadmap/DEVELOPMENT_ROADMAP.md` | The plan, with decisions and every task |
| `roadmap/DESIGN_COVERAGE.md` | Each design board mapped to routes and tasks |
| `roadmap/ROADMAP_REVIEW_*.md`, `roadmap/archive/` | The review of roadmap v1 and how it was resolved |
| `.claude/specs/NN-*.md` | Feature specifications, 01 to 16 |
| `.claude/skills/`, `.agents/skills/` | Assistant workflow commands |
