# Explore list and filters

**Status:** Approved (by the owner, 2026-10-24)
**Roadmap reference:** `roadmap/DEVELOPMENT_ROADMAP.md` §3 Phase 6 (tasks 6.1–6.12); also §2.1 R2, R5, R7, §2.3 O7 (Lite mode stays in Phase 7), task 2.9; `roadmap/DESIGN_COVERAGE.md` rows 13–15 and 37; `docs/URLS.md` (Explore keys)
**Source task:** "`/explore` with every filter in the design, URL state and accessible list behaviour."
**Branch:** `07-phase-6-explore-list`
**Date:** 2026-10-24

## 1. Problem and intended outcome
`/explore/` does not exist yet (`docs/URLS.md`: planned, 6.5). The data for it is ready: `public/data/index.json` has 413 rows with every field the filters need (`dt`, `tb`, `h`, `c`, `ac`, `dv`, `d`, `t`, `rc`, `lc`, `p`, `hv`, `ll`, `img`). The boards set the target:
- `Explore · desktop (pin popover open)` (rail, results, sort, "Copy link to this view", "Showing N of M", "Load more"; its map is Phase 7);
- `Explore · filter drawer, all groups open`;
- `Explore · mobile filter drawer` (draft, "Show N sites");
- `বাংলা · Explore · desktop`.

The boards, the URL contract and the roadmap disagree in places, which the interview settled (§10): the type filter, what a count means, sort in the URL, the hours wording, and division/district logic. The board's "Hours recorded · 289" is wrong since task 2.9 (12 sites).

**Outcome:** a visitor filters the 413 sites by every group on the boards, sees honest counts computed from the data, sorts the list, and shares a URL that reproduces the view byte for byte. Everything works by keyboard and screen reader, in English and Bangla, at 390 px and 1440 px, with no map code.

## 2. Scope
### In scope
- Tasks 6.1–6.12: `SiteCard` (3 variants), `lib/filters.ts`, `lib/urlState.ts`, `lib/sort.ts`, `ExploreApp`, the seven controls, `FilterRail`, `FilterDrawer`, `EmptyResults`, history behaviour, "Copy link to this view", Playwright tests.
- The route `app/explore/page.tsx` (static), linked from the header's existing "Explore" item.
- **Contract changes, made in the same commit as the code (URLS.md rule):**
  - `type` takes the 9 type-group tokens in `TypeGroup` order (`house, rajbari, kachari, kuthi, chief, religious, fort, other, unclassified`) instead of raw `site_type` tokens (D1);
  - new key `sort` = `time` | `name` | `district`, default `time` (D5);
  - `/explore/` status becomes "built (list; map in 7.x)";
  - roadmap 6.2 wording: "each count shows how many sites match that option under the other groups' filters" (D2), and 6.4 gains `sort` in the URL.
- Interface strings in `lib/i18n.ts` for every new label: Bangla from the `বাংলা · Explore · desktop` board where it shows them, otherwise drafts marked `needsReview`.
### Out of scope
- **The map** and everything in Phase 7: `MapView`, pins, popover, `SummaryCard`, both mobile sheets, the Map/List switch, Lite mode (O7). No Leaflet dependency is added.
- **Text search** (`q`, D4): no "Search within results" box; Phase 8.
- **Applying `view`, `sel`, `ids`** (D10).
- Home quick-filter chips (11.1), division/district pages (Phase 10), the shared `Skeleton` variants (10.11; Phase 6 has its own list skeleton), Lighthouse budgets (13.1).
- Any change to `index.json` fields or the data build.

## 3. User journeys / use cases
- **UJ-1 Day-tripper on a phone.** Opens Explore, taps "Filters", turns on "Day trips from Dhaka" (132), picks 2–3 h and Preserved + In ruins; the button reads "Show 44 sites". Taps it; the list shows 44 rows sorted by travel time, the "Filters" button shows the number of active filters, and Back returns to the unfiltered list.
- **UJ-2 Changes their mind.** Same drawer, toggles several chips, then presses Esc (or X, or the backdrop). Nothing changes; focus returns to the "Filters" button.
- **UJ-3 Researcher on desktop.** Ticks Rajshahi, then two of its districts, turns on "Only well-documented sites", sorts by District, loads two more pages, opens a site, presses Back: the filters, sort, loaded rows and scroll position are as they left them.
- **UJ-4 Sharing.** Presses "Copy link to this view" and pastes it in a message. The recipient sees the same results in the same order; in Bangla mode, Bangla names and digits.
- **UJ-5 Broken or old link.** Opens `/explore/?cond=ruins&dist=sylhet&div=dhaka`. The page drops `cond=ruins` and `dist=sylhet` (not in Dhaka division), rewrites the URL, and shows the dismissible notice.
- **UJ-6 Over-filtered.** Gets 0 results; EmptyResults says which single group or switch to remove and how many sites that brings back, with a button that removes it.
- **UJ-7 Keyboard / screen reader.** Tabs through the rail; switches announce on/off, segments announce pressed, chips announce pressed with their count; after each change a polite message announces "N sites".

## 4. Functional requirements

### Route and loading (6.5)
- **FR-1** `app/explore/page.tsx` is a static server page with `SiteHeader current="explore"`, a `<main id="main">` and an `<h1>` ("Explore", bilingual). It renders `ExploreApp` inside `<Suspense>` (6.10), with the division and district lists as props (Assumption A-6).
- **FR-2** `ExploreApp` fetches `/data/index.json` once per page load. While loading it shows a list skeleton (`aria-busy="true"`, rows `aria-hidden`); on failure it shows "Couldn't load the sites" with a Retry button that fetches again. Filters from the URL are parsed before the fetch finishes, so the controls render with the right state.
- **FR-3** Results are paged by 24. "Showing N of M" and a "Load more" button sit below the list; "Load more" adds the next 24 and is absent when all are shown. Any filter or sort change resets to the first page. Focus moves to the first newly loaded card (A-4).

### SiteCard (6.1)
- **FR-4** `SiteCard` takes `site: IndexSite`, `variant: 'full' | 'compact' | 'row'` and `highlight?: boolean`. It is a component without hooks or `server-only` imports, so client components can render it. Each variant shows:
  - the photo (`/thumbs/<img.id>.webp`, 4:3, decorative `alt=""` because the name follows) with its credit `img.credit` printed verbatim, or `PlaceholderArt` tinted by condition when `p` is absent;
  - `BilingualName` (English and Bangla; English only with "Bangla name not yet recorded" when `b` is absent, O13);
  - place: upazila (if any) and district, in the active language;
  - travel time from `h` (`formatHours`) or "Travel time unknown"; never blank;
  - condition and access labels (existing `condition.*` / access strings), and the fee as "Tk N" only when `fe` is present (R6);
  - "No map location yet" when `ll` is absent;
  - the whole card links to `/site/<i>/<s>/` with one link (the name), not nested links.
- **FR-5** Variants differ only in layout: `full` (photo on top, summary-free card for Home), `compact` (smaller photo, for the Phase 7 sheet), `row` (64 px thumbnail at left, as in the desktop results list). `highlight` adds the selected style (used by Phase 7). The Explore list uses `row` at every width (A-7).

### Filters (6.2)
- **FR-6** `lib/filters.ts` is pure: `filter(sites, state) → IndexSite[]` and `counts(sites, state) → Counts`, with no React and no DOM. `FilterState` holds: `day: boolean`, `tt: TravelBucket | 'any'`, `cond: Condition[]`, `acc: Access[]`, `div: string[]`, `dist: string[]`, `type: TypeGroup[]`, `doc`, `vloc`, `photo`, `hours: boolean`.
- **FR-7** Matching rules:
  - `day`: `dt === 1` (absent `dt` never matches);
  - `tt`: `tb === tt`; `unknown` is its own value and never folded into `4+`;
  - `cond`: `c` in the list; `acc`: `ac` in the list; `type`: `t` in the list;
  - `doc`: `rc` is `confirmed` or `partially_confirmed`; `vloc`: `lc === 'verified'`; `photo`: `p === 1`; `hours`: `hv === 1`;
  - **Where (D7):** a site matches when its division is selected **and** either no district of that division is selected, or its district is selected. With no division selected, Where matches everything.
  - Groups combine with AND; options within a group with OR; an empty group matches everything.
- **FR-8** **Facet counts (D2).** For an option *o* of group *G*, the count is the number of sites that pass every active group except *G* and match *o*. Specifically:
  - switches (`day`, `doc`, `vloc`, `photo`, `hours`): sites passing all other groups that have the property;
  - travel time: each segment, and "Any" = sites passing all other groups;
  - condition, access, type: each option;
  - Where: each division counts sites in it passing all non-Where groups; each district likewise.
  - The result count ("N sites", "Show N sites") is `filter(sites, state).length`.
- **FR-9** No count, total or label number is typed into the code or strings; all come from `index.json` at run time (acceptance criterion "No count is hard-coded").

### URL state (6.3)
- **FR-10** `lib/urlState.ts` is pure: `parse(search, lists) → { state, sort, kept, dropped: boolean }` and `serialize(state, sort, kept) → string`. `lists` carries the division and district slugs and the district→division map.
- **FR-11** It follows `docs/URLS.md` exactly: keys in table order, values in their listed order, duplicates removed, defaults omitted, commas unencoded, `q` trimmed and capped at 100 characters. `serialize(parse(x))` is byte-identical for any canonical `x` (round trip), and any input becomes canonical after one parse.
- **FR-12** Unknown keys, values not allowed for their key (including `1` keys with any other value, and a second value on a single-value key), and districts outside every selected division are dropped. When anything was dropped, the app rewrites the URL with `history.replaceState` (no new entry) and shows the dismissible notice `url.droppedFilters`. Dismissal is not remembered.
- **FR-13** `q`, `view`, `sel` and `ids` are validated (`sel`/`ids`: IDs that exist in the index, dropped otherwise once the index loads) and kept in the canonical URL, but do not change the results (D4, D10).
- **FR-14** Division and district values are slugs: division slugs in `divisions.json` order; district slugs in `districts.json` order. A site's district slug comes from the districts list passed as props (A-6), never by lower-casing in the browser.

### Sort (6.4)
- **FR-15** `lib/sort.ts` is pure and stable, with three orders:
  - `time` (default): by bucket order (`0-1` … `4+`), then exact `h` ascending, sites with a bucket but no `h` after the others in their bucket, `unknown` **last**; ties by English name (`e`), then ID (A-8);
  - `name`: by name in the interface language (D8): `Intl.Collator('bn')` on `b` (falling back to `e`) in Bangla, `Intl.Collator('en')` on `e` in English; ties by ID;
  - `district`: by district name in the interface language (`db` / `d`), then by name as above, then ID.
- **FR-16** The sort control ("Sort: Travel time · Name · District") is a single-select group above the list, its value in the URL as `sort` (D5).

### Controls (6.6)
- **FR-17** `DayTripSwitch`: a `<button role="switch" aria-checked>` labelled "Day trips from Dhaka" with the subline "Go and come back the same day · N" (N = facet count).
- **FR-18** `TravelTimeSegmented`: a labelled group of 7 toggle buttons (Any, 0–1 h, 1–2 h, 2–3 h, 3–4 h, 4 h+, Unknown), exactly one `aria-pressed="true"`, each with its count. Choosing the pressed one again does nothing.
- **FR-19** `ChipGroup`: a labelled group of toggle buttons (`aria-pressed`), each with its label, optional condition dot, count and a check glyph when selected, so the state never relies on colour alone. Used for condition and access.
- **FR-20** `DivisionDistrictPicker`: one checkbox per division (8, in `divisions.json` order) with its Bangla name and count. A selected division expands its districts as toggle chips with counts; unticking a division also clears its districts.
- **FR-21** `TypeChips`: a `ChipGroup` of the 9 groups, with the note "N sites are not yet classified; they still show in every other filter" (N from the data).
- **FR-22** `QualitySwitches`: "Only well-documented sites" (subline "Confirmed N + partly confirmed N · N"), "Only verified locations" (subline "Pin confirmed by several sources · N"), "Has photos" (subline "Open-licence photos · N") and "Opening times known" (subline "A clock time is recorded · N", D9). All are `role="switch"`.
- **FR-23** `ActiveFilters`: above the list, one removable chip per active value (for example "In ruins ×", "2–3 h ×", "Manikganj ×") and a "Clear all" button. Removing a chip or Clear all is one change (one history entry, FR-28). Hidden when nothing is active.
- **FR-24** Zero-count options are shown with their 0 and a muted style and stay operable (A-3).

### Rail and drawer (6.7, 6.8)
- **FR-25** `FilterRail` (at `lg` and above, A-1) applies each change immediately. It has a "Filters" heading and "Clear all". Day trip, travel time, condition, visiting and where are open; type, information quality, photos and hours sit in a "More" disclosure that starts open when one of them is active (A-2).
- **FR-26** `FilterDrawer` (below `lg`) opens from a "Filters" button that shows the number of active values. It is a modal dialog (`role="dialog" aria-modal="true"`, labelled by its heading) that:
  - copies the applied state into a **draft** and shows every group (all collapsible, all open by default) with counts computed for the draft;
  - "Show N sites" (N = draft result count) applies the draft and closes;
  - "Clear all" clears the draft only (D11);
  - X, Esc and a tap on the backdrop discard the draft and close (D11);
  - traps focus while open, returns it to the "Filters" button on close, and locks page scroll behind it.

### Empty results (6.9)
- **FR-27** When the result count is 0, `EmptyResults` replaces the list. It computes, for each active group (all its values together) and each active switch, the result count with that one removed, and names the largest gain: "Remove *Condition: Lost, Preserved* to see N sites", with a button that removes it. Ties go to the rail's group order. It also offers "Clear all filters" (D6).

### History and scroll (6.10)
- **FR-28** Each applied change creates exactly one history entry (`pushState`): one rail change, one sort change, one ActiveFilters removal, one EmptyResults action, one drawer "Show". Opening or discarding the drawer, Load more, and URL canonicalisation create none.
- **FR-29** Back and Forward restore the filters and sort from the URL, and the number of loaded pages and the list's scroll position from `history.state` (A-4). Leaving for a site page and returning with Back does the same.
- **FR-30** `useSearchParams` is used only inside the `<Suspense>` boundary; the static export builds without a client-side bailout error.

### Copy link (6.11)
- **FR-31** "Copy link to this view" copies the absolute canonical URL (origin + `/explore/` + canonical query) and announces "Link copied" or "Couldn't copy the link" in a polite live region, reusing `components/site/CopyButton.tsx`. On failure the URL is shown so it can be selected.

### Announcements and language
- **FR-32** After each applied change, a polite live region announces the new count ("44 sites"), debounced so a fast run of changes announces once (A-5).
- **FR-33** All numbers use `formatCount` / `formatHours` (`lib/format.ts`), so Bangla mode shows Bangla digits; IDs stay Latin. Interface strings render through `lib/i18n.ts` (`T` on the server side, `text(key, useUiLang())` inside client components).

## 5. Non-functional requirements
- **NFR-1 Accessibility.** Every control is operable by keyboard with a visible focus ring; touch targets ≥ 44 px; the axe check (`@axe-core/playwright`) finds no serious or critical issues on `/explore/` in light and dark, default and with filters active, and with the drawer open.
- **NFR-2 Performance (R7).** The browser fetches only `index.json` (about 35 KB gzipped) for data; no map or Leaflet code is loaded. Filtering and counting all groups for 413 sites runs within one frame on a mid-range phone (target < 16 ms; a unit benchmark is not required).
- **NFR-3 Responsive.** No horizontal scroll at 390 px; the layout matches the boards at 390 px and 1440 px ("reviewed against the design", not pixel-perfect).
- **NFR-4 Privacy (R5).** No URL carries coordinates; selection is by ID only.
- **NFR-5 i18n.** Bangla mode shows Bangla interface strings, names and digits; every new Bangla string not taken from the বাংলা board is `needsReview`.
- **NFR-6 No JavaScript (Assumption A-9).** Without JavaScript the page shows the header, the heading and a short note that Explore needs JavaScript, with a link to `/`.

## 6. Data, interfaces, and integrations
- **Read:** `public/data/index.json` (`IndexSite[]`, `lib/types.ts`), fetched in the browser; `data/build/divisions.json` and `districts.json`, read at build time by `app/explore/page.tsx` through `lib/data.ts` and passed as props `{ slug, en, bn }[]` (divisions) and `{ slug, en, bn, divisionSlug }[]` (districts).
- **New modules:** `lib/filters.ts`, `lib/urlState.ts`, `lib/sort.ts` (pure, unit-tested); `components/explore/*` (`ExploreApp`, controls, `FilterRail`, `FilterDrawer`, `ActiveFilters`, `EmptyResults`, `ResultsList`); `components/cards/SiteCard.tsx`.
- **Reused:** `PlaceholderArt`, `ConditionGlyph`, `CopyButton`, `formatCount`/`formatHours`, `T`/`Both`, `useUiLang`, existing `condition.*` and access strings, `url.droppedFilters`.
- **Contract edits:** `docs/URLS.md` (`type`, `sort`, route status) and `tests/urls.test.ts` if it checks the key list; roadmap 6.2/6.4 wording.

## 7. Edge cases and failure behavior
- `index.json` fetch fails or returns invalid JSON: error state with Retry (FR-2); the controls stay visible but disabled.
- URL with `sel`/`ids` naming unknown IDs: dropped with the notice once the index is loaded (FR-13).
- `dist` without any `div`: dropped with the notice (URLS.md rule).
- Unticking a division that has ticked districts: those districts are cleared in the same change.
- A filter combination with 0 results: EmptyResults (FR-27); never a blank area.
- `tt=unknown` with `day=1`: 0 results today (no day-trip site has an unknown time), handled by EmptyResults like any other 0.
- Sites without a Bangla name (2): the card shows the English name with the missing-name note; the Bangla name sort falls back to `e`.
- The one site with a bucket but no exact time (JB-DHK-011 today): the card shows the bucket ("2–3 h"), and the sort places it after the timed sites of its bucket.
- Clipboard API unavailable or denied: failure message and the visible URL (FR-31).
- The drawer is open when the window widens past `lg`: the drawer closes, discarding its draft.

## 8. Acceptance criteria
- **AC-1** (FR-6–FR-9) Unit tests on fixtures cover every group's matching, AND/OR combination, Where narrowing (D7) and facet counts. An invariant test on the real `index.json` checks: every count ≤ the total; with no filters, the condition counts (and likewise access, type, travel-time segments and divisions) sum to 413; with any one filter active, each other single-value group's counts sum to the result count without that group.
- **AC-2** (FR-10–FR-14) Unit tests: round trip of canonical URLs; canonicalisation of reordered and duplicated values; unknown keys and values dropped with `dropped = true`; a district outside the selected divisions dropped; `q` trimmed and capped; `sort` default omitted.
- **AC-3** (FR-15) Unit tests: unknown travel time last; ties broken by name then ID; the same input in a different order gives the same output; Bangla name sort uses `b` with fallback.
- **AC-4** (FR-4, FR-5) Unit tests render each `SiteCard` variant for a site with a photo, a site without, and a hidden-pin site: photo + credit or placeholder, "No map location yet" only when `ll` is absent, no "Free" or "Tk 0".
- **AC-5** (FR-17–FR-26, 6.12) Playwright: each filter group changes the list and the URL; the result count matches `lib/filters.ts` run in the test on `index.json`; the displayed counts of every option in each group match the facet counts computed in the test.
- **AC-6** (FR-26) Playwright at 390 px: a draft is discarded by Esc, by X and by the backdrop; "Show N sites" applies it; focus is trapped while open and returns to the Filters button.
- **AC-7** (FR-12) Playwright: an invalid query shows the notice and the URL is rewritten to canonical form without a new history entry.
- **AC-8** (FR-28, FR-29) Playwright: after two rail changes and a Load more, Back restores the first change's state and Forward the second's, including loaded rows and scroll position; opening a site and returning with Back restores the view.
- **AC-9** (FR-31, FR-11) Playwright: Copy link puts the canonical URL on the clipboard; opening it in a new page reproduces the same results in the same order.
- **AC-10** (FR-27) Playwright: a 0-result URL shows EmptyResults naming the group or switch with the largest gain (computed in the test), and its button restores that many results.
- **AC-11** (NFR-1) axe: no serious or critical issues in the states listed in NFR-1. Every control is reachable and operable with the keyboard alone (a keyboard-only Playwright pass through the rail and the drawer).
- **AC-12** (NFR-3, NFR-5) No horizontal scroll at 390 px; the Bangla run shows Bangla digits in counts. Screenshots at 390 and 1440 px (light, dark, Bangla) are added to `npm run screenshots` and reviewed by the owner against the four boards.
- **AC-13** (FR-9) A test asserts that no Explore string in `lib/i18n.ts` contains a digit other than placeholders, and that the rendered counts change when the test fixture index changes.
- **AC-14** (FR-30, NFR-2) `npm run build:local` succeeds; the `/explore/` page requests no file under a map or Leaflet chunk (Playwright request log).

## 9. Dependencies, constraints, and assumptions
### Dependencies
- Phase 4 (routing, header, data readers) is done; Phase 5 is not required. `index.json` already carries `ty`, `t`, `hv`, `p`, `rc`, `lc` (tasks 2.4, 2.9).
### Constraints
- Static export, no server code (`next.config.mjs`: `output: 'export'`, `trailingSlash: true`); `useSearchParams` needs `<Suspense>` (README, Routes table).
- `lib/data.ts` is `server-only`: client components never import it; build-time lists reach `ExploreApp` as props.
- Interface strings render both languages and CSS shows one (`components/T.tsx`, I3); client components choose with `useUiLang()` (`lib/use-ui-lang.ts`).
- Exact versions for any dependency (none expected in this phase).
- Tests take expected values from the built data, never typed numbers (I6, `e2e/smoke.spec.ts` pattern); `npm run e2e` serves `out/` (`playwright.config.ts`).
- Breakpoints: `md` 768, `lg` 1024, `xl` 1280, `2xl` 1440 (`tailwind.config.ts`).
### Assumptions (all accepted by the owner, 2026-10-24)
- **A-1** The rail shows at `lg` (≥ 1024 px) and the drawer below.
- **A-2** Rail groups open as on the desktop board; type, information quality, photos and hours live in a "More" disclosure, open when one of them is active. Open/closed state is not in the URL.
- **A-3** Zero-count options stay operable with a muted style (not `disabled`).
- **A-4** Load more moves focus to the first new card; the loaded page count and the list scroll position are stored in `history.state`, not the URL.
- **A-5** The result count is announced in a polite live region, debounced (about 500 ms).
- **A-6** Division and district lists come from the server page as props; the browser fetches only `index.json`.
- **A-7** The Explore list uses the `row` card at every width; `full` and `compact` are built and unit-tested now for Phases 7 and 11.
- **A-8** Travel-time sort: bucket order, then exact `h`, then sites with a bucket but no `h`, then `unknown`; ties by English name and ID in both languages, so the default order is the same in English and Bangla.
- **A-9** Without JavaScript, `/explore/` shows only a note and a link home; no server-rendered list in this phase.

## 10. Key decisions and rationale
Confirmed by the owner in the interview on 2026-10-24:
- **D1 Type groups, not raw types.** The board shows 9 groups; many raw types have 1–3 sites. `type` in URLS.md changes to group tokens.
- **D2 Facet counts.** Matches the board (Preserved 10 + In ruins 34 = "Show 44"); a selected and an unselected chip read the same way. Roadmap 6.2 wording changes.
- **D3 Rail + wide list on desktop.** No placeholder for the map; Phase 7 inserts it.
- **D4 `q` waits for Phase 8**, so matching and Bangla spelling folding are built once.
- **D5 `sort` in the URL**, so a shared link reproduces the order (as the trips listing already does).
- **D6 EmptyResults suggests a whole group or a switch**, because removing one value of an OR group can only narrow the results.
- **D7 Districts narrow their division**; a division with none ticked means all of it.
- **D8 Name and district sorts follow the interface language.**
- **D9 "Opening times known"** for `hours` (12 sites with a clock time); closes spec 02 OQ-2.
- **D10 `view`, `sel`, `ids` kept with no effect** so links made for Phases 7 and 9 survive.
- **D11 Drawer discard by X, Esc or backdrop**, no Cancel button, as on the boards; "Clear all" clears the draft only.

## 11. Open questions
- **OQ-1** Bangla wording for the new strings not shown on the বাংলা board (drawer buttons, empty state, sort labels, the hours switch): drafts with `needsReview` until a native reviewer signs them off.
