# Map

**Status:** Approved (by the owner, 2026-10-24); amended during implementation on 2026-10-24 (D5, A-2, FR-31, FR-34: see §10)
**Roadmap reference:** `roadmap/DEVELOPMENT_ROADMAP.md` §3 Phase 7 (tasks 7.1–7.12); also §2.1 R5, R7, R8, §2.3 O4, O7, O9, task 5.18; `roadmap/DESIGN_COVERAGE.md` rows 13, 16–19, 25, 27, 30–33; `docs/URLS.md` (`view`, `sel`); `.claude/specs/06-Explore-list.md` (D10, A-1)
**Source task:** "A Leaflet map beside the list on desktop, and the mobile map with its two distinct sheets: the **results** sheet and the **selected-site** sheet."
**Branch:** `08-phase-7-map`
**Date:** 2026-10-24

## 1. Problem and intended outcome
`/explore/` today is a filter rail and a list (spec 06). The URL already carries `view` and `sel`, validated and kept with no effect (spec 06 FR-13, D10). The site page's `LocationPanel` is text only; the roadmap note on Phase 5 says "Phase 7 adds the mini map". Of the 413 sites, 299 have a pin (`ll` in `index.json`: verified 38, single source 217, approximate 43, unverified 1) and 114 have none (§2.5); 87 mapped sites are flagged (`f`).

The boards set the target:
- `Explore · desktop (pin popover open)`: rail | map | list, the "N of M on the map · K without a pin" bar, zoom, locate and base-map controls, "Map key", the popover;
- `Explore · mobile map + summary sheet`: the selected-site sheet with Read more and Directions;
- `Explore · mobile sheet peek, half, full`: the results sheet and its handle button;
- `Explore · mobile list, sheet up (dark)`: the list at full height with Map/List and the Lite mode switch;
- `Explore · pin set and clusters by zoom`: the pin set, interaction states, cluster sizes and the 1.5 km circle;
- the Location section of `Site page · Baliati · desktop (full record)` (mini map with "Open in Explore") and `Site page · Elangi · no photo, no pin` (no map);
- `Offline slow network · mobile`: the Lite mode explanation and switch (the offline toast is 10.12).

The boards and the data disagree in two places, settled in the interview (§10): the card's one-line description is not in `index.json` (D1), and "Location confirmed by 3 sources" has no clean source count (D2).

**Outcome:** the map shows exactly the mappable filtered sites, and the sites without a pin only in the list. Every map interaction has a keyboard and a non-drag alternative. Map code and tiles load only when a map is actually shown, never in Lite mode. The attribution is visible on every map.

## 2. Scope
### In scope
- Tasks 7.1–7.8, 7.10–7.12, and 7.9 without the trip `RouteMap` (D3).
- Dependencies at exact versions: `leaflet`, `leaflet.markercluster`, `@types/leaflet`, `@types/leaflet.markercluster`. Their CSS is imported inside the map module only.
- `components/map/*`: `MapLoader`, `MapView`, `SitePin`, `ClusterIcon`, `MapControls`, `MapKey`, `SummaryCard`, `BottomSheet`, `MiniMap`; pure rules in `lib/pins.ts` and settings in `lib/map-config.ts`.
- Changes to `ExploreApp` for the three layouts (D7), `view`, `sel`, list–map sync and "Show on map" (D10).
- **Data:** a new `index.json` field `sm` (D1), with `lib/types.ts`, the index contract test and the reviewed baseline size updated.
- **Lite mode:** the preference in `lib/prefs.ts`, the boot script, a toggle in the site header and in Explore, Save-Data activation and the slow-connection suggestion (D8).
- `MiniMap` in `LocationPanel` for mappable sites, with "Open in Explore" (D13).
- **Contract changes, made in the same commit as the code (URLS.md rule):**
  - `view`: default `list` below 1280 px; ignored at 1280 px and above, where both panes show (D6, D7);
  - `sel`: dropped with the notice when the site has no pin or is excluded by the filters (D12);
  - `/explore/` status becomes "built (list and map)";
  - roadmap Phase 7 wording for 7.9 (RouteMap moves to Phase 9) and the breakpoint.
- Interface strings in `lib/i18n.ts` for every new label; Bangla drafts marked `needsReview`.
### Out of scope
- The trip `RouteMap` and its Lite stop list (Phase 9; D3).
- Search and the mobile top bar's search box (Phase 8); the quick chips on the mobile board (Phase 11; D4).
- `ids` ("Open all stops on the map", 9.8).
- The offline toast and `OfflineNotice` (10.12); the shared `Skeleton` map variant (10.11).
- The launch tile provider (O4; tasks 13.6, 14.1). Phase 7 makes the switch a configuration change.
- Map position (centre, zoom) in the URL.
- A per-site location source count (D2).
- Any change to which sites are mappable or to the hidden-pin rules (R5); the data build changes only by adding `sm`.

## 3. User journeys / use cases
- **UJ-1 Desktop browsing.** At 1440 px, opens Explore: rail, map and list. Turns on "Day trips from Dhaka"; the map fits the 101 mapped day-trip sites, the bar reads "101 of 132 on the map · 31 without a pin" (counts from data). Clicks Baliati's pin: the ring shows, the list row is highlighted, the popover opens with photo, names, summary and "Read more". Read more opens the site page; Back returns with the popover open.
- **UJ-2 Phone, map.** At 390 px, the list shows first. Taps "Map": the map loads with the results sheet at peek ("413 sites · 299 on the map · 114 without a pin"). Taps the handle: half, then full, then peek. At half, taps a pin: the results sheet gives way to the selected-site sheet. Taps Close: the results sheet comes back at half, at the same list position.
- **UJ-3 Phone, Back.** With the selected-site sheet open, presses the system Back: the sheet closes, filters unchanged.
- **UJ-4 Keyboard and screen reader.** Tabs into the map: zoom, locate, base map, key, then clusters and pins. A cluster announces "Cluster of 17 sites"; Enter zooms in. A pin announces "Baliati Palace, Preserved, Location confirmed"; Enter opens the summary; Esc closes it and focus is back on the pin.
- **UJ-5 Desktop list to map.** Hovers a list row: its pin is highlighted. Presses "Show on map": the map pans to the pin and the popover opens.
- **UJ-6 Shared link.** Opens `/explore/?day=1&view=map&sel=JB-DHK-064`: same filters, map shown, Baliati selected. A link with `sel` naming a hidden-pin site loses `sel` and shows the "removed" notice.
- **UJ-7 Data saver.** A phone with Save-Data on opens Explore: Lite mode is on with "We switched to Lite mode"; no map code or tiles load. Tapping "Map" shows "Map is off in Lite mode" with "Turn off Lite mode".
- **UJ-8 Tiles blocked.** On a network that blocks the tile server, the map shows "Map tiles couldn't load" with Retry; the pins, the list and the filters keep working.
- **UJ-9 Site page.** Scrolls Baliati's page to Location: the mini map loads as it scrolls into view, with the pin and the attribution. "Open in Explore" opens the Explore map with Baliati selected. Elangi (no pin) shows the existing no-pin panel and loads no map.

## 4. Functional requirements

### Loading (7.1, 7.2)
- **FR-1** `components/map/MapLoader.tsx` is a `'use client'` component that loads `MapView` with `dynamic(() => import('./MapView'), { ssr: false })`. It renders `MapView` only when the map is on screen in the current layout (FR-5) and Lite mode is off. Otherwise no Leaflet module, Leaflet CSS or tile is requested.
- **FR-2** `leaflet` and `leaflet.markercluster` CSS are imported inside the map module, not in `app/layout.tsx` or `app/tokens.css`. Markers use `divIcon` only, so Leaflet's default image icons are never requested.
- **FR-3** At most one Explore map instance exists at a time. Switching from map to list, or turning Lite mode on, unmounts it and calls `map.remove()`.

### Layout and view (D6, D7)
- **FR-4** Below 1024 px (phone layout): `view=list` (the default) shows the Phase 6 list with a floating "Map" button; `view=map` shows the map full-bleed with the results sheet (FR-24) and the existing "Filters" button (with its active count) floating over the map (D4).
- **FR-5** From 1024 to 1279 px: the rail stays (spec 06 A-1); the second pane shows the list for `view=list` or the map for `view=map`, chosen by a Map/List switch above it. At 1280 px and above: rail | map | list, as on the desktop board, and `view` has no visible effect but is kept in the URL.
- **FR-6** The Map/List switch and the floating Map button change `view` with one history entry (spec 06 FR-28) and keep the filters, sort and `sel`.

### MapView (7.3, 7.11)
- **FR-7** The map opens on all of Bangladesh. When the index is loaded and on each applied filter change, it fits the bounds of the mappable results, with maximum zoom 12; with no mappable results it shows all of Bangladesh (D11). A view the visitor panned or zoomed is kept until the next filter change; sort, Load more and selection (other than FR-19) do not move it.
- **FR-8** The attribution of the active base map (FR-31) is always visible in the map's corner, including in the error state (FR-12), at every width and in the mini map (R8).
- **FR-9** A `ResizeObserver` on the map container calls `invalidateSize()` when its size changes (pane switch, sheet change, window resize).
- **FR-10** A bar on the map reads "N of M on the map · K without a pin", where M is the result count, N the results with `ll` and K = M − N. When K is 0 it reads only "N on the map".
- **FR-11** Without JavaScript nothing changes from spec 06 A-9; the map has no server-rendered fallback.
- **FR-12** When tiles fail to load (a burst of `tileerror` events, or no tile loaded within a timeout, A-7), an overlay over the map says "Map tiles couldn't load. The list still works." with a Retry button that reloads the tile layer. Pins stay interactive under the overlay's message area, and the list and filters are unaffected. A later successful tile load hides the overlay.

### Pins (7.3, O9)
- **FR-13** Each mappable result is one pin. `lib/pins.ts` (pure) maps a site to its style:
  - **colour and inner glyph from condition** `c`: preserved (check), preserved_adaptive_reuse (arch), in_ruins (broken line), lost (cross), unknown ("?"), matching `ConditionGlyph`;
  - **fill from location status** `lc`: `verified` solid, `single_source` outlined, `approximate` hatched, `unverified` outlined;
  - **a gold "?" badge** when `f` is 1.
  
  JB-DHK-008, today the only `unverified` mapped site, is therefore an outlined pin with the "?" badge, and its accessible name and summary say "Location unverified"; it is never drawn as verified or single source (O9).
- **FR-14** The marker element itself (Leaflet's `divIcon` element, `keyboard: true`) is the focusable control: `role="button"`, an accessible name "{name}, {condition}, {location status}" in the interface language, and no nested `<button>`, so each pin is one tab stop. The hit area is at least 44 px around a 26 px pin.
- **FR-15** States from the board: hover enlarges the pin to 115% and shows the name as a tooltip; keyboard focus draws the focus ring; the selected pin (FR-19) draws the ring and stays on top. None depends on colour alone.
- **FR-16** At zoom 11 and above, each `approximate` pin draws a dashed circle of 1.5 km radius around it, in its condition colour, not interactive. The map key labels it "Approximate area: a display convention, not a measured area" (reusing the sense of `location.radius`). Below zoom 11 no circle is drawn.
- **FR-17** At zoom 12 and above, each unclustered pin shows its name as a label (A-3).

### Clusters (7.4)
- **FR-18** Pins are clustered with `leaflet.markercluster`, radius 60 px, through `ClusterIcon`: a ring with the count (in the interface's digits), 36 px for up to 9 sites, 44 px up to 99, 52 px for 100 or more. A cluster is focusable with the accessible name "Cluster of N sites. Zoom in"; Enter, Space or click zooms to its bounds. Hovering a cluster outlines the area it covers. At the maximum zoom a cluster that cannot split spiderfies, and its pins become focusable.

### Map–list sync and selection (7.5)
- **FR-19** Activating a pin (click, Enter, Space) sets `sel` to its site ID with one history entry (`pushState`), opens the summary (FR-21) and highlights its list row (`SiteCard highlight`), scrolling the row into view on desktop if it is loaded. If the pin is outside the view or inside a cluster, the map zooms or pans just enough to show it.
- **FR-20** On desktop and the 1024–1279 map pane, hovering or focusing a list row highlights its pin (or its cluster) without panning. Each mappable row has a "Show on map" button that sets `sel` like FR-19 and pans to the pin; rows without `ll` keep "No map location yet" and get no button. The name remains the row's only link (spec 06 FR-4). Below 1024 px the button switches to `view=map` and selects the site in the same history entry.
- **FR-21** Closing the summary (Close button, Esc, or on phones the backdrop of the sheet) clears `sel`: when the previous history entry is this same view without `sel` (the visitor selected it here), it calls `history.back()`; otherwise (the page opened with `sel`) it replaces the entry without `sel`. Focus returns to the pin, or to the list row's "Show on map" button if the selection came from there (A-1).
- **FR-22** **Rules for `sel`** (D12):
  - a loaded URL whose `sel` names a site without `ll`, or one the current filters exclude, drops `sel`, rewrites the URL with `replaceState` and shows the existing `url.droppedFilters` notice;
  - an applied filter change that excludes the selected site drops `sel` in that same history entry and closes the summary, with no notice;
  - `sel` never changes which sites match the filters.
- **FR-23** Back and Forward restore `view` and `sel` from the URL like the filters (spec 06 FR-29): Back after FR-19 closes the summary; Forward reopens it.

### Results sheet (7.7)
- **FR-24** In the phone map view, `BottomSheet` holds the results with three snap points:
  - **peek**: "N sites", "N on the map · K without a pin", and a "List" control (which goes to full);
  - **half**: the count, the sort control, and the top of the list;
  - **full**: the count, Map/List switch, the Lite mode switch, the sort control and the list, as on the dark board.
  
  The sheet opens at peek.
- **FR-25** The handle is a `<button aria-expanded>` labelled with the next state ("Show more results" / "Show fewer results"). Each press steps peek → half → full → peek, and moves focus to the sheet's heading. `aria-expanded` is true at half and full. Dragging the handle snaps to the nearest point; the button is the non-drag alternative.
- **FR-26** The list scrolls inside the sheet only at full; at peek and half, a swipe on the list area moves the sheet, not the list. `scroll-padding-bottom` of the page follows the sheet's visible height, so a focused element is never hidden behind it.
- **FR-27** The snap point and the list's scroll position live in `history.state` (`jp`) like spec 06 A-4; they create no history entry.

### Selected-site summary (7.6)
- **FR-28** `SummaryCard` is shown as a popover anchored to the pin at 1280 px and above, and in the 1024–1279 map pane, and as the **selected-site sheet** in the phone map view, where it replaces the results sheet. It is a non-modal dialog (`role="dialog"`, labelled by the site name) that receives focus when opened by keyboard, and contains:
  - the photo (`/thumbs/<img.id>.webp`) with its credit verbatim, or `PlaceholderArt`;
  - `BilingualName` (English only with the O13 note when `b` is absent);
  - place (upazila, district) in the interface language;
  - `ConditionBadge` and `AccessBadge` (fee as in spec 06 FR-4, never "Free" or "Tk 0", R6);
  - `sm` (FR-34);
  - the location line: the existing location status label (D2);
  - travel time (`formatHours`, or "Travel time unknown"), one-way cost "~Tk N" only when `oc` is known, and day trip yes/no/unknown from `dt`;
  - "Read more" linking to `/site/<i>/<s>/`;
  - "Directions", an outbound link built by `directionsUrl(ll)` (`lib/site-page.ts`), opening in a new tab with the "opens in a new tab" text (5.18);
  - Close (X).
- **FR-29** Closing the selected-site sheet restores the results sheet at the snap point and list position it had before (FR-27). Selecting a different pin while a summary is open replaces it (one new history entry).

### Controls and key (7.8)
- **FR-30** `MapControls`, as on the board, top right: zoom in, zoom out, locate, base map. Each is a `<button>` with an accessible name and a 44 px target.
- **FR-31** The base-map menu lists the providers in `lib/map-config.ts` that need no API key: today OSM standard only (D5, amended). CARTO Positron and Dark Matter stay in the config, switched off, until O4 provides a key; once on, the default follows the theme (A-2). A choice made in the menu lasts for the page session (A-8). Each provider carries its own URL template and attribution.
- **FR-32** Locate asks for the browser's location permission when pressed. On success it shows a dot (and accuracy circle) and pans to it; the position is never stored, put in a URL or sent anywhere. Refusal, unavailability or a timeout are reported in a polite status message ("Location permission was refused", "Your location isn't available"), and the button stays usable.
- **FR-33** `MapKey`, opened by the "Map key" button bottom left (a disclosure, Esc closes it), lists the five condition glyphs, the three fills (location confirmed, from one source, approximate), the unverified pin with "?", the "?" badge meaning "needs checking" and the approximate circle row (FR-16).

### Data (D1)
- **FR-34** The data build adds `sm` to every `index.json` row: the first sentence of `short_description` (a `.`, `!` or `?` followed by a space and a capital, digit or quote, not after an initial such as "M." or a title such as "Md."), or the first two sentences when the first is under 60 characters ("Not a zamindar house."), cut at a word boundary to at most 160 characters with "…" when longer (`cardSummary` in `scripts/lib/rules.mjs`). It is public text that has already passed the internal-note check. The field order and determinism rules of the index are unchanged. Measured on 24 Oct 2026: `index.json` grows from 61 to 76 KB gzipped (96 rows capped), under the 120 KB warning and the 150 KB budget.

### Lite mode (7.9, O7, D8, D14)
- **FR-35** The preference is stored in `localStorage` as `jp-lite` (`1` on, `0` off, absent for automatic) and applied by the boot script before first paint as `html[data-lite]`, with the same storage-failure behaviour as language and theme (`lib/prefs.ts`).
- **FR-36** Automatic: with no stored choice, Lite mode is on when `navigator.connection.saveData` is true, and the Explore page shows "We switched to Lite mode because your phone's data saver is on" (dismissible). When `navigator.connection.effectiveType` is `slow-2g` or `2g` and Lite is off, a dismissible banner suggests it, with a "Turn on Lite mode" button; once dismissed it does not return in that browser session (A-6). A manual choice always wins.
- **FR-37** The "Lite mode (no map)" switch (`role="switch"`) is in the site header next to the language and theme toggles, and in the Explore list header (the full results sheet on phones, the list header at 1024 px and above). Both reflect and change the same preference immediately.
- **FR-38** With Lite mode on, Explore shows the list only: the map pane (1280 px and above) and the Map view (below) show a panel "Map is off in Lite mode" with "Turn off Lite mode". `view=map` stays in the URL. No Leaflet module, CSS or tile is requested until Lite mode is turned off, and turning it on while a map is open unmounts it (FR-3).
- **FR-39** With Lite mode on, the site page's `MiniMap` shows only the location text (the existing `LocationPanel`) and a "Show map" button that loads the map for this page view without changing the preference (A-4).

### MiniMap (7.10, D13)
- **FR-40** For a site with `latlon`, `LocationPanel` includes a `MiniMap`: one pin styled as FR-13, the 1.5 km circle for approximate sites at its fixed zoom, the attribution, zoom buttons, and "Open in Explore" linking to `/explore/?view=map&sel=<ID>`. It loads its map code only when the panel comes within one viewport of the screen (`IntersectionObserver`), and shows a static placeholder of the same size until then, so the layout doesn't jump.
- **FR-41** For a site without `latlon` (hidden pin) nothing changes: the existing no-pin panel, no map code, no coordinates, no "Open in Explore" (R5).

### Language
- **FR-42** Every string built at runtime (pin and cluster names, live-region messages, the bar) uses `text(key, useUiLang())`; server-rendered parts use `T`. Numbers use `formatCount` / `formatHours`, so Bangla mode shows Bangla digits on clusters and in the bar; IDs and coordinates stay Latin.

## 5. Non-functional requirements
- **NFR-1 Accessibility.** Every map action has a keyboard path and a non-drag alternative (pins, clusters, controls, key, the handle button, Show on map). Focus is visible on every control, including pins. axe (`@axe-core/playwright`) finds no serious or critical issues on `/explore/` with the map shown, with a popover open, with each sheet open, in light and dark, and on a site page with the mini map.
- **NFR-2 Performance (R7).** In the phone list view, in Lite mode, and on a site page before the mini map nears the viewport, no Leaflet chunk, Leaflet CSS or tile request appears. The list renders before the map: the map mounts after the index is loaded and the list has rendered.
- **NFR-3 Privacy (R5).** No hidden-pin coordinates reach any page, URL or index row; URLs select by ID only; the Locate position never leaves the browser.
- **NFR-4 Reliability.** A tile failure, a geolocation failure or a Leaflet error never breaks the filters or the list; Leaflet errors are contained by an error boundary around the map that shows the FR-12 message.
- **NFR-5 Responsive.** No horizontal scroll at 390 px; the three layouts (FR-4, FR-5) at 390, 1024, 1280 and 1440 px are reviewed by the owner against the boards ("reviewed against the design", not pixel-perfect).
- **NFR-6 i18n.** Bangla mode shows Bangla interface strings and digits on the map; new Bangla strings are `needsReview`.

## 6. Data, interfaces, and integrations
- **Read:** `public/data/index.json` (`IndexSite`: `ll`, `lc`, `f`, `c`, `ac`, `fe`, `h`, `oc`, `dt`, `img`, `e`, `b`, `u`, `d`, `db`, and the new `sm?: string`). Site pages read `SiteRecord.location` at build time as now.
- **Tile services:** OSM standard (`tile.openstreetmap.org`) and CARTO basemaps, through `lib/map-config.ts`. The launch provider is O4.
- **New modules:** `components/map/*` (FR-1 to FR-41), `lib/pins.ts` (pin style, accessible names and cluster sizes: pure, unit-tested), `lib/map-config.ts` (providers, Bangladesh bounds, zoom thresholds 11 and 12, circle radius 1.5 km, cluster radius 60 px).
- **Changed:** `ExploreApp` (layouts, `view`, `sel`, sync), `ResultsList` / `SiteCard` row (Show on map, highlight), `LocationPanel` (MiniMap), `SiteHeader` (Lite switch), `lib/prefs.ts` and `BOOT_SCRIPT` (`jp-lite`), `lib/urlState.ts` (the `sel` rules of FR-22, which need the filtered results), `scripts/build-index.mjs` and `lib/types.ts` (`sm`), `lib/i18n.ts`.
- **Reused:** `SiteCard` (`compact`, `highlight`), `BilingualName`, `ConditionBadge`, `AccessBadge`, `LocationBadge`, `PlaceholderArt`, `ConditionGlyph`, `directionsUrl`, `formatCount`/`formatHours`, `useUiLang`, the `jp` history-state helpers in `ExploreApp`, `url.droppedFilters`.
- **Contract edits:** `docs/URLS.md` (`view`, `sel`, route status), `tests/urls.test.ts` if it checks those rows, `tests/index-contract.ts`, the reviewed baseline, the roadmap's Phase 7 wording.
- **Tests:** Playwright routes every tile URL to a local fixture image (A-5), so tests never contact a tile server; a separate test aborts them to exercise FR-12.

## 7. Edge cases and failure behavior
- Results with no mappable site (for example a filter on "No map location" combinations): the map shows Bangladesh, the bar reads "0 of M on the map · M without a pin"; the list is unchanged.
- 0 results: EmptyResults as in spec 06; the map shows Bangladesh with no pins.
- `sel` names an unknown ID, a hidden-pin site, or a filtered-out site: FR-22 (drop with notice). `sel` with an unknown ID already follows spec 06 FR-13.
- `view=map` with Lite mode on: FR-38 panel; `view` kept.
- Lite mode turned on while the map or a summary is open: the map unmounts, `sel` stays in the URL, and the list row stays highlighted.
- The window crosses 1280 or 1024 px with a popover or sheet open: the summary moves to the other form (FR-28) with `sel` kept; the results sheet's snap point is kept for when the phone layout returns.
- Geolocation unavailable, refused or timed out: FR-32 message; nothing else changes.
- Tiles blocked or offline: FR-12 overlay; the cached index keeps the list working.
- JB-DHK-008: outlined pin with "?" and "Location unverified" everywhere (FR-13).
- A mappable site with no photo: placeholder art in the summary, as in the list.
- An approximate site viewed below zoom 11: no circle (FR-16); the hatched fill still says approximate.
- Two sites at the same coordinates: they stay clustered until the maximum zoom and then spiderfy (FR-18).
- Leaflet throws during mount: the error boundary shows the FR-12 message without Retry of tiles but with "Reload map" (NFR-4).
- Storage unavailable: Lite mode follows Save-Data only and a manual choice lasts for the open page (FR-35).

## 8. Acceptance criteria
- **AC-1** (FR-1, FR-2, FR-38, FR-40, NFR-2) Playwright request log: in the phone list view, with Lite mode on (any width), and on Baliati's page before scrolling to Location, no request matches the Leaflet chunk, Leaflet CSS or any tile host. With the map shown, they do.
- **AC-2** (FR-13, FR-22, FR-10) Playwright: with no filters and with two filter sets, the number of pins plus clustered sites equals `filter(index, state).filter(s => s.ll).length` computed in the test, and the bar's N, M and K match it.
- **AC-3** (FR-13–FR-17) Unit tests on `lib/pins.ts`: every condition × location status × flag combination gets the board's style; JB-DHK-008's style is outlined with the badge; the accessible name includes name, condition and location status in both languages; cluster sizes at 9/10, 99/100.
- **AC-4** (FR-14, FR-18, FR-19, FR-21, 7.12) Playwright keyboard-only: Tab reaches a cluster and Enter zooms in; Tab reaches a pin, Enter opens the summary, Esc closes it and focus is on that pin; each pin is a single tab stop (no nested button).
- **AC-5** (FR-19, FR-21, FR-23) Playwright: clicking a pin adds one history entry with `sel`; Back closes the summary; Forward reopens it; Close on a page opened with `sel` replaces the entry (Back then leaves the page state before it).
- **AC-6** (FR-22) Playwright: `?sel=<hidden-pin ID>` and `?type=fort&sel=<a non-fort site ID>` each drop `sel` with the notice and a canonical URL; applying a filter that excludes the selected site closes the summary and drops `sel` with no notice.
- **AC-7** (FR-20) Playwright at 1440 px: hovering a row highlights its pin; "Show on map" opens the popover for that site; rows without `ll` have no button.
- **AC-8** (FR-24–FR-27, FR-29, 7.12) Playwright at 390 px: the handle button cycles peek → half → full → peek with `aria-expanded` false/true/true/false and focus on the sheet heading; selecting a pin at half and closing the summary returns to half with the same list scroll; Map/List keeps the filters and `sel`.
- **AC-9** (FR-28) Unit tests on `SummaryCard`: Baliati (photo, credit, `sm`, Directions), Elangi-like hidden site never rendered, a site without photo (placeholder), a site with unknown fee (no price, no "Free"), JB-DHK-008 ("Location unverified").
- **AC-10** (FR-12, NFR-4, 7.12) Playwright with tile requests aborted: the overlay shows, the list and filters still change results, Retry with tiles restored hides it.
- **AC-11** (FR-8) Playwright: the attribution is visible (non-zero size, in the viewport) in the desktop map, the phone map at each snap point, the error state and the mini map, for each base map.
- **AC-12** (FR-30–FR-33) Playwright: zoom buttons change the zoom; the base-map menu switches the tile host and the attribution; Locate with permission denied (Playwright's geolocation permission off) shows the refusal message; the key opens, closes with Esc and contains the unverified and approximate-circle rows.
- **AC-13** (FR-34) Unit test on the index build: `sm` is the first sentence, ≤ 161 characters including "…", never empty, and the build stays deterministic; the size test stays under the 120 KB warning.
- **AC-14** (FR-35–FR-39) Unit tests on `lib/prefs.ts` and the boot script (`jp-lite` values, storage failure); Playwright with `saveData` emulated (init script) shows "We switched to Lite mode"; the header switch and the Explore switch stay in sync; "Show map" on the site page loads the mini map once and leaves `jp-lite` unchanged.
- **AC-15** (FR-40, FR-41, NFR-3) Playwright: Baliati's mini map loads on scroll and "Open in Explore" opens `/explore/?view=map&sel=JB-DHK-064` with the summary open; the existing check that all 114 hidden-pin pages have no coordinates and no directions link also asserts no mini map and no "Open in Explore".
- **AC-16** (FR-4–FR-6, NFR-5) Playwright at 390, 1024, 1280 and 1440 px: the right panes show for `view=list` and `view=map`; no horizontal scroll at 390 px. `npm run screenshots` adds Explore with the map at 1440 px (popover open), 390 px (peek, half, full, summary) and 390 px dark (full), and Baliati's Location section, for the owner's review against the boards.
- **AC-17** (NFR-1, FR-42) axe: no serious or critical issues in the NFR-1 states; a Bangla run shows Bangla digits on clusters and in the bar.
- **AC-18** (FR-3, FR-9) Playwright: switching map → list → map ten times leaves one `.leaflet-container` in the page; resizing from 1440 to 1100 px leaves no grey (unrendered) tile area, checked by the map's size matching its container.
- **AC-19** (FR-7) Playwright: after applying a filter, every mappable result's pin (or its cluster) lies inside the map's bounds; panning by hand and then changing the sort or pressing Load more leaves the bounds unchanged; a filter with no mappable results shows the Bangladesh bounds.
- **AC-20** (FR-11) Playwright with JavaScript disabled: `/explore/?view=map` shows the spec 06 note and link, and no map container.

## 9. Dependencies, constraints, and assumptions
### Dependencies
- Phase 6 (Explore, URL state, `SiteCard` variants) is done; Phase 5's `LocationPanel` and `directionsUrl` exist.
- New packages at exact versions (I1): `leaflet`, `leaflet.markercluster`, `@types/leaflet`, `@types/leaflet.markercluster`.
### Constraints
- Static export, no server (`next.config.mjs`: `output: 'export'`); Leaflet touches `window`, hence `ssr: false` (FR-1).
- `lib/data.ts` is `server-only`; the map gets everything from `index.json` or from props.
- Interface strings render both languages and CSS shows one (I3, `components/T.tsx`); client components use `useUiLang()` (`lib/use-ui-lang.ts`).
- `ExploreApp` already keeps per-entry state in `history.state.jp` (A-4 of spec 06); FR-27 extends it.
- Tests take expected values from the built data, never typed numbers (I6); `npm run e2e` serves `out/` (`playwright.config.ts`).
- Breakpoints: `lg` 1024, `xl` 1280, `2xl` 1440 (`tailwind.config.ts`).
- OSM's tile policy forbids heavy use: OSM and CARTO are for development and protected previews until O4 is decided.
### Assumptions (all accepted by the owner with the spec, 2026-10-24)
- **A-1** Focus after closing a summary returns to the element that opened it: the pin, or the "Show on map" button; after Back (browser), to the pin.
- **A-2** The default base map follows the theme when a provider for each theme is available (CARTO Positron and Dark Matter, once O4 provides a key). Until then OSM standard is used in both themes (D5, amended).
- **A-3** Pin name labels show from zoom 12 (the board's "street level" panel).
- **A-4** "Show map" on a site page in Lite mode shows the mini map for that page view only.
- **A-5** Playwright serves a local fixture image for every tile URL, so CI never contacts tile servers.
- **A-6** The slow-connection suggestion, once dismissed, stays dismissed for the browser session (`sessionStorage`).
- **A-7** The tile error overlay shows after 3 consecutive tile errors, or when no tile has loaded 8 s after the map mounts.
- **A-8** The base-map choice lasts for the page session and is not stored or put in the URL.

## 10. Key decisions and rationale
Confirmed by the owner in the interview on 2026-10-24:
- **D1 The card's one-liner comes from `index.json`** as `sm`, the first sentence of `short_description` capped at 160 characters: one fetch, no per-site JSON, about +16 KB gzipped.
- **D2 The location line is the status label only**, because a location source count exists only in free text.
- **D3 The trip `RouteMap` waits for Phase 9**, which has the trip pages; Phase 7 provides the Lite preference and `MapLoader`.
- **D4 No search and no quick chips on the mobile map**; the existing Filters button floats over it.
- **D5 Base maps: OSM standard, CARTO Positron and CARTO Dark Matter**, in one config so that the O4 decision is a one-line change. **Amended 2026-10-24 (owner):** CARTO's basemaps now answer every request with an "API KEY REQUIRED" image, so the map offers OSM standard only, in both themes, until O4 picks the launch provider; the CARTO entries stay in `lib/map-config.ts`, switched off.
- **D6 Phones default to the list** (URLS.md, R7); the map is one tap away.
- **D7 Three panes from 1280 px**; from 1024 to 1279 px, rail + a Map/List pane; below, the phone layout.
- **D8 Lite mode switch in the site header and in Explore**, stored as `jp-lite`; Save-Data turns it on, a slow connection suggests it, and a manual choice wins (O7).
- **D9 Selecting a pin pushes one history entry**, so Back closes the summary and the link is shareable.
- **D10 Hover or focus on a row highlights its pin; "Show on map" selects it**; the name stays the row's only link.
- **D11 The map fits the results** on load and on each filter change; the map position is not in the URL.
- **D12 A `sel` that can't be shown is dropped**: with the notice when it came in a link, silently when a filter change excluded it.
- **D13 "Open in Explore"** on the mini map goes to `/explore/?view=map&sel=<ID>`.
- **D14 With Lite mode on, the map pane says so** and offers to turn it off; `view=map` is kept.

## 11. Open questions
- **OQ-1** Bangla wording for the new strings (map controls, key, sheet, Lite mode, error overlay): drafts with `needsReview` until a native reviewer signs them off.
- **OQ-2** The launch tile provider and its terms (O4), before 13.6 and 14.1. CARTO now needs an API key; OSM's tile policy forbids heavy use, and OSM has no dark style, so the dark theme shows light tiles until then.
- **OQ-3** Whether a reviewed card-line column (Phase 12) should replace the derived first sentence in `sm`.
