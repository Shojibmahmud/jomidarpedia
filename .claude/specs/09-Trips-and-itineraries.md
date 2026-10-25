# Trips and itineraries

**Status:** Approved (by the owner, 2026-10-25); amended during implementation on 2026-10-25 (FR-35, FR-47, FR-50, AC-16: see §10)
**Roadmap reference:** `roadmap/DEVELOPMENT_ROADMAP.md` §3 Phase 9 (tasks 9.1–9.12); also R1, R5, R9, I5, O11, Phase 11 (11.5 featured trips reuse the card); `roadmap/DESIGN_COVERAGE.md` rows 6, 7, 23, 24, 25 and the print boards (41, 42); `docs/URLS.md` (`/trips/`, `/trips/<id>/`, Explore `ids`); `docs/DATA_CONTRACT.md` (Trip card, Itinerary); `.claude/specs/05-Site-page.md` (FR-44, D4); `.claude/specs/07-Map.md` (D3)
**Source task:** "Phase 9: Trips and itineraries. Objective: the trips listing and the itinerary pages, honest about which plans are timed and which costs are known."
**Branch:** `10-phase-9-trips`
**Date:** 2026-10-25

## 1. Problem and intended outcome
`/trips/` and `/trips/<id>/` are planned routes that 404 today. The header's "Day trips" link (`lib/nav.ts`) leads nowhere, and the site page lists each site's itineraries as plain text with no link (spec 05 FR-44, D4).

The build already writes the data: `data/build/trips.json` (385 summaries) and `data/build/trips/<id>.json` (385 itineraries). That data is much thinner than the boards, which show timed badges, drawn legs, pins for places, a closing-day check, Bangla titles and a one-line summary. On 25 Oct 2026:

| Board shows | Data has |
|---|---|
| "Timed plan" / "Suggested circuit" badges, "Has a timed plan" filter | `planStatus` absent on all 385 (the editor has not reviewed `plan_status`; the build suggests 37 timed, 266 circuit, 82 incomplete, O11) |
| Coloured legs with a legend | `legs: []` and `schematic: true` on all 385 (`itinerary_legs.csv` is empty) |
| Pins for lunch stops, terminals, ghats | 200 place stops, none with coordinates (`itinerary_places.csv` is empty); 711 of 910 site stops have `latlon` |
| "Which day are you going?" with closed days | `closedDays.known = false` on all 413 sites |
| Bangla title and a summary sentence | no `titleBn`, no summary field |
| Photo strip on every card | `thumb` (anchor's first photo) on 122 of 385 |
| Budget with a known subtotal | `budget.known` on 357 of 385; every row with an amount is `per_person` |

**Outcome:** a listing and 385 itinerary pages that show only what the data supports, and that fill in by themselves, with no code change, as the editor adds `plan_status`, `closed_days`, legs and place coordinates. Timed, circuit and incomplete plans look different once they are reviewed; budgets never claim an unsupported total; printouts are light, credited and never clipped.

## 2. Scope
### In scope
- Tasks 9.1–9.12: `ItineraryCard`, `TripsFilters`, the `/trips/[id]` shell, `ItineraryStops`, `RouteMap`, `BudgetTable`, `DayCheck`, "Open all stops on the map", `ShareButton` reuse, `PrintButton` and the print layout, the print token fix, the overflow policy.
- Routes `app/trips/page.tsx` and `app/trips/[id]/page.tsx`.
- Site cards on the trip page, built from the site JSON (D5).
- **Explore `ids`** (9.8): parsing, filtering, the chip and the notice.
- **Site page:** itinerary entries become links, and the stop-by-stop timed preview is built, shown only for timed trips (D7).
- **Build addition:** a per-card stop-photo strip in `trips.json` (D4, §6).
- Interface strings in `lib/i18n.ts`; Bangla drafts `needsReview`.
- **Contract changes, in the same commit as the code:** `docs/URLS.md` (`/trips/` and `/trips/<id>/` → built; `ids` → built); `docs/DATA_CONTRACT.md` (Trip card `photos`; site page itinerary links); a note on spec 05 FR-44 that the links now exist.
- `npm run screenshots` gains `/trips/` and two trip pages.

### Out of scope
- Filling `plan_status`, `closed_days`, `itinerary_legs.csv` or `itinerary_places.csv`. That is editor data work (Phase 12, O11).
- Bangla trip data (titles, notes, budget items).
- Division and district pages (10.1, 10.2): breadcrumbs lead to Explore until then (D12).
- Home featured trips (11.5) and the trips `Skeleton` (10.11).
- A QR code on the printout (D8).
- Firefox and WebKit Playwright projects (D9).
- Any change to `index.json`.

## 3. User journeys / use cases
- **UJ-1 Listing.** Opens "Day trips" from the header: `/trips/` shows 385 plans, sorted by travel time. Chooses "One day" and Dhaka division: the URL becomes `/trips/?len=one-day&div=dhaka`, the count line updates, and "Load 12 more" shows the next 12.
- **UJ-2 Photo credits.** On a card, presses the camera button: a popover lists each photo's exact credit line. Esc or a click outside closes it, and focus returns to the button.
- **UJ-3 Itinerary page.** Opens "See the plan": the breadcrumb, the badges ("One day", "8 stops"), the title, the stops in order with place stops labelled, the map with numbered pins and "Schematic: order of stops, roads not drawn", a card for each site, the rough budget ("Known so far Tk 90 per person", then what it leaves out), notes and add-ons, and "Suggest a correction".
- **UJ-4 Lite.** With Lite mode on, the page shows the stop list and no map.
- **UJ-5 All stops on the map.** Presses "Open all stops on the map": Explore opens on the map showing only that trip's sites, with an "8 trip stops" chip that removes the restriction.
- **UJ-6 Print.** In dark mode, presses "Print or save as PDF": the preview is light, controls are hidden, photos carry credits, and the licence line and source links are printed. A 9-stop trip runs onto a third page with the title repeated; nothing is cut off.
- **UJ-7 From a site page.** On Agla Zamindar Bari, the "Itineraries" section links to `/trips/IT-DHK-001-1/`.
- **UJ-8 Bangla.** With Bangla on, labels, badges and digits are Bangla; the trip title, stop notes and budget items stay English; site names show in Bangla where the site has one.
- **UJ-9 Keyboard.** Every filter, the camera popover, Share, Print and the map controls work from the keyboard, with visible focus.

## 4. Functional requirements

### Listing `/trips/` (9.1, 9.2)
- **FR-1** `/trips/` lists all trips from `trips.json`. Its heading copy describes what the plans are without claiming that every plan is timed or starts in Dhaka; "385" and other counts come from the data.
- **FR-2** The build renders the first 12 cards in the default order (travel time, unknown last) as static HTML. With JavaScript off, those 12 cards and their links work (D10).
- **FR-3** A client component reads the URL keys from `docs/URLS.md` (`len`, `tt`, `div`, `plan`, `sort`), filters and sorts the list, and shows 12 more cards on each press of "Load 12 more", which shows the shown and total counts. Filter changes reset to the first 12 (D10).
- **FR-4** `len` is multi-select, with a count per value: One day, Overnight / multi-day, Not stated (the duration "Not stated" is a real choice, not hidden).
- **FR-5** `tt` selects one travel-time band of the anchor site (`0-1`, `1-2`, `2-3`, `3-4`, `4+`, `unknown`), as in Explore (D11).
- **FR-6** `div` is multi-select over the anchor's division.
- **FR-7** "Has a timed plan" (`plan=timed`) appears only when at least one trip has `planStatus = timed`. If the URL carries `plan=timed` while no trip is timed, the list is empty and a notice explains that no plans have been checked for times yet (D1).
- **FR-8** `sort` is `time` (default; the anchor's travel hours, unknown last, then name) or `name` (title, in the interface language's collation).
- **FR-9** The URL stays canonical: an unknown key value is dropped and a notice says so, using Explore's pattern. Back and Forward restore the filter state.
- **FR-10** The count line reads "Showing N of M plans", followed by the active filters in words.
- **FR-11** No matches: an empty state with a "Clear filters" action.

### ItineraryCard (9.1)
- **FR-12** A card shows: the duration badge (including "Not stated"); the plan-status badge only when `planStatus` is set ("Timed plan", "Suggested circuit", "Incomplete plan"), with no badge otherwise (D1); "N stops"; the title; the anchor site's name (Bangla where one exists); a footer line; and "See the plan" linking to `/trips/<id>/`.
- **FR-13** The photo area is a strip of up to 4 stop photos from `photos` (§6), in stop order. Each photo carries a numbered marker with its stop number. No photos: the placeholder art.
- **FR-14** When photos are shown, a camera button opens a popover that lists each photo's exact credit line, unchanged. It closes on Esc, on an outside click and on a second press. Focus returns to the button.
- **FR-15** The footer shows the anchor's travel time from Dhaka ("About N h from Dhaka") or "Travel time not known". No card text names a starting point or a clock time (D15).
- **FR-16** Home (11.5) and division pages (10.1) can reuse the card unchanged with a `TripSummary`.

### Trip page shell (9.3)
- **FR-17** `/trips/<id>/` is generated for every trip (`generateStaticParams`, `dynamicParams = false`); an unknown ID is a 404.
- **FR-18** The breadcrumb is "Day trips / <Division> / <District>". Division links to `/explore/?div=<slug>`, district to `/explore/?dist=<slug>` (with `div`) until 10.1 and 10.2 exist (D12).
- **FR-19** The header shows: the duration badge; the status badge only when set; "N stops"; and, only when `planStatus = timed`, the first and last stop times ("07:30–17:00"). Then the title, a link to the anchor site, Share and "Print or save as PDF".
- **FR-20** The page has no summary sentence (there is no field for one). `notes[]` appear in a "Notes and add-ons" section; with none, the section is omitted (D14).
- **FR-21** Sections use the board's section icons: the day stop by stop, the sites, rough budget, notes.
- **FR-22** The page ends with "From the research profile", the `costsEstimated` range when present ("Costs estimated 13 Oct 2026" or "13–15 Oct 2026"), and `SuggestCorrection` prefilled with the page URL and the anchor's `site_id` (OQ-2).

### ItineraryStops (9.4)
- **FR-23** Stops are listed in `order`, numbered.
- **FR-24** Clock times are shown only when `planStatus = timed`. For a circuit, an incomplete plan or a plan not yet reviewed, only the order is shown, even when the data has times (D1).
- **FR-25** A site stop links to its site page and shows the site's name (Bangla where the site has one). A place stop is labelled "Place" and has no link.
- **FR-26** A stop's `note` is shown under its name; an empty note is omitted.

### RouteMap (9.5)
- **FR-27** The map is loaded through `MapLoader`, only on the trip page and only when it is shown.
- **FR-28** It shows a numbered marker for every stop with `latlon`, using the stop number. Stops without `latlon` are named under the map ("Not on the map: 1 Leave Gulistan, 4 …").
- **FR-29** Lines are drawn only from `legs[]`. When `schematic` is true, no line is drawn and the label "Schematic: order of stops, roads not drawn" is shown; the leg legend is shown only when legs exist.
- **FR-30** With fewer than 2 stops that have `latlon`, no map is shown; the stop list stands alone (D3).
- **FR-31** In Lite mode, no map loads; the stop list stands alone, with Lite's existing notice.
- **FR-32** If tiles fail to load, the map area shows the stop list in its place.

### Site cards (D5)
- **FR-33** For each distinct site stop, in stop order, a card shows: the stop number and site name; the first Ready photo with its exact credit, or the placeholder; the condition badge; the entry fee, or "No ticket reported", or "Entry not documented"; the closing days when `closedDays.known`, otherwise nothing about closing days; and a link to the site page. The data is read from `data/build/sites/<id>.json` at build time.

### BudgetTable (9.6)
- **FR-34** Each row shows the item, the amount (with "~" when `status` is `estimate`), the unit ("per person", "per vehicle", "per group"), the basis when present ("shared", "reserved"), and the note in a disclosure.
- **FR-35** A `noTicket` row reads "No ticket reported". A row with neither an amount nor `noTicket` reads "Not estimated yet".
- **FR-36** When `budget.known` exists, a final line reads "Known so far: Tk <known> per person", followed by the items in `budget.omitted` by name. When it is absent: "No costs known yet". The word "Total" never appears (D16).
- **FR-37** Under the table: "Estimates, checked <costsEstimated>", and "Know a current fare? Tell us" linking to the corrections form.
- **FR-38** The budget never adds a return fare or a fare between stops that has no row (DATA_CONTRACT: no return fare unless a row exists).

### DayCheck (9.7)
- **FR-39** DayCheck reads only `closedDays` of the site stops. It never parses the unreviewed `closed` text.
- **FR-40** When at least one site stop has `closedDays.known`, it shows a 7-day picker (Sat–Fri). Choosing a day lists the stops closed that day, and names the stops whose closing days are unknown as "Closing days not documented: …".
- **FR-41** When no site stop has known closing days, there is no picker: one line reads "Closing days not documented for these sites; check before you go." (D2). A trip with no site stops shows nothing.

### Open all stops on the map (9.8)
- **FR-42** When a trip has at least one site ID, the page shows "Open all stops on the map", linking to `/explore/?ids=<site IDs, comma-separated, in stop order>&view=map`, plus `&sel=<first stop site with a pin>` when one exists (D13).
- **FR-43** In Explore, `ids` limits the results to those sites, ANDed with any other filters. A chip "N trip stops" removes it. Unknown IDs are dropped with the existing notice. A hidden-pin site is listed but not mapped (R5).
- **FR-44** `docs/URLS.md`: `ids` → built, with its meaning and dropping rules.

### Share (9.9)
- **FR-45** Share reuses `ShareButton` (`components/site/CopyButton.tsx`) with the trip URL and title.

### Print (9.10–9.12)
- **FR-46** "Print or save as PDF" calls the browser's print (R9); no PDF library.
- **FR-47** The print layout follows the two print boards:
  - **Page 1:** the brand line with "Day trip plan"; the title and its meta (duration, status when set, stop count, first and last time only when timed, a blank "Date:" line); the map when it rendered, or the stop list otherwise; a stop table (time column only when timed, number, stop, note, a checkbox column).
  - **Page 2:** "Check before you go" with only known facts (closing days and hours when known, entry fees, and the trip's own notes; nothing is added that the data lacks); the site cards with photos and exact credits; the budget table; the notes; a Notes box; the full page URL in text (D8); the licence line; and the source links.
  - Footer on each page: "Checked <date>. Hours, fees and fares change: confirm on the day."
- **FR-48** Controls are hidden in print: header, nav, footer, filters, Share, Print, map controls, the camera button.
- **FR-49** `app/tokens.css`: under `@media print`, **every** colour token is overridden with a selector that outranks both `[data-theme="dark"]` and `:root:not([data-theme="light"])` (for example `@media print { :root:root, [data-theme] { … } }`), so print is light whichever way dark mode was set (9.11).
- **FR-50** Overflow (9.12): the layout aims for two A4 pages. Longer trips flow onto more pages, the trip title repeats at the top of each page, and table rows and cards are not split across pages where avoidable. No content is clipped or hidden by overflow.

### Site page (D7)
- **FR-51** In the site page's "Itineraries" section, each entry links to `/trips/<id>/`. The spec 05 FR-44 "no link" rule is replaced.
- **FR-52** The stop-by-stop preview with clock times (Baliati board) is built, and renders only for itineraries with `planStatus = timed`; for others the entry is the link with its duration.

### Language (D6)
- **FR-53** All interface strings are in `lib/i18n.ts`, with Bangla drafts `needsReview`. Digits, badges and labels follow the interface language.
- **FR-54** Trip titles, stop names of places, notes and budget text are English data and are wrapped in `Latin`. A site's name uses its Bangla name in Bangla mode where it has one.

## 5. Non-functional requirements
- **NFR-1 Static output.** The build emits `/trips/` and 385 trip pages (R1). Every trip in `trips.json` has a page; every link to `/trips/<id>/` resolves.
- **NFR-2 Payload.** `/trips/` loads no Leaflet code. A trip page loads Leaflet only when its map is shown. The listing's HTML with photo data stays small: a budget is measured during implementation and recorded in DATA_CONTRACT.md, with a test that warns above it.
- **NFR-3 Accessibility.** axe passes on `/trips/`, a trip page, the open camera popover and the site page. The status and duration are text, not colour alone. Filters and the popover are operable by keyboard with visible focus; the popover has an accessible name.
- **NFR-4 Privacy (R5).** No hidden-pin coordinates appear on any trip page, in `trips.json`, in the trip JSON or in an `ids` link.
- **NFR-5 Print.** Readable on A4, light in all theme settings, every printed photo credited, the licence line and source links present.
- **NFR-6 Honesty.** No copy states a fact the data lacks: no "timed" without a reviewed status, no total, no closing day not in `closedDays`, no starting point not in the stops.

## 6. Data, interfaces, and integrations
- **`trips.json` (`TripSummary`)** gains `photos?: { n: number; thumb: string; credit: string }[]`: up to 4 site stops in stop order that have a Ready image, where `n` is the stop number, `thumb` the `/thumbs/<id>.webp` path and `credit` the exact credit line. Absent when none. `thumb` stays as now. Written by `scripts/build-data.mjs`; documented in `docs/DATA_CONTRACT.md` (Trip card).
- **Trip page** reads `data/build/trips/<id>.json` (`Itinerary`) and, for site cards and DayCheck, `data/build/sites/<siteId>.json` at build time.
- **`lib/trips.ts`** (pure, unit-tested): URL parsing and serialising for `/trips/`, filtering, sorting, counts, and the budget display (row amounts, the known line, the omitted list).
- **Explore:** `ids` in `lib/urlState.ts` and the Explore filter pipeline.
- **No CSV or `index.json` change.**
- `docs/URLS.md`: `/trips/`, `/trips/<id>/` and `ids` → built.

## 7. Edge cases and failure behavior
- **1-stop trips (82):** no map (FR-30); one row; print fits one page.
- **9-stop trips (2):** print flows past two pages with headers repeated (FR-50).
- **All stops are places:** no site cards, no DayCheck, no "Open all stops on the map", no map.
- **Anchor or stop with a hidden pin:** listed, linked, never mapped (FR-43, NFR-4).
- **No `budget.known` (28 trips):** "No costs known yet" with the named omissions (FR-36).
- **No photos:** placeholder; no camera button (FR-13, FR-14).
- **No notes:** section omitted (FR-20).
- **`plan=timed` with none timed:** empty list and notice (FR-7).
- **Unknown or invalid URL values, unknown `ids`:** dropped with a notice (FR-9, FR-43).
- **Tiles fail (screen or print):** the stop list takes the map's place (FR-32, FR-47).
- **JavaScript off:** first 12 cards on `/trips/`; trip pages fully readable, without the map (FR-2).
- **Dark mode print,** by OS preference or by the toggle: light (FR-49).
- **A site appears twice in one trip:** one site card (FR-33); both stops listed.

## 8. Acceptance criteria
- **AC-1** Given the built site, `/trips/` and 385 trip pages exist, and every link to `/trips/<id>/` from the listing and site pages resolves. (FR-1, FR-17, FR-51, NFR-1)
- **AC-2** Given JavaScript off, `/trips/` shows 12 cards in travel-time order with working links. (FR-2)
- **AC-3** Given `/trips/?len=one-day&div=dhaka`, only one-day trips in Dhaka division are listed, the count line matches, and "Load 12 more" adds 12. (FR-3–FR-6, FR-10)
- **AC-4** Given the current data (no reviewed status), no card or page shows "Timed plan", "Suggested circuit" or a time, and "Has a timed plan" is not shown; `/trips/?plan=timed` shows the empty list and the notice. (FR-7, FR-12, FR-19, FR-24, NFR-6)
- **AC-5** Given a test fixture where one trip has `planStatus = timed`, its badge, its stop times and the "Has a timed plan" filter appear, and a `circuit` fixture shows "Suggested circuit" and no times. (FR-7, FR-12, FR-19, FR-24, FR-52)
- **AC-6** Unit tests of `lib/trips.ts` cover each filter, both sorts (unknown last), URL round-trips and the dropping of invalid values. (FR-3–FR-9)
- **AC-7** The camera popover lists the exact credits, closes on Esc and on an outside click, and returns focus. (FR-14)
- **AC-8** Card footers never contain a clock time or a starting place. (FR-15)
- **AC-9** The breadcrumb's division and district link to Explore with `div` and `dist`. (FR-18)
- **AC-10** On a trip page, place stops are labelled "Place" and unlinked; site stops link to their site pages. (FR-25, FR-26)
- **AC-11** On a schematic trip with 2+ pinned stops, the map shows numbered markers for pinned stops only, no lines, the schematic label, and names the stops not on the map; on a trip with fewer than 2 pinned stops, no map element exists. In Lite mode, no Leaflet request is made. (FR-27–FR-31)
- **AC-12** Budget unit tests: "~" on estimates, "No ticket reported", "Not estimated yet", the known line with omissions, "No costs known yet", and no "Total" in any output. (FR-34–FR-38, NFR-6)
- **AC-13** DayCheck: with current data, the one-line note shows and no picker; with a fixture site whose `closedDays` is known, the picker lists it as closed on its day and names the unknown stops. (FR-39–FR-41)
- **AC-14** "Open all stops on the map" links to `/explore/?ids=…&view=map` with `sel` only when a stop has a pin; Explore then lists exactly those sites, the chip removes it, and an unknown ID shows the notice. (FR-42, FR-43)
- **AC-15** Site cards show credits for every photo and only known facts. (FR-33)
- **AC-16** Playwright prints the 1-stop and a 9-stop trip to PDF in Chromium, in light mode and in dark mode set both by `prefers-color-scheme` and by `data-theme="dark"`: the page background is light, no control appears, the last stop, a photo credit, the licence line and the page URL are in the PDF text, and the 9-stop trip has more than two pages. Firefox and Safari print previews are checked by the owner. (FR-46–FR-50, NFR-5)
- **AC-17** axe finds no violations on `/trips/`, a trip page, the open popover and a site page with itinerary links; a keyboard-only Playwright run applies a filter, opens and closes the popover and presses Share. (NFR-3, UJ-9)
- **AC-18** A test asserts that no hidden-pin site's coordinates appear in any built trip page, `trips.json` or trip JSON. (NFR-4)
- **AC-19** `/trips/` loads no Leaflet script; the listing HTML size is under the recorded budget. (NFR-2)
- **AC-20** In Bangla mode, interface strings and digits are Bangla and trip data stays in Latin script, apart from site names with a Bangla name. (FR-53, FR-54)
- **AC-21** Page-shell checks in Playwright: a filter combination with no matches shows the empty state and "Clear filters" restores the list; a trip with notes shows "Notes and add-ons" and one without omits it; the footer shows the `costsEstimated` range and a corrections link carrying the anchor `site_id`; Share falls back to copying the link; with tile requests blocked, the map area shows the stop list; the card renders unchanged from a bare `TripSummary` in a component test. (FR-11, FR-16, FR-20–FR-22, FR-32, FR-45)
- **AC-22** `docs/URLS.md` and `docs/DATA_CONTRACT.md` are updated in the same commit as the code. (FR-44, §6)

## 9. Dependencies, constraints, and assumptions
### Dependencies
- Phase 5 (site page components: `ShareButton`, `SuggestCorrection`, badges, `Gallery` credits).
- Phase 7 (`MapLoader`, map styles, the Lite preference) for `RouteMap`.

### Constraints
- Static export, no server (R1): `next.config.mjs` `output: 'export'`.
- Hidden pins (R5): the build already omits `latlon` for hidden sites in trip JSON.
- Only the editor's `plan_status` is published (O11; `scripts/build-data.mjs` writes `planStatus` only from the reviewed column).
- DayCheck reads only `closedDays` (`lib/types.ts`, `ClosedDays`).
- Budget rules from `docs/DATA_CONTRACT.md` (Itinerary): `amount` only when > 0, `noTicket`, `known` per-person only, `omitted`, no return fare without a row.
- Dual-language rendering through `components/T.tsx` (`T`, `Both`, `Latin`); both languages are in the HTML.
- Print CSS lives in `app/tokens.css` (`@media print` block, currently overriding only four tokens).
- Playwright runs Chromium only (`playwright.config.ts`).
- Reuse: `components/site/CopyButton.tsx` (`ShareButton`), `components/site/SuggestCorrection.tsx`, `components/site/Related.tsx` (`Itineraries`), `components/map/MapLoader.tsx`, `lib/prefs.ts` (Lite), `lib/urlState.ts`, `components/explore/ResultsList.tsx` (paging pattern), `components/art/*` (placeholders).

### Assumptions
None outstanding. The seven defaults proposed in the interview (A-1 to A-7) were accepted by the owner on 2026-10-25 and are recorded as decisions D10–D16.

## 10. Key decisions and rationale
- **D1 Plan status follows the contract.** No status badge, no clock times and no "Has a timed plan" filter until the editor sets `plan_status`. Showing the build's suggestion would publish an unreviewed claim (O11). The pages light up without code change once the column is filled.
- **D2 DayCheck shows a picker only when some stop has known closing days.** All 413 sites are unknown today; a picker that says "not documented" seven times tells the visitor nothing.
- **D3 RouteMap draws pins, not roads.** Numbered markers for pinned stops, the schematic label, unpinned stops listed, no map with fewer than 2 pins. Straight lines would look like routes the data doesn't have.
- **D4 Cards show a strip of stop photos** (up to 4), with a small build addition to `trips.json`, so more than the 122 anchor-photo trips get pictures.
- **D5 Site cards from the site JSON**, at build time, showing only known facts.
- **D6 Interface in both languages, trip data in English**, with Bangla site names where they exist; the same approach as the site page.
- **D7 Site page: links now; timed preview built but shown only for timed trips.**
- **D8 No QR code;** the page URL is printed as text. No new dependency.
- **D9 Print verified by Chromium PDF tests** plus the owner's manual check in Firefox and Safari; no extra Playwright browsers.
- **D10 (A-1)** The listing renders the first 12 cards statically; a client component handles filters, sort and "Load 12 more" from the URL.
- **D11 (A-2)** `tt` stays one travel-time band, as in `docs/URLS.md` and Explore, rather than the board's "Within 2 h".
- **D12 (A-3)** Breadcrumb division and district links go to Explore (`div`, `dist`) until Phase 10, as Search does. *(Phase 10: they now go to `/division/<slug>/` and `/district/<slug>/`, spec 10 FR-62.)*
- **D13 (A-4)** "Open all stops on the map" uses `ids` (stop order), `view=map`, and `sel` = the first stop with a pin; hidden-pin sites are listed but not mapped.
- **D14 (A-5)** No summary sentence on the trip page; `notes[]` appear as "Notes and add-ons".
- **D15 (A-6)** Card footers show the anchor's travel time from Dhaka or "Travel time not known", never a start place or clock time.
- **D16 (A-7)** The budget shows "Known so far" only when `known` exists, names the omissions, gives each row's unit and date and the `costsEstimated` range, and never says "Total".

### Amendments during implementation (2026-10-25)
- **FR-35:** a row whose status is `not_applicable` (2 rows) reads "Not applicable", not "Not estimated yet".
- **FR-47, FR-50:** the type scale is in px, so the plan is scaled to fit A4 with `zoom` on the page in print. "Check before you go" starts a new page only when the plan has a map; otherwise it flows on, so a short plan fits one page. The running title and page numbers use page margin boxes, which Chromium prints; other browsers print without them.
- **AC-16:** a Chromium PDF's text is in subset fonts and can't be searched without a PDF library, so the check runs on the page in print media instead (background light, controls hidden, last stop, credits, licence line and URL visible, nothing clipped), plus a PDF page count: at most 2 pages for the shortest plan and at least 2 for the longest.

## 11. Open questions
- **OQ-1** The owner's visual review against the 7 boards (`Day trips · listing` desktop and mobile, the two itinerary desktops, `Itinerary · mobile (dark)`, and the two print pages).
- **OQ-2** Should the corrections issue template gain an `itinerary_id` field? Until then, `SuggestCorrection` on a trip page sends the anchor's `site_id` and the page URL.
- **OQ-3** When the editor will review `plan_status` and `closed_days` (outside this spec; Phase 12). Until then, AC-5 and AC-13 rely on test fixtures.
