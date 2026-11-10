# Architecture

How Jomidarpedia fits together, and why. Read this first. For where a particular file lives, see `docs/CODE_MAP.md`. For how to run and change things, see `docs/DEVELOPMENT.md`.

Codes such as R5, I3 and O4 refer to `roadmap/DEVELOPMENT_ROADMAP.md` §2, where each requirement (R), implementation recommendation (I) and owner decision (O) is recorded with its reason. Codes such as "spec 07 FR-14" refer to a numbered requirement in `.claude/specs/`.

## 1. The shape of the system

Jomidarpedia is a static website. There is no server, API, database, login, cookie or analytics. Everything a visitor sees is a file that was made at build time.

```
 EDITING                    BUILD TIME                               RUN TIME (the browser)

 data/csv/*.csv      ──►  npm run data  ──►  data/build/**.json  ──►  next build  ──►  out/*.html
 data/translations/        (scripts/)        (read with fs by                          (static pages)
 content/about.*.md                           page.tsx; never fetched)
                                         └►  public/data/index.json  ─────────────►  fetched once by
                                              (one short row per site)                 Explore and Search
                                         └►  public/maps/*.svg       ─────────────►  inlined into pages
                                         └►  data/reports/release-problems.md   (for the editor)

 ../images/ (outside   ──►  npm run thumbs  ──►  public/thumbs/*.webp, public/home/*.webp   (committed)
 the repository)            (maintenance)
```

Three consequences shape most of the code:

1. **Pages get their data as props.** A `page.tsx` reads `data/build/**` with `fs` while Next pre-renders it (`lib/data.ts`). The browser never sees those files.
2. **The browser fetches exactly one data file**, `public/data/index.json`, and only on pages that filter or search in the browser. It has short keys (`i`, `e`, `b`, `ll`…) to stay small: about 76 KB gzipped against a hard budget of 150 KB.
3. **Anything that must not be public is stopped by the build**, not by the UI. The UI can't leak what it was never given.

## 2. Rules that hold everywhere

These are the project's invariants. Each is enforced in code, usually in more than one place.

| Rule | What it means | Enforced by |
|---|---|---|
| **R1 Static output** | Every route is pre-rendered. Dynamic routes use `generateStaticParams()` with `dynamicParams = false`. | `next.config.mjs`, each dynamic `page.tsx` |
| **R2 Real data only** | Nothing is invented. An unknown is shown as words. | `Maybe` types in `lib/types.ts`, `components/site/Unknown.tsx`, `lib/format.ts` (throws instead of formatting an unknown) |
| **R3 Uncertainty is visible** | Legends are separate from history. Each claim shows only its own sources. | `scripts/build-data.mjs`, `components/site/Conflicts.tsx`, `History.tsx`, `Footnotes.tsx` |
| **R4 Images** | Only `Ready` images are published, each with its exact credit. | `scripts/lib/rules.mjs` `isReadyImage`, `scripts/lib/thumbs-check.mjs`, `home-check.mjs` |
| **R5 Hidden pins** | A site with `map_display = hide`, or without both coordinates, never exposes coordinates anywhere. | `scripts/lib/validate.mjs` `isMappable`, `scripts/lib/checks.mjs`, `scripts/check-out.mjs`, `scripts/build-export.mjs` |
| **R6 Fees** | A fee of 0 or blank is never a price or "free entry". | `scripts/build-data.mjs`, `scripts/lib/checks.mjs`, `components/site/Badges.tsx` |
| **R7 Slow networks** | The list renders before the map. Lite mode loads no map code and no tiles. | `components/map/MapLoader.tsx`, `lib/prefs.ts`, `scripts/check-budgets.mjs` |
| **R8 Attribution** | Every map shows its credit. | `lib/map-config.ts`, `scripts/build-maps.mjs` |
| **I6 Counts from data** | No number is typed into copy or a test. | `data/build/meta.json`, `tests/baseline.json`, the `{{counts.*}}` tokens in `content/about.*.md` |
| **I7 Field whitelist** | The build copies only named public fields. Internal columns can't reach the output. | `scripts/build-data.mjs`, `scripts/build-export.mjs` (fails on a field it doesn't know) |

## 3. The data build

`npm run data` runs `scripts/data.mjs`, which runs these steps in order and writes one report:

| Step | Script | Writes |
|---|---|---|
| 1 | `build-index.mjs` | `public/data/index.json` |
| 2 | `build-data.mjs` | `data/build/sites/<id>.json`, `trips/<id>.json`, `trips.json`, `divisions.json`, `districts.json`, `sources.json`, `credits.json`, `meta.json`, `translations.json` |
| 3 | `build-maps.mjs` | `public/maps/bd.svg`, `division/<slug>.svg`, `district/<slug>.svg` |
| 4 | `lib/thumbs-check.mjs` | nothing: checks that every referenced thumbnail exists and that no other one is published |
| 5 | `lib/home-check.mjs` | nothing: checks the home page's curated photos |
| 6 | `lib/about.mjs` | nothing: checks the About text and its count tokens |
| 7 | `build-export.mjs` | `public/data/jomidarpedia-data.zip` and `data/build/export.json`, in release mode only |

The scripts are plain Node with no dependencies. The output is deterministic: the same CSVs give the same bytes, because dates come from the data (or `SOURCE_DATE_EPOCH`) and never from the clock. That is what makes the fresh-clone comparison (`npm run compare:out`) possible.

### Build modes

`scripts/data-mode.mjs` decides the mode. It fails closed: anything unexpected is `release`.

| Mode | Selected by | Editorial problems | Indexing |
|---|---|---|---|
| `local` | `JP_DATA_MODE=local` (set by `npm run dev` and `npm run build:local`) | reported | noindex |
| `preview` | `VERCEL_ENV=preview`, or `JP_DATA_MODE=preview` | reported | noindex |
| `release` | the default; always when `VERCEL_ENV=production` | **fail the build** | indexable |

The mode also decides three other things: whether the `/dev/` pages are built (`next.config.mjs`), whether the data download is made (`build-export.mjs`), and whether a missing map tile key fails the build (`check-tile-key.mjs`).

### Three kinds of problem

| Kind | Examples | Effect |
|---|---|---|
| **Structural** | Malformed CSV, a missing column, a bad or duplicate ID, a broken reference, a bad enum, date or number, coordinates outside Bangladesh | Fails every mode. Nothing is written, and old output is removed. |
| **Safety** | A hidden site's coordinates on any path, a non-Ready image, a fee of 0 shown as a price, `index.json` over 150 KB | Fails every mode. Files are written so they can be inspected. |
| **Editorial** | An internal note in public text, a credit line not in the standard form, an `unclassified` site type, an unreviewed `plan_status` or `closed_days` | Reported in local and preview. Fails release. |

Every run writes `data/reports/release-problems.md`, which groups problems by the CSV cell to edit. `docs/DATA_GUIDE.md` describes the tables and the stages in detail, and `docs/DATA_CONTRACT.md` documents every output field.

## 4. Pages and rendering

All routes are in `app/`, and the full list with query keys is in `docs/URLS.md`.

| Route | Pages | How it gets data |
|---|---:|---|
| `/` | 1 | props from `meta.json`, `divisions.json`, `trips.json`, `credits.json` |
| `/explore/` | 1 | fetches `index.json`; area names as props |
| `/search/` | 1 | fetches `index.json`; districts as props |
| `/site/<id>/<slug>/` | 413 | props from `sites/<id>.json` |
| `/site/<id>/` | 413 | a meta-refresh redirect to the current slug (a static export can't send a real redirect) |
| `/trips/`, `/trips/<id>/` | 1 + 385 | props from `trips.json`, `trips/<id>.json` |
| `/division/<slug>/`, `/district/<slug>/` | 8 + 64 | props from `divisions.json`, `districts.json` |
| `/sources/`, `/sources/<id>/` | 1 + 1,146 | props from `sources.json` |
| `/about/`, `/credits/`, `/correction/`, 404 | 4 | props from `meta.json`, `credits.json`, `content/about.*.md` |
| `/dev/i18n/`, `/dev/bn-review/…` | local and preview only | files named `page.dev.tsx`, left out of release builds |

### Server components by default, small client islands

Most components are server components and ship no JavaScript. A component is a client component (`'use client'`) only when it needs the browser: the URL, storage, Leaflet, a dialog, a live region.

The pattern to follow when a page needs interactivity:

1. The `page.tsx` (server) reads data and passes plain props.
2. One client "app" component owns the interactive state: `ExploreApp`, `SearchApp`, `TripsApp`, `SourcesTable`.
3. The page renders a useful static version as the `<Suspense>` fallback (the first 12 trip cards, the first 25 source rows), so the page works with JavaScript off. `useSearchParams` in a static export requires the `<Suspense>` anyway.
4. Rules live in `lib/` as pure functions with no React, so the server, the client and the tests all call the same code.

### The URL is the state

Explore, Search, Trips, Sources and Credits keep their state in the query string. Each has a pure `parse()` and `serialize()` pair (`lib/urlState.ts`, `lib/searchUrl.ts`, `lib/trips.ts`, `lib/sources.ts`):

- `serialize()` writes one canonical form: keys in a fixed order, values in a fixed order, defaults left out. So a shared link and a rebuilt link are byte-identical.
- `parse()` drops any key or value it doesn't know and reports that. The page then rewrites the URL in place and shows a notice.
- An applied change pushes one history entry. Things that shouldn't create an entry (Load more, scroll position, the sheet's snap point) live in `history.state` under `jp`.

Language, theme and Lite mode are never in the URL. They live in `localStorage` (`lib/prefs.ts`).

### Heavy code loads late

| Code | Loads when |
|---|---|
| Leaflet, markercluster, map CSS, tiles | A map is actually visible and Lite mode is off (`next/dynamic` with `ssr: false` in `MapLoader`, `MiniMap`, `RouteMap`) |
| Fuse.js | A search box is focused or mounted (`lib/search-client.ts`) |
| `index.json` | Explore or Search runs, or a search box is used; fetched at most once per page |
| The search overlay | The header's search button is first pressed |
| The full-size Wikimedia photo | The lightbox opens |

`npm run check:budgets` fails if the home page references a Leaflet or Fuse.js chunk.

## 5. Two languages without routes

Decision I3. There are no `/bn/` pages. Instead:

1. **Every interface string is rendered in both languages**, as `<span lang="en" data-l="en">` and `<span lang="bn" data-l="bn">`. The component is `<T k="…">` in `components/T.tsx`, and the strings are in `lib/i18n.ts`.
2. **CSS hides one of them**, keyed on `<html data-lang>` (`app/tokens.css`). A hidden span is `display: none`, so screen readers skip it too.
3. **A boot script sets `data-lang` before first paint** from `localStorage` (`BOOT_SCRIPT` in `lib/prefs.ts`, inlined in `app/layout.tsx`). So nothing flashes, and server components need no language context.
4. **With JavaScript off, English shows.**

Which helper to use:

| Helper | For |
|---|---|
| `<T k="nav.explore" />` | An interface string from `lib/i18n.ts` |
| `<Both value={formatCount(n)} />` | A number, date or other value formatted in both languages by `lib/format.ts` |
| `<Prose en={…} bn={…} />` | Prose from the data. Shows the Bangla when the build found a valid translation, otherwise the English marked `lang="en"` |
| `<Latin>` | Text that stays in Latin script: IDs, coordinates, credit lines, source titles |
| `useUiLang()` | Only for strings built at run time in a client component: Leaflet labels, live regions, toasts |

**Numbers.** On Bangla pages numbers use Bengali digits (০–৯) through `lib/format.ts`. IDs, coordinates, URLs and phone numbers keep Latin digits. Translation files store Latin digits, and the site converts them when it renders.

**Bangla prose.** Translations live in `data/translations/bn/<table>.csv`, one row per translated cell, each with a fingerprint (`en_hash`) of the English it translates. When the English changes, the fingerprint stops matching and the page shows English again until the Bangla is redrafted. See `docs/TRANSLATION_BN.md` and `docs/DATA_CONTRACT.md` §5.

**Trade-off.** Search engines index only the English. Separate `/bn/` routes are listed in the roadmap (§4) as post-MVP work.

## 6. Visitor preferences

`lib/prefs.ts` holds three preferences in `localStorage`. The boot script applies them to `<html>` before paint, and the toggles (`components/shell/Toggles.tsx`) change them without a reload.

| Preference | Key | Attribute on `<html>` | Default |
|---|---|---|---|
| Language | `jp-lang` | `data-lang`, `lang` | English |
| Theme | `jp-theme` | `data-theme` | follows the OS |
| Lite mode | `jp-lite` | `data-lite` | on only when the browser's data saver is on (O7) |

Storage can throw (private mode). A change then applies to the open page only.

## 7. Explore, search and the map

**Filters** (`lib/filters.ts`). Groups combine with AND, and options within a group with OR. The count beside an option is a facet count: how many sites would match if you chose it, given every *other* group. All of this is computed in the browser from `index.json`.

**Search** (`lib/search.ts`, `lib/fold.ts`). The query and the index are both "folded" so that spellings that should find each other become the same string: case, Latin accents, Bangla vowel length, and listed Latin variants (zamindar, jomidar, jamidar…). A query is split into words. A word hits a site when a site word equals it, starts with it, or (outside exact mode) is a close spelling found by Fuse.js over the index's vocabulary. Fuse.js runs on single words, never on whole fields, so a short word can't fuzzily match somewhere inside a paragraph.

**Map** (`components/map/`, `lib/pins.ts`, `lib/map-config.ts`). React owns the controls, the key and the summary card. Leaflet owns the tiles, the pins and the clusters. A pin's colour and glyph say the site's condition, its fill says how sure the location is, and a gold "?" marks a flagged pin. None of that depends on colour alone: the accessible name repeats it. The list is the accessible equivalent of the map, and only mappable sites ever reach the map.

**Tiles.** CARTO in production, through `NEXT_PUBLIC_TILE_KEY`. Without the key (local builds), the map falls back to OpenStreetMap's tiles, which is fine for development only. A release build without the key fails on purpose. See `docs/tiles.md`.

## 8. Other moving parts

- **Corrections** (`components/correction/`). Every "Suggest a correction" link points to `/correction/`. With JavaScript, a listener opens the form as a popup instead. The form posts to Web3Forms, which emails the project address. Nothing a reader sends is published automatically. The Web3Forms access key in `lib/nav.ts` is public by design: it only identifies which inbox receives the form.
- **Print** (`app/tokens.css`, `app/trips/[id]/page.tsx`). Itineraries print with the browser's own print, with no PDF library. Print is always light, whatever the theme.
- **SEO** (`lib/seo.ts`, `scripts/build-seo.mjs`). Each page sets its title, description, canonical link and share image. `robots.txt` is written in every mode, and `sitemap.xml` only in release mode with `SITE_URL` set. Local and preview builds are noindex.
- **Security** (`vercel.json`, `serve.json`). A Content Security Policy and three other headers on every path. `serve.json` mirrors them for the test server, so every Playwright test runs under the production policy and fails on a violation. See `docs/security.md`.
- **Static maps** (`scripts/build-maps.mjs`). The home, division and district pages show SVG maps drawn at build time from `data/geo/bgd.json`, so they need no Leaflet.
- **Offline** (`components/shell/OfflineNotice.tsx`). There is no service worker (O8). The notice promises only that the open page stays open.

## 9. Hosting and delivery

- **Vercel Hobby** builds and deploys `main` to production with `npm run build`. Other branches get preview deployments. The Hobby plan is for non-commercial use only.
- **Vercel serves `out/` as a plain static site** (`vercel.json`: `"framework": null`, `"outputDirectory": "out"`, `"trailingSlash": true`), so production is exactly the `out/` that the tests and `compare:out` check. Vercel's Next.js builder must not be used: it takes the output when `next build` ends, so `robots.txt` and `sitemap.xml`, which `npm run seo` writes afterwards, were missing from production until 10 Nov 2026. A unit test in `tests/release-checks.test.ts` keeps these settings.
- **GitHub Actions** (`.github/workflows/ci.yml`) runs two jobs on every push to `main` and every pull request: `check` (lint, types, a local build, unit tests, link and budget checks, page tests) and `release` (a release build, the same checks, and Lighthouse).
- **Environment variables** are listed in `docs/DEVELOPMENT.md`. Production needs `SITE_URL` and `NEXT_PUBLIC_TILE_KEY`.

## 10. Where decisions are recorded

| Question | Where to look |
|---|---|
| Why was X decided? | `roadmap/DEVELOPMENT_ROADMAP.md` §2 (R, I and O codes) |
| What exactly should feature Y do? | `.claude/specs/NN-*.md`: numbered requirements (FR), decisions (D), assumptions (A) and acceptance criteria (AC) |
| What does the code in this file do? | The comment at the top of the file. Nearly every file starts with one that names its roadmap task and spec. |
| What did the design look like? | The design canvas linked from the roadmap. Some boards show old counts; counts always come from data. |
| What isn't done? | Roadmap §4 (after the MVP), and "Open items" in `docs/a11y-checks.md` |

## 11. Known limits

- Bangla pages aren't indexed separately by search engines (no `/bn/` routes).
- No offline support.
- One editor, working in CSV files. There is no editing interface.
- 160 houses from the core book's appendix aren't in the data yet (`data/reference/book-appendix-matches.csv`).
- The tile provider's free tier is for non-commercial use, and so is the hosting plan.
