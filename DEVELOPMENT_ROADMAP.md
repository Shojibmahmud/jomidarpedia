# Jomidarpedia: development roadmap

**Version 2, 22 October 2026.** This replaces version 1 (kept in `archive/DEVELOPMENT_ROADMAP.v1-2026-10-22.md`). It takes into account the review in `ROADMAP_REVIEW_AND_REVISION_REQUEST.md`. How each finding was handled is in `ROADMAP_REVIEW_RESOLUTION.md`, and how each design board maps to tasks is in `DESIGN_COVERAGE.md`.

**How to use this file**
- Tick a box only when the task is done **and** its verification step has passed.
- Task IDs are stable. When the plan changes, add tasks with new IDs (for example `5.3a`) instead of renumbering.
- Each phase lists its **required** prerequisites. The order of phases is a suggestion, except where a prerequisite says otherwise.
- Unticked tasks have not been implemented or verified. Statements about the current state of the repository were checked on 22 October 2026, by reading the files and running both data builders into temporary folders; where Phase 1 changed them, the text says so.

Design references:
- Canvas (every screen, light and dark, Bangla, print pages): https://claude.ai/artifact/RWUDBkchSgq1mwrDe5LqqC
- Exported boards: `../claude design/Jomidarpedia-png/` (40 PNGs)
- Some boards show counts that are out of date. **Counts in the UI always come from data, never from a screenshot.**

---

## 1. What we are building

### Purpose
Jomidarpedia (জমিদারপিডিয়া) is a free, non-commercial, bilingual encyclopedia and travel guide to the zamindar houses, palaces, rajbaris and kacharis of Bangladesh. For each site it shows:
- what is known about it;
- how sure we are;
- where the sources disagree;
- how to get there from Dhaka.

Unknowns are shown as words ("Not documented", "No ticket reported"). They are never shown as blanks, zeros or "Free".

### Users
- **Day-trippers from Dhaka.** They want to know what they can see in a day and how to get there.
- **People interested in heritage**, including descendants of the families. They want to know what a place is, who built it, and what state it is in.
- **Students, researchers and journalists.** They want history, owners and conflicting accounts, each with its source.

Most visitors use phones, often on slow connections.

### MVP features
1. **Home**
2. **Explore:** a list and a map, with filters stored in the URL. The list is the accessible equivalent of the map.
3. **Site pages:** one for each of the 413 sites.
4. **Search:** English and Bangla, with spelling variants folded together.
5. **Day trips:** a listing page, plus an itinerary page for each trip with a print layout.
6. **Other pages:** division and district pages, sources, About and methodology, image credits, and the 404, loading and offline states.
7. **Bangla mode** and a **light/dark theme**. How much is translated is decision O6.
8. **"Suggest a correction"** on site and itinerary pages.

### Architecture (agreed in the handoff; still holds)
| Area | Decision |
|---|---|
| Framework | Next.js App Router with `output: 'export'` and `trailingSlash: true`: a fully static site. There is no runtime server, API, database or login. Build-time generated files (JSON, `sitemap.xml`) are allowed. |
| Styling | Tailwind CSS **3.4.x**. Tokens are CSS variables (`tailwind.config.ts`, `app/tokens.css`). |
| Fonts | `next/font/google`, self-hosted at build: Cinzel (wordmark only), Fraunces, Source Sans 3, Tiro Bangla, Hind Siliguri (`app/fonts.ts`). |
| Data | `data/csv/*.csv` is the source of truth. `scripts/build-data.mjs` writes `data/build/**`, which pages read at build time. `scripts/build-index.mjs` writes `public/data/index.json`, the only data file the browser fetches. |
| Map | Leaflet and leaflet.markercluster over raster tiles. The provider is decision O4. |
| Search | Fuse.js, loaded only when it is needed. |
| Hosting | Vercel Hobby, a non-commercial project. Preview deployments are protected; production uses the release gate (§2.4). |
| Corrections | A pre-filled issue link, with an email fallback. Where it points is decision O1. |
| Accessibility target | WCAG 2.2 AA, verified by hand, not only by tools. |

**Superseded:** the 16 October plan (MapLibre and PMTiles, Cloudflare Pages, a form service) was replaced by the handoff. Self-hosted vector tiles stay a post-MVP option.

### Current state of the repository
This `handoff/` folder is assumed to become the repository root.

**Present:**
- `tailwind.config.ts`, `app/tokens.css`, `app/fonts.ts`, `app/layout.tsx`, `next.config.mjs`, `lib/types.ts`
- `scripts/build-data.mjs`, `scripts/build-index.mjs`, `scripts/csv.mjs`, `scripts/export-xlsx.py`
- 14 CSV tables in `data/csv/`
- book reference tables in `data/reference/`

**Not present:**
- `package.json`, any pages, `public/`, Git
- `public/icon.svg` and `public/apple-touch-icon.png`, which `app/layout.tsx` refers to
- `public/maps/*.svg`, which the README refers to

**Images:**
- Photo files are in `../images/<division>/`, **outside** the repository root.
- `images.csv` refers to them by `relative_file_path`.

**Update after Phase 1:** the release build now fails on editorial problems only. Its report (`data/reports/release-problems.md`) lists **1,510 cells to edit**: 1,416 internal-note cells (1,489 output occurrences), 15 credit lines and 79 unclassified sites. The figures below are the original survey.

**`build-data.mjs` exits with code 1, as designed.** It finds 1,386 internal-note strings in its output, across 417 output records. These are repeated occurrences: the same source text shows up on many site pages. In the CSVs, 1,939 cells contain the same flagged terms. The largest groups:

| CSV column | Flagged cells | Public? |
|---|---:|---|
| `site_sources.citation_publisher` | 688 | yes |
| `site_sources.citation_note` | 358 | no, never published |
| `sites.coordinates_note` | 298 | yes |
| `images.identity_verification` | 116 | no |
| `site_sources.citation_title` | 109 | yes |
| `claims.claim_text` | 100 | yes |
| `sites.short_description` | 71 | yes |

**Known defects in the existing code**, which this plan fixes (task IDs in brackets):
- `conflict()` drops source links when it splits "A vs B": 576 of 1,196 conflict versions have no sources [2.2].
- An unknown transport mode is drawn as a bus; this affects 37 routes [2.5].
- ~~`build-index.mjs` checks only for a missing latitude~~ [1.4]. Fixed in Phase 1.
- ~~`meta.generatedAt` makes the output different on every run~~ [1.7]. Fixed in Phase 1.
- Trip `lastChecked` takes the newest date of any anchor fact [2.8].
- Dark mode can survive printing, because the selector `:root:not([data-theme="light"])` outranks the print block's `:root` [9.11].
- `app/layout.tsx` hard-codes "399 sites" [3.9].

---

## 2. Requirements, recommendations and owner decisions

### 2.1 Confirmed requirements
These come from the handoff, the design, or the owner's standing instructions.

- **R1. Static output.** Every route is pre-rendered. Dynamic routes use `generateStaticParams()` with `dynamicParams = false`.
- **R2. Real data only.** No invented facts, coordinates, times, fares, opening rules or names, in the UI or in fixtures that ship. Unknowns are shown as text.
- **R3. Uncertainty is visible.** Legends are never shown in the history timeline. Conflicts show each version, and they show which sources support it only where that is actually known. Location status is always shown.
- **R4. Images.** Only images with `publication_readiness` starting with `Ready` are published. Each one shows its exact credit line, licence and a link to its source. Google Maps and news photos are never displayed.
- **R5. Hidden pins.** A site with `map_display = hide`, or without both coordinates, never exposes coordinates on any public path. That includes `index.json`, site JSON, itinerary stops, outbound links, the sitemap and Open Graph data.
- **R6. Fees.** An entry fee of 0 or blank is never shown as a price or as "free entry".
- **R7. Mobile first and slow-network friendly.** The list renders before the map. Lite mode never loads the map code or map tiles.
- **R8. Attribution.** The map attribution is visible on every map.
- **R9. Itinerary print.** The browser's own print, with no PDF library. The layout is the canvas boards `Itinerary-Print-1` and `Itinerary-Print-2`.
- **R10. Bilingual names.** Both names are shown wherever a site is named.

### 2.2 Implementation recommendations
These are the plan's choices. Change them here if needed.

- **I1. Toolchain.**
  - Node.js 24 LTS everywhere: `.nvmrc`, `engines`, CI and Vercel. Node 20 has reached end of life. Confirm the LTS line at nodejs.org when you do task 0.1.
  - Pin exact versions in `package.json` and commit `package-lock.json`.
  - Tailwind stays on 3.4.x.
- **I2. Tests.**
  - Vitest for the scripts and pure functions.
  - Playwright with `@axe-core/playwright` for page tests, run against `out/` served by a pinned static server (`serve`).
  - Lighthouse CI for budgets.
  - `tsc --noEmit` and ESLint as explicit CI steps.
- **I3. Bangla rendering (if decision O6 keeps the default).** Interface strings are rendered in **both** languages on the server, inside `<span lang="en" data-l="en">` and `<span lang="bn" data-l="bn">`. CSS hides the inactive one, using `html[data-lang]`, which the existing boot script sets before the first paint.
  - Server Components therefore need no language context, and nothing flashes on hydration.
  - Client components use the same markup. A small hook reads `document.documentElement.dataset.lang` only for strings that are built at runtime, such as Leaflet `aria-label`s and live-region messages.
  - This is why the plan does **not** add a React context in Server Components (fixes finding C7).
- **I4. Images.**
  - Thumbnails are generated by a maintenance command and **committed** to `public/thumbs/`.
  - Originals stay outside the repository.
  - Release builds check that every referenced thumbnail exists. A fresh clone builds without `../images/`.
- **I5. One normalization layer for itinerary titles:** the build (`tripTitle`).
  - The extractor applies only when a title has the two-group pattern `… (X) (Anchor)`. Otherwise it leaves the title alone, which makes it idempotent.
  - CSV titles are not rewritten.
- **I6. Counts.** One dated baseline (§2.5). Tests check invariants, such as `onMap + noPin = sites`, plus a reviewed snapshot that must be updated on purpose. Fixed numbers are not scattered through tests.
- **I7. Field whitelist.** The build copies only named public fields into its output. Internal columns (`citation_note`, `identity_verification`, `local_path`, `license_evidence`, `notes`) can never reach the output, whatever they contain.

### 2.3 Owner decisions
Each decision has a recommended default. Work continues on the default unless the owner changes it. Each entry names the tasks it blocks.

| ID | Decision | Recommended default | Blocks |
|---|---|---|---|
| O1 | **Repository visibility and public data. Decided 22 Oct 2026: owner confirmed the default.** The raw CSVs contain internal provenance (1,939 flagged cells, some in columns that are never published). Git history keeps everything that is ever committed. | Keep the app repository **private** through the MVP. Take corrections through a separate **public** issues-only repository (for example `jomidarpedia-corrections`) plus the email fallback. Meet the About page's "CSV files anyone can read" promise with a **sanitized CSV export** generated by the release build (task 14.6). Until that ships, change the About copy (10.9). | 0.9 (first push), 5.13, 10.9 |
| O2 | Correction email address | None. Hide the email fallback until one is provided. | 5.13 |
| O3 | **How to clear internal notes** | Rewrite the public fields by hand in the CSV. Non-public fields are covered by I7. Formulaic groups (citation publishers) may be rewritten with a reviewed script that runs once. | 12.x |
| O4 | **Tile provider** | Development uses OSM standard tiles. **Before public launch**, choose a provider whose terms allow the expected traffic (a CARTO basemap under its terms, or a paid or free-tier provider), with Lite mode as the fallback. OSM's tile policy forbids heavy use. | 13.6, 14.1 |
| O5 | **Text and data licence** | CC BY-SA 4.0. It already appears in the credits design, so it only needs the owner's confirmation. Photos keep their own licences. | 10.8, 14.6 |
| O6 | **Bangla scope for the MVP** | Bangla mode covers interface strings, names, numbers and dates. Long prose stays English and is marked `lang="en"`, with a one-line note in Bangla mode. The `বাংলা · Baliati` board, which shows translated prose, is the post-MVP target. If the owner wants translated prose in the MVP, add Phase 11a (storage, translation and review), which is listed in §4. | 3.1–3.4, 11.x |
| O7 | **Lite mode activation** | Switch automatically **only** when `navigator.connection.saveData` is true. On a slow connection, *suggest* it. The manual toggle always wins and is stored in `localStorage` (`jp-lite`). The offline/slow board's "We switched to Lite mode" copy is used only in the Save-Data case. | 7.9 |
| O8 | **Offline promise** | No service worker in the MVP. Change the copy to: "You're offline. This page stays open; other pages and photos need a connection." | 10.12 |
| O9 | **JB-DHK-008 (Dhar Zamindar Bari), the only mapped site with `coordinates_status = unverified`** | Keep it on the map with an outlined pin, the flagged "?" badge, the label "Location unverified", and its own row in the map key. Never draw it as single-source or verified. | 7.3 |
| O10 | **Outbound photo link for hidden-pin sites** (Elangi's design shows one; the builder suppresses it) | Allow a **name-based** Google Maps search link ("Search for visitor photos"), with no coordinates in the URL. Never embed the photos. | 2.12 |
| O11 | **What counts as a "timed plan"** | Add a reviewed `plan_status` column to `itineraries.csv` with the values `timed`, `circuit` and `incomplete`. The build suggests a value (2 or more stops, and every stop has a clock time such as `7:30 AM`; labels like `1`, `2`, `End` don't count) in a report: 37 timed, 266 circuit and 82 incomplete on 22 Oct 2026. Only the editor's value is published. | 2.10, 9.2 |
| O12 | **Thumbnail storage** | Commit generated WebP thumbnails, about 480 px wide and about 40 KB each (roughly 35–40 MB for 934 images). The alternative is width-limited Wikimedia thumbnail URLs with no committed images. Choose before task 3.5. | 3.5 |
| O13 | Bangla names missing for **JB-RAJ-059** and **JB-RAJ-071** | Show the English name with `lang="en"` and the text "Bangla name not yet recorded" until a verified name is added. | 2.13 |
| O14 | **Canonical domain** | `*.vercel.app` at first. Changing the domain means changing `SITE_URL` and rebuilding (14.2). | 14.2 |
| O15 | **Remaining data issues:** 79 `unclassified` sites, 15 non-standard credit lines, and the editor's 20 October Manikganj fares | Classify and fix them in Phase 12. Add the fares as cost and leg rows with their unit and shared/reserved basis. | 12.6–12.8 |

### 2.4 Build modes and gates
`scripts/data-mode.mjs` decides the mode. **The default is `release`.** A build only relaxes checks when the mode is set explicitly, so it fails closed.

| Mode | How it is selected | Used for | Editorial checks (internal-note terms, non-standard credit wording, unclassified type, plan status) | Always enforced |
|---|---|---|---|---|
| `local` | `JP_DATA_MODE=local` (set by `npm run dev` and `npm run build:local`) | your machine | reported, build continues | structural validation, hidden-coordinate rule, image eligibility, fee semantics, index budget |
| `preview` | `VERCEL_ENV=preview`, or `JP_DATA_MODE=preview` | protected Vercel previews only | reported, build continues; pages get `noindex` | same |
| `release` | default; `VERCEL_ENV=production`; CI on `main` | production, fresh-clone check | **fail** | same |

Notes:
- Vercel's environment is separate from GitHub Actions, so the mode is decided **inside the build script** from `VERCEL_ENV`. It is never assumed from CI variables.
- A production deployment with editorial problems fails at build time.
- **Before Phase 12 finishes, nothing is deployed to production.** Early deployments are previews with Vercel Deployment Protection turned on. Check what protection the Hobby plan offers when you do task 4.6. If previews can't be protected, deploy only a hand-picked set of records that pass release checks.

### 2.5 Dataset baseline
Observed on 22 October 2026 from `data/csv/`, updated after the Phase 1 data fixes. This is the only place in the plan where these numbers are written down. Tests compare against `tests/baseline.json` (task 1.9), and changes to that file are reviewed.

| Measure | Value |
|---|---:|
| Sites | 413 |
| Shown on the map | 299 (verified 38, single source 217, approximate 43, unverified 1) |
| No pin | 114 |
| Day-trip sites (`day_trip_from_dhaka = TRUE`) | 132; false 269; blank 12 |
| Itineraries | 385: one day 144, overnight/multi-day 65, not stated 176 |
| Itinerary stops | 1,110; 200 without a `site_id`; 301 with a time |
| Itineraries with any timed stop | 45 |
| Sources | 1,136 |
| Images | Ready 934 (126 sites; 814 on `thumb.wikimedia.org`, 120 on `upload.wikimedia.org`); Needs review 24; Permission required 1,322 |
| Claims | fact 3,866, conflict 982, legend 205 |
| Claim-source relations | supports 2,714, disputed_by 1,788 (2 orphan links removed in Phase 1), reported_by 71 |
| Site-source citations | 2,662 (71 stale duplicate audit citations removed in Phase 1) |
| Sites with opening hours stated | about 286–289, depending on the rule (task 2.9 defines the rule) |
| `index.json` | 35.0 KB gzipped (budget 150 KB) |
| Unclassified sites | 79 |
| Dhaka Division | 111 sites, 42 without pins |

Site-level day-trip counts (132) and one-day itineraries (144) measure different things. Never use one in place of the other.

---

## 3. Phases

```
0 Toolchain ─► 1 Pipeline gates ─► 2 Data contracts ─► 3 App foundations ─► 4 Skeleton (protected preview)
                    │                                                         │
                    └──► 12 Content readiness (runs alongside, from Phase 1) ─┤
                                                                              ▼
              5 Site page   6 Explore list   7 Map   8 Search   9 Trips   10 Other routes   11 Home
                                                                              │
                                                    13 Quality, accessibility, security ─► 14 Release
```

Required dependencies between phases 5 and 11:

| Phase | Needs |
|---|---|
| 5 Site page | 4 |
| 6 Explore list | 4 |
| 7 Map | 6 |
| 8 Search | 6 (index loading) |
| 9 Trips | 5 (shared components) and 7 (for `RouteMap` only) |
| 10 Other routes | 5 |
| 11 Home | 6, 9 and 3.5 |

---

### Phase 0: Toolchain and placeholder build

**Objective:** a Next.js app using the existing config files that builds a static placeholder, with lint, type checks and unit tests. **No data hook yet.**

**Prerequisites:** none. The owner confirms that Git may be initialised locally.

- [x] **0.1** Install Node 24 LTS. Add `.nvmrc` (`24`) and `"engines": { "node": ">=24 <25" }`.
  - **Verify:** `node -v` prints `v24.x`.
- [x] **0.2** Initialise Git **locally**. Do not add a remote.
  - Add a `.gitignore` covering `node_modules/`, `.next/`, `out/`, `data/build/`, `public/data/`, `.env*`, `data/reports/` and `.vercel/`.
  - Make a local snapshot commit only if the owner asks.
  - **Verify:** `git status` lists the existing files.
- [x] **0.3** Scaffold Next.js (App Router, TypeScript, ESLint, no `src/`, import alias `@/*`) in a temporary folder **outside** `handoff/`.
  - Copy in only `package.json`, `package-lock.json`, `tsconfig.json`, the ESLint config and `next-env.d.ts`.
  - **Verify:** `app/layout.tsx`, `app/fonts.ts`, `app/tokens.css`, `next.config.mjs`, `tailwind.config.ts` and `lib/types.ts` are byte-identical to before (`git diff --stat`, or compare checksums).
- [x] **0.4** Install `tailwindcss@3.4.x`, `postcss` and `autoprefixer` at exact versions. Add `postcss.config.mjs`.
  - **Verify:** `app/tokens.css` keeps its `@tailwind` directives and is imported in `app/layout.tsx`.
- [x] **0.5** Add a placeholder `app/page.tsx` that uses `bg-bg text-ink`, `font-serif text-h1` and a Bangla line in `font-bn text-bn-lg`.
- [x] **0.6** Add scripts that **do not touch data**: `dev`, `build`, `lint` (`next lint` or `eslint .`), `typecheck` (`tsc --noEmit`) and `test` (Vitest).
  - **Verify:** `npm run build` writes `out/index.html`.
  - **Verify:** `npm run lint`, `npm run typecheck` and `npm test` all exit 0.
- [x] **0.7** Install Vitest. Add `tests/csv.test.ts` for `scripts/csv.mjs`, covering:
  - a quoted comma;
  - an escaped quote;
  - a Bangla value;
  - a byte-order mark;
  - a row with the wrong number of fields, which should be reported (this test is expected to fail until task 1.3).
- [x] **0.8** Add a GitHub Actions workflow file (`.github/workflows/ci.yml`) running `npm ci`, `lint`, `typecheck`, `test` and `build` on Node 24. It runs once the repository is pushed.
- [x] **0.9** Create the app repository as **private** (O1), plus a separate **public** issues-only repository for corrections (for example `jomidarpedia-corrections`), with an issue template for corrections and one for photo offers. Then push the app repository.
  - **Verify:** the first CI run is green.
  - **Done 22 Oct 2026, with one owner change:** the app repository `Shojibmahmud/jomidarpedia` is **public** by the owner's choice (overriding O1's default; it may be made private later). The corrections repository is `Shojibmahmud/jomidarpedia-corrections` (public, issues only), with the forms `correction.yml` and `photo-offer.yml` and the labels `correction` and `photo-offer`. Both forms take `site_id` and `page_url` as prefill fields; the correction form also takes `field` (5.13).

**Acceptance criteria**
- The placeholder page renders the cream background, Fraunces and Hind Siliguri in `out/index.html`, opened through `npx serve out`.
- Lint, typecheck, unit tests and build all pass locally. They also pass in CI, if 0.9 is done.
- No data script runs during `npm run build`.

---

### Phase 1: Data pipeline gates, validation and determinism

**Objective:** data builds that are safe by default. They validate structure, enforce the non-negotiable rules in every mode, and produce the same output every time they run.

**Prerequisites:** Phase 0.

- [x] **1.1** Add `scripts/data-mode.mjs`, which resolves `local`, `preview` or `release` as in §2.4. The default is `release`. Unit-test each environment combination, including "Vercel production with `JP_DATA_MODE=local`", which must resolve to `release`.
- [x] **1.2** Give `build-index.mjs` default paths (`data/csv/sites.csv`, `data/csv/images.csv`, `public/data`).
  - **Verify:** `node scripts/build-index.mjs` with no arguments writes `index.json`.
- [x] **1.3** Extend `scripts/csv.mjs` to report malformed input: field-count mismatches, unclosed quotes, duplicate or empty header names. It returns `{ rows, errors }`. Make the 0.7 test pass.
- [x] **1.4** Create `scripts/lib/validate.mjs` with the shared rules:
  - `isMappable(site)`: coordinates are finite, latitude 20.3–26.7 and longitude 88.0–92.7 (Bangladesh with a margin), and `map_display ≠ hide`;
  - ID patterns;
  - enum sets (conditions, access, location status, confidence, buckets);
  - ISO dates;
  - non-negative numbers.

  Use it in **both** builders and for itinerary stops.
- [x] **1.5** Add structural validation, reported per CSV row. These checks are fatal in every mode:
  - required columns are present;
  - IDs are unique;
  - foreign keys resolve (every `site_id`, `source_id`, `claim_id`, `itinerary_id` and `related_site_id`);
  - enums are valid;
  - dates parse;
  - numbers parse;
  - generated route paths are unique (slugs);
  - every Ready image has a `relative_file_path`.
- [x] **1.6** Add small valid and invalid fixtures under `tests/fixtures/csv/`, one per rule in 1.4 and 1.5.
  - **Verify:** each invalid fixture fails with a message naming the file, row and column.
- [x] **1.7** Make the output deterministic:
  - `generatedAt` comes from `SOURCE_DATE_EPOCH` if it is set, otherwise from `meta.lastUpdated`;
  - object keys and arrays are sorted where order has no meaning.
  - **Verify:** two runs produce byte-identical `data/build/**` and `public/data/index.json`.
- [x] **1.8** Add the mode flag to `build-data.mjs` and `build-index.mjs`:
  - structural, hidden-coordinate, image-eligibility, fee and budget rules always fail the build;
  - editorial rules fail only in `release`;
  - in every mode, write `data/reports/release-problems.md`.
- [x] **1.9** Write `tests/baseline.json` (the counts in §2.5) and an invariant test:
  - `onMap + noPin = sites`;
  - every hidden site has no `ll` and no `latlon`;
  - Ready images in the output equal the Ready rows in the CSV;
  - every index row has a site file.

  A difference from the baseline fails the test, which prints a diff to review.
- [x] **1.10** Group the internal-note report **by CSV source cell** (table, row ID, column). List the affected outputs under each cell. The summary line reports `cells to edit` as well as `output occurrences`.
- [x] **1.11** Narrow and widen the content rules (finding B9):
  - **Fee rule:** test meaning, not words. A fee that is zero or unknown must never appear as a price or as "free entry", and nothing may say "free entry" or "entry: free". Allow "Free" in other contexts, such as source titles. Remove the blanket ban on "Free" and any ban on the word "audit".
  - **Internal-note terms:** keep them in `scripts/lib/internal-terms.mjs`. Include the existing terms plus `Brave browser`, `Project upload`, local file paths (`/Users/`, `file://`, `C:\`) and `.xlsx`/`.md` working-file names.
  - **URL strings:** scan them for local paths and `file:` schemes only.
- [x] **1.12** Add the package scripts:
  - `data:index`
  - `data:build`
  - `data` (both)
  - `dev` (`JP_DATA_MODE=local npm run data && next dev`)
  - `build:local`
  - `build` (`npm run data && next build`, release by default)
- [ ] **1.13** Update CI so it runs `npm run build:local` on branches and `npm run build` (release) on `main`. Until Phase 12 is complete, the `main` job is allowed to fail and is marked as non-blocking.
  - **Implemented 22 Oct 2026, not yet verified:** tick after the first CI run on GitHub. Every push and PR runs lint, typecheck, tests and `build:local` as a blocking job. Pushes to `main` also run a separate `release` job with `continue-on-error`, which uploads the report as an artifact; this keeps a blocking build on `main`.

**Done 22 Oct 2026 (1.1–1.12)**, specified in `.claude/specs/01-Data-pipeline-gates.md`. Verified with 109 passing tests, `npm run build:local` (exit 0), `npm run build` (release, exit 1 with 1,510 cells to edit) and two byte-identical data builds. Changes from the task text:
- **Data fixes** needed for structural validity: removed 2 orphan `claim_source_links` rows; gave the two Rautara sites distinct slugs (`rautara-zamindar-bari-magura`, `rautara-zamindar-bari-sirajganj`); changed SRC-0001's publication date to `2024-02` (the edition note moved to `reliability_notes`); removed 71 `site_sources` rows that duplicated the AI-audit citations under the master-list IDs SRC-1104 and SRC-1107.
- **Shared code:** validation, structure checks, output checks and the report live in `scripts/lib/`; `npm run data` (`scripts/data.mjs`) runs both builders and writes one report.
- **Slugs** must be unique within each route namespace (sites, districts, divisions). A district and a division may share one, as Dhaka does.
- **Coordinates outside Bangladesh** are a structural error, not a silent hidden pin.
- **Dates:** system dates must be `YYYY-MM-DD`; citation and publication dates may be `YYYY`, `YYYY-MM`, `YYYY-MM-DD` or a range.
- **On a structural error** nothing is written and old output is removed; on a safety or editorial failure the output is still written for inspection.
- **Open:** `Project upload` source-type labels (16 cells) count as editorial work for now.

**Acceptance criteria**
- `npm run build` on a fresh checkout runs release mode and currently fails, listing **cells to edit**.
- `npm run build:local` succeeds.
- Every fixture behaves as expected.
- Two consecutive data builds are byte-identical.
- No mode can publish hidden coordinates or a non-Ready image (checked by tests that use hostile fixtures).

---

### Phase 2: Data contracts (before the UI that depends on them)

**Objective:** generated JSON that carries what the designs need, with attribution, units and dates preserved, and with uncertainty kept rather than filled in.

**Prerequisites:** Phase 1.

**Rule for this phase:** if the data can't support a field, the contract makes it optional and the UI shows a documented empty state. **Do not invent values to match a screenshot.**

- [ ] **2.1** Write `docs/DATA_CONTRACT.md`. For each browser-rendered feature, list the fields it reads and whether they come from `index.json` (fetched) or from build-time props. The features are:
  - Explore card
  - map summary
  - search results
  - trip card
  - home tiles

  Update `lib/types.ts` to match. Add a runtime check for `index.json` in tests: a small hand-written validator, no new dependency needed.
- [ ] **2.2** **Conflict attribution.** Rebuild `conflict()` so each version carries its own sources, using `claim_source_links.relation`:
  - a `supports` source is attached to the version it supports;
  - a `disputed_by` source is attached to the opposing version;
  - `reported_by` is shown as "reported by".

  Where a source can't be tied to a version, put it on the conflict as `unattributedSources` and show "Sources for this disagreement (not matched to a version)". Never copy every source onto every version.
  - **Verify:** the report counts versions with and without sources. A test on fixtures covers both cases.
- [ ] **2.3** **Legend and fact sources.** Give each legend `sources: SourceRef[]`, drawn from its `SRC-` IDs. Give `era`, `founder`, `style` and `preservation` a `sources` field. Take it from the fact claims whose `field` is `history.established_era`, `history.founder`, `history.architectural_style` or `history.preservation_status`, joined to `claim_source_links`. Leave it empty where no claim has a source. The page footnotes no longer imply that each listed source supports every claim on the page.
- [ ] **2.4** **Index additions** (budget: 150 KB gzipped; the test fails above 120 KB as an early warning):
  - `fm`: the founder or family as text, for search; it is not a normalized family entity;
  - `ty`: the raw `site_type`, for the type filter;
  - `hv`: hours known (rule in 2.9);
  - `oc`: one-way cost in Tk, only when a number is known;
  - `img`: `{ id, credit }` for the card photo.

  Do **not** add summaries to the index. The map summary card shows index fields only, plus a "Read more" link.
- [ ] **2.5** **Transport mode.** Add `unknown` and `mixed` to `Route['mode']`. Stop defaulting to `bus`. Infer a mode from the description only on an exact keyword match, and record that it was `inferred`. Show neutral icons for unknown and mixed modes.
- [ ] **2.6** **Budget rows.** Change itinerary `budget` to rows with these fields:
  - `item`, `category`;
  - `amount` (a number), or `range: [min, max]`;
  - `currency`, `unit` (per person, per vehicle, per group);
  - `basis` (shared or reserved);
  - `legs` (which journey legs are included);
  - `date`, `status`, `sources`.

  Take these from the `costs.csv` columns that already exist (`amount_bdt`, `unit`, `basis_and_assumptions`, `estimate_date`, `status`, `source_ids`). **Never parse display prose** such as "about Tk 320".
- [ ] **2.7** **Budget totals.** Compute a `known` subtotal of per-person amounts only, and an `omitted` list naming each item without an amount. Label the anchor transport as "Dhaka → [anchor], one way". There is no return fare or fare between stops unless a row for it exists.
  - **Verify on the Manikganj loop:** Tk 405 is known, onward transport and food are named as omitted, and the shared-rickshaw basis is shown.
- [ ] **2.8** **Dates per fact.** Each visiting field, cost row and route carries its own date. Trip pages show dates per section ("Costs estimated …", "Visiting info checked …, per stop"). There is no single trip `lastChecked`. The meta file distinguishes `compiledAt` (when the build ran) from `lastVerified`.
- [ ] **2.9** **"Has visiting hours".** Derive `hoursKnown` from `visitor_info.opening_hours`. It is true only when the value is not blank, not an unknown phrase, and not a restriction-only phrase. Put the phrase list in `scripts/lib/rules.mjs` and test it on real examples. Record the resulting count in the baseline.
- [ ] **2.10** **Itinerary model.**
  - Add `plan_status` (O11).
  - Mark each stop as `site` or `place` (terminal, lunch stop, ghat).
  - Give place stops coordinates **only** from a new optional `itinerary_places.csv` with sources.
  - Add an optional `itinerary_legs.csv` (`from_stop`, `to_stop`, `mode`, `duration`, `cost_row`, `source_ids`).

  Leave both new CSVs empty until there is researched data. `RouteMap` draws legs only where legs exist, and labels anything else "schematic: stops in order, roads not drawn".
- [ ] **2.11** **Closing-day rules.** Add a reviewed `closed_days` column to `visitor_info.csv` (for example `fri`, `sun;mon`, `none`, `unknown`), filled in by the editor and not parsed automatically. `DayCheck` uses only this column. Where it is `unknown`, it says "Closing days not documented".
- [ ] **2.12** **External photo link (O10).** For hidden-pin sites, generate a name-only search URL. Test that it contains no digits that look like coordinates.
- [ ] **2.13** **Missing Bangla names (O13).** Make `name.bn` optional in the contract, with `bnMissing: true`. List the affected sites in the report.
- [ ] **2.14** **Architectural features.** `claims.csv` has no `key_features` field; only `history.architectural_style` exists, with 370 rows. So:
  - add an optional `features.csv` (`site_id`, `feature`, `feature_bn`, `measurement`, `unit`, `source_ids`, `status`), filled only from research;
  - build `features` from that table, keeping their sources;
  - competing measurements, such as Baliati's area, become two rows with different sources and appear as a conflict;
  - until rows exist, `features: []`, and `FeatureList` shows "Not documented".

  Don't copy values from the screenshots.
- [ ] **2.15** **Structured source fields.** Add optional columns to `sources.csv`: `author`, `publisher`, `edition`, `isbn`, `verification_method`. Fill them **for SRC-0001 only** from its existing confirmed text (Md. Mahmud Ali; Dibyaprakash; first edition, February 2024; ISBN 978-984-97277-4-3; "appendix checked in print (Oct 2026); chapter entries via master-list transcriptions"). Leave every other source blank. The build emits citation counts by division for each source.
- [ ] **2.16** **Itinerary titles (I5).** Make `tripTitle` idempotent and test it on:
  - a title with two groups;
  - a title with one group;
  - an already clean title that contains parentheses;
  - a title with no parentheses.
- [ ] **2.17** Update `lib/types.ts` and `docs/DATA_CONTRACT.md` together.
  - **Verify:** `npm run typecheck` and the index contract test both pass.

**Acceptance criteria**
- Every conflict version either has its own sources or sits under a visible "not matched" list.
- No route has `mode: 'bus'` unless the data says bus.
- Budget rows carry numbers and units, and totals list what they omit.
- No stop or place has coordinates without a source.
- `index.json` stays within budget.
- Types, contract and tests agree.

---

### Phase 3: App foundations

**Objective:** settle language, URLs, images, assets and the page shell before building feature components.

**Prerequisites:** Phase 2. Decisions O6 and O12 use their defaults unless the owner has changed them.

- [ ] **3.1** Create `lib/i18n.ts` with a dictionary of interface strings (`en` and `bn`), and a `<T k="…" />` server component that renders both spans (I3). Add CSS in `tokens.css`: `html:not([data-lang="bn"]) [data-l="bn"]{display:none}` and the reverse.
  - **Verify:** the HTML contains both languages, and switching `data-lang` in DevTools swaps them with no reload.
- [ ] **3.2** Write `lib/format.ts` with these functions, each tested in both languages:
  - `formatCount`, `formatMoney`, `formatHours`, `formatDate` (Bangla digits in Bangla mode);
  - `formatId` and `formatCoords` (always Latin digits, wrapped in `lang="en"`).

  Numbers inside dual spans are formatted at build time, so no client-side formatting is needed.
- [ ] **3.3** Make the boot script also set `data-lang="en"` by default. Document that `<html lang>` changes only after the boot script runs, and that the HTML already holds both languages, so nothing needs translating before the first paint.
- [ ] **3.4** Add `useUiLang()`, a client hook that reads `data-lang` and listens for changes through a `MutationObserver`. Use it only for runtime strings (Leaflet labels, live regions, toasts).
- [ ] **3.5** *(O12.)* Write `scripts/build-thumbs.mjs` using `sharp`, at a pinned version.
  - Input: Ready rows in `images.csv`, with `JP_IMAGES_DIR` (default `../images`).
  - Output: `public/thumbs/<image_id>.webp`, 4:3, about 480 px wide.
  - A manifest `public/thumbs/manifest.json` records the source checksum, so the script regenerates only files that changed and removes orphaned thumbnails.
  - A missing or corrupt original is reported by ID, and the script exits non-zero.
- [ ] **3.6** Add a release check: every `thumb` path in `data/build/**` and `index.json` exists in `public/thumbs/`. It does not need `JP_IMAGES_DIR`.
  - **Verify:** a fresh clone without `../images` passes this check.
- [ ] **3.7** Write `docs/URLS.md`, the URL contracts, covering:
  - Explore query keys (`day`, `tt`, `cond`, `acc`, `div`, `dist`, `type`, `doc`, `vloc`, `photo`, `hours`, `q`, `view=map|list`, `sel`);
  - `/search?q=`;
  - the trips listing (`len`, `tt`, `div`, `plan`, `sort`);
  - `/credits?site=`;
  - anchors on site pages (`#visiting`, `#getting-there`, `#sources`).

  It also states that unknown keys and values are dropped, with a dismissible notice.
- [ ] **3.8** Prepare the static assets:
  - the selected logo mark (from `Brand · new mark and wordmark options`) as SVG;
  - `public/icon.svg` and `public/apple-touch-icon.png`;
  - `PlaceholderArt`, the empty-state illustrations and the condition glyphs as React SVG components;
  - static map previews as SVG generated from coordinates by `scripts/build-maps.mjs`. Use only mappable sites. No tiles are embedded.

  **Verify:** every asset that `layout.tsx` and the components refer to exists.
- [ ] **3.9** Build the shell:
  - `SiteHeader`, with Explore, Day trips, Divisions (a menu listing the 8 divisions) and About;
  - `SiteFooter`, with "Data last updated", the map credit, links to Credits and Licences (`/about#licences`), Sources and Suggest a correction;
  - `LanguageToggle` and `ThemeToggle`.

  The `layout.tsx` description takes its count from `meta.json`.
- [ ] **3.10** Write `lib/data.ts`, typed readers that use `fs` at build time only: `getIndex`, `getSite`, `getTrip`, `getTrips`, `getMeta`, `getDivisions`, `getDistricts`, `getSources`, `getCredits`.
  - **Verify:** a test imports each reader and checks the shape of one record.

**Acceptance criteria**
- A test page shows `T` strings, numbers and dates in both languages, and toggling switches them with no flash on reload.
- Thumbnails are reproducible and their presence is checked.
- `docs/URLS.md` covers every query key used later in the plan.
- The shell has no broken links: every link resolves to an existing route, or to a route planned in this file, tracked as a TODO list in `docs/URLS.md`.

---

### Phase 4: Walking skeleton on a protected preview

**Objective:** a real site page and a minimal home page, built from real data on a protected Vercel preview.

**Prerequisites:** Phase 3, and O1 for the remote repository.

- [ ] **4.1** Create `app/site/[id]/[slug]/page.tsx`, using `generateStaticParams` from the index. Render the names, the summary and the condition as text.
- [ ] **4.2** Create `app/site/[id]/page.tsx` as an ID redirect page with:
  - a `<link rel="canonical">`;
  - `<meta name="robots" content="noindex">`;
  - a `<meta http-equiv="refresh">`;
  - a visible link.

  Host-level redirects are optional (14.3).
- [ ] **4.3** Create a minimal `app/page.tsx`: the title, counts from `meta.json`, and links to 5 site pages.
- [ ] **4.4** Add a Playwright config that serves `out/` with the pinned `serve` on a fixed port, run by `webServer` in the config, and installs browsers with `npx playwright install --with-deps chromium`.
- [ ] **4.5** Add a smoke test: `/`, one site page and one ID redirect each show the expected `<h1>`, or arrive at the canonical URL.
- [ ] **4.6** *(Owner action.)* Import the repository into Vercel.
  - Settings: Node 24, build command `npm run build`, output directory `out`.
  - Turn on Deployment Protection for previews.
  - Production deploys stay **off**: either turn off the production branch or keep `main` failing release, as it does now.
  - **Verify:** the preview URL asks for authentication when opened in a private window.

**Acceptance criteria**
- The preview shows Baliati (`JB-DHK-064`) from real data, in `preview` mode.
- The production build fails closed.
- The smoke tests pass locally and in CI.

---

### Phase 5: Site page

**Objective:** the site page covers every state in the designs, including sparse records.

**Prerequisites:** Phase 4.

**Designs:**
- `Site page · Baliati · desktop (full record)`
- `Site page · Baliati · mobile (dark)`
- `Site page · Elangi · desktop (sparse, beside Baliati)`
- `Site page · Elangi · no photo, no pin`

- [ ] **5.1** Build the badges `ConditionBadge`, `AccessBadge`, `DayTripBadge` and `LocationBadge`. `LocationBadge` covers verified, single source, approximate, **unverified** (O9) and no pin. Add a unit test for each label in both languages.
- [ ] **5.2** Build `Unknown`, which renders a `Maybe` value.
- [ ] **5.3** Build `LastChecked`. The server renders the date. A small client island adds "May be out of date" when the date is more than 12 months before **now**, so the warning doesn't go stale between builds. Test it with a fixed clock.
- [ ] **5.4** Build `BilingualName` (with the `bnMissing` fallback), `Breadcrumb` and `RecordBanner`.
- [ ] **5.5** Build `AtAGlance`, with per-fact sources from 2.3.
- [ ] **5.6** Build `LocationPanel` in its five states. The approximate circle is labelled "display radius, not a measured area".
- [ ] **5.7** Build `HistoryTimeline` with its empty state.
- [ ] **5.8** Build `LegendBox`, separate from the timeline, with the attribution of each legend.
- [ ] **5.9** Build `ConflictNote`, with sources per version and the "not matched" list (2.2).
- [ ] **5.10** Build `FeatureList`: the features from 2.14, or "Not documented".
- [ ] **5.11** Build `VisitingInfo`. It shows the private-house notice and per-field dates.
- [ ] **5.12** Build `RouteSteps`, `RouteAccordion` and `CostTable`. These show neutral icons for unknown and mixed modes, and the unit, basis and date of each cost.
- [ ] **5.13** Build `SuggestCorrection`.
  - It links to the corrections repository's issue form (O1), pre-filled with the site ID, field and page URL.
  - The email link is shown only if O2 is set.
  - A "Share a photo" variant uses the same channel with a photo template. It is **not** an upload.
- [ ] **5.14** Build `PlaceholderArt` and `NoPhotoPanel`. `NoPhotoPanel` includes the external link from 2.12 and the photo-contribution link from 5.13.
- [ ] **5.15** Build `SectionNav` (a sticky table of contents and a mobile `<select>`), `StillToConfirm` and `CombineWith`.
- [ ] **5.16** Build `ShareButton`: `navigator.share` when it is available, otherwise copy the link, with a polite live-region message for success or failure. Add a "Copy coordinates" button for mappable sites, using Latin digits.
- [ ] **5.17** Build `Gallery` and `Lightbox`:
  - arrow keys, Esc, swipe, and buttons as the alternative to dragging;
  - focus trapped while open and restored on close;
  - the credit and source link **below** each image.
- [ ] **5.18** Add a "Directions" link for mappable sites (an outbound map link built from the coordinates, opening in a new tab with a visible label). Hidden sites get no directions link.
- [ ] **5.19** Add Playwright tests:
  - **Baliati** (full record);
  - **Elangi**, `JB-RAJ-002`: no photo, no pin, unknowns;
  - a **conflict-heavy** site;
  - a site with **unknown access and fee**;
  - **JB-DHK-008** (unverified);
  - a **missing Bangla name** (JB-RAJ-059).

  Assert:
  - the legends are outside the timeline;
  - no fee renders as a price or as "free entry";
  - no coordinates appear in hidden-pin HTML;
  - every image has its credit.

**Acceptance criteria**
- The sampled sites show every state without blanks.
- The automated axe check finds no serious or critical issues.
- A visual comparison with the four boards at 390 px and 1440 px has been reviewed by the owner. It is "reviewed against the design", not pixel-perfect.

---

### Phase 6: Explore list and filters (no map yet)

**Objective:** `/explore` with every filter in the design, URL state and accessible list behaviour.

**Prerequisites:** Phase 4. Phase 5 is not required: `SiteCard` is built here.

**Designs:**
- `Explore · desktop (pin popover open)`
- `Explore · filter drawer, all groups open`
- `Explore · mobile filter drawer`
- `বাংলা · Explore · desktop`

- [ ] **6.1** Build `SiteCard` in three variants: full, compact and row. Each has its photo and credit, or placeholder art, and shows "No map location yet".
- [ ] **6.2** Write `lib/filters.ts`, a pure function covering every group:
  - day trip;
  - travel time (Unknown is its own option);
  - condition;
  - access;
  - division and district;
  - **site type**;
  - **only well-documented** (`confirmed` or `partially_confirmed`);
  - **only verified locations** (`lc = verified`);
  - **has photos**;
  - **has visiting hours** (`hv`).

  Groups combine with AND and options within a group with OR. Each count shows the result if that option were toggled. Unit-test with fixtures, plus an invariant test on real data: every count is ≤ the total, and the sum of the condition counts equals the total when no other filter is on.
- [ ] **6.3** Write `lib/urlState.ts` to the contract in `docs/URLS.md`. It handles:
  - round trips;
  - invalid values, which are dropped and listed in a notice;
  - a district that doesn't belong to the selected division, which is dropped with a notice.
- [ ] **6.4** Write `lib/sort.ts`: travel time ascending, with unknown times **last**; ties broken by English name, then ID, so the order is stable. Name and district sorts are also stable.
- [ ] **6.5** Build `ExploreApp`. It fetches `index.json` once and shows a skeleton while loading and an error with Retry if the fetch fails. Results are paged by 24 with "Load more". Pagination resets when the filters change.
- [ ] **6.6** Build the controls:
  - `DayTripSwitch` (`role="switch"`);
  - `TravelTimeSegmented`;
  - `ChipGroup`;
  - `DivisionDistrictPicker`;
  - `TypeChips`;
  - `QualitySwitches`;
  - `ActiveFilters`.
- [ ] **6.7** Build `FilterRail` for desktop, which applies changes straight away.
- [ ] **6.8** Build `FilterDrawer` for mobile:
  - it works on a **draft** state;
  - "Show N sites" applies the draft and Cancel or Esc discards it;
  - focus is trapped in the drawer and returns to the trigger on close.
- [ ] **6.9** Build `EmptyResults`, which names the single filter whose removal brings back the most results.
- [ ] **6.10** Wrap `useSearchParams` in `<Suspense>`.
  - Apply on desktop and Show on mobile each create one history entry.
  - **Verify:** Back and Forward restore the filters and the scroll position of the list.
- [ ] **6.11** Add a "Copy this view" button that copies the URL, with a success or failure message.
- [ ] **6.12** Add Playwright tests:
  - each filter group changes the results and the URL;
  - a draft is discarded on Cancel;
  - an invalid query shows the notice;
  - Back and Forward restore the state;
  - the counts match `lib/filters.ts`, computed in the test from `index.json`.

**Acceptance criteria**
- Every control on the filter-drawer board exists and works.
- A shared URL reproduces the same view.
- Every control can be operated by keyboard.
- No count is hard-coded.

---

### Phase 7: Map

**Objective:** a Leaflet map beside the list on desktop, and the mobile map with its two distinct sheets: the **results** sheet and the **selected-site** sheet.

**Prerequisites:** Phase 6.

**Designs:**
- `Explore · desktop (pin popover open)`
- `Explore · mobile map + summary sheet`
- `Explore · mobile sheet peek, half, full`
- `Explore · mobile list, sheet up (dark)`
- `Explore · pin set and clusters by zoom`

- [ ] **7.1** Install `leaflet`, `leaflet.markercluster`, `@types/leaflet` and `@types/leaflet.markercluster` at exact versions. Import both libraries' CSS **inside** the map module. Add Leaflet's default-icon fix, or use only `divIcon`.
- [ ] **7.2** Create `components/map/MapLoader.tsx`, a `'use client'` component that calls `dynamic(() => import('./MapView'), { ssr: false })`.
  - The loader mounts `MapView` only when the map is actually shown: the desktop layout is visible, or the mobile view is `map`. Lite mode is off.
  - **Verify:** with the mobile List view or Lite mode on, no Leaflet chunk is requested.
- [ ] **7.3** Build `MapView`:
  - the initial view of Bangladesh;
  - the attribution (R8);
  - cleanup on unmount (`map.remove()`);
  - `invalidateSize()` through a `ResizeObserver`.

  Pins are `divIcon`s. The **marker element itself** is the focusable control, with `keyboard: true` and an accessible name. There is **no nested `<button>`**, so there are no duplicate tab stops. Fill styles: solid, outlined, hatched, and outlined with "?" for unverified (O9).
- [ ] **7.4** Add clustering with `ClusterIcon` (sizes by count). Clusters can be focused, and Enter zooms in.
  - Draw approximate circles from zoom 11. They are a display convention, labelled as such in the map key.
- [ ] **7.5** Synchronise the map and the list:
  - the map shows only the filtered results;
  - selecting a pin sets `sel` in the URL and highlights the card;
  - selecting a card pans to its pin.
- [ ] **7.6** Build the **selected-site sheet** (mobile) and popover (desktop), `SummaryCard`:
  - it opens when a pin is selected;
  - Close, or Esc, clears `sel` and returns focus to the pin;
  - it has a "Read more" link and "Directions" (5.18).
- [ ] **7.7** Build the **results sheet** (mobile), `BottomSheet`:
  - snap points peek, half and full;
  - the handle is a `<button aria-expanded>` that cycles through the snap points (the alternative to dragging);
  - the list scrolls inside the sheet only when it is at full height;
  - `scroll-padding-bottom` follows the sheet's height.

  Define and test the transitions between the sheets:
  - **selecting a pin** swaps the results sheet for the selected-site sheet, and closing it restores the previous snap point and list position;
  - **the Map/List switch** keeps the filters and `sel`.
- [ ] **7.8** Build `MapControls`: zoom, locate (asks for permission and handles a refusal) and a base-map menu (O4). Build `MapKey`, which includes the unverified and approximate-circle rows.
- [ ] **7.9** Lite mode (O7):
  - Explore shows the list only;
  - the site `MiniMap` shows the static location text and a "Show map" button;
  - the trip `RouteMap` shows the stop list.
  - **Verify:** with Lite mode on, no Leaflet chunk and **no tile requests** appear in the Playwright request log.
- [ ] **7.10** Build `MiniMap` for site pages: a pin, an approximate circle, or the no-pin panel. It loads only when scrolled into view (`IntersectionObserver`).
- [ ] **7.11** Handle tile errors: an overlay message, the list keeps working, and Retry reloads the tiles.
- [ ] **7.12** Add Playwright tests:
  - pins and clusters are reachable by keyboard;
  - Enter opens the summary and Esc restores focus;
  - the snap button cycles through the snap points;
  - Lite mode makes no requests;
  - blocked tiles show the overlay.

**Acceptance criteria**
- The map shows exactly the mappable filtered sites, and the hidden ones appear only in the list.
- Every interaction has a non-drag alternative.
- Map code loads only when the map is shown.
- The attribution is always visible.

---

### Phase 8: Search

**Objective:** the header and hero search box, and the `/search` page.

**Prerequisites:** Phase 6.

**Designs:**
- `Search results · desktop`
- `Search · did you mean + no results · mobile`

- [ ] **8.1** Write `lib/fold.ts`: lower-case, Bangla normalization (NFC), and Latin variants (jomidar/jamidar/zamindar, bari/badi, Chowdhury spellings). Use it in the build and in the browser. Unit-test it.
- [ ] **8.2** Write `lib/search.ts`: Fuse.js imported dynamically, over these fields with these weights:
  - `e` 3, `b` 3, `a` 2, `d` 1, `fm` 1.

  Results are grouped as **Sites**, **Districts** (from `districts.json`) and **Families**:
  - a family result groups the sites whose `fm` matches;
  - selecting it opens `/search?q=<family>&field=family`, which lists those sites.

  Test that "baliyati" finds Baliati and "jamidar bari teota" finds Teota.
- [ ] **8.3** Build `SearchBox` as an ARIA 1.2 combobox:
  - ↑ and ↓ move through results, Enter opens, Esc clears;
  - the number of results is announced;
  - matches are wrapped in `<mark>`.
- [ ] **8.4** Build `SearchApp` with full results, "Did you mean" (the closest folded name) and the empty state, which shows the illustration and suggestions.
- [ ] **8.5** Add Playwright tests:
  - a Bangla query;
  - a spelling variant;
  - a family result;
  - keyboard-only operation.

**Acceptance criteria**
- English names, Bangla names and variant spellings find the right sites.
- The family and district groups lead to real destinations.
- The combobox passes the axe check and the manual keyboard check (13.3).

---

### Phase 9: Trips and itineraries

**Objective:** the trips listing and the itinerary pages, honest about which plans are timed and which costs are known.

**Prerequisites:** Phase 5. Task 9.5 also needs Phase 7.

**Designs:**
- `Day trips · listing · desktop/mobile`
- `Itinerary · Manikganj heritage loop · desktop`
- `Itinerary · Mymensingh and Muktagacha · desktop`
- `Itinerary · mobile (dark)`
- canvas boards `Itinerary-Print-1` and `-2`

- [ ] **9.1** Build `ItineraryCard`: stop photos with credits behind a camera button that closes on an outside click or Esc. It shows the plan status (timed, suggested circuit, incomplete) and the duration, including "Not stated".
- [ ] **9.2** Build `TripsFilters`: length, travel time, division, **"Has a timed plan"** (`plan_status = timed`) and sort. Copy that claims every plan is timed or starts in Dhaka is removed.
- [ ] **9.3** Build the `/trips/[id]` page shell: title, status, anchor site, the section icons from the design, and `SuggestCorrection`.
- [ ] **9.4** Build `ItineraryStops`. Timed plans show times. Circuits show the order only. Place stops are labelled.
- [ ] **9.5** Build `RouteMap`:
  - numbered markers for stops with coordinates;
  - legs drawn only from `itinerary_legs`;
  - otherwise the label "Schematic: order of stops, roads not drawn";
  - Lite mode shows the list only.
- [ ] **9.6** Build `BudgetTable` from 2.6 and 2.7: the known subtotal, the named omissions, and the unit, basis and date of each row.
- [ ] **9.7** Build `DayCheck`, which reads only `closed_days` and shows unknowns as text.
- [ ] **9.8** Add an "Open all stops on the map" link: `/explore?sel=…&ids=<comma list>&view=map`. Add `ids` to `docs/URLS.md`.
- [ ] **9.9** Add `ShareButton` (reused from 5.16).
- [ ] **9.10** Build `PrintButton` and the print layout from `Itinerary-Print-1` and `-2`:
  - the light palette is forced (9.11);
  - controls are hidden;
  - photos print with their credits;
  - the licence line and source links are printed;
  - if tiles fail, the map area becomes a stop list.
- [ ] **9.11** Fix the print CSS in `tokens.css`. Override **all** colour tokens under `@media print` with a selector that outranks both `[data-theme="dark"]` and `:root:not([data-theme="light"])`, for example `@media print { :root:root, [data-theme] { … } }`.
  - **Verify:** print preview in dark mode, set both by the OS preference and by the toggle, comes out light.
- [ ] **9.12** Define the overflow policy: two A4 pages where practical. Longer itineraries flow onto more pages with headers that repeat on each page. **Content is never clipped.**
  - **Verify:** in Chromium, Firefox and Safari print preview, test the shortest itinerary (1 stop) and the longest (9 stops).

**Acceptance criteria**
- Timed, circuit and incomplete plans are visibly different.
- Budgets never claim a total that isn't supported.
- Print output is readable, credited and unclipped for both the shortest and the longest itinerary.

---

### Phase 10: Areas, sources, About, credits and system states

**Objective:** every remaining route, built from real data.

**Prerequisites:** Phase 5.

**Designs:**
- `Division · Dhaka · desktop`, `District · Manikganj · mobile`
- `Sources · list · desktop`, `Source page · the core book · mobile`
- `About and methodology · desktop`, `Image credits and licences · desktop`
- `404 · desktop`, `404 · mobile (dark)`
- `Loading skeletons · mobile`, `Offline slow network · mobile`

- [ ] **10.1** Build `/division/[slug]` (8 pages):
  - counts, a condition bar, a location-confidence summary and a no-pin list;
  - related trips and a `MapTeaser`.

  All of these come from one source in `divisions.json`. This fixes the board's mismatch of 42 against 37.
- [ ] **10.2** Build `/district/[slug]` (64 pages) the same way.
- [ ] **10.3** Build `/sources`, with `SourcesTable` (filter, sort, paging). Remove any copy claiming every fact has a supporting link. Instead, link to the methodology section on attribution.
- [ ] **10.4** Build `/sources/[id]`. It shows the structured fields from 2.15 when they are present, citation counts by division, example sites, and "View all N sites citing this source" (`/sources/[id]#sites`, a full list on the page). It keeps the verification-method wording.
- [ ] **10.5** Build `/about`:
  - grading definitions;
  - research limitations;
  - how disagreements are shown;
  - counts from `meta.json`, including **unpublished image counts** (needs review, permission required) and **possible duplicates**, from a new `meta.counts.possibleDuplicates`, derived from `site_relationships.relation_type = possible_duplicate` (1 row today);
  - the contribution channels (O1, O2).
- [ ] **10.6** Write the methodology and limitations text in `content/about.en.md`, with a Bangla version only if O6 asks for one. The owner reviews it before it ships.
- [ ] **10.7** Build `/credits`: Ready images with a filter by site (`?site=`). Each credit shows the exact credit line, the licence, a source link and any change notice. Nothing is reworded.
- [ ] **10.8** Add a licences section on `/about#licences`: the text and data licence (O5) and the photo licences, linked from the footer.
- [ ] **10.9** *(O1.)* Make the About page's public-data wording match what will actually ship: either "a cleaned CSV download" (14.6), or remove the promise.
- [ ] **10.10** Build `app/not-found.tsx`, with the illustration, a search box and links.
- [ ] **10.11** Build the `Skeleton` variants for Explore, search and the trips listing.
- [ ] **10.12** Build `OfflineNotice` with the O8 copy, listening to the `online` and `offline` events, and the Save-Data and slow-network messages (O7).
- [ ] **10.13** Add Playwright tests:
  - each route type renders an `<h1>`;
  - an unknown URL returns the 404 page;
  - the offline notice appears when the browser is set offline.

**Acceptance criteria**
- Every route in the route table builds.
- Area pages agree with each other, because they share one source.
- The source and About pages present only claims the data supports.

---

### Phase 11: Home page

**Objective:** the finished photo-led home page, in both languages.

**Prerequisites:** Phases 6 and 9, and task 3.5.

**Designs:**
- `Home · desktop`, `Home · mobile`
- `বাংলা · Home · desktop`, `বাংলা · Home · mobile`

- [ ] **11.1** Hero: the Mohera photo with its credit, the hero `SearchBox` and quick-filter chips linking to Explore URLs.
- [ ] **11.2** Four photo tiles, each with a credit. Add the numbers strip using `StatStrip`, with counts from `meta.json`.
- [ ] **11.3** `MapTeaser`: a static SVG from 3.8 linking to `/explore?view=map`.
- [ ] **11.4** Eight division tiles with photos and credits.
- [ ] **11.5** Three featured trip cards, chosen by a rule (`plan_status = timed`, then by travel time) and not hard-coded.
- [ ] **11.6** The trust band, linking to methodology and sources.
- [ ] **11.7** Bangla check: the layout is identical in both languages, with Bangla digits and the Bangla type scale.

**Acceptance criteria**
- Every photo on the page has a visible credit.
- The page loads no Leaflet or Fuse.js code.
- The owner has reviewed it against all four home boards.

---

### Phase 12: Content readiness (runs alongside, from Phase 1)

**Objective:** release mode passes, with public text rewritten rather than deleted.

**Prerequisites:** task 1.10 (the per-cell report). O3 uses its default unless changed.

- [ ] **12.1** Generate `data/reports/release-problems.md`, grouped by CSV cell (1.10). Record the starting number of **cells to edit**.
- [ ] **12.2** Rewrite the formulaic `site_sources.citation_publisher` and `citation_title` values. A script may be used, but it runs once and its diff is reviewed by hand.
  - **Verify:** the matching report groups reach zero.
- [ ] **12.3** Rewrite `sites.coordinates_note` (298 cells). The new wording keeps the uncertainty: for example, "Pin from a map service; not yet matched by a published source".
- [ ] **12.4** Rewrite `sites.short_description`, `claims.claim_text` and `history_events.description`, about 25 cells per session. Keep each source limitation in public words.
- [ ] **12.5** Clear the remaining small groups: cost basis, founder, notes, sources and itinerary notes.
- [ ] **12.6** Classify the 79 `unclassified` sites (O15), with a source for each classification.
- [ ] **12.7** Fix the 15 credit lines that don't follow the standard format. **Keep each licence's required wording.**
- [ ] **12.8** Add the Manikganj fares from the editor (20 October 2026) as `costs.csv` and `itinerary_legs.csv` rows, with their units, the shared or reserved basis and the date:
  - Teota → Aricha rickshaw: Tk 15 shared / Tk 30 reserved;
  - Aricha → Utholi shared auto: Tk 10;
  - Utholi → Gabtoli bus: Tk 200.
- [ ] **12.9** Fill in `plan_status` (O11) and `closed_days` (2.11) wherever the research supports them. Everything else stays `incomplete` or `unknown`.
- [ ] **12.10** Spot-check 40 randomly chosen sites against their sources. Log the findings in `data/reports/spot-check-<date>.md`.

**Acceptance criteria**
- `npm run build` (release) passes.
- The report shows zero editorial findings.
- The diff review shows that uncertainty wording was kept.

---

### Phase 13: Quality, accessibility and security

**Objective:** measured performance, manually verified accessibility, a working error handling, and a security policy tested on the deployed preview.

**Prerequisites:** Phases 5–11.

- [ ] **13.1** **Performance budget**, enforced with Lighthouse CI on `/`, `/explore` and Baliati in mobile mode:
  - `index.json` ≤ 150 KB gzipped;
  - JavaScript on the home page ≤ about 150 KB gzipped;
  - no Leaflet or Fuse.js on the home page;
  - the largest image on the home page ≤ 300 KB.
- [ ] **13.2** **Automated accessibility:** run axe through Playwright on a **state matrix**:
  - a sparse record, no pin, no photo;
  - unknown access and fee;
  - an unverified pin;
  - a long itinerary;
  - a conflict-heavy site;
  - Bangla mode and dark mode;
  - a failed `index.json` request;
  - a failed tile request.
- [ ] **13.3** **Manual accessibility checks**, recorded in `docs/a11y-checks.md` with the date, browser and assistive technology used:
  - 200% and 400% zoom and reflow at 320 px;
  - keyboard-only operation of the filters, drawer, sheets, map, lightbox and combobox;
  - focus that is visible and is restored when a dialog closes;
  - live-region announcements;
  - non-drag alternatives;
  - language changes read correctly;
  - VoiceOver on iOS and TalkBack on Android.

  These checks show progress towards WCAG 2.2 AA. They do not by themselves certify conformance.
- [ ] **13.4** **Bangla rendering** on real devices (Android Chrome, iOS Safari): conjuncts such as "সংরক্ষিত" and "ধ্বংসপ্রায়" render correctly.
- [ ] **13.5** **Error states**, each tested by blocking the request in Playwright:
  - the `index.json` fetch;
  - tiles;
  - an image (falls back to placeholder art);
  - offline;
  - an unknown route.
- [ ] **13.6** **Tiles (O4):** confirm the provider's terms in writing, in `docs/tiles.md`. In the browser's DevTools on the preview, check that tile requests send a `Referer` (the origin is enough under `strict-origin-when-cross-origin`) and that the attribution matches the provider's requirements.
- [ ] **13.7** **Content Security Policy:** list the assets the generated `out/` actually uses. Write a CSP for `vercel.json` with:
  - `default-src 'self'`;
  - `img-src 'self' https://thumb.wikimedia.org https://upload.wikimedia.org <tile hosts> data:`;
  - `style-src 'self' 'unsafe-inline'` (Leaflet sets inline styles);
  - `connect-src 'self'`;
  - `object-src 'none'`;
  - `base-uri 'self'`;
  - `frame-ancestors 'none'`.

  For `script-src`, request-specific nonces don't work with a static export. Use `'self'` plus either hashes or `'unsafe-inline'` for Next's inline bootstrap scripts and the theme/language boot script. Document the choice and its trade-off. Deploy it as `Content-Security-Policy-Report-Only` on the preview first, then enforce it.
- [ ] **13.8** **Other headers:**
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - `Permissions-Policy: geolocation=(self), camera=(), microphone=()`.

  **Verify:** with `curl -I` on the preview.
- [ ] **13.9** **Link and leak checks** with a script over `out/`:
  - every external link has `rel="noopener noreferrer"`;
  - no internal terms (from `internal-terms.mjs`) appear;
  - no local paths appear;
  - no hidden-site coordinates appear (search for each hidden site's original coordinates).
- [ ] **13.10** **Dependency check:** `npm audit --omit=dev`. Fix high and critical issues, or document why each one doesn't apply.
- [ ] **13.11** **SEO:**
  - titles and descriptions come from the data;
  - canonical URLs use `SITE_URL`;
  - `sitemap.xml` and `robots.txt` are generated at build time and leave out the ID redirect pages;
  - Open Graph images on home and on site pages that have photos;
  - preview builds are `noindex`.

**Acceptance criteria**
- The budgets pass in CI.
- The axe state matrix has no serious or critical findings.
- The manual checks are recorded, with any open issues listed.
- The CSP is enforced on the preview without console violations.
- The leak checks pass.

---

### Phase 14: Release

**Objective:** a reproducible, verified public release.

**Prerequisites:** Phases 12 and 13, and O4, O5 and O14.

- [ ] **14.1** Configure the production tile provider (O4) and repeat test 13.6 against it.
- [ ] **14.2** Set `SITE_URL` (O14) in the Vercel production environment and in CI, then rebuild.
  - **Verify:** the canonical URLs, the sitemap and the Open Graph URLs use it.
- [ ] **14.3** *(Optional.)* Generate host-level redirects in `vercel.json` for `/site/:id` and any renamed slugs, with `data/redirects.csv` holding the old slug, the ID and the date. Keep the meta-refresh pages as a portable fallback.
- [ ] **14.4** Run the fresh-clone check:
  - clone into an empty folder **without** `../images`;
  - run `npm ci && npm run build` (release by default);
  - compare it with the CI build.

  What "builds identically" means:
  - `data/build/**` and `public/data/index.json` are **byte-identical**;
  - `out/` has the **same set of files**, and the same page text once Next's build IDs and hashed chunk names are normalised away.

  Use the script `scripts/compare-out.mjs`.
- [ ] **14.5** *(Owner action.)* Turn on production deployments. Deploy, then run the smoke tests and the 13.9 leak checks **against the production URL**.
- [ ] **14.6** *(O1 and O5.)* Publish the cleaned data download: a release-built CSV or JSON export containing only the whitelisted public fields, with a `LICENSE` and a README. Link it from About.
- [ ] **14.7** Write `CONTRIBUTING.md`, covering:
  - editing a CSV;
  - `npm run dev`;
  - reading the problem report;
  - regenerating thumbnails;
  - how corrections arrive.
- [ ] **14.8** Write a rollback note in `docs/RUNBOOK.md`. In Vercel, use "Promote" on the previous production deployment, or revert the commit and push. Data mistakes are fixed in the CSV and rebuilt.
- [ ] **14.9** Once 14.4 and 14.5 have passed, tag `v1.0.0` and write `CHANGELOG.md`.

**Regression checklist before tagging.** These checks re-run tests that already exist; none of them re-implements anything.
- [ ] Release build green (12)
- [ ] Hidden-coordinate and image-eligibility tests green (1.9)
- [ ] Site state tests green (5.19)
- [ ] Explore tests green (6.12)
- [ ] Map and Lite tests green (7.12)
- [ ] Print checks re-run (9.12)
- [ ] axe matrix and manual accessibility log current (13.2, 13.3)
- [ ] Leak checks green on production (13.9, 14.5)
- [ ] Fresh clone matches (14.4)
- [ ] Every link from the header and footer resolves

**Acceptance criteria**
- Production is live on the chosen domain.
- The fresh clone matches the release build.
- The regression checklist is complete.
- The tag points at the deployed commit.

---

## 4. After the MVP (not required for the first release)

Optional improvements, listed separately from the required MVP work:
- **Phase 11a (if O6 changes):** Bangla prose.
  - `_bn` columns, or `content/bn/` files;
  - translation;
  - a review workflow;
  - `lang` handling.

  The target design is `বাংলা · Baliati · mobile`.
- Separate `/bn/...` routes, so search engines index Bangla pages.
- A service worker for offline viewing of pages the visitor has already opened, with copy that promises it only once it is verified.
- Privacy-friendly analytics.
- Nearby sites and a custom trip builder.
- The 160 houses from the book's appendix that aren't in the data yet (`data/reference/book-appendix-matches.csv`).
- Self-hosted vector tiles (MapLibre with PMTiles) if raster tile terms or limits become a problem.
- A database and editing interface for several editors.
- Public photo uploads with moderation. These are explicitly excluded from the MVP.

---

## 5. Critical dependencies and blockers

1. **O1 is decided** (22 Oct 2026): a private app repository, a public corrections repository, and a cleaned CSV export at release. The first push (0.9) is no longer blocked by a decision.
2. **Content cleanup (Phase 12)** blocks any production deployment. It is the longest job, so start it right after task 1.10.
3. **O4 (tile terms)** blocks the public launch.
4. **Data contracts (Phase 2)** block conflict, budget, itinerary and filter UI. Don't build those components on the current shapes.
5. **Image reproducibility (3.5, 3.6)** blocks fresh-clone verification.
6. **Vercel Hobby** is for non-commercial use only. Ads or sponsorship would mean changing plan.

---

## 6. "MVP complete" means

- Every route in the route table is built statically from the CSVs, in **release** mode, and deployed to production on the chosen domain.
- Site pages show:
  - sources attributed per version or marked as not matched;
  - legends kept apart from history;
  - visiting information and costs with dates per fact;
  - every unknown in words.
- Explore offers every designed filter, a shareable URL, a map limited to mappable sites, both mobile sheets, and Lite mode with no map requests.
- Search finds sites by English and Bangla names, spelling variants, districts and families.
- Trips distinguish timed, circuit and incomplete plans; budgets list what they omit; itineraries print without clipping.
- Bangla mode covers the scope agreed in O6.
- Every image is credited exactly.
- Budgets, the axe matrix, the manual accessibility log, the CSP and the leak checks all pass, as recorded.
- A fresh clone reproduces the release.

**This document does not claim pixel-perfect fidelity or WCAG certification.** "Matches the design" means the owner has reviewed it against the listed boards.

---

## 7. First task for your IDE coding assistant

Paste this into the assistant, opened at the `handoff/` folder:

> You are working in an existing folder that will become the root of a Next.js App Router project called Jomidarpedia. First read `README.md` and `DEVELOPMENT_ROADMAP.md` (sections 1, 2 and Phase 0). Do **Phase 0, tasks 0.1 and 0.3 to 0.7 only**. Do not run, change or wire up anything under `scripts/` or `data/`. In particular, do **not** add `prebuild`, `data`, or any script that runs `build-data.mjs` or `build-index.mjs`, because the data build is designed to fail until Phase 1.
>
> 1. Check `node -v`. If it isn't Node 24 LTS, stop and tell me. Add `.nvmrc` containing `24`, and add `"engines": { "node": ">=24 <25" }` to `package.json` once it exists.
> 2. Before changing anything, record SHA-256 checksums of `app/layout.tsx`, `app/fonts.ts`, `app/tokens.css`, `next.config.mjs`, `tailwind.config.ts` and `lib/types.ts`.
> 3. Scaffold Next.js (latest stable, App Router, TypeScript, ESLint, no `src/`, import alias `@/*`) in a temporary folder **outside** this one. Copy over only `package.json`, `package-lock.json`, `tsconfig.json`, the ESLint config and `next-env.d.ts`. Delete the temporary folder.
> 4. Install `tailwindcss@3.4` (exact 3.4.x, not v4), `postcss` and `autoprefixer` with exact versions (`--save-exact`). Create `postcss.config.mjs`. Do not edit `app/tokens.css`. It already contains the `@tailwind` directives and is imported by `app/layout.tsx`.
> 5. Create `app/page.tsx`: a `<main id="main" className="min-h-screen bg-bg p-8 text-ink">` containing `<h1 className="font-serif text-h1">Jomidarpedia</h1>` and `<p lang="bn" className="font-bn text-bn-lg">বাংলাদেশের জমিদার বাড়ি</p>`.
> 6. Add the package scripts `dev`, `build` (`next build` only), `lint`, `typecheck` (`tsc --noEmit`) and `test` (`vitest run`). Install Vitest with an exact version. Add `tests/csv.test.ts` testing `scripts/csv.mjs` with a quoted comma, an escaped quote, a Bangla value and a byte-order mark. Do not change `scripts/csv.mjs`.
> 7. Run `npm run build`, `npm run lint`, `npm run typecheck` and `npm test`. `npm run build` must create `out/index.html`. If `next/font` or `app/layout.tsx` needs a change for the current Next.js version, make the smallest possible change and explain it. Otherwise those files must keep their original checksums.
>
> Do **not** run `git init`, commit, add a remote, push, deploy or install Playwright. When you finish, show me: each command's result, the checksum comparison, the list of files created or changed, and anything you could not do.

Task 0.2 (initialising Git locally) and task 0.8 (the CI file) come next, once you've confirmed them.
