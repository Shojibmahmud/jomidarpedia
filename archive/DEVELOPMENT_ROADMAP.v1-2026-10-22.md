# Jomidarpedia: development roadmap

Working checklist for building the Jomidarpedia web app. Written 22 October 2026 from the design canvas, the developer handoff (`README.md` in this folder), the data in `data/csv/`, and the earlier planning document `Final Data/interactive-map-roadmap.md` (16 October 2026).

- **Design canvas (every screen, light and dark, Bangla mode, print):** https://claude.ai/artifact/RWUDBkchSgq1mwrDe5LqqC
- **Tick a box when the task is done and verified.**
- **Do the phases in order.** Inside a phase, tasks are ordered too, unless a task says otherwise.

---

## 1. What we are building

### Purpose
Jomidarpedia (জমিদারপিডিয়া) is a free, non-commercial, bilingual (English and Bangla) encyclopedia and travel guide to the zamindar houses, palaces, rajbaris and kacharis of Bangladesh. For each site it shows what is known, how sure we are, where the sources disagree, and how to get there from Dhaka. Unknowns are shown as words ("Not documented", "No ticket reported"), never as blanks, zeros or "Free".

### Target users
- **Day-trippers and travellers from Dhaka:** "what can I see in a day, and how do I get there?"
- **People interested in heritage**, including families of the houses: "what is this place, who built it, what state is it in?"
- **Students, researchers and journalists:** history, owners and conflicting accounts, each with its source.

Most visitors will be on phones, often on slow mobile connections.

### Core features (MVP)
1. **Home:** photo-led landing page with search, quick filters, numbers, a map preview, division tiles and featured day trips.
2. **Explore:** map plus list of every site, with filters for day trip, travel time, condition, access, division and district, site type and information quality. Filters live in the URL. The list is the accessible equivalent of the map.
3. **Site pages:** one per site, with gallery or placeholder art, at-a-glance facts, location confidence, history timeline, legends kept apart from history, disagreements between sources, visitor info with a "last checked" date, routes and costs from Dhaka, related sites, and a source list.
4. **Search** across English and Bangla names, alternate names, districts and families, with spelling folding (jomidar, jamidar, zamindar).
5. **Day trips:** listing plus itinerary pages with a route map, timed stops, a budget, day-of-week warnings and a two-page A4 print layout.
6. **Division and district pages, the source list and source pages, About, image credits, and 404 / loading / offline states.**
7. **Bangla mode** (interface strings and digits) and **light/dark theme**.
8. **"Suggest a correction"** link on every site page.

### Agreed technical decisions (confirmed in the handoff)
| Area | Decision |
|---|---|
| Framework | Next.js App Router with `output: 'export'`: a fully static site. No server code, API routes, database or login at launch. |
| Styling | Tailwind CSS v3.4 with colours as CSS variables (`tailwind.config.ts`, `app/tokens.css`). Light and dark themes come from the same classes. |
| Fonts | `next/font/google`, self-hosted at build: Cinzel (wordmark only), Fraunces, Source Sans 3, Tiro Bangla, Hind Siliguri (`app/fonts.ts`) |
| Data | CSV files in `data/csv/` are the source of truth, edited through Git. `scripts/build-index.mjs` writes `public/data/index.json`, the only file the browser fetches (budget 150 KB gzipped). `scripts/build-data.mjs` writes `data/build/**`, which pages read at build time. |
| Build rules | The build **fails** on internal research notes in public text, on any image that isn't `Ready`, and on a fee of 0 shown as a price. Sites with `map_display = hide` get no coordinates. |
| Map | Leaflet + leaflet.markercluster over OSM raster tiles (CARTO Positron as an option), loaded with `next/dynamic` (`ssr: false`), and never loaded in Lite mode |
| Search | Fuse.js, loaded lazily, over `index.json` |
| Bangla mode | Client-side switch: `<html lang="bn">`, strings from `lib/i18n.ts`, choice saved in `localStorage` (`jp-lang`). Separate `/bn/` routes may come later. |
| Images | Only `Ready` images, as pre-sized 4:3 WebP thumbnails in `public/thumbs/`. The lightbox loads the Wikimedia Commons original. Every image shows its credit line. Never Google Maps or news photos. |
| Corrections | A pre-filled GitHub issue link, with an email fallback |
| Hosting | Vercel Hobby (non-commercial use only, which this project is) |
| Accessibility | WCAG 2.2 AA, a visible focus ring, 44 px touch targets, pins as `<button>`s, `prefers-reduced-motion` respected, `lang` attributes on mixed-language text |
| Routes | `/`, `/explore`, `/site/[id]/[slug]`, `/site/[id]` (redirect page), `/trips`, `/trips/[id]`, `/division/[slug]`, `/district/[slug]`, `/search`, `/sources`, `/sources/[id]`, `/about`, `/credits`, 404 |

**Superseded by the handoff:** the 16 October roadmap suggested MapLibre with self-hosted PMTiles, Cloudflare Pages, and a form service for corrections. The handoff and the design chose Leaflet, Vercel and GitHub issues instead. This roadmap follows the handoff.

### Current state of the repository (this `handoff/` folder)
- **Already present:**
  - `tailwind.config.ts`, `app/tokens.css`, `app/fonts.ts`, `app/layout.tsx`, `next.config.mjs`, `lib/types.ts`
  - `scripts/build-index.mjs`, `scripts/build-data.mjs`, `scripts/csv.mjs`, `scripts/export-xlsx.py`
  - 14 CSV tables in `data/csv/`
  - book reference tables in `data/reference/`
- **Data size:** 413 sites (299 with a map pin, 114 without), 385 itineraries, 1,136 sources, 934 publishable images. The image files are in `../images/<division>/`.
- **`build-data.mjs` currently fails, as designed:** 1,386 strings of internal notes in public text, across 417 records. The biggest groups are source publishers (662), location notes (298), source titles (109), conflict text (76) and site summaries (71).
- **No Next.js app exists yet:** there is no `package.json` and no pages.

---

## 2. Requirements, assumptions, open decisions

### Confirmed requirements
- **Static site** with the routes listed above; every page pre-rendered.
- **Real data only:** no placeholder text or invented facts in production. Unknown values are shown as text.
- **Legends never appear in the history timeline.** Disagreements between sources are shown, with the sources for each version.
- **Image publishing rule:** only `Ready` images, each with its credit line.
- **Map preview:** no Google Maps or news photos embedded. Hidden-pin sites never get a guessed pin.
- **Bilingual interface:** names always shown in both languages; long text in English for now.
- **Mobile first,** accessible, and fast on slow connections. The list renders before the map; Lite mode has no map.
- **Map attribution:** OpenStreetMap credit shown on every map.
- **Itinerary print:** a two-page A4 print/PDF layout produced by the browser's print, with no PDF library.

### Assumptions (change them here if they're wrong)
- **A1. Who builds it:** you, comfortable with JavaScript and new to parts of Next.js and Leaflet, working with an AI coding assistant. Tasks are sized for one focused session each.
- **A2. Repository root:** this `handoff/` folder becomes the root of the Git repository.
- **A3. Public repository:** the repo is public on GitHub. This is needed for "Suggest a correction" GitHub issues and fits "the data is a set of CSV files anyone can read" (About page).
- **A4. Versions:** current stable Next.js, React 19, TypeScript, and Tailwind pinned to 3.4.x as agreed. Node 20 LTS or newer.
- **A5. Tests:** Vitest for the data scripts and pure functions, Playwright plus `@axe-core/playwright` for page tests and accessibility, and a Lighthouse budget check before launch.
- **A6. Domain:** you start on the free `*.vercel.app` address. A custom domain can be added at any time without code changes.
- **A7. Analytics:** none at MVP. A privacy-friendly tool is a post-MVP option.
- **A8. Content licence:** CC BY-SA 4.0 for the text and data, as shown in the print design's footer. Photos keep their own licences.

### Open decisions (they block only the tasks named)
- **D1. Correction email address** for the email fallback. Blocks task 7.6.
- **D2. Fixing the 1,386 internal notes:** reword them by hand, or have the build strip some fields automatically (for example, hide source publishers that mention internal tooling). Blocks Phase 10. Development can continue before this is decided (see Phase 1).
- **D3. Tile provider for production:** OSM's public tile servers allow light use only and forbid heavy traffic. CARTO basemaps have their own terms. Confirm the terms, or plan a fallback, before launch. Blocks task 11.4.
- **D4. Licence for the site's text and data:** confirm assumption A8. Blocks task 9.5.
- **D5. Unfinished data issues from the handoff:**
  - 79 sites typed `unclassified`
  - 15 image credit lines in non-standard wording
  - itinerary titles that embed the anchor site
  - the editor's new Manikganj fares
  
  Blocks Phase 10.

---

## 3. Phases

The order gets a working, deployed end-to-end slice early (data → one real site page → live URL), then widens it.

```
0 Setup ─► 1 Data pipeline (dev mode) ─► 2 Walking skeleton (deployed)
        ─► 3 Site page ─► 4 Explore list ─► 5 Map ─► 6 Search
        ─► 7 Trips, areas, sources, about ─► 8 Bangla + theme
        ─► 9 Images ─► 10 Content readiness ─► 11 Quality + security ─► 12 Launch
```
Phase 10 (content cleanup) can run alongside Phases 3 to 9.

---

### Phase 0: Project setup

**Objective:** an empty Next.js app that uses the agreed config files, builds as a static export, and runs its first tests.
**Prerequisites:** Node 20+, Git, a GitHub account, a Vercel account.

- [ ] **0.1** In `handoff/`, run `git init`. Add a `.gitignore` for `node_modules/`, `.next/`, `out/`, `data/build/`, `public/data/` and `.env*`, then commit the existing files.
- [ ] **0.2** Scaffold Next.js (App Router, TypeScript, ESLint, `src/` off, import alias `@/*`) into a temporary folder. Copy `package.json`, `tsconfig.json`, `eslint` config and `next-env.d.ts` into the root without overwriting `app/layout.tsx`, `next.config.mjs` or `tailwind.config.ts`.
- [ ] **0.3** Install Tailwind 3.4.x, PostCSS and Autoprefixer. Create `postcss.config.mjs`. Import `app/tokens.css` and the Tailwind directives in `app/layout.tsx`.
- [ ] **0.4** Add a placeholder `app/page.tsx` that uses a token colour (`bg-bg text-ink`), a heading font (`font-serif`) and a Bangla line (`font-bn`).
- [ ] **0.5** Run `npm run build` and confirm `out/index.html` exists. Fix any font or config errors.
- [ ] **0.6** Add scripts to `package.json`:
  - `data:index`
  - `data:build`
  - `data` (runs both)
  - `test` (Vitest)
  - `e2e` (Playwright)
  - `prebuild` (runs `npm run data`)
- [ ] **0.7** Install Vitest. Add one test for `scripts/csv.mjs` that parses a quoted field containing a comma and a Bangla string.
- [ ] **0.8** Create a GitHub repository, push, and add a CI workflow: `npm ci`, `npm test`, `npm run build` on every push.

**Acceptance criteria**
- `npm run build` produces `out/` locally.
- `npm test` passes.
- The CI run on GitHub is green.
- The placeholder page shows the cream background, Fraunces and Hind Siliguri.

---

### Phase 1: Data pipeline in development mode

**Objective:** generate all JSON from the CSVs on every build, without the 1,386 known content problems blocking development, while still blocking release builds.
**Prerequisites:** Phase 0.

- [ ] **1.1** Make `build-index.mjs` take default paths (`data/csv/sites.csv`, `data/csv/images.csv`, `public/data`) so `npm run data:index` needs no arguments. Confirm it writes `public/data/index.json` with 413 rows and reports its gzipped size.
- [ ] **1.2** Add a `--mode=dev|release` flag to `build-data.mjs`.
  - **`release`:** fails on problems, as now.
  - **`dev`:** writes the files, prints a one-line summary per problem group, and exits 0.
  - The `prebuild` script uses `dev` locally and `release` when `CI_RELEASE=1`.
- [ ] **1.3** Write a Vitest test that builds into a temporary folder and checks three hard rules:
  - no generated text contains "Free";
  - no image record has a readiness other than `Ready`;
  - no `index.json` row with `map_display = hide` has `ll`.
- [ ] **1.4** Write a Vitest test for the folding function used by search (`jamidar`/`zamindar` → `jomidar`, `badi` → `bari`, Chowdhury spellings). Put the function in `lib/fold.ts` and use it in both the build and the browser.
- [ ] **1.5** Generate `meta.json`, check its counts (sites 413, onMap 299, noPin 114) against a Vitest snapshot, and commit the snapshot.

*Dependency:* 1.2 must be done before any phase that runs `next build`.

**Acceptance criteria**
- `npm run data` writes `public/data/index.json` (under 150 KB gzipped) and all of `data/build/**` in dev mode.
- `CI_RELEASE=1 npm run data` still fails, listing the problem groups.
- The tests cover the three hard rules.

---

### Phase 2: Walking skeleton, deployed

**Objective:** one real site page and a minimal home page, built from real data and live on a Vercel URL.
**Prerequisites:** Phase 1.

- [ ] **2.1** Write `lib/data.ts` with typed, build-time readers (`getIndex()`, `getSite(id)`, `getMeta()`, `getTrips()`) that read `data/build/**` and `public/data/index.json` with `fs`. Use the types in `lib/types.ts`.
- [ ] **2.2** Create `app/site/[id]/[slug]/page.tsx`:
  - `generateStaticParams()` from the index, and `dynamicParams = false`;
  - render the name (English and Bangla), the summary, and the condition as plain text.
- [ ] **2.3** Create `app/site/[id]/page.tsx` that renders a `<meta http-equiv="refresh">` and a visible link to the canonical slug URL.
- [ ] **2.4** Build `SiteHeader` (logo mark, wordmark, nav) and `SiteFooter` (last updated date from `meta.json`, OSM credit) as server components. Use them in `app/layout.tsx`.
- [ ] **2.5** Replace the placeholder home page with a minimal version: the title, the counts from `meta.json`, and links to 5 real site pages.
- [ ] **2.6** Import the GitHub repository into Vercel:
  - framework preset Next.js;
  - output directory `out`;
  - Node 20.
  
  Deploy and open `/site/JB-DHK-064/<slug>/` (Baliati) on a phone.
- [ ] **2.7** Add a Playwright smoke test that loads `/` and one site page and checks the `<h1>` text. Run it in CI against the built `out/` folder, served with `npx serve out`.

**Acceptance criteria**
- A public `*.vercel.app` URL shows Baliati's page with real data.
- `/site/JB-DHK-064/` redirects to it.
- The build pre-renders all 413 site pages.
- The Playwright smoke test passes in CI.

---

### Phase 3: Complete site page

**Objective:** the site page matches the design (`Site-Desktop`, `Site-Mobile`, `Site-Elangi-Desktop`), including every unknown and missing-data state.
**Prerequisites:** Phase 2.

- [ ] **3.1** Build the badge set:
  - `ConditionBadge`
  - `AccessBadge`: shows "Tk 30" when ticketed; never "Free"
  - `DayTripBadge`
  - `LocationBadge`
  
  Add a Vitest test for each label.
- [ ] **3.2** Build `Unknown` (renders a `Maybe<T>` as its value or as muted italic text) and `LastChecked` (adds "May be out of date" after 12 months). Test the date logic with a fixed "today".
- [ ] **3.3** Build `BilingualName`, `Breadcrumb` and `RecordBanner` (shown for unconfirmed and partly confirmed records).
- [ ] **3.4** Build `AtAGlance` and `LocationPanel`, covering four states: confirmed, one source, approximate (with text) and no pin (union area text).
- [ ] **3.5** Build `HistoryTimeline` (including its empty state) and `LegendBox` (headed "Stories told about this place (not verified)"). Confirm legends never render inside the timeline.
- [ ] **3.6** Build `ConflictNote` (expandable, each version with its sources) and footnote numbers that link to `SourcesList`.
- [ ] **3.7** Build `VisitingInfo` (private-house notice when restricted), `RouteSteps`, `RouteAccordion` and the cost table.
- [ ] **3.8** Build `PlaceholderArt`: the condition-aware zamindar-house illustration from the design. Use it when a site has no photo, together with `NoPhotoPanel`.
- [ ] **3.9** Build `SectionNav`: a sticky table of contents on desktop and a `<select>` on mobile. Tag empty sections ("no pin", "not yet", "none").
- [ ] **3.10** Build `SuggestCorrection`: a pre-filled GitHub issue URL with the site ID and field. Leave the email fallback as a TODO until D1 is decided.
- [ ] **3.11** Build `StillToConfirm` and `CombineWith`.
- [ ] **3.12** Add Playwright tests for Baliati (full record) and Elangi (`JB-RAJ-002`: no photo, no pin, condition unknown). Assert:
  - "No map location yet" is visible on Elangi;
  - the legends box is separate from the timeline;
  - no element contains the text "Free".

**Acceptance criteria**
- Baliati and Elangi match the canvas layouts at 390 px and 1440 px.
- Every unknown field shows text.
- Both Playwright tests pass.
- axe reports no serious or critical issues on either page.

---

### Phase 4: Explore, list first

**Objective:** a working `/explore` page with list, filters and URL state, before any map.
**Prerequisites:** Phase 3 (for `SiteCard`).

- [ ] **4.1** Build `SiteCard` with three variants (full, compact, row), a thumbnail or placeholder, and "No map location yet" for hidden-pin sites.
- [ ] **4.2** Write `lib/filters.ts`, a pure function: `(rows, state) → { results, counts }`.
  - **Rule:** AND across groups, OR within a group.
  - **Counts:** each chip's count is what the results would be if that chip were toggled.
  - **Test:** Vitest against real `index.json`. With no filters there are 413 results; day trips only gives 132.
- [ ] **4.3** Write `lib/urlState.ts`, which converts filter state to and from the query string (`?day=1&cond=preserved,in_ruins&tt=2-3&div=dhaka&dist=manikganj&q=`). Test that a round trip returns the same state.
- [ ] **4.4** Build `ExploreApp` (client component). It fetches `/data/index.json` once and shows:
  - a loading skeleton while it loads;
  - an error state with a retry button if the fetch fails;
  - `ResultsList` sorted by travel time, paged by 24 with "Load more".
- [ ] **4.5** Build the filter controls:
  - `DayTripSwitch`
  - `TravelTimeSegmented` (Unknown is its own segment)
  - `ChipGroup` for condition and access
  - `DivisionDistrictPicker`
  - `ActiveFilters`
- [ ] **4.6** Build `FilterRail` for desktop (applies instantly) and `FilterDrawer` for mobile (applies on "Show N sites"). Build `EmptyResults`, which names the one filter to loosen.
- [ ] **4.7** Wrap `useSearchParams` in `<Suspense>`, which a static export requires. Confirm that back and forward restore the filters.
- [ ] **4.8** Add a Playwright test:
  - turn on day trips and expect 132 results;
  - add "In ruins" and check the URL updates;
  - reload and check the state survives.

**Acceptance criteria**
- `/explore` works with JavaScript on, with no map.
- The counts match the data.
- A filtered URL can be shared and reopened to the same state.
- Keyboard users can reach every control.

---

### Phase 5: Map

**Objective:** Leaflet map beside the list on desktop, map with bottom sheet on mobile, pins matching the design's pin set.
**Prerequisites:** Phase 4.

- [ ] **5.1** Install `leaflet` and `leaflet.markercluster`. Create `MapView`, loaded with `next/dynamic({ ssr: false })`. Set a starting view of Bangladesh and show the OSM attribution.
- [ ] **5.2** Build `SitePin` as a Leaflet `divIcon` holding a `<button>`:
  - **fill** by location confidence: solid, outlined or hatched;
  - **glyph** by condition;
  - a **"?" badge** for flagged sites;
  - an **`aria-label`** such as "Baliati Palace, preserved, location confirmed".
- [ ] **5.3** Add clustering with `ClusterIcon` (36, 44 or 52 px by count), and the 1.5 km dashed circle for approximate pins from zoom 11.
- [ ] **5.4** Sync the map and list: selecting a pin highlights the card and the reverse, and the map shows only filtered results.
- [ ] **5.5** Build `SummaryCard`: a popover on desktop and the `BottomSheet` body on mobile, with peek, half and full snap points. The handle is a button with `aria-expanded`.
- [ ] **5.6** Build `MapControls` (zoom, locate, base-map menu with OSM or Positron) and `MapKey`.
- [ ] **5.7** Add Lite mode: a toggle that keeps the list and never loads the map chunk. Suggest it automatically when `navigator.connection.saveData` is on or the connection is slow.
- [ ] **5.8** Add `MiniMap` to the site page (pin, approximate circle, or no-pin panel). Add `MapTeaser` to the home page as a static image.
- [ ] **5.9** Handle tile errors: if tiles fail, show a message over the map and keep the list usable.
- [ ] **5.10** Add a Playwright test: pins are keyboard-focusable, and Enter opens the summary.

**Acceptance criteria**
- 299 sites appear on the map and 114 appear only in the list.
- Pins can be reached by keyboard.
- The map chunk loads only after the list has rendered, and never in Lite mode.
- The OSM attribution is visible.

---

### Phase 6: Search

**Objective:** the header search dropdown and the `/search` page.
**Prerequisites:** Phase 4 (index loading), task 1.4 (folding).

- [ ] **6.1** Write `lib/search.ts`:
  - Fuse.js over `e`, `b`, `a`, district and family, with weights 3/3/2/1/1 and threshold 0.35;
  - queries and index both pass through `lib/fold.ts`;
  - Fuse.js is imported dynamically.
  
  Test with Vitest that "baliyati" finds Baliati and "jamidar bari teota" finds Teota.
- [ ] **6.2** Build `SearchBox` (hero, header and page variants) as a combobox:
  - results grouped as sites, districts and families, 5 each;
  - the matched text inside `<mark>`;
  - ↑ and ↓ move, Enter opens, Esc clears.
- [ ] **6.3** Build `SearchApp` on `/search?q=`: the full results list, "Did you mean", and an empty state (the design's magnifier illustration plus suggestions).
- [ ] **6.4** Add a Playwright test: typing in the header and pressing Enter opens the first result.

**Acceptance criteria**
- Both English and Bangla names find sites.
- Common spelling variants match.
- The combobox passes axe.

---

### Phase 7: Trips, areas, sources, About, credits, 404

**Objective:** every remaining route renders from real data.
**Prerequisites:** Phase 3. Task 7.2 also needs Phase 5.

- [ ] **7.1** Build `/trips`:
  - `ItineraryCard` showing photos of the trip's stops, with credits behind a camera button that closes on an outside click or Esc;
  - `TripsFilters` for length, travel time, division and sort.
- [ ] **7.2** Build `/trips/[id]`:
  - `RouteMap` with numbered stops and solid, dashed and dotted legs;
  - `ItineraryStops`;
  - `BudgetTable` showing the known total plus the number of unknown items;
  - `DayCheck` (day-of-week warnings);
  - the section icons from the design.
- [ ] **7.3** Add `PrintButton` and print styles that reproduce the two A4 pages:
  - light theme only;
  - header and controls hidden;
  - credits printed with photos.
  
  Check the output with the browser's "Save as PDF".
- [ ] **7.4** Build `/division/[slug]` (8 pages) and `/district/[slug]` (64 pages): counts, a condition bar, a location-confidence summary, site lists and related trips.
- [ ] **7.5** Build `/sources` (`SourcesTable`: client-side filter, sort and paging) and `/sources/[id]` (1,136 pages). The book's source page shows the confirmed publisher, edition and ISBN.
- [ ] **7.6** Build `/about` (numbers from `meta.json`) and `/credits` (934 images, filterable). Finish the email fallback in `SuggestCorrection` once D1 is decided.
- [ ] **7.7** Build `app/not-found.tsx` (ruined-palace illustration plus a search box), the `Skeleton` variants, and `OfflineNotice`.
- [ ] **7.8** Add Playwright smoke tests: one page of each route type returns content and has an `<h1>`.

**Acceptance criteria**
- Every route in the route table builds.
- Itinerary print output fits on two A4 pages.
- An unknown URL shows the 404 page.

---

### Phase 8: Bangla mode and theme

**Objective:** a switch for interface language and colour theme that works on every page without a flash of the wrong state.
**Prerequisites:** Phases 3 to 7. Each component can be translated as soon as it exists, so this phase can start earlier.

- [ ] **8.1** Create `lib/i18n.ts`, a dictionary of every interface string in `en` and `bn`, plus `formatNumber(n, lang)` using `Intl.NumberFormat('bn-BD')`.
- [ ] **8.2** Build `LanguageToggle` and wire it to the boot script already in `app/layout.tsx` (`jp-lang`). Components read the language from a small React context.
- [ ] **8.3** Make each name lead with Bangla in Bangla mode (`BilingualName lead="bn"`) and apply the Bangla type scale (`text-bn-*`).
- [ ] **8.4** Build `ThemeToggle` (system, light, dark; `jp-theme`). Check every component in dark mode against the design's accessibility board.
- [ ] **8.5** Add a Playwright test: switch to Bangla, reload, and check that `<html lang="bn">` is set, the hero reads "বাংলাদেশের জমিদার বাড়ি" and counts use Bangla digits.
- [ ] **8.6** Check Bangla rendering by hand on Android Chrome and iOS Safari. Conjuncts must render correctly, for example "সংরক্ষিত" and "ধ্বংসপ্রায়".

**Acceptance criteria**
- Both languages and both themes match the canvas, including `Home-Desktop-BN` and `Home-Mobile-BN`.
- There is no flash of the wrong theme or language on reload.
- Contrast passes in both themes.

---

### Phase 9: Images and the full home page

**Objective:** real photos everywhere the design uses them, and the finished photo-led home page.
**Prerequisites:** Phase 7 (credits), D4 (licence wording in the footer).

- [ ] **9.1** Write `scripts/build-thumbs.mjs` with `sharp`.
  - **Input:** the `Ready` images listed in `images.csv`, read from `../images/` or a path set in an environment variable.
  - **Output:** `public/thumbs/<image_id>.webp`, 4:3, about 800 px wide and under about 100 KB each.
  - **Speed:** skip files that are already up to date.
- [ ] **9.2** Decide where the original photos live in the repository:
  - **Option 1:** commit the WebP thumbnails only.
  - **Option 2:** store the originals with Git LFS.
  
  Record the choice in `README.md`.
- [ ] **9.3** Build `Gallery` and `Lightbox`:
  - arrow keys, Esc and swipe;
  - focus trapped while open;
  - the credit line and a source link under each image, never on top of it.
- [ ] **9.4** Build the full home page from `Home-Desktop` and `Home-Mobile`:
  - the Mohera hero with its credit;
  - four photo tiles;
  - the numbers strip;
  - the map teaser;
  - eight division photo tiles;
  - three trip cards;
  - the trust band.
  
  Every photo carries a small credit.
- [ ] **9.5** Add the licence line (D4) and links to credits and sources in the footer.

**Acceptance criteria**
- All 934 `Ready` images have thumbnails.
- No image appears without its credit.
- The home page matches the canvas in both languages.
- The largest image on the home page is under 300 KB.

---

### Phase 10: Content readiness (can run alongside Phases 3 to 9)

**Objective:** the release build passes with no internal notes and the data issues in D5 resolved.
**Prerequisites:** D2 decided.

- [ ] **10.1** Run `CI_RELEASE=1 npm run data` and save the problem list as `data/reports/release-problems.txt`. Sort it by field.
- [ ] **10.2** Clear the source publisher and title groups (662 + 109 + 44 + 31). They are formulaic, so rewrite them in one pass in `sources.csv`, `site_sources.csv` and the related tables.
- [ ] **10.3** Clear the location notes (298). Replace internal wording such as "Pin supplied by Orca" with public wording such as "Pin from Google Maps, not yet matched by a published source".
- [ ] **10.4** Rewrite the site summaries (71), conflict text (76) and history text (21) by hand, 20 to 30 per session.
- [ ] **10.5** Clear the remaining small groups (cost basis, founder, notes and others).
- [ ] **10.6** Classify the 79 `unclassified` sites, fix the 15 non-standard credit lines, strip anchor-site text from itinerary titles, and add the Manikganj fares (Teota → Aricha rickshaw Tk 15 shared / Tk 30 reserved; Aricha → Utholi shared auto Tk 10; Utholi → Gabtoli bus Tk 200).
- [ ] **10.7** Spot-check 40 randomly chosen sites against their sources and fix what you find.
- [ ] **10.8** Switch CI to `CI_RELEASE=1` for the `main` branch.

**Acceptance criteria**
- `CI_RELEASE=1 npm run build` passes.
- No public page contains "Orca", "this thread", "Claude", "ChatGPT" or "audit". Search the built `out/` folder for these words with a Playwright test or a script.

---

### Phase 11: Quality, error handling and security

**Objective:** the site is fast, accessible, resilient and locked down.
**Prerequisites:** Phases 3 to 9.

- [ ] **11.1** **Performance budget:**
  - `index.json` under 150 KB gzipped;
  - home page JavaScript under about 150 KB gzipped;
  - Leaflet and Fuse.js absent from the home page bundle.
  
  Run Lighthouse in mobile mode on `/`, `/explore` and Baliati, and record the scores in `README.md`.
- [ ] **11.2** **Accessibility pass:**
  - run axe on one page of every route type in Playwright;
  - check by hand with keyboard only and with VoiceOver or TalkBack on the map, list, filters, lightbox and bottom sheet;
  - fix every serious issue.
- [ ] **11.3** **Error states:**
  - `index.json` fetch failure (retry button);
  - map tile failure;
  - offline or slow connection (`OfflineNotice` suggests Lite mode);
  - an image that fails to load (fall back to placeholder art);
  - an unknown route (404).
  
  Test each one by blocking the request in Playwright.
- [ ] **11.4** **Tile usage (D3):** confirm the provider's terms, set a descriptive referrer, and add a fallback tile source or Lite-mode fallback.
- [ ] **11.5** **Security headers:** in `vercel.json`, add:
  - a Content-Security-Policy allowing only `self`, the tile hosts and `upload.wikimedia.org`;
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - `Permissions-Policy` allowing geolocation only for `self`.
  
  Check the headers with securityheaders.com.
- [ ] **11.6** **External links:** every external link gets `rel="noopener noreferrer"`. Check that no internal notes or local file paths appear in the HTML. Run `npm audit` and fix high-severity issues.
- [ ] **11.7** **SEO basics:**
  - page `<title>` and description from the data;
  - canonical URLs;
  - `sitemap.xml` and `robots.txt` generated at build;
  - Open Graph image on the home page and on site pages that have photos.

**Acceptance criteria**
- Lighthouse in mobile mode scores at least 90 on performance and accessibility on the three pages tested.
- There are no serious axe issues.
- Every error state shows a useful message.
- The security headers are present.

---

### Phase 12: Launch

**Objective:** a public release you can maintain.
**Prerequisites:** Phases 10 and 11.

- [ ] **12.1** Work through the launch checklist below and tick each item.
- [ ] **12.2** If you're using a custom domain (A6), add it in Vercel and check that HTTPS works.
- [ ] **12.3** Tag the release `v1.0.0` and write a short `CHANGELOG.md`.
- [ ] **12.4** Write `CONTRIBUTING.md`: how to edit a CSV, how to run `npm run data`, and how corrections arrive as GitHub issues.
- [ ] **12.5** Test a restore: clone the repository into a new folder, run `npm ci && npm run build`, and confirm the output matches the live site.

**Launch checklist**
- [ ] The release build passes with no internal notes.
- [ ] Every shown pin has a location status, and flagged pins show their warning.
- [ ] No legend appears as fact; the legends box appears wherever legends exist.
- [ ] Visitor info and costs show their check date.
- [ ] Unknowns show as text; nothing says "Free".
- [ ] Every image has its creator, licence and source link.
- [ ] OpenStreetMap attribution is visible on every map.
- [ ] Bangla renders correctly on Android Chrome, iOS Safari and desktop browsers.
- [ ] A keyboard and screen-reader check of the map, list, filters and site page is done.
- [ ] "Suggest a correction" has been tested end to end.
- [ ] The 40-site spot-check is done.

**Acceptance criteria:** the site is live on its final URL, the checklist is complete, and a fresh clone builds identically.

---

## 4. After the MVP (not needed for the first release)

- [ ] Privacy-friendly analytics (A7)
- [ ] Separate `/bn/...` routes so search engines index Bangla pages
- [ ] Bangla prose for site summaries (`_bn` columns), added a field at a time
- [ ] Offline mode: a service worker caching viewed pages and `index.json`
- [ ] Data download for researchers (CSV or GeoJSON with a licence file)
- [ ] Nearby sites, a custom trip builder, and directions
- [ ] The 160 houses listed in the book's appendix that aren't in the data yet (see `data/reference/book-appendix-matches.csv`)
- [ ] Self-hosted vector tiles (MapLibre with PMTiles) if raster tile limits become a problem
- [ ] A database and editing interface (Supabase/PostGIS, optionally with Directus), with a login for editors only, once several editors or public submissions justify it
- [ ] Public photo uploads with moderation. This was explicitly ruled out for now.

---

## 5. Critical dependencies and possible blockers

1. **D2, content cleanup.** The release build can't pass until the 1,386 internal notes are rewritten. This is the longest task in the plan, so start Phase 10 early.
2. **D3, tile provider terms.** Heavy use of OSM's public tiles isn't allowed. Confirm a provider before launch or the map may be blocked.
3. **Static export limits.** There are no server redirects or API routes, so `/site/[id]` uses a meta-refresh page and corrections go to GitHub issues. Keep any feature that needs a server out of the MVP.
4. **Image storage.** About 1,000 photos make the repository large. Decide task 9.2 before committing any images.
5. **Vercel Hobby terms.** Hobby is for non-commercial use only. Adding ads or sponsorship would mean moving to a paid plan or another host.
6. **Bangla rendering.** Check conjuncts on real Android devices early (task 8.6), not at launch.

---

## 6. MVP complete means

All routes in the route table are statically built from the CSVs with the **release** build passing. Every site has a page with sources, conflicts, legends kept apart and dated visitor information. Explore shows 299 pins and all 413 sites in a filterable, shareable list, with Lite mode. Search works in English and Bangla. Trips have printable itineraries. The interface works in both languages and both themes. Every image is credited. The site meets WCAG 2.2 AA and the performance budget on a phone, and it is live on Vercel.

---

## 7. First task for your AI coding assistant

Copy this into the assistant in your IDE, opened at the `handoff/` folder:

> You are working in an existing folder that will become the root of a Next.js App Router project called Jomidarpedia. Read `README.md` and `DEVELOPMENT_ROADMAP.md` first. Do Phase 0, tasks 0.1 to 0.5 only:
>
> 1. Run `git init`. Create a `.gitignore` covering `node_modules/`, `.next/`, `out/`, `data/build/`, `public/data/` and `.env*`. Commit the existing files as "Initial handoff files".
> 2. Scaffold a Next.js app (latest stable, App Router, TypeScript, ESLint, no `src/` folder, import alias `@/*`) in a temporary folder outside this one. Copy over `package.json`, `tsconfig.json`, the ESLint config and `next-env.d.ts`. **Do not overwrite** the existing `app/layout.tsx`, `app/fonts.ts`, `app/tokens.css`, `next.config.mjs`, `tailwind.config.ts` or `lib/types.ts`. Delete the temporary folder.
> 3. Install Tailwind CSS **3.4.x** (not v4), PostCSS and Autoprefixer. Create `postcss.config.mjs`. Make sure `app/tokens.css` is imported in `app/layout.tsx` and includes the `@tailwind base; @tailwind components; @tailwind utilities;` directives (add them at the top of `tokens.css` if they're missing).
> 4. Create `app/page.tsx` with a placeholder: a `<main id="main">` with class `bg-bg text-ink min-h-screen p-8`, an `<h1 className="font-serif text-h1">Jomidarpedia</h1>`, and `<p lang="bn" className="font-bn text-bn-lg">বাংলাদেশের জমিদার বাড়ি</p>`.
> 5. Run `npm run build`. It must produce `out/index.html` (static export is set in `next.config.mjs`). Fix any errors without changing the agreed design tokens or fonts. If `next/font` or `app/layout.tsx` needs a change for the current Next.js version, make the smallest change and explain it.
>
> When finished, show me the `git status`, the build output summary, and a list of every file you created or changed. Commit as "Phase 0: Next.js and Tailwind setup". Don't start task 0.6 or anything later.
