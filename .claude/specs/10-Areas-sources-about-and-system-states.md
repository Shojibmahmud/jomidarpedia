# Areas, sources, About, credits and system states

**Status:** Approved (by the owner, 2026-10-25)
**Roadmap reference:** `roadmap/DEVELOPMENT_ROADMAP.md` §3 Phase 10 (tasks 10.1–10.13); also O1, O2, O5, O6, O7, O8, R1, R5, I6, I7; `roadmap/DESIGN_COVERAGE.md` rows 1, 2, 3, 11, 12, 22, 26, 27, 34, 35; `docs/URLS.md`; `docs/DATA_CONTRACT.md` (Districts, Sources, Meta, credits); `.claude/specs/03-App-foundations.md` (3.8 maps, pin numbering); `.claude/specs/05-Site-page.md` (FR-3, FR-34, FR-35, sources list); `.claude/specs/07-Map.md` (Lite, O7); `.claude/specs/08-Search.md` (district results); `.claude/specs/09-Trips-and-itineraries.md` (D12, `ItineraryCard`)
**Source task:** "Phase 10: Areas, sources, About, credits and system states. Objective: every remaining route, built from real data."
**Branch:** `11-phase-10-areas-sources`
**Date:** 2026-10-25

## 1. Problem and intended outcome
Seven routes in `docs/URLS.md` are still planned, and their links already appear in the shell: the header's Divisions menu (`lib/nav.ts` `divisionHref`), and the footer's Credits, Licences and Sources links. Every one of those links leads to the default Next.js 404. The site page's breadcrumb is plain text (spec 05 FR-3). The trip page breadcrumb and Search's district results link to Explore instead of area pages (spec 09 D12; `components/search/results.tsx`). Site pages show source IDs ("SRC-0001") with no page to explain them.

The build already writes most of the data (25 Oct 2026):

| Board shows | Data has |
|---|---|
| Division: condition bar, no-pin list, "13 districts" | `divisions.json` (8): `count`, `onMap`, `conditions`, `noPin`, `districts`, `tripCount` |
| Division: "How sure we are of locations" 11 / 44 / 13 / 1 / 42 | not in `divisions.json`; `index.json` `lc` gives exactly these numbers for Dhaka |
| District: site cards, condition bar, map | `districts.json` (64): `count`, `onMap`, `conditions`, `noPin`, `siteIds`; `public/maps/district/<slug>.svg` (3.8) |
| Sources list: 1,136 rows, type chips, "Most cited" | `sources.json` (1,136): `type`, `title`, `publisher`, `sites[]`, `date`, `url`, `readStatus`, `notes` |
| Source page (the core book): author, edition, ISBN, checked | `bib` on SRC-0001 only (2.15); `citationsByDivision` |
| About: 38 / 217 / 43 / 1 / 114 location counts | `index.json` `lc` (matches); not in `meta.json` |
| About: "982 recorded disagreements" | 982 conflicts, of which only **201** have 2+ versions (disagreements) and **781** are open questions (spec 05 FR-34, FR-35) |
| About: "1,869" still to confirm; 24 held for review; 1,322 permission required; possible duplicates | none in `meta.json`; derivable from site records, `images.csv` `publication_readiness`, `site_relationships.csv` (1 `possible_duplicate`) |
| Credits: 934 photos of 126 sites, "all from Wikimedia Commons", "Exterior · IMG-…" | `credits.json`: 938 Ready images of 127 sites; 936 from Commons and 2 are the owner's own; no view label |
| 404: "searching for [a site ID] always works" | `lib/search.ts` does not match site IDs |

**Outcome:** every route in the route table builds; area pages, About and the home counts agree because they share one source; the sources, About and credits pages say only what the data supports; the 404, loading and offline states match the boards.

## 2. Scope
### In scope
- Tasks 10.1–10.13.
- Routes: `app/division/[slug]/page.tsx` (8), `app/district/[slug]/page.tsx` (64), `app/sources/page.tsx`, `app/sources/[id]/page.tsx` (1,136), `app/about/page.tsx`, `app/credits/page.tsx`, `app/not-found.tsx`.
- Components: `MapTeaser` (static SVG, from 3.8), `ConditionBar`, `LocationSummary`, `NoPinList`, `SourcesTable`, credit rows, the licences block, the shared `Skeleton`, `OfflineNotice`.
- **Build additions** (`scripts/build-data.mjs`, §6): area `locations` and `dayTrip` counts and district `tripCount`; new `meta.counts` fields; `credits.json` `view`.
- **District map pin numbers** matching the district page's list order (spec 03: "numbering waits for Phase 10's list order"), in `scripts/build-maps.mjs`.
- **Search:** a site-ID query finds that site (D14).
- **Link updates:**
  - the site page breadcrumb links its division and district (spec 05 FR-3 replaced);
  - each SRC ID on a site page links to `/sources/<id>/`;
  - the trip page breadcrumb links to the area pages (spec 09 D12 replaced);
  - Search's district results link to `/district/<slug>/`.
- Lite notes (O7) on trip and site pages that load a map (D12).
- `content/about.en.md` (drafted by Claude, reviewed by the owner) with a release gate (D10).
- Interface strings in `lib/i18n.ts`; Bangla drafts `needsReview`.
- **Contract changes, in the same commit as the code:** `docs/URLS.md` and `docs/DATA_CONTRACT.md`.
- `npm run screenshots` gains the new routes.

### Out of scope
- Owner-written area descriptions (D1).
- A `/divisions/` index route (D15).
- Home (Phase 11), including its division tiles.
- Rewriting internal wording in `sources.csv` or elsewhere (Phase 12; the release gate already covers `sources.json`).
- The cleaned CSV export (14.6) and any promise of it (D8).
- Bangla About prose (O6).
- A service worker (O8).
- Choosing a tile provider (O4).
- A "broken link" field on the corrections form (OQ-3).

## 3. User journeys / use cases
- **UJ-1 Division.** Opens "Dhaka" from the header's Divisions menu. `/division/dhaka/` shows:
  - the name in both languages and a sentence built from counts;
  - the static map with "69 of 111 on the map";
  - the condition bar;
  - "How sure we are of locations" (11 / 44 / 13 / 1 / 42);
  - 13 districts with counts;
  - up to 4 trip cards;
  - "Filter in Explore";
  - the 42 sites without a pin.
- **UJ-2 District.** Opens Manikganj from that list. `/district/manikganj/` shows 4 numbered site cards in travel-time order, matching numbered pins on the map. "Open to visitors 2" narrows the cards.
- **UJ-3 Sources.** Opens Sources from the footer. Picks "Encyclopedias" and types "Banglapedia": the URL becomes `/sources/?q=banglapedia&type=encyclopedia`, and the table and count update. Page 2 is a link.
- **UJ-4 Source page.** On a site page, presses "SRC-0001". `/sources/SRC-0001/` shows:
  - the book's author, edition, ISBN and how it was checked;
  - "Cited by 335 sites" and the counts by division;
  - 3 example sites;
  - "See all 335 sites", which jumps to the full list on the page.
- **UJ-5 About.** Reads `/about/`: the core book, grading, location statuses, disagreements and open questions, costs, photos, what is not done yet, how to contribute, and the licences. The numbers match the rest of the site.
- **UJ-6 Credits.** From a photo credit, opens `/credits/?site=JB-DHK-064`. Only Baliati's photos are listed, each with its exact credit line, its licence and its file page. "Show all sites" removes the filter.
- **UJ-7 404.** Follows a stale link and sees "This page has fallen into ruin" with a search box. Types "jb-dhk-064": Baliati is the first result.
- **UJ-8 Offline.** Loses the connection on a trip page and sees the toast "You're offline. This page stays open; other pages and photos need a connection." When the connection is back, presses "Try again" and the page reloads.
- **UJ-9 Bangla.** In Bangla mode, labels, digits and area names are Bangla. The About prose stays English with the one-line O6 note.
- **UJ-10 Keyboard.** Chips, the sources table controls, paging, the credits search, "Show N more", the no-pin disclosure and the toast all work from the keyboard, with visible focus.

## 4. Functional requirements

### Shared area parts (10.1, 10.2)
- **FR-1** All counts on area pages come from `divisions.json` and `districts.json` alone (one source; I6). No count is typed into code or copy.
- **FR-2** The intro sentence is generated from counts:
  - "N sites in M districts" (division) or "N sites" (district);
  - then "K can be visited in a day from Dhaka", where K is the area's `dayTrip` count, omitted when K = 0.

  The sentence uses no descriptive prose (D1).
- **FR-3** `ConditionBar` shows the five condition counts as one bar, with a legend that gives each label and number in text. Zero counts are left out of the legend; colour is never the only cue.
- **FR-4** `LocationSummary` shows five tiles from the area's `locations`, labelled as on the boards: "confirmed" (`verified`), "one source", "approximate", "unverified, flagged", and "no pin yet". Each tile links to `/about/#locations` (D2).
- **FR-5** `MapTeaser` shows the area's static SVG (`public/maps/division/<slug>.svg`, `public/maps/district/<slug>.svg`) and a label "X of N on the map". It links to Explore on the map with the area filter (`view=map`, `div`, and for a district `dist`). Its caption reads "Static image; the interactive map loads only when opened." With `onMap = 0`, no teaser is shown, only the line "None of these sites has a map location yet." It loads no Leaflet code.
- **FR-6** `NoPinList` appears when `noPin` is not empty. Its title is "N sites without a pin yet", followed by the board's explanation. It lists the first 5 sites (name linked to the site page, then the district), and "See all N" expands the rest. The expansion works without JavaScript. The list ends with "Know where one of these is? Tell us", linking to the corrections form with `page_url`. It shows names only, never coordinates (R5).
- **FR-7** The trips row shows up to 4 `ItineraryCard`s for trips anchored in the area, ordered timed first (only when `planStatus = timed`), then by travel time (unknown last), then by title. The link "All N trip plans" goes to `/trips/?div=<division slug>`. With no trips, the row is omitted (D3).
- **FR-8** The breadcrumb reads "Divisions / <Division>" on a division page and "Divisions / <Division> / <District>" on a district page. "Divisions" is plain text (D15). The division is a link on district pages, and the current page has `aria-current="page"`.
- **FR-9** Names show in both languages: the English `h1` plus the Bangla name ("ঢাকা বিভাগ" for a division).

### Division page (10.1)
- **FR-10** `/division/<slug>/` is generated for the 8 slugs in `divisions.json` (`generateStaticParams`, `dynamicParams = false`).
- **FR-11** The header actions are "Explore <Division> on the map" (Explore with `div` and `view=map`) and, when `tripCount > 0`, "N trip plans" linking to `/trips/?div=<slug>`.
- **FR-12** "N districts" lists every district of the division with a proportional bar and its count, sorted by count (high first), then by name. Each row links to `/district/<slug>/`.
- **FR-13** "All N sites" does not list the sites. It links to Explore filtered to the division ("Filter in Explore") with the board's sentence (D4).

### District page (10.2)
- **FR-14** `/district/<slug>/` is generated for the 64 slugs in `districts.json`.
- **FR-15** "N sites" lists every site in the district as a static `SiteCard` (index fields only, as in Explore), ordered by travel time (unknown last) and then by name. Each card carries a number marker 1…N in that order (D4).
- **FR-16** The district SVG's pins carry the same numbers as the cards (sites without a pin have no pin, but keep their number in the list). The numbers are written by `scripts/build-maps.mjs` from the same order, defined once and shared (spec 03).
- **FR-17** Chips above the list filter the cards in the browser:
  - "All N";
  - "Open to visitors" (`ac` is `ticketed` or `open_no_ticket_reported`);
  - "Preserved" (`preserved` or `preserved_adaptive_reuse`);
  - "In ruins";
  - "Lost".

  Each chip shows its count and appears only when that count is above 0. One chip is active at a time, and it is not kept in the URL (D5). Without JavaScript, all cards show and the chips are hidden.
- **FR-18** The district page also shows `ConditionBar`, `LocationSummary`, `NoPinList` and the trips row. Its trips are the ones whose anchor is in the district; "All N trip plans" goes to `/trips/?div=<division slug>`, because Trips has no district key.

### Sources list (10.3)
- **FR-19** `/sources/` lists every entry in `sources.json`. The intro copy follows the board ("These are the N sources behind the site. Site pages show which source supports each fact where we know it…") with N from the data, and links to `/about/#disagreements`. No copy claims that every fact has a supporting link.
- **FR-20** `SourcesTable` has these columns:
  - **Source:** the title, linking to `/sources/<id>/`, with the ID in mono;
  - **Type:** the chip label;
  - **Publisher:** the publisher;
  - **Date:** the date, or "Not dated";
  - **Cited by:** "N sites".
- **FR-21** The type chips group `type` values as follows:

  | Chip | Token | `type` values | Count |
  |---|---|---|---|
  | News | `news` | `news` | 378 |
  | Wikipedia | `wiki` | `wiki` | 233 |
  | Government portals | `government` | `government` | 158 |
  | Travel guides | `travel` | `travel_guide` | 139 |
  | Encyclopedias | `encyclopedia` | `encyclopedia` | 116 |
  | Personal blogs | `blog` | `blog` | 29 |
  | Maps | `map` | `map_service` | 27 |
  | Academic | `academic` | `academic` | 16 |
  | Books | `book` | `book` | 1 |
  | Project working files | `project` | `project_upload_list`, `project_upload_audit`, `project_communication` | 17 |
  | Other | `other` | `web_other`, `secondary_citation`, `social_media`, `international` | 22 |

  A `type` value missing from this table fails a unit test, so a new value cannot vanish. Counts come from the data.
- **FR-22** The URL keys are `q`, `type`, `sort` and `page`, following the URL rules (canonical order, defaults left out, unknown values dropped with the notice):
  - `q`: free text, matched against title, publisher and ID, folded as in Search (`lib/fold.ts`);
  - `type`: one chip token;
  - `sort`: `cited` (the default: site count high first, then ID), `title`, or `date` (newest first, undated last);
  - `page`: an integer from 2 up, dropped with the notice when beyond the last page.

  Back and Forward restore the state.
- **FR-23** The table shows 25 rows per page (D17), with "1–25 of N" and numbered page links that are real `<a>` elements. Without JavaScript, the first 25 rows in the default sort are static HTML.
- **FR-24** No match shows an empty state with "Clear filters".

### Source page (10.4)
- **FR-25** `/sources/<id>/` is generated for all 1,136 IDs; an unknown ID is a 404.
- **FR-26** The header shows "<Type label> · <ID>", the title as written, and the author (`bib.author`) when present.
- **FR-27** A definition list shows only the fields that are present:
  - Published: `date`, plus `bib.edition`;
  - Publisher: `bib.publisher`, else `publisher`;
  - ISBN;
  - Checked: `bib.verificationMethod`, with its wording kept as written;
  - How we read it: `readStatus`;
  - Accessed;
  - Cited by: "N sites".

  When `url` is present, the page shows "Open the source ↗" (external, `rel="noopener noreferrer"`).
- **FR-28** "How we used it" shows `notes` as written, and is omitted when empty.
- **FR-29** A project working file (`projectFile`, or a `project` chip type) is labelled "Project working file: the project's own research file, not published". It has no outbound link, even when `url` is set (D6).
- **FR-30** "Sites citing this source, by division" shows a bar per division from `citationsByDivision`, sorted high to low. Each division name links to `/division/<slug>/`. Shown only when the source is cited by 2 or more sites.
- **FR-31** "A few of them" shows up to 3 citing sites, ordered by record confidence (confirmed, partly confirmed, unconfirmed, not graded) and then by name, each with its condition badge. "See all N sites" links to `#sites` and appears only when N > 3 (D7).
- **FR-32** `#sites` lists every citing site, grouped by division in `divisions.json` order, sorted by name within each division, each linked to its site page.

### Site page links (10.4)
- **FR-33** In the site page's source list, the SRC ID becomes a link to `/sources/<id>/`. The title still links to the source's own URL.
- **FR-34** The site page breadcrumb links the division to `/division/<slug>/` and the district to `/district/<slug>/`. The upazila and the site name stay text (replaces spec 05 FR-3's "not links yet").

### About (10.5, 10.6, 10.8, 10.9)
- **FR-35** `/about/` renders `content/about.en.md` at build time, with no client-side JavaScript for the prose. It has a table of contents (a sticky side list at 1280 px and wider, a list at the top below that). Its sections carry these anchors:
  - `#core-book`, the core book;
  - `#grading`, how records are graded;
  - `#locations`, what each location status means;
  - `#disagreements`, disagreements, open questions and legends;
  - `#costs`, costs, fees and dates;
  - `#photos`, photos;
  - `#not-done`, what is not done yet;
  - `#contribute`, how to contribute;
  - `#licences`, licences.
- **FR-36** The Markdown holds count tokens (for example `{{counts.sites}}`), which the build fills from `meta.json`. An unknown token fails the build in every mode. Numbers are formatted for the interface language.
- **FR-37** The front matter holds `reviewed: true | false`. A release build fails while it is `false`; local and preview builds render the draft (D10).
- **FR-38** Grading shows the four `meta.counts.confidence` counts with their definitions, and the `stillToConfirm` total.
- **FR-39** Locations shows five cards (confirmed, one source, approximate, unverified, no pin) with `meta.counts.locations`. The approximate card explains the 1.5 km circle as a display convention, and the unverified card describes the "?" pin and "Location unverified" (O9).
- **FR-40** Disagreements shows `disagreements` ("N disagreements: sources give different versions") and `openQuestions` ("N open questions: one version, not yet checked") separately, plus `legends` (D9). It never shows a combined "982".
- **FR-41** Photos shows `images` with "for `withPhotos` sites", `imagesNeedReview` ("held for review, not shown") and `imagesPermissionRequired` ("permission required: link only"), plus a link to `/credits/`. "Possible duplicates: N" appears with one sentence saying that such records are kept separate until checked.
- **FR-42** Contribute lists the corrections form and the photo-offer form (`docs/URLS.md` outbound links). The email fallback stays hidden while O2 is unset.
- **FR-43** `#licences` states:
  - **Text and site data:** CC BY-SA 4.0 (O5), with a link to the licence deed, and no promise of a data download (D8);
  - **Photos:** each photo keeps its own licence; see `/credits/`;
  - **Changes to photos:** "Photos are shown resized and converted to WebP; the original is on each file page" (D11);
  - **Map data:** © OpenStreetMap contributors (ODbL), and the tile provider credits actually offered by `lib/map-config.ts` `BASE_MAPS`;
  - **Boundaries:** the sources and licences listed in `data/geo/SOURCE.md` (geoBoundaries CC0 1.0; BBS / OCHA ROAP CC BY 3.0 IGO for districts);
  - **Map library:** Leaflet and Leaflet.markercluster;
  - **Fonts:** the families loaded by `app/fonts.ts`, with their licence.

  The block is one component that `/credits/` reuses.
- **FR-44** The About copy makes no claim the repository contradicts. "Has no accounts and keeps no tracking" is allowed only while the app loads no analytics script (none today; D13). "Costs nothing to run" stays only if the owner confirms it in review.

### Credits (10.7)
- **FR-45** `/credits/` lists every entry in `credits.json`, grouped by site: divisions in `divisions.json` order, sites A–Z within a division. Each group heading shows the site name (linked to its site page), its ID and "N photos".
- **FR-46** Each row shows:
  - the thumbnail (lazy-loaded, sized to prevent layout shift);
  - the exact `credit` text, character for character, never split or reworded;
  - the `view` label;
  - the image ID;
  - "File page ↗" when `sourcePage` exists (none for the owner's 2 photos).
- **FR-47** A group shows 8 rows, then "Show N more", which works without JavaScript.
- **FR-48** The search box filters the groups in the browser by site name (English or Bangla, folded) or by the text of the credit line. It is not kept in the URL.
- **FR-49** `?site=<site ID>` shows only that site's group plus a "Show all sites" link. A site ID with no Ready photos, or one that names no site, is dropped with the notice (URL rules).
- **FR-50** The intro reads "Every photo published on this site, with the credit line its licence asks for: N photos of M sites." N and M come from the data, with no claim about where the photos come from (D11). The photo-licence box shows the count of each `license` value, sorted by count. The licences block (FR-43) and "Your photo here by mistake? Tell us" (corrections form) appear in the side column.

### 404 (10.10)
- **FR-51** `app/not-found.tsx`, inside the standard page shell, shows:
  - the 404 numeral and `NotFoundArt`;
  - "This page has fallen into ruin" with the Bangla line;
  - the board's sentence about site IDs;
  - the search box (`components/search/SearchBox.tsx`), which submits to `/search/?q=`;
  - the links "Home", "Explore the map" (`/explore/?view=map`) and "Report a broken link" (the corrections form, with `page_url` set to the current URL in the browser; without JavaScript, the plain form URL).
- **FR-52** Any unknown path in the static export serves this page (`/404.html`) with HTTP status 404.

### Site-ID search (D14)
- **FR-53** A Search query that is exactly a site ID (`JB-XXX-NNN`, any case, surrounding spaces trimmed) puts that site first in the Sites results, marked "matched by site ID", and turns off "Did you mean". An ID that names no site gets the normal "no results" state. `docs/URLS.md` and spec 08 gain a note.

### Skeleton (10.11)
- **FR-54** A shared `Skeleton` has `row`, `card` and `map` variants, styled from tokens. It sets `aria-busy` on its region and gives screen readers one text "Loading…". There is no shimmer under `prefers-reduced-motion`.
- **FR-55** `ListSkeleton` (`components/explore/ResultsList.tsx`) is replaced by the `row` variant in Explore and Search.
- **FR-56** While Leaflet loads, `MapLoader` shows the `map` variant with "Loading the map… the list is ready below" in Explore and "Loading the map…" on trip and site pages.
- **FR-57** The trips listing renders its first 12 cards statically and needs no skeleton (D16). The `card` variant is built and covered by a test, for Home (Phase 11).

### Offline and Lite notes (10.12)
- **FR-58** `OfflineNotice` is rendered once, in the root layout. It appears when the `offline` event fires, or on load when `navigator.onLine` is false, with the O8 copy: "You're offline. This page stays open; other pages and photos need a connection."
- **FR-59** The notice hides by itself on the `online` event. "Dismiss" hides it until the next `offline` event. "Try again" reloads the page when the browser reports online; otherwise it keeps the toast and says "Still offline".
- **FR-60** The notice is a polite live region, sits above the Explore bottom sheet and does not cover the bottom navigation on mobile. It is hidden in print.
- **FR-61** `LiteNotices` (the Save-Data note "We switched to Lite mode" and the slow-network suggestion, O7) also appears on trip pages whose `RouteMap` would load, and on site pages whose mini map would load. The once-per-session hint key is shared with Explore (D12).

### Links into the new pages
- **FR-62** On the trip page, the breadcrumb's division and district link to `/division/<slug>/` and `/district/<slug>/` (replaces spec 09 D12 and FR-18).
- **FR-63** Search's district results link to `/district/<slug>/` (`components/search/results.tsx`).

### Language
- **FR-64** All new interface strings are in `lib/i18n.ts`, with Bangla drafts marked `needsReview`. Digits and labels follow the interface language. Source titles, publishers, notes and credit lines are data and are shown as written (wrapped in `Latin` when in Latin script). The About prose is English, with `lang="en"` and the O6 note in Bangla mode.

## 5. Non-functional requirements
- **NFR-1 Static output.** The build emits 8 division pages, 64 district pages, `/sources/`, 1,136 source pages, `/about/`, `/credits/` and `/404.html` (R1). Every internal link to these routes resolves.
- **NFR-2 One source of counts.** For each division:
  - its `count`, `conditions` and `locations` equal the sums over its districts;
  - its `locations` sum to `count`.

  Across divisions, the totals equal `meta.counts` (`sites`, `conditions`, `locations`). A unit test enforces both.
- **NFR-3 Payload.** None of the new pages loads Leaflet or Fuse.js code. HTML-size budgets for `/sources/` and `/credits/` are measured during implementation and recorded in `docs/DATA_CONTRACT.md`, with a test that warns above them. Credit thumbnails are lazy-loaded.
- **NFR-4 Accessibility.** axe passes on a division page, a district page, `/sources/`, a source page, `/about/`, `/credits/`, the 404 page and the open offline toast. Counts and status are text, never colour alone. Visible focus everywhere; tap targets follow `min-h-tap`.
- **NFR-5 Privacy (R5).** No hidden-pin coordinates appear on any new page, in any map SVG, or in a link.
- **NFR-6 Honesty.** No copy states a fact the data lacks:
  - no combined disagreement figure;
  - no "all from Wikimedia Commons";
  - no promise of a data download;
  - no claim that every fact has a link;
  - unknowns are shown as words.
- **NFR-7 Exact credits.** Every credit line on `/credits/` equals its `images.csv` `required_credit` byte for byte.

## 6. Data, interfaces, and integrations
- **`divisions.json` and `districts.json`** gain:
  - `locations`, which is `{ verified, singleSource, approximate, unverified, noPin }`. The first four count pinned (not hidden) sites by `coordinates_status`; `noPin` counts the hidden sites and equals `noPin.length`.
  - `dayTrip`: the number of sites with `dt = 1`.
  - On districts only, `tripCount`: the number of trips anchored in the district.
- **`meta.json` `counts`** gains:
  - `locations` (same shape: 38 / 217 / 43 / 1 / 114 on 25 Oct 2026);
  - `disagreements` (conflicts with 2+ versions: 201) and `openQuestions` (1 version: 781);
  - `stillToConfirm` (1,869);
  - `imagesNeedReview` (`publication_readiness = Needs review`: 24) and `imagesPermissionRequired` (`Permission required`: 1,322);
  - `possibleDuplicates` (`site_relationships.relation_type = possible_duplicate`: 1).
- **`credits.json`** gains `view` (from `images.view_category`, a public field; added to the I7 allow-list).
- **`scripts/build-maps.mjs`:** numbered district pins in the district list order, computed by a shared function (also used by the page).
- **`lib/search.ts`:** site-ID matching (FR-53).
- **New pure modules (unit-tested):**
  - `/sources/` URL parsing, serialising, filtering, sorting, paging and type grouping;
  - the area list order and chip counts;
  - the About token filler and review gate.
- **`content/about.en.md`:** new; front matter `reviewed`.
- **`docs/URLS.md`:**
  - routes set to built;
  - a `/sources/` query-key table (`q`, `type`, `sort`, `page`);
  - the About anchors (FR-35);
  - the `/credits/` `site` rules (FR-49);
  - the site-ID note for `/search/`.
- **`docs/DATA_CONTRACT.md`:** the area, meta and credits fields above; page budgets.
- **No CSV change.** `index.json` is unchanged.

## 7. Edge cases and failure behavior
- **District with no pinned sites:** no `MapTeaser`, a one-line note instead, and the numbered cards still show (FR-5, FR-16).
- **Area with no pinless sites:** no `NoPinList`. **Area with no trips:** no trips row and no "N trip plans" button (FR-7, FR-11).
- **Condition or location count of 0:** left out of the legend; no zero tile in `LocationSummary`, except "no pin yet" (shown as 0 in that case).
- **Source cited by 1 site:** no division bars and no "See all" (FR-30, FR-31). A source with no `date`: "Not dated". With no `url`: no outbound link.
- **Source titles in Bangla script:** shown as written, with no `Latin` wrapper.
- **`/sources/?page=999`, an unknown `type` or `sort`:** dropped with the notice (FR-22).
- **`/credits/?site=` for a site with no Ready photos, or an unknown ID:** dropped with the notice (FR-49).
- **The owner's own photos (2):** no "File page" link (FR-46).
- **A Ready image whose credit line is non-standard (15):** shown exactly as written (NFR-7; the fix is Phase 12).
- **`about.en.md` token typo:** the build fails in every mode (FR-36). Release with `reviewed: false`: the build fails (FR-37).
- **Offline on first load:** the toast shows at once. Online again before any action: it hides (FR-58, FR-59).
- **JavaScript off:**
  - district cards all show and the chips are hidden;
  - `/sources/` shows 25 rows;
  - "See all", "Show N more" and the TOC work;
  - the 404 report link has no `page_url`.
- **Lite on:** area pages are unchanged (static SVG only); trip and site pages show Lite's notice and no map (FR-61).
- **Dark mode and print:** the new pages print light through the existing `@media print` tokens. The toast and controls are hidden.

## 8. Acceptance criteria
- **AC-1** Given the built site, 8 division pages, 64 district pages, `/sources/`, 1,136 source pages, `/about/`, `/credits/` and `/404.html` exist, and each renders one `<h1>`. A link check finds no internal link to a missing route. (FR-10, FR-14, FR-25, FR-35, FR-45, FR-51, NFR-1)
- **AC-2** Unit tests prove the NFR-2 sums for every division, and that Dhaka's `locations` are 11 / 44 / 13 / 1 / 42 on the 25 Oct 2026 data. (FR-1, FR-4, NFR-2)
- **AC-3** On `/division/dhaka/`, the page shows:
  - the generated intro (no prose beyond counts);
  - the condition legend in text;
  - five location tiles;
  - 13 district links sorted by count;
  - at most 4 trip cards with "All N trip plans" → `/trips/?div=dhaka`;
  - "Filter in Explore";
  - a no-pin list of 5, with "See all 42" expanding to 42.

  (FR-2–FR-8, FR-11–FR-13)
- **AC-4** On `/district/manikganj/`, 4 numbered cards appear in travel-time order. The district SVG has pins numbered to match. "Open to visitors" shows only cards whose access is ticketed or open. With JavaScript off, all 4 show and no chips do. (FR-15–FR-18)
- **AC-5** A district with `onMap = 0` (a fixture, if none in the data) shows the one-line note and no SVG. An area with no trips has no trips row. (FR-5, FR-7)
- **AC-6** Unit tests cover the `/sources/` URL keys (round trip, defaults left out, invalid values dropped), the three sorts, the `q` match on title, publisher and ID, paging, and a test that fails on a `type` value missing from the chip table. (FR-21, FR-22)
- **AC-7** Playwright on `/sources/`:
  - choosing "Encyclopedias" and typing a query updates the URL and the "1–25 of N" line;
  - page 2 is a link;
  - Back restores the previous state;
  - a no-match query shows the empty state and "Clear filters";
  - with JavaScript off, 25 rows show.

  (FR-19, FR-20, FR-23, FR-24)
- **AC-8** `/sources/SRC-0001/` shows the author, edition, ISBN, "Checked" with `verificationMethod` as written, "Cited by 335 sites", 8 division bars summing to 335, 3 example sites, and `#sites` listing 335 links. A project working file's page shows the label and no outbound link. (FR-26–FR-32)
- **AC-9** On a site page, each SRC ID links to its source page, and the breadcrumb's division and district link to their area pages. On a trip page, the breadcrumb links to the area pages, and Search's district results link to district pages. (FR-33, FR-34, FR-62, FR-63)
- **AC-10** About:
  - each FR-35 anchor exists;
  - every number on the page equals its `meta.json` count;
  - the page shows 201 disagreements and 781 open questions, and the text "982" does not appear;
  - `#licences` names CC BY-SA 4.0, the WebP change statement, OSM, the boundary licences and the fonts;
  - no sentence promises a data download;
  - Contribute links the corrections and photo-offer forms, with no email address;
  - a test fails if the "no tracking" sentence is present while any analytics script is loaded.

  (FR-35, FR-38–FR-44, NFR-6)
- **AC-11** A unit test fails on an unknown token, and a release-mode test fails while `reviewed: false`. (FR-36, FR-37)
- **AC-12** `/credits/`:
  - shows 938 rows in 127 groups;
  - every credit text equals its `required_credit`;
  - the owner's 2 photos have no "File page";
  - each group shows 8 rows, then "Show N more";
  - `?site=JB-DHK-064` shows one group with "Show all sites";
  - `?site=JB-XXX-999` shows the dropped-filter notice.

  (FR-45–FR-50, NFR-7)
- **AC-13** An unknown URL on the e2e server returns status 404 and the 404 page. Its search box submits to `/search/?q=…`, and "Report a broken link" carries `page_url`. (FR-51, FR-52)
- **AC-14** Search unit and e2e tests: `jb-dhk-064` returns Baliati first, marked "matched by site ID"; `JB-DHK-999` gives "no results" with no "Did you mean". (FR-53)
- **AC-15** Explore and Search show the `row` skeleton while loading. The map area shows the `map` skeleton text while Leaflet loads. Under reduced motion, no animation runs. A component test renders the `card` variant. (FR-54–FR-57)
- **AC-16** Playwright with `context.setOffline(true)`:
  - the toast appears with the O8 copy;
  - "Try again" while still offline keeps it, with "Still offline";
  - going online hides it;
  - "Dismiss" hides it until the next offline event.

  (FR-58–FR-60)
- **AC-17** With `saveData` emulated, a trip page with a map and a mappable site page show "We switched to Lite mode" and load no Leaflet request. (FR-61)
- **AC-18** axe finds no violations on every page listed in NFR-4. A keyboard-only run uses a district chip, a sources chip and paging, "See all", "Show N more" and the toast buttons. (NFR-4, UJ-10)
- **AC-19** No new page requests Leaflet or Fuse.js. The `/sources/` and `/credits/` HTML stays under the recorded budgets. (NFR-3)
- **AC-20** A test asserts that no hidden-pin site's coordinates appear in any area page, area SVG or new JSON field. (NFR-5)
- **AC-21** In Bangla mode, the new pages' labels and digits are Bangla, area names show their Bangla form, and the About prose carries `lang="en"` with the O6 note. (FR-9, FR-64)
- **AC-22** `docs/URLS.md` and `docs/DATA_CONTRACT.md` are updated in the same commit as the code, and `tests/urls.test.ts` passes with the new routes set to built. (§6)

## 9. Dependencies, constraints, and assumptions
### Dependencies
- Phase 5: `SiteCard`, badges, `SuggestCorrection`, the URL-notice pattern.
- Phase 6 and 7: Explore URL state (`lib/urlState.ts` `exploreHref`), `MapLoader`, `LiteNotices`.
- Phase 8: `SearchBox`, `lib/search.ts`, `lib/fold.ts`.
- Phase 9: `ItineraryCard`, `/trips/?div=`.
- 3.8: the area SVGs in `public/maps/` and `components/art/EmptyStates.tsx` (`NotFoundArt`, `OfflineIcon`).

### Constraints
- Static export, no server (R1): `next.config.mjs` `output: 'export'`, `trailingSlash: true`; dynamic routes use `generateStaticParams` and `dynamicParams = false`.
- Data modes: editorial problems fail only release builds (`scripts/data-mode.mjs` `editorialIsFatal`). The per-cell detector already covers `sources.json`, `credits.json` and the area files (`scripts/build-data.mjs`), so internal wording in source notes blocks a release until Phase 12 rewrites it.
- Only named public fields reach the output (I7). `images.notes`, `images.license_evidence` and `sources.local_path` never appear.
- CARTO tiles stay off until O4 provides a key (`lib/map-config.ts`). The licences block lists only the providers in `BASE_MAPS`.
- Boundary licences: `data/geo/SOURCE.md` (district boundaries are CC BY 3.0 IGO and need a credit).
- The Tailwind config has no `sm` breakpoint (md, lg, xl, 2xl only).
- Dual-language rendering through `components/T.tsx` (`T`, `Both`, `Latin`).
- Playwright runs Chromium only (`playwright.config.ts`).
- Reuse:
  - `components/cards/SiteCard.tsx`, `components/trips/ItineraryCard.tsx`;
  - `components/search/SearchBox.tsx`, `components/explore/LiteNotices.tsx`, `components/map/MapLoader.tsx`;
  - `components/site/Header.tsx` (`Breadcrumb`), `components/site/Sources.tsx`, `components/site/SuggestCorrection.tsx`;
  - `lib/nav.ts` (`divisionHref`, `CORRECTIONS_URL`), `lib/urlState.ts`, `lib/fold.ts`, `lib/format.ts`.

### Assumptions
None outstanding. A-1 (25 rows per page on `/sources/`) was accepted by the owner on 2026-10-25 and is recorded as D17.

## 10. Key decisions and rationale
Confirmed by the owner in the interview on 2026-10-25.
- **D1 Area intros come from counts only.** Always true, and no editor work. Owner-written blurbs can come later.
- **D2 Location labels follow the boards and `lc`:** confirmed, one source, approximate, unverified (flagged) and no pin. The board numbers already match the data.
- **D3 The trips row uses `ItineraryCard` by rule** (timed first, then travel time), up to 4, with "All N trip plans". It is omitted when empty. The board's site-card row is not built.
- **D4 District pages list every site; division pages link to Explore**, as on the boards. Cards are numbered to match the district map's pins.
- **D5 District chips live in the browser only**, not in the URL. Explore already offers shareable filtered views.
- **D6 Project working files are listed as their own group**, labelled as unpublished project files, with no outbound link.
- **D7 Source page examples:** 3 sites by record confidence, then name, plus `#sites` as the full list grouped by division (former A-3).
- **D8 No public-data promise yet (O1).** `#licences` states CC BY-SA 4.0 for text and data (O5, confirmed). The download line arrives with 14.6.
- **D9 Disagreements follow the data contract.** 201 disagreements and 781 open questions are shown separately, because the board's 982 counts single-version open questions as disagreements (spec 05 FR-34, FR-35).
- **D10 Claude drafts `content/about.en.md`; the owner reviews it.** `reviewed: false` fails release builds.
- **D11 Photo changes are noted once:** "Photos are shown resized and converted to WebP; the original is on each file page", on `/credits/` and `#licences`. Credit lines stay exact. The intro makes no "all from Wikimedia Commons" claim, because 2 photos are the owner's own.
- **D12 OfflineNotice is on every page, from the layout. Lite notes are on every page that loads a map** (Explore, trip pages, site pages).
- **D13 About's privacy claims are checked against the code** (no analytics today). The licences block lists only what ships (former A-5, A-8).
- **D14 Search matches site IDs**, so the 404 copy's promise is true (owner's choice over rewording the copy).
- **D15 No `/divisions/` route;** "Divisions" in breadcrumbs is text (former A-2).
- **D16 Shared `Skeleton` with `row`, `card` and `map` variants**, replacing `ListSkeleton`. The trips listing needs none, because its first 12 cards are static (former A-7). The 404 search box and "Report a broken link" behave as in FR-51 (former A-6). Credits grouping and filtering follow FR-45–FR-49 (former A-4).
- **D17 `/sources/` shows 25 rows per page** (the board's 9 is a mock-up value; former A-1).

### Amendments during implementation (2026-10-25)
- **FR-51:** the 404 search box is a plain form that submits `q` to `/search/`, not `components/search/SearchBox.tsx`. It works with JavaScript off and loads no search index on the 404 page; Search itself finds the ID (FR-53).
- **FR-22:** pressing the active type chip turns it off (back to all types), like "All".
- **FR-45, NFR-3:** `/credits/` writes each group's rows as one escaped HTML string, with short `.credit-row` classes in `app/tokens.css`, because the RSC payload repeated every row's element tree. On 25 Oct 2026 the page is 126 KB gzipped (2.1 MB raw) and `/sources/` 55 KB gzipped; the test warns above 150 KB and 70 KB.
- **FR-43:** library names (Leaflet, Leaflet.markercluster) are data in `lib/licences.ts`, not interface strings: the strings ship in a client chunk, and the trips listing's test fails any script that mentions the map library.
- **FR-36:** a missing `content/about.en.md` is a structural error in every mode, like an unknown token.
- **FR-44:** the draft keeps "has no accounts and keeps no tracking" (no analytics script ships; a unit test fails if one is added) and leaves out "costs nothing to run" until the owner confirms it (OQ-1).

## 11. Open questions
- **OQ-1** The owner's visual review against the 10 boards (Division, District, Sources list, Source page, About, Image credits, 404 desktop, 404 mobile dark, Loading skeletons, Offline slow network), and the review of `content/about.en.md`, including "costs nothing to run" and the "Not done yet" list.
- **OQ-2** O4 (the tile provider). When it is decided, the licences block gains that provider's credit with no code change, because it reads `BASE_MAPS`.
- **OQ-3** Should the corrections issue template gain a "broken link" field? Until then, "Report a broken link" sends `page_url` only.
