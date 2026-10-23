# App foundations

**Status:** Approved (by the owner, 2026-10-23, after implementation; the changes made during implementation are marked in FR-23 and FR-25)
**Roadmap reference:** `roadmap/DEVELOPMENT_ROADMAP.md` §3 Phase 3 (tasks 3.1–3.10); also §2.2 I3 and I4, §2.3 O1, O2, O6 and O12, §2.1 R4, R5, R8 and R10
**Source task:** "Settle language, URLs, images, assets and the page shell before building feature components."
**Branch:** `04-phase-3-app-foundations`
**Date:** 2026-10-23

## 1. Problem and intended outcome
Phase 2 left a typed, tested data contract (`lib/types.ts`, `docs/DATA_CONTRACT.md`, `data/build/**`, `public/data/index.json`), but the app is still a placeholder (`app/page.tsx`). The following pieces are missing:

- **Language.** There is no way to render interface text in both languages. The boot script in `app/layout.tsx` sets `data-lang` only when Bangla is stored.
- **Formatting.** There are no number or date formatters, and nothing produces Bangla digits.
- **Thumbnails.**
  - The build already points 934 Ready images at `/thumbs/<image_id>.webp` (`scripts/build-data.mjs`), but `public/thumbs/` doesn't exist.
  - The originals are outside the repository (`../images/`, 846 MB). All 934 Ready originals are present: 925 jpg, 8 png, 1 webp.
- **URLs.** There is no URL contract, and route paths are spread across the roadmap and README.
- **Assets.**
  - `layout.tsx` refers to `/icon.svg` and `/apple-touch-icon.png`, which don't exist.
  - There is no logo, illustration or condition glyph.
  - There are no static maps, and the repository has no boundary geometry.
- **Shell.** There is no header, footer, language toggle or theme toggle, and `layout.tsx` hard-codes "399 sites" (the data has 413).
- **Data access.** Pages have no typed readers for `data/build/**`.

Outcome: a page shell and shared layers that every later phase builds on. These are:

- dual-language interface text with no flash;
- tested formatters;
- reproducible committed thumbnails that every build checks;
- one URL contract;
- the brand assets and static maps;
- typed build-time data readers.

## 2. Scope
### In scope
- **Tasks 3.1–3.10**, with the decisions in §10.
- **Geometry:** a committed, simplified geoBoundaries BGD boundary set and a reviewed district-name map (`data/geo/`).
- **Asset components:**
  - `PlaceholderArt`, the empty-state illustrations and the condition glyphs, as React SVG components.
  - Roadmap 5.14 keeps only `NoPhotoPanel`, which uses this art.
- **`/dev/i18n/` test page:** built in local and preview mode only.
- **Package scripts:** a `thumbs` maintenance script, and map generation inside `npm run data`.
- **Baseline and tests:** additions for the new invariants.

### Out of scope
- **Feature components:** `SiteCard`, `Gallery`, `SummaryCard`, the `MapTeaser` component and its page wiring, `NoPhotoPanel`, `SitePin` for Leaflet, and Lite mode.
- **Pages:** building the planned routes. Their links are allowed, and `docs/URLS.md` tracks them.
- **Translation:**
  - translating prose (O6 default kept);
  - `/bn/` routes;
  - Bangla `<title>` or metadata.
- **Playwright, Vercel and host redirects:** Phase 4 and task 14.3.
- **Detailed basemaps:** rivers, roads and place labels on the static maps (the district board shows OSM detail; that is post-MVP).
- **Reviewing drafted Bangla strings:** an owner or native-reviewer task before release, tracked by the `needsReview` list.
- **Translating stored data:** no translation of site names or CSV text.

## 3. User journeys / use cases
- **UJ-1 Bangla reader.** They choose বাংলা once. On every later page load, the interface appears in Bangla from the first paint, with no English flash. Names stay bilingual (R10), and prose stays English with `lang="en"` (O6).
- **UJ-2 Night reader.** They choose Dark, or leave System to follow the OS. The choice survives reloads and never flashes. Choosing System again returns control to the OS.
- **UJ-3 Phone visitor on a slow connection.** Cards load small WebP thumbnails, about 40 KB each, from the same origin. They never load a full-size Wikimedia original.
- **UJ-4 Developer on a fresh clone.** With no `../images/`, `npm run build:local` passes, and the thumbnail check passes against the committed files.
- **UJ-5 Maintainer adding photos.**
  1. They mark rows Ready and run `npm run thumbs`.
  2. Only new or changed originals are processed, and orphaned thumbnails are removed.
  3. They commit `public/thumbs/`.
- **UJ-6 Developer building later phases.**
  - They read `docs/URLS.md` for every route and query key.
  - They use `<T>`, `lib/format.ts` and `lib/data.ts` instead of inventing their own.

## 4. Functional requirements

### Interface strings (3.1)
- **FR-1** `lib/i18n.ts` exports a typed dictionary of interface strings. Each entry has `en`, `bn` and an optional `needsReview: true`.
  - Keys are a TypeScript union, so an unknown key is a type error.
  - Strings never contain data values. Interpolation uses typed parameters filled by the formatters (FR-6).
- **FR-2** `<T k="…" />` is a server component. It renders `<span lang="en" data-l="en">…</span><span lang="bn" data-l="bn">…</span>` and nothing else: no client JavaScript and no React context (I3).
- **FR-3** `app/tokens.css` hides the inactive language with `html:not([data-lang="bn"]) [data-l="bn"]{display:none}` and `html[data-lang="bn"] [data-l="en"]{display:none}`. A hidden span is therefore also hidden from assistive technology.
- **FR-4** Where the বাংলা boards show a string, the `bn` text uses their wording.
  - Every other `bn` string is a draft marked `needsReview: true`.
  - A test prints the list of `needsReview` keys. It doesn't fail on them.
  - A release-mode check reports the count as editorial work. It doesn't fail the build in Phase 3; see Open question Q-3.
- **FR-5** Accessible names for controls (icon buttons, toggles, the menu) use visually hidden dual spans inside the control, not an `aria-label` attribute. Only strings built at runtime use `useUiLang` (FR-11). `<title>` and `<meta>` stay English.

### Formatting (3.2)
- **FR-6** `lib/format.ts` exports `formatCount`, `formatMoney`, `formatHours` and `formatDate`. Each takes `(value, lang)` and returns a string; Bangla uses the digits ০–৯. The formats are:

  | Function | English | Bangla |
  |---|---|---|
  | `formatCount` | `1,136` | `১,১৩৬` |
  | `formatMoney` | `Tk 30` | `৩০ টাকা` |
  | `formatHours` | `2.5 h` | `২.৫ ঘণ্টা` |
  | `formatDate` (`YYYY-MM-DD`) | `21 October 2026` | `২১ অক্টোবর ২০২৬` |

  - `formatDate` also accepts `YYYY-MM` and `YYYY`, at matching precision.
  - A dual-span helper renders both formatted forms at build time, so the client does no formatting.
- **FR-7** `formatMoney` throws on 0, negative or non-finite amounts. A zero or unknown fee can never be formatted as a price (R6); the caller shows the documented text from the contract instead. Every formatter throws on non-finite input or an unparseable date. None of them invent a value.
- **FR-8** `formatId` and `formatCoords` always use Latin digits, and their rendered form is wrapped in `lang="en"`.
  - `formatCoords` takes numbers only.
  - Callers must pass only coordinates from mappable records, which `lib/data.ts` already enforces through the contract (R5).

### Boot script and hook (3.3, 3.4)
- **FR-9** Before first paint, `<html>` always has `data-lang`: `"bn"` if `localStorage['jp-lang'] === 'bn'`, otherwise `"en"`. `lang` becomes `bn` only in the Bangla case.
  - A stored theme is applied only if it is `light` or `dark`. Any other value is ignored, and so is a storage exception.
  - The server-rendered markup already holds both languages, so nothing needs translating before paint.
- **FR-10** `layout.tsx` documents, in a comment, that `<html lang>` changes only after the boot script runs.
- **FR-11** `useUiLang()` is a client hook that returns `'en' | 'bn'`.
  - It reads `document.documentElement.dataset.lang` through `useSyncExternalStore`, with server snapshot `'en'`.
  - It updates through a `MutationObserver` on `data-lang`.
  - It is used only for runtime strings (Leaflet labels, live regions, toasts).

### Thumbnails (3.5, 3.6)
- **FR-12** `scripts/build-thumbs.mjs` runs as `npm run thumbs`, never in `build` or `data`, and uses `sharp` at a pinned exact version (devDependency).
  - **Input:** the Ready rows of `data/csv/images.csv`, read through `scripts/csv.mjs`. The originals are under `JP_IMAGES_DIR` (default `../images`), via `relative_file_path`.
- **FR-13** Output is `public/thumbs/<image_id>.webp`:
  - EXIF orientation applied, centre-cropped to 4:3, 480×360 px, sRGB, WebP at quality about 75;
  - **all metadata stripped**, including EXIF GPS;
  - target average 40 KB or less (A-1).
- **FR-14** `public/thumbs/manifest.json` records, for each image ID, the SHA-256 of the source, the encoding parameters and the SHA-256 of the output, with keys sorted.
  - A thumbnail is regenerated only when the source checksum or the parameters change.
  - A thumbnail not in the Ready set is deleted and dropped from the manifest.
  - A second run with no changes rewrites nothing.
- **FR-15** A missing, unreadable or corrupt original is reported by image ID and path.
  - The run continues for the other images, then exits non-zero.
  - An existing thumbnail for that ID is kept, not deleted.
- **FR-16** The data build includes a thumbnail check that **fails in every mode** (local, preview and release):
  - every `thumb` path in `data/build/**`, and every `img.id` in `index.json` (as `/thumbs/<id>.webp`), exists in `public/thumbs/`;
  - **`public/thumbs/` holds no `.webp` outside the Ready set**: a stray file would publish a non-Ready image (R4).

  The check does not read `JP_IMAGES_DIR`.

### URL contract (3.7)
- **FR-17** `docs/URLS.md` lists every route, each marked **built** or **planned**, with the task that builds it:
  - `/`, `/explore/`, `/search/`, `/site/<id>/<slug>/`, `/site/<id>/` (ID redirect);
  - `/division/<slug>/`, `/district/<slug>/`;
  - `/trips/`, `/trips/<id>/`, `/sources/`, `/sources/<id>/`;
  - `/about/` (with `#licences`), `/credits/`, the 404 page, and `/dev/i18n/` (not in release).

  All routes have trailing slashes (`next.config.mjs`).
- **FR-18** The query-key section lists, for each key, its allowed values, default, multi-value rule and the task that consumes it:
  - Explore: `day`, `tt`, `cond`, `acc`, `div`, `dist`, `type`, `doc`, `vloc`, `photo`, `hours`, `q`, `view=map|list`, `sel`;
  - search: `/search/?q=`;
  - trips listing: `len`, `tt`, `div`, `plan`, `sort`;
  - credits: `/credits/?site=`;
  - site-page anchors: `#visiting`, `#getting-there`, `#sources`.
- **FR-19** Multi-value keys are a comma list of the full enum tokens from `lib/types.ts`, for example `cond=in_ruins,lost`. The app rewrites the URL with `history.replaceState` into a canonical form: keys in documented order, values in enum order, no duplicates.
- **FR-20** Unknown keys and invalid values are dropped. The page then shows a notice that the visitor can dismiss, and its dismissal is not stored (A-10). `docs/URLS.md` states this rule, and later phases implement it.

### Static assets (3.8)
- **FR-21** The logo is lockup A (weathered rajbari front) with the Cinzel wordmark, from the `Brand · new mark and wordmark options` board.
  - It is delivered as React SVG components (mark and lockup) and as `public/icon.svg`.
  - At 32 px and 16 px, the ruin details are dropped, as the board specifies.
  - `public/apple-touch-icon.png` (180×180) is generated once from the SVG and committed (A-4).
- **FR-22** `PlaceholderArt` (sizes `card`, `thumb` and `band`, optional condition `tint`), the empty-state illustrations (404, no results, offline, no photo) and the five condition glyphs are React SVG components. They are decorative, so they have `aria-hidden`, and they are coloured only through tokens.
- **FR-23** `data/geo/` holds:
  - a simplified geoBoundaries BGD set, pinned to commit `9469f09`: ADM0 and ADM1 (CC0 1.0) and ADM2 (BBS/OCHA, CC BY 3.0 IGO). *Changed during implementation: the spec first assumed CC BY 4.0 for all three.*
  - `SOURCE.md` (URL, release, licence, how it was simplified);
  - a reviewed map from our division and district slugs to geoBoundaries names.

  If a division or district in `data/build/` has no mapping, that is a **structural** error.
- **FR-24** `scripts/build-maps.mjs` runs inside `npm run data` and writes `public/maps/bd.svg`, `public/maps/division/<slug>.svg` (8) and `public/maps/district/<slug>.svg` (64). The output is gitignored.
  - The output is byte-identical between runs.
  - The projection is equirectangular with a cos(latitude) correction, fitted to each area's bounding box (A-3).
- **FR-25** Pins come **only** from sites that pass `isMappable` in `scripts/lib/validate.mjs`. A hidden-pin site never contributes a coordinate, a marker or an ID to any SVG (R5).
  - Markers follow the "Design system · components" board, all in the condition colour: `verified` is filled, `single_source` is outlined, and `approximate` is hatched.
  - `unverified` (O9) and flagged sites also get a gold "?" badge.
  - Each marker carries `data-site-id`, and markers carry no numbers.
  - *Changed during implementation: the spec first drew one-source pins filled; the board outlines them.*
- **FR-26** SVG colours are CSS token references, such as `rgb(var(--map-land))`, so a map inlined at build time follows the theme and print styles.
  - Each SVG has a `<title>`.
  - Each SVG contains visible credit text: "Boundaries: geoBoundaries; districts BBS/OCHA, CC BY 3.0 IGO" (R8).

### Shell (3.9)
- **FR-27** `SiteHeader` contains the logo (linking to `/`), Explore, Day trips, Divisions, About, a search link to `/search/`, `LanguageToggle` and `ThemeToggle`.
  - **Divisions** is a click-to-open disclosure menu listing the 8 divisions from `getDivisions()`, with bilingual names. It works with the keyboard, and Escape closes it.
  - **On mobile**, a menu button opens the same links in a disclosure.
- **FR-28** `SiteFooter` contains:
  - "Data last updated", from `meta.lastVerified` via `formatDate`;
  - the map credit (OpenStreetMap contributors; geoBoundaries; districts BBS/OCHA, CC BY 3.0 IGO);
  - links to Credits, Licences (`/about/#licences`) and Sources;
  - **Suggest a correction:** a link to a new issue using the `correction.yml` form in `Shojibmahmud/jomidarpedia-corrections`. The email fallback stays hidden (O2).
- **FR-29** `LanguageToggle` switches English and বাংলা.
  - It sets `data-lang` and `lang` on `<html>` and stores `jp-lang`, so it works without a reload.
  - If storage throws, the switch still applies for the current page.
  - It exposes its state (`aria-pressed` or a radio group).
- **FR-30** `ThemeToggle` has three states: System, Light and Dark.
  - Light or Dark stores `jp-theme` and sets `data-theme`.
  - System removes both, so the `prefers-color-scheme` block applies.
  - The current state is exposed to assistive technology.
- **FR-31** The `layout.tsx` description takes its site count from `getMeta().counts.sites`. No count is hard-coded anywhere in the shell.
- **FR-32** Every link in the shell goes to a route listed in `docs/URLS.md`, built or planned.

### Data readers (3.10)
- **FR-33** `lib/data.ts` exports `getIndex`, `getSite(id)`, `getTrip(id)`, `getTrips`, `getMeta`, `getDivisions`, `getDistricts`, `getSources` and `getCredits`.
  - They read `data/build/**` and `public/data/index.json` with `fs` at build time and return the `lib/types.ts` types.
  - They can't be imported by client code (`server-only` or an equivalent guard, A-5).
- **FR-34** If a file is missing, the reader throws a message naming the file and telling the developer to run `npm run data`. An unknown `id` throws; it never returns `undefined`.

### Test page
- **FR-35** `/dev/i18n/` exists in local and preview builds only. It is absent from the release `out/` and from any sitemap, and it is marked `noindex`. It shows:
  - sample `<T>` strings;
  - each formatter in both languages, including Bangla digits;
  - `formatId` and `formatCoords`;
  - the toggles.

## 5. Non-functional requirements
- **NFR-1 No flash.** Language and theme are correct at first paint on reload, and there are no hydration warnings in the console from the toggles or `<html>` attributes.
- **NFR-2 No new runtime JavaScript for text.** `<T>` and the formatters add no client JavaScript. The only client components are the two toggles, the header disclosures and `useUiLang`.
- **NFR-3 Accessibility (WCAG 2.2 AA).**
  - Toggles and menus work with the keyboard, have tap targets of at least 44 px (`min-h-tap`) and show visible focus.
  - Hidden-language text is not announced.
  - Bangla line height is at least 1.6, per the existing `tokens.css` base styles.
- **NFR-4 Determinism.** Two `npm run data` runs give byte-identical `public/maps/**`. `npm run thumbs` with no source changes leaves `public/thumbs/` and the manifest unchanged.
- **NFR-5 Privacy.** Committed thumbnails carry no EXIF, GPS or XMP metadata.
- **NFR-6 Size.** Thumbnails average 40 KB or less, and about 40 MB in total. Each district SVG is 30 KB or less, and `bd.svg` is 150 KB or less, uncompressed; these are targets, reported and not failed.
- **NFR-7 Fresh clone.** `npm ci && npm run build:local` passes without `../images/`.

## 6. Data, interfaces, and integrations
- **Reads:**
  - `data/build/meta.json`: `lastVerified`, `compiledAt`, `counts`;
  - `divisions.json` and `districts.json`, which give the `slug`, `en`, `bn` and `divisionSlug` fields;
  - `sites/*.json`, `trips/*.json`, `trips.json`, `sources.json`, `credits.json`;
  - `public/data/index.json`;
  - `data/csv/images.csv` (thumbs only).
- **Writes:**
  - committed: `public/thumbs/*.webp`, `public/thumbs/manifest.json`, `public/icon.svg`, `public/apple-touch-icon.png`, `data/geo/**`;
  - generated and gitignored: `public/maps/**`.
- **Environment variable:** `JP_IMAGES_DIR` (thumbs only).
- **localStorage keys:** `jp-lang` (`bn`, or absent for English), `jp-theme` (`light` or `dark`, or absent for System). Lite mode's `jp-lite` stays with Phase 7.
- **New dependencies, pinned exact:**
  - devDependency: `sharp`;
  - possibly `server-only`;
  - possibly a geometry simplifier, used once while preparing the data (document it in `SOURCE.md`; it may stay out of `package.json` if it is run ad hoc).
- **External:**
  - a one-time download of geoBoundaries (`github.com/wmgeolab/geoBoundaries`);
  - the corrections repository URL for the footer link.

## 7. Edge cases and failure behavior
- **Storage:**
  - a stored `jp-lang` that is not `bn`, or a `jp-theme` that is not `light` or `dark`, is ignored;
  - if `localStorage` throws (private mode), the defaults apply and the toggles still work for the session.
- **JavaScript disabled:** English is shown, because the default CSS hides `bn` when `data-lang` is absent or `en`. The theme follows the OS, and the toggles don't work.
- **Bangla UI around English prose:** prose spans keep `lang="en"`, so the Latin font rules in `tokens.css` apply.
- **Formatter inputs:**
  - `formatMoney(0)`, `formatMoney(NaN)` and `formatDate('2026-13-01')` throw; the build fails, and nothing renders wrongly;
  - a `YYYY` date formats as the year only.
- **Thumbnail run problems:**
  - an original that is portrait, a panorama or smaller than 480 px is still centre-cropped; a small one is upscaled to 480×360, and this is reported as a warning;
  - a PNG with transparency is flattened onto the `--surface` light colour;
  - if an original is missing but its thumbnail exists, the thumbnail is kept, the run exits non-zero, and the build check still passes.
- **Thumbnail check failures:**
  - an image that becomes non-Ready leaves a stray thumbnail behind, which the FR-16 check fails until `npm run thumbs` removes it;
  - a thumbnail deleted by hand also fails the FR-16 check.
- **Map generation:**
  - a district with no mappable site gets an outline with no pins and its credit;
  - all 413 sites map to one of the 64 districts; a district or division with no geometry mapping fails the build structurally (FR-23);
  - JB-DHK-008, the only `unverified` site, is drawn outlined with "?";
  - the Dhaka division and district share the slug `dhaka`, and the separate folders avoid a collision.
- **Readers:** a missing `data/build` gives a readable error pointing to `npm run data`.
- **Navigation:**
  - a header link to a planned route gives the static 404 until that route ships; this is accepted and tracked in `docs/URLS.md`;
  - the Divisions menu closes when focus or a click leaves it, and on Escape.

## 8. Acceptance criteria
- **AC-1** (FR-2, FR-3) Given a built page, its HTML contains each `<T>` string in both languages. When `data-lang` is changed in DevTools, the visible language swaps with no reload.
- **AC-2** (FR-1, FR-4) Using an unknown key fails `npm run typecheck`. The test output lists the `needsReview` keys.
- **AC-3** (FR-6, FR-7, FR-8) Unit tests cover each formatter in both languages, Bangla digits, all three date precisions, the throwing cases, and Latin digits for `formatId` and `formatCoords`.
- **AC-4** (FR-9, NFR-1) Given `jp-lang=bn` and `jp-theme=dark` are stored, when `/dev/i18n/` is reloaded with the network throttled, the first paint is already in Bangla and dark. Given garbage values are stored, the page renders English with the OS theme.
- **AC-5** (FR-11) A test confirms that `useUiLang` returns `en` on the server and updates when `data-lang` changes.
- **AC-6** (FR-12–FR-15, NFR-4, NFR-5) Given `../images` is present:
  - the first `npm run thumbs` writes one thumbnail per Ready row, plus a manifest; all are 480×360 with no metadata;
  - a second run changes nothing (`git status` clean);
  - when one source is touched, only that thumbnail is rebuilt;
  - when one original is removed, the run reports its ID and exits non-zero.
- **AC-7** (FR-16, NFR-7) On a fresh clone without `../images`, `npm run build:local` passes. When a thumbnail is deleted, or a stray `.webp` is added, the build fails in local, preview and release modes, naming the file.
- **AC-8** (FR-17–FR-20) `docs/URLS.md` lists every route and query key named anywhere in `roadmap/DEVELOPMENT_ROADMAP.md` (a test or script cross-checks the keys in 3.7) and states the multi-value, canonical-order and drop-with-notice rules.
- **AC-9** (FR-21, FR-22) `public/icon.svg` and `public/apple-touch-icon.png` exist, and every asset that `layout.tsx` and the components refer to exists.
- **AC-10** (FR-23–FR-26) After `npm run data`, these hold:
  - `public/maps/` holds `bd.svg`, 8 division files and 64 district files;
  - two runs are byte-identical;
  - a test finds no hidden-pin site ID in any SVG, and the number of markers in `bd.svg` equals `meta.counts.onMap` (no fixed numbers in tests, I6);
  - each file contains the credit text and uses token colours only;
  - an unmapped district fixture fails structurally.
- **AC-11** (FR-27–FR-32, NFR-3) Every shell link resolves to a route in `docs/URLS.md`, checked by a test.
  - The Divisions menu lists 8 divisions and works with the keyboard alone.
  - The toggles persist across reloads, and System clears `jp-theme`.
  - The layout description says 413 from `meta.json`, and "399" appears nowhere in `app/`.
- **AC-12** (FR-33, FR-34) A test imports each reader, checks the shape of one record against `lib/types.ts`, and checks the errors for an unknown ID and a missing file.
- **AC-13** (FR-35) `/dev/i18n/` exists in the `build:local` output and is absent from the release `out/`.
- **AC-14** `npm run lint`, `typecheck` and `test` pass, and so does `build:local`. The release `build` fails only on the existing editorial cells.

## 9. Dependencies, constraints, and assumptions
### Dependencies
- **Phase 2:** contract, `meta.json` fields, `thumb` paths, `isMappable`.
- **O6, O12:** the owner confirmed the defaults on 2026-10-23.
- **geoBoundaries:** availability of the BGD release.
- **Corrections repository:** `Shojibmahmud/jomidarpedia-corrections` with `correction.yml` (task 0.9).

### Constraints (repository evidence)
- **Static export:** `output: 'export'` and `trailingSlash: true`, with no server (`next.config.mjs`).
- **Tokens and theme CSS:** colours are RGB-channel tokens in `app/tokens.css`. Dark mode uses `[data-theme="dark"]`, plus `prefers-color-scheme` with `:root:not([data-theme="light"])`.
- **Boot script:** already in `app/layout.tsx`, using the keys `jp-theme` and `jp-lang`.
- **Fonts:** `app/fonts.ts`. Cinzel is for the wordmark only.
- **Mode logic:** `scripts/data-mode.mjs`. Map and thumbnail checks join the always-enforced rules in `scripts/lib/checks.mjs`.
- **Image paths:** `scripts/build-data.mjs` already writes `/thumbs/<image_id>.webp`, and `index.json` carries `img.id`.
- **Pinned versions:** exact versions in `package.json` (I1).

### Assumptions
The owner accepted these on 2026-10-23; they are kept here for traceability.
- **A-1** Thumbnails are 480×360 WebP at quality about 75, averaging 40 KB or less, with no 2× versions.
- **A-2** Map files live at `public/maps/bd.svg`, `division/<slug>.svg` and `district/<slug>.svg`.
- **A-3** The map projection is equirectangular with a cos(latitude) correction, per bounding box.
- **A-4** `apple-touch-icon.png` is generated once from the SVG and committed.
- **A-5** `lib/data.ts` is guarded against client import.
- **A-6** Control names use visually hidden dual spans. `<title>` and metadata stay English.
- **A-7** The money, hours and date formats in FR-6.
- **A-8** The header behaviour in FR-27. Links to planned routes are allowed.
- **A-9** The footer content in FR-28.
- **A-10** Dismissing the unknown-filter notice is not remembered.

## 10. Key decisions and rationale
- **One spec for the whole phase,** as in Phases 1 and 2.
- **O6 default:** interface strings only. This keeps Phase 3 small, and prose translation is Phase 11a.
- **Bangla wording:** taken from the boards where they show it; otherwise drafts flagged `needsReview`. Nothing ships as if reviewed when it isn't.
- **O12, commit thumbnails even though the repository is public:** builds are reproducible, work offline and don't hotlink Wikimedia. Every image is Ready-licensed and credited.
- **Centre crop:** deterministic and easy to review. Per-image focal overrides can be added later.
- **Thumbnail check fails in every mode,** and stray thumbnails are fatal: a broken or non-Ready image must never reach a preview (R4).
- **Logo A + Cinzel:** the board's recommendation, and Cinzel is already loaded.
- **Admin outlines from geoBoundaries:** they give enough context for a teaser at a fraction of an OSM extract's cost and licensing. Rivers and roads are post-MVP.
- **Maps generated by `npm run data` and inlined:** the output follows the data with no stale committed files, and inlining lets the theme toggle and print styles apply. An `<img>` would ignore `data-theme`.
- **Condition-coloured pins with status shapes:** keeps R3, since location status is always visible. Numbering waits for Phase 10's list order.
- **Three-state theme:** visitors can return to following the OS.
- **`/dev/i18n/` only outside release:** gives a real page for the no-flash check without shipping a test page.
- **PlaceholderArt in 3.8:** 5.14 keeps only `NoPhotoPanel`, which removes the duplication in the roadmap.
- **URLS.md holds routes as well as keys:** one contract, which the shell link test can read.
- **Comma lists with canonical order:** shorter, shareable URLs, with one URL per filter state.
- **Route paths follow the roadmap:** `/trips/<id>/` and `/sources/<id>/`.

## 11. Open questions
- ~~**Q-1** Which geoBoundaries release to pin.~~ Resolved: commit `9469f09` (build of 12 December 2023), recorded in `data/geo/SOURCE.md`.
- **Q-2** District names that differ between the data and geoBoundaries. All 72 are mapped in `data/geo/names.csv`. The source's two typos ("Rajshani", "Brahamanbaria") are corrected when the data is prepared. 9 districts and 2 divisions still use older official spellings there. The owner still needs to review that map.
- **Q-3** Should unreviewed (`needsReview`) Bangla strings fail release builds as an editorial check? The draft default is to report and not fail until Phase 12 decides.
