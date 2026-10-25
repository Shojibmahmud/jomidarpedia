# Home page

**Status:** Approved (by the owner, 2026-10-25)
**Roadmap reference:** `roadmap/DEVELOPMENT_ROADMAP.md` §3 Phase 11 (tasks 11.1–11.7); also I6, O6, O12, 13.1; `roadmap/DESIGN_COVERAGE.md` rows 20, 21 and the boards `বাংলা · Home · desktop`, `বাংলা · Home · mobile`; `docs/URLS.md` (Explore keys); `docs/DATA_CONTRACT.md` (Meta, home tiles); `.claude/specs/04-Walking-skeleton.md` (FR-8, minimal home); `.claude/specs/06-Explore-list.md` (quick chips deferred here); `.claude/specs/08-Search.md` (hero `SearchBox`, FR-37); `.claude/specs/09-Trips-and-itineraries.md` (FR-16, `ItineraryCard`); `.claude/specs/10-Areas-sources-about-and-system-states.md` (`MapTeaser`, D3, D9)
**Source task:** "Phase 11: Home page. Objective: the finished photo-led home page, in both languages."
**Branch:** `12-phase-11-home`
**Date:** 2026-10-25

## 1. Problem and intended outcome
`/` is still the walking-skeleton page from task 4.3 (`app/page.tsx`): a title, three counts and links to five sample sites (`lib/home.ts` `HOME_SAMPLE_IDS`). The four Home boards show a photo-led page:
- a hero with search and quick chips;
- four "What would you like to see?" tiles;
- a numbers strip;
- the national map teaser;
- eight division tiles;
- three featured trips;
- a trust band.

Everything those sections link to now exists (Phases 6–10).

The boards' numbers are mock-ups, and several of them disagree with the data (25 Oct 2026):

| Board shows | Data has |
|---|---|
| Hero chips: Day trips · 132, Within 2 hours · 24, Open to visitors · 151, Map | 132 = sites with `dt = 1` (= sum of `divisions.json` `dayTrip`); 24 = `tb` `0-1` (4) + `1-2` (20), but Explore's `tt` takes **one** segment (`docs/URLS.md`), so no URL shows it; 151 = `ac` `ticketed` or `open_no_ticket_reported`, which is not in `meta.json` |
| Tiles: 132 palaces, 42 preserved, 178 ruins, "44 museums, offices, schools" | `meta.counts.conditions`: 42 / 44 / 178 match. The data does not record what the 44 adaptive-reuse sites became |
| Numbers: 413 · 132 day trips · 934 open-licence photos · 1,136 sources checked · 205 legends | 413, 1,136 and 205 match. `meta.counts.images` = **938** (2 are the owner's own photos, also CC BY-SA 4.0). 1,064 sources are `read`, and 71 are cited second-hand. `meta.counts.dayTrips` = **144**, which counts one-day **trip plans**, not sites |
| Map: "299 on the map" | `meta.counts.onMap` = 299; `public/maps/bd.svg` (3.8) colours pins by condition |
| Divisions: 111 / 72 / 53 / 47 / 46 / 33 / 28 / 23 | `divisions.json` `count` (matches) |
| Trips: Manikganj heritage loop, Old Dhaka palaces, Mymensingh and Muktagacha, with clock times "07:00–17:00" | 385 trips. No trip has `planStatus` yet, so none is timed. The roadmap rule taken literally picks three Old Dhaka trips. 155 trips have no photo |
| Trust band: "982 disagreements shown", "205 legends kept apart" | 201 disagreements and 781 open questions (spec 10 D9); 205 legends |
| Hero photo: Ananda Lodge, Mohera | `IMG-DHK-101-001`, Ronju65, CC BY 4.0, 1920×1280, Ready. Thumbnails are 480×360 only (`scripts/build-thumbs.mjs`), which is too small for the hero |

**Outcome:** the home page matches the four boards in both languages. Every number comes from build data. Every photo shows its credit. The page loads no Leaflet or Fuse.js code until search is used.

## 2. Scope
### In scope
- Tasks 11.1–11.7 in `app/page.tsx`.
- **Components:**
  - hero (photo, title, `SearchBox`, chips);
  - `CategoryTiles`;
  - `StatStrip` (new);
  - `MapTeaser` reused for the national map;
  - `DivisionTiles`;
  - the featured trips row (reusing `ItineraryCard`);
  - `TrustBand`;
  - a photo credit overlay shared by the hero and the tiles.
- **Header:** a transparent home-only variant of `SiteHeader` over the hero (D7).
- **Images:** larger committed WebP variants for the images Home uses (D1), made by `npm run thumbs`.
- **Curated photo list:** a reviewed list of photo IDs in `lib/home.ts`, checked by the build (D2).
- **Featured trip rule:** a pure, tested function (D4).
- **Build additions** (`scripts/build-data.mjs`): any home count not yet in `meta.json` (A-2).
- **Strings:** interface strings in `lib/i18n.ts`, with Bangla drafts marked `needsReview`.
- **Contract docs:** `docs/DATA_CONTRACT.md` changes go in the same commit as the code.
- **Tests:** `HOME_SAMPLE_IDS` moves to a test fixture, and the smoke test checks the new sections (D10).

### Out of scope
- A "Within 2 hours" chip, or a multi-value Explore `tt` key (D3).
- Any change to Explore, Trips, Search, area pages or About.
- Owner-written prose. Bangla long prose (O6).
- Clock times on trip cards before plans are timed (Phase 12.9; A-3).
- Lighthouse CI itself (13.1). The 13.1 budgets are still respected (NFR-1).
- A service worker (O8). Image formats other than WebP.

## 3. User journeys / use cases
- **UJ-1 First visit.** A visitor sees the Mohera photo with the title "The zamindar palaces of Bangladesh" and the Bangla line, and the photo's credit in the corner. They type "Baliati" in the hero search: the suggestions open, Fuse.js loads only now, and Enter opens the site page.
- **UJ-2 Quick chip.** Taps "Open to visitors · 151" and lands on `/explore/?acc=ticketed,open_no_ticket_reported`, which shows 151 results.
- **UJ-3 Category tile.** Taps "Haunting ruins · 178 ruins" and lands on Explore filtered to `cond=in_ruins`, which shows 178 results.
- **UJ-4 Numbers.** Reads the numbers strip and opens "1,136 sources cited", which goes to `/sources/`.
- **UJ-5 Map.** Presses "Open the map" on the static Bangladesh map ("299 on the map"). Explore opens on the map. The home page itself never loaded Leaflet.
- **UJ-6 Division.** Taps the Rajshahi tile (72) and lands on `/division/rajshahi/`. On a phone, the division tiles scroll sideways, with the next tile peeking in.
- **UJ-7 Trip.** Opens the first featured trip, then "All 385 plans", which goes to `/trips/`.
- **UJ-8 Trust.** Reads "Honest about what isn't known" and opens "How the research was done" (`/about/`). Then "Your family's house? Suggest a correction" opens the corrections form.
- **UJ-9 Bangla.** Switches to বাংলা. The layout is identical: the Bangla title is the large heading with the English title below it in italics, and all digits are Bangla.
- **UJ-10 Keyboard.** Tabs through the skip link, the header, the search box, the chips, the tiles, the stats link, the map button, the division row (each tile focusable, and the row scrolls to keep focus visible), the trips and the trust links, with focus visible on the photo backgrounds.

## 4. Functional requirements

### Page and data (all tasks)
- **FR-1** Every number on the page comes from build data: `meta.json` `counts`, `divisions.json` or `trips.json`. No number is typed into code or copy (I6). Numbers use `formatCount` in the interface language.
- **FR-2** The five sample-site links and the `home.samples` / `home.sourceCount` strings are removed from Home (D10).
- **FR-3** The page is statically exported, and its content (text, links and images) renders without JavaScript. Only the search box needs JavaScript (spec 08).

### Hero (11.1)
- **FR-4** The hero shows the curated hero photo (`IMG-DHK-101-001` at launch) full-bleed, behind a gradient scrim. Its `required_credit` is printed **exactly** (`credits.json` `credit`) in the hero's bottom corner, legible over the photo.
- **FR-5** In English, the `h1` is "The zamindar palaces of Bangladesh", with the Bangla "বাংলাদেশের জমিদার বাড়ি" below it (`lang="bn"`). In Bangla mode, the Bangla title is the `h1` and the English title is the italic line below it (`lang="en"`), as on the Bangla board.
- **FR-6** The hero contains `SearchBox`, reused unchanged (spec 08), with the placeholder "Search N palaces…" (N = `counts.sites`) and the board's Search button. Fuse.js loads only when the box is used (spec 08 FR-37).
- **FR-7** Below the search box are three quick chips, each a plain link with its count (D3):

  | Chip | Count | Link |
  |---|---|---|
  | Day trips | sites with `dt = 1` (132) | `/explore/?day=1` |
  | Open to visitors | sites with `ac` `ticketed` or `open_no_ticket_reported` (151) | `/explore/?acc=ticketed,open_no_ticket_reported` |
  | Map | none | `/explore/?view=map` |

  The links are built with the existing `exploreHref` (`lib/urlState.ts`), so they are canonical. Each count equals the result count that Explore shows for that link.

### Category tiles and numbers (11.2)
- **FR-8** The section "What would you like to see?" has four photo tiles. Each tile is one link, with a title in the interface language, the other language's name as a subtitle (as on the boards), a count badge and the photo's credit:

  | Tile | Badge | Link |
  |---|---|---|
  | Day trips from Dhaka | "N palaces" (`dt = 1`, 132) | `/explore/?day=1` |
  | Still standing tall | "N preserved" (`conditions.preserved`, 42) | `/explore/?cond=preserved` |
  | Haunting ruins | "N ruins" (`conditions.in_ruins`, 178) | `/explore/?cond=in_ruins` |
  | Palaces with new lives | "N in new use" (`conditions.preserved_adaptive_reuse`, 44) | `/explore/?cond=preserved_adaptive_reuse` |

  The "museums, offices, schools" text is not used (D8).
- **FR-9** Each tile's photo comes from the curated list (D2) and must show a site that matches the tile's filter. The build fails when it doesn't (FR-24).
- **FR-10** `StatStrip` shows five stats, each with an icon, a number and a label:
  - "N palaces and rajbaris" (`counts.sites`);
  - "N day trips from Dhaka" (day-trip **sites**, 132; not `counts.dayTrips`, which counts trip plans);
  - "N open-licence photos" (`counts.images`, 938);
  - "N sources cited" (`counts.sources`), linking to `/sources/`;
  - "N legends, kept apart" (`counts.legends`).

  The labels claim nothing the data doesn't support: the strip says "cited", not "checked" (D5).

### Map teaser (11.3)
- **FR-11** The national teaser reuses `MapTeaser` (`components/areas/AreaParts.tsx`) with `public/maps/bd.svg`. It shows the label "N on the map" (`counts.onMap`), the caption "Colour shows condition", and an "Open the map" button linking to `/explore/?view=map`. It loads no Leaflet code. Any change to `MapTeaser` keeps the area pages' behaviour (spec 10 FR-5).

### Divisions (11.4)
- **FR-12** "Eight divisions" (the number comes from `counts.divisions`) shows one tile per entry in `divisions.json`, sorted by `count` (high first), then by name. Each tile shows the photo, the division name in the interface language with the other language below it, the count, and the photo's credit. It links to `/division/<slug>/`.
- **FR-13** Each division tile's photo comes from the curated list and shows a site in that division (D2, FR-24).

### Featured trips (11.5)
- **FR-14** "Day trips, ready to go" shows 3 `ItineraryCard`s, chosen by a rule and not hard-coded (D4):
  1. Eligible trips have at least one photo.
  2. They are ordered with timed plans first (`planStatus = timed`), then by travel time (`sortTrips(…, 'time', 'en')`, unknown last), then by title.
  3. Going down that order, a trip is skipped when an already chosen trip is in the same `district`.
  4. The first 3 are taken.

  If fewer than 3 trips are eligible, photo-less trips fill the remaining places by the same order and district rule. With today's data, the rule picks Old Dhaka palaces (Dhaka), Gazipur (Gazipur) and Narayanganj river heritage (Narayanganj).
- **FR-15** The cards reuse `ItineraryCard` unchanged (spec 09 FR-16), with their existing badges and photo credits. Clock times appear only through the card's own timed-plan display (A-3).
- **FR-16** The "All N plans" link (N = `counts.trips`, 385) goes to `/trips/`.

### Trust band (11.6)
- **FR-17** The trust band contains:
  - the heading "Honest about what isn't known";
  - the link "How the research was done", to `/about/`;
  - "N recorded disagreements" (`counts.disagreements`, 201), linking to `/about/#disagreements`;
  - "N legends, kept apart" (`counts.legends`, 205), linking to `/about/#disagreements`, where legends are explained (`content/about.en.md`);
  - "Your family's house?" with "Suggest a correction", linking to `CORRECTIONS_URL` (`lib/nav.ts`).

  The band does not show the board's 982, and it does not call open questions disagreements (spec 10 D9; D6).
- **FR-18** The trust band links to `/sources/` as well as to methodology (roadmap 11.6), with "N sources" or an equivalent link.

### Header over the hero (D7)
- **FR-19** On `/` only, `SiteHeader` is transparent over the hero, with light text and logo. A top gradient scrim gives its text at least 4.5:1 contrast against the photo, measured at the lightest point under the text. On every other route, the header is unchanged. When the menus or the search overlay are open, they look the same as on other pages.

### Mobile layout (D9)
- **FR-20** Below the `md` breakpoint:
  - the category tiles form a 2×2 grid;
  - `StatStrip` wraps to a grid and shows all five stats (none is cut off or hidden);
  - the division tiles and the trip cards are horizontal scroll-snap rows, with the next item partly visible.
- **FR-21** In the scroll rows, every item is a focusable link, and focusing one scrolls it into view. The rows add no scroll buttons or JavaScript, and nothing animates under `prefers-reduced-motion`.

### Language (11.7)
- **FR-22** In Bangla mode, the layout is identical to English. All digits are Bangla (`formatCount`), the Bangla type scale applies, and every string comes from `lib/i18n.ts` (new strings are `needsReview: true`). Credit lines stay in their original wording. Division and site names use the Bangla names from the data.

### Images (D1, D2)
- **FR-23** `npm run thumbs` also writes larger WebP variants, but only for the image IDs in the curated home list (`lib/home.ts`): the hero at about 960 and 1600 px wide, and the tiles at about 800 px. The variants use the same manifest, metadata stripping and hashing as the thumbnails, and are committed. The hero uses `<img srcset sizes>`; the tiles use the variant with the 480 px thumbnail as a smaller candidate.
- **FR-24** The curated list in `lib/home.ts` names the hero image, the 4 category tile images and 8 division tile images (one per division slug). The build (or the 3.6 image check) fails, naming the ID, when an ID:
  - is not Ready;
  - lacks its thumbnail or variant;
  - belongs to a site outside its tile's division;
  - belongs to a site whose condition or day-trip flag doesn't match its category tile.

### Tests fixture (D10)
- **FR-25** `HOME_SAMPLE_IDS` moves out of `lib/home.ts` into a test fixture and keeps its five IDs and their comments. `tests/baseline.test.ts`, `tests/skeleton.test.ts`, `e2e/site-page.spec.ts` and `e2e/smoke.spec.ts` import it from there. The smoke test's home case checks the new `h1`, the hero credit, and one link from each section.

## 5. Non-functional requirements
- **NFR-1 Performance (13.1 budgets).**
  - The page loads no Leaflet, Fuse.js or map-tile requests until search is used.
  - Home JavaScript stays ≤ about 150 KB gzipped.
  - The largest image is ≤ 300 KB. The hero loads eagerly with `fetchpriority="high"`, and every other image loads lazily (A-4).
  - Images carry `width` and `height`, so the layout doesn't shift.
- **NFR-2 Accessibility.**
  - Each photo is decorative inside its link (`alt=""`), because the link text names the tile. The hero photo has `alt` from `caption_alt_text` with its `lang`.
  - Credits are real text, not part of the image.
  - Text over photos meets WCAG AA contrast, with a scrim.
  - Focus is visible on photo backgrounds.
  - The sections use landmarks and headings in order (`h1` hero, then `h2` per section).
  - Every target is ≥ the `min-h-tap` size.
- **NFR-3 Single source.** The counts on Home, on area pages and in Explore agree (I6, spec 10 FR-1).
- **NFR-4 Static export.** No runtime fetch is needed to render the page.

## 6. Data, interfaces, and integrations
- **Reads:**
  - `meta.json` `counts` (`sites`, `onMap`, `images`, `sources`, `legends`, `trips`, `divisions`, `disagreements`, `conditions.*`, plus the A-2 additions);
  - `divisions.json` (`slug`, `en`, `bn`, `count`, `dayTrip`);
  - `trips.json` (`TripCard`, `photos`);
  - `credits.json` (the `credit` for each curated image ID);
  - `public/maps/bd.svg`.
- **Build additions (A-2):**
  - `meta.counts.dayTripSites`: sites with `dt = 1`; must equal the sum of `divisions.json` `dayTrip`;
  - `meta.counts.openToVisitors`: sites with `ac` in {`ticketed`, `open_no_ticket_reported`}.

  Both are documented in `docs/DATA_CONTRACT.md` (Meta). The final field names are fixed when the build changes. `meta.counts.dayTrips` keeps its current meaning.
- **`lib/home.ts`:** the curated image list (`hero`, `categories` keyed by tile, `divisions` keyed by slug) and the pure featured-trip function (beside or extending `pickTrips` in `lib/areas.ts`).
- **Images:** `public/thumbs/` (480×360) plus the new variant files, recorded in `public/thumbs/manifest.json`, or in a sibling manifest if that keeps the thumbnail check simpler.
- **Links use existing helpers:** `exploreHref` (`lib/urlState.ts`), `tripHref` (`components/trips/ItineraryCard.tsx`), `CORRECTIONS_URL` (`lib/nav.ts`), and the division route `/division/<slug>/`.

## 7. Edge cases and failure behavior
- **A curated image becomes not Ready, or its site moves division or condition:** the build fails and names the ID (FR-24). Home never ships a mismatched or uncredited photo.
- **A count is 0:**
  - a category tile or chip with a count of 0 is still shown, with "0", and the build warns (A-5);
  - a division with `count = 0` still has a tile.
- **Fewer than 3 eligible trips:** photo-less trips fill the remaining places (FR-14). If fewer than 3 trips exist in total, the row shows those that exist. With 0 trips, the section is omitted.
- **Several trips tie on travel time:** the title decides, so the choice is deterministic.
- **A trip becomes timed (Phase 12.9):** it moves to the front automatically, and the district rule still applies.
- **Search used offline:** behaves as spec 08 already does. `OfflineNotice` comes from the layout.
- **JavaScript disabled:** every section and link works, and the search box falls back as in spec 08.
- **Bangla names missing:** a division or site without a Bangla name falls back as elsewhere (`common.bnNameMissing` pattern).
- **Very long Bangla labels:** tiles wrap their text and never truncate counts.

## 8. Acceptance criteria
- **AC-1** (FR-1, NFR-3) Every number on the page equals its value in `meta.json`, `divisions.json` or `trips.json`, checked by a unit test that renders Home and compares each number. A test edits a count in fixture data and sees the page change.
- **AC-2** (FR-2, FR-25) Home has no "Five sites to start with" section. The tests import `HOME_SAMPLE_IDS` from the fixture, and the full test suite passes.
- **AC-3** (FR-3, NFR-4) With JavaScript disabled, Playwright sees every section heading, every tile link and every credit on `/`.
- **AC-4** (FR-4, FR-5) The hero credit equals `credits.json` `credit` for the hero ID, character for character, and is visible. In English, the `h1` is the English title; in Bangla mode, it is the Bangla title and the English line has `lang="en"`.
- **AC-5** (FR-6, NFR-1) Given a fresh load of `/`, no request is made for Fuse.js, Leaflet or tile chunks. When the hero search box is focused and typed in, then the Fuse.js chunk loads and suggestions appear.
- **AC-6** (FR-7, FR-8) For each chip and category tile, following its link to Explore shows a result count equal to the number on Home. There is no "Within 2 hours" chip.
- **AC-7** (FR-9, FR-13, FR-24) The build fails, naming the ID, when a curated ID is changed to one that is not Ready, missing its variant, in the wrong division, or of the wrong condition. With the committed list, the build passes.
- **AC-8** (FR-10) The strip shows five stats with data-true labels: "sources cited", 938 photos, and 132 day-trip sites (not 144). "Sources cited" links to `/sources/`.
- **AC-9** (FR-11) The map teaser shows "299 on the map" and links to `/explore/?view=map`. The area pages' teaser tests still pass.
- **AC-10** (FR-12) Eight division tiles appear in count order (Dhaka 111 … Mymensingh 23), each linking to its division page.
- **AC-11** (FR-14) Unit tests of the trip rule cover: today's data → Old Dhaka palaces, Gazipur, Narayanganj river heritage; a timed trip goes first; no two picks share a district; photo-less trips fill the remaining places only when needed; ties break by title.
- **AC-12** (FR-15, FR-16) The three cards are `ItineraryCard`s with visible credits, and "All 385 plans" links to `/trips/`.
- **AC-13** (FR-17, FR-18) The trust band shows 201 disagreements and 205 legends, never 982, and links to `/about/`, `/about/#disagreements`, `/sources/` and the corrections form.
- **AC-14** (FR-19) On `/`, the header is transparent over the hero, with ≥ 4.5:1 text contrast (checked by axe and a manual check on the photo's lightest area). On `/explore/`, the header is unchanged (screenshot comparison).
- **AC-15** (FR-20, FR-21) At 390 px wide: the tiles are 2×2; all five stats are visible without horizontal page scroll; the division and trip rows scroll sideways; and keyboard Tab moves through every division tile with each one in view.
- **AC-16** (FR-22) In Bangla mode at desktop and mobile widths, the page contains no Latin digits outside credit lines and `lang="en"` text, and the section order and layout match English (screenshot comparison).
- **AC-17** (FR-23, NFR-1) The hero variant served at 1600 px is ≤ 300 KB, and every Home image has `width` and `height`. `npm run thumbs` is idempotent: a second run changes nothing.
- **AC-18** (NFR-2) axe reports no violations on `/` in English, Bangla, light and dark modes.
- **AC-19** (roadmap) Every photo on the page has a visible credit (a Playwright check counts the `img` elements and their credits). The page loads no Leaflet or Fuse.js code on load. The owner has reviewed the page against all four home boards (OQ-1).

## 9. Dependencies, constraints, and assumptions
### Dependencies
- Phases 6 (Explore and its URLs) and 9 (`ItineraryCard`, `trips.json`), task 3.5 (thumbnails), 3.8 (`bd.svg`), Phase 8 (`SearchBox`), Phase 10 (division pages, `/sources/`, `/about/#disagreements`, `MapTeaser`).
- The originals in `JP_IMAGES_DIR` (default `../images`) are needed to make the new variants once. After that, the committed files suffice (O12).

### Constraints
- **Static export:** the site has no `next/image` optimiser, so images are plain `<img>` elements with committed files (`components/cards/SiteCard.tsx`, `components/site/Gallery.tsx`).
- **Explore URL keys and canonical order** are fixed by `docs/URLS.md`, and `tt` is single-valued (D3).
- **Credit lines are printed exactly** (`docs/DATA_CONTRACT.md` credits; spec 10 D11).
- **Thumbnail check:** the check (3.6) fails on stray files outside the Ready set, so the variants must be inside its rules (`scripts/build-thumbs.mjs`).
- **One-source counts** (spec 10 FR-1, `docs/DATA_CONTRACT.md` §Districts).

### Assumptions (all accepted by the owner, 2026-10-25; now requirements)
- **A-1** Both the disagreements and the legends links go to `/about/#disagreements`, the About section that covers both (`content/about.en.md`). The correction link uses `CORRECTIONS_URL`.
- **A-2** The two missing counts (day-trip sites and open to visitors) are added to `meta.counts` by `scripts/build-data.mjs`, rather than read from `index.json` at build time.
- **A-3** Trip cards show the existing duration and plan badges. The board's clock times ("07:00–17:00") appear only once a plan is timed.
- **A-4** The hero image loads eagerly with `fetchpriority="high"`, and every other image loads lazily.
- **A-5** Zero counts still show their tile or chip (§7), and the build warns about them.

## 10. Key decisions and rationale
- **D1 Larger committed image variants, only for Home's images.** The 480 px thumbnails are too soft for a full-bleed hero and for tall tiles. Committing the variants keeps O12's rule: no runtime dependency on Wikimedia, and a fresh clone builds. Limiting them to the curated list keeps the repository small.
- **D2 Curated, reviewed photo IDs, checked by the build.** A rule would change the photos whenever the data changes, and could pick weak ones. The checks guarantee every curated photo is Ready, credited and correctly placed. The list starts from the boards' photos.
- **D3 No "Within 2 hours" chip.** No single Explore URL can show it, and making `tt` multi-valued would change Explore's contract. The three remaining chips match the mobile board.
- **D4 Featured trips by rule, with one trip per district and a photo required.** This honours 11.5 ("by a rule, not hard-coded") without three Old Dhaka trips side by side. Requiring a photo matches the photo-led boards.
- **D5 Data-true stat labels:** 938 photos, "sources cited", and 132 day-trip sites. 71 sources are cited second-hand, so "checked" would overclaim.
- **D6 The trust band shows 201 disagreements and 205 legends.** This follows spec 10 D9. Open questions are explained on About.
- **D7 A transparent header over the hero, on `/` only,** as on the boards. Other routes are unchanged.
- **D8 "44 in new use".** The data records adaptive reuse, but not what each site became.
- **D9 Mobile:** the category tiles form a 2×2 grid, the stats wrap, and the divisions and trips are scroll-snap rows as on the board.
- **D10 The sample links leave Home, and `HOME_SAMPLE_IDS` becomes a test fixture.** It is still the record-state list the tests rely on (spec 04).

### Amendments during implementation (2026-10-25)
- **`SearchBox` gains three optional props** (`initialValue`, `placeholder`, `submit`), unused by its other callers, so FR-6's "reused unchanged" holds for behaviour only. The hero is a plain form to `/search/` until first focus. It then loads `SearchBox`, which takes over the typed text synchronously (`flushSync`), so no keystroke is lost.
- **Curated photos (OQ-2, first pass):** hero `IMG-DHK-101-001`; tiles: Baliati (day trips), Boro Sardar Bari (preserved), Teota (ruins) and Natore Rajbari (new use); divisions: Ahsan Manzil, Sholla, Puthia, Sundarpur, Haydar Ali, Gourarang, Tajhat and Muktagacha. The board's "preserved" photo (Mohera's gate) is an adaptive-reuse site, so FR-24 rejects it. The list is in `lib/home-images.json` rather than `lib/home.ts`, because `npm run thumbs` (plain Node) reads it too.
- **Credits:** below `lg`, each category tile's credit sits under the tile, because the exact line, with its licence URL, covers a 175 px tile. Featured trip cards keep `ItineraryCard`'s camera-button credits (FR-15), and AC-19's test accepts either.
- **"8 divisions"** is the heading, not "Eight divisions", because the number comes from `counts.divisions` (FR-12).
- **JavaScript budget (NFR-1):** the home page's own code is 3 KB. The shared framework makes the total about 200 KB gzipped in the webpack build; About is 197 KB. Lighthouse measures it in 13.1.

## 11. Open questions
- **OQ-1** The owner's visual review against the four Home boards (the roadmap's acceptance criterion).
- **OQ-2** The exact curated photo IDs for the 4 category tiles and the 8 division tiles. They are chosen at implementation, starting from the photos credited on the boards, and the owner reviews them.
- **OQ-3** Should a trust-band count or link change the board's wording "disagreements shown" to "recorded disagreements" in Bangla too? The Bangla draft is `needsReview` either way.
