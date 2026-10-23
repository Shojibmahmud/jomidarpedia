# Design coverage matrix

Maps each of the 40 screen boards (plus the 2 print pages) in `../claude design/Jomidarpedia-png/` to its route or component, the states and interactions it shows, the data it needs, the roadmap tasks that cover it, and how it is verified. Task IDs refer to `roadmap/DEVELOPMENT_ROADMAP.md` version 2 (22 October 2026).

**How this was checked**
- **Opened and read this pass:** three boards, namely `বাংলা · Baliati · mobile`, `Offline slow network · mobile` and `Explore · filter drawer, all groups open`.
- **The other 37:** mapped from the design canvas source files (the `.dc.html` boards they were exported from) and from the review's findings.
- **Board text is not a source of facts.** Counts are generated from data (roadmap I6).
- **Status values:** `stale` means the board shows counts or text that the current data contradicts. `alt` means the board shows alternatives. `open` means part of the spec is unresolved.

| # | Board | Route / component | States and interactions | Data prerequisites | Tasks | Verification | Status |
|---|---|---|---|---|---|---|---|
| 1 | 404 · desktop | `app/not-found.tsx` | illustration, search box, links | none | 10.10, 3.8 | 10.13 | |
| 2 | 404 · mobile (dark) | `app/not-found.tsx` | dark theme, mobile | none | 10.10 | 10.13, 13.2 (dark) | |
| 3 | About and methodology · desktop | `/about` | grading definitions, limitations, disagreements, unpublished image counts, possible duplicates, contributions, licences | meta counts including `possibleDuplicates` and the images that need review or permission; O1, O2, O5 | 10.5, 10.6, 10.8, 10.9 | owner review of the copy; 10.13 | fixed 22 Oct 2026: 43 approximate was correct for mapped pins; an Unverified · 1 card was added, and the CSV promise became a cleaned download at launch (O1) |
| 4 | Accessibility · dark mode, contrast, focus states | tokens, focus ring, dark palette | contrast pairs, focus visibility | none | 3.1, 3.9, 13.2, 13.3 | 13.3 manual log; the board records design intent, not test results | |
| 5 | Brand · new mark and wordmark options | logo mark, wordmark, favicon | alternatives | none | 3.8 | the assets exist (3.8) | alt: use the selected mark |
| 6 | Day trips · listing · desktop | `/trips`, `ItineraryCard`, `TripsFilters` | camera-button credits, filters including "Has a timed plan", sort | `plan_status` (O11), trip thumbnails and credits | 9.1, 9.2, 2.10 | Playwright on the filters; owner review | fixed 22 Oct 2026: copy rewritten; cards show Timed plan / Suggested circuit |
| 7 | Day trips · listing · mobile | `/trips` (mobile) | as above, mobile | as above | 9.1, 9.2 | as above | fixed 22 Oct 2026: same |
| 8 | Design system · components | shared components | badges, chips, cards, buttons and their states | none | 5.1–5.4, 6.1, 6.6 | unit tests for labels; owner review | |
| 9 | Design system · tokens & brand | `tailwind.config.ts`, `tokens.css` | light and dark tokens, type scale | none | Phase 0, 3.1, 9.11 | placeholder page (0.5) | |
| 10 | Developer handoff · Next.js + Tailwind | architecture reference | data flow, route table | none | §1 of the roadmap | not applicable | fixed 22 Oct 2026: 413 rows, 34.9 KB |
| 11 | District · Manikganj · mobile | `/district/[slug]` | counts, condition bar, site list, `MapTeaser` | `districts.json`, map SVGs | 10.2, 3.8 | 10.13 | |
| 12 | Division · Dhaka · desktop | `/division/[slug]` | location-confidence summary, no-pin list, related trips | `divisions.json` | 10.1 | 10.13; counts come from one source | fixed 22 Oct 2026: 11 confirmed, 44 one source, 13 approximate, 1 unverified, 42 no pin |
| 13 | Explore · desktop (pin popover open) | `ExploreApp`, `FilterRail`, `MapView`, `SummaryCard` | list and map synchronised, popover, Copy view | index additions (2.4) | 6.x, 7.3–7.6, 6.11 | 6.12, 7.12 | fixed 22 Oct 2026: "Showing 7 of 132" and day-trip filter counts from data |
| 14 | Explore · filter drawer, all groups open | `FilterDrawer` | every group: day trip, time, condition, visiting, where, type, information quality, photos and hours; draft, then "Show N" | `ty`, `hv`, `p`, `rc`, `lc` (2.4, 2.9) | 6.2, 6.6, 6.8 | 6.12 | "Hours recorded 289" is replaced by the rule in 2.9 |
| 15 | Explore · mobile filter drawer | `FilterDrawer` (mobile) | draft, apply, cancel, focus trap | as above | 6.8 | 6.12 | |
| 16 | Explore · mobile list, sheet up (dark) | results `BottomSheet` | list inside the sheet at full height, dark theme | index | 7.7 | 7.12 | |
| 17 | Explore · mobile map + summary sheet | selected-site sheet, `SummaryCard` | pin selected, close returns focus, Read more, Directions | index | 7.6, 5.18 | 7.12 | |
| 18 | Explore · mobile sheet peek, half, full | results `BottomSheet` | snap points, handle button, transitions to and from the selected-site sheet | none | 7.7 | 7.12 | |
| 19 | Explore · pin set and clusters by zoom | `SitePin`, `ClusterIcon`, `MapKey` | four fills plus unverified (O9), "?" badge, cluster sizes, 1.5 km circle | `lc`, `f` | 7.3, 7.4, 7.8 | 7.12 | fixed 22 Oct 2026: the unverified pin (O9) and the display-convention circle are now described on the board |
| 20 | Home · desktop | `app/page.tsx` | hero, tiles, numbers strip, map teaser, divisions, trips, trust band | meta, thumbnails, map SVG | Phase 11, 3.5, 3.8 | 11.x; 13.1 | counts from meta |
| 21 | Home · mobile | `app/page.tsx` (mobile) | as above | as above | Phase 11 | as above | |
| 22 | Image credits and licences · desktop | `/credits`, `/about#licences` | exact credit lines, filter by site, licences | `credits.json`; O5 | 10.7, 10.8 | 13.9 (every image is credited) | shows CC BY-SA 4.0 for text and data, which is the evidence for O5 |
| 23 | Itinerary · Manikganj heritage loop · desktop | `/trips/[id]` | route map, stops, budget with a partial total, DayCheck, icons | budget rows (2.6, 2.7), legs (2.10), `closed_days` (2.11), fares (12.8) | 9.3–9.8 | owner review; budget unit tests | open: Tk 405 known plus named omissions is the intended behaviour; the shared-rickshaw assumption must stay visible |
| 24 | Itinerary · Mymensingh and Muktagacha · desktop | `/trips/[id]` | as above, a different trip | as above | 9.3–9.8 | as above | |
| 25 | Itinerary · mobile (dark) | `/trips/[id]` (mobile) | dark theme, Lite mode shows the list | as above | 9.x, 7.9 | 13.2 | |
| 26 | Loading skeletons · mobile | `Skeleton` | row, card and map variants | none | 10.11 | visual check | |
| 27 | Offline slow network · mobile | `OfflineNotice`, Lite mode | "We switched to Lite mode" toggle; offline toast with Dismiss and Try again | none | 7.9, 10.12 | 10.13, 7.12 | fixed 22 Oct 2026: copy follows O7 and O8 |
| 28 | Search results · desktop | `SearchApp` | grouped results (Sites, Districts, Families), `<mark>` | `fm` (2.4), districts | 8.2–8.4 | 8.5 | |
| 29 | Search · did you mean + no results · mobile | `SearchApp` empty state | "Did you mean", illustration, suggestions | index | 8.4 | 8.5 | |
| 30 | Site page · Baliati · desktop (full record) | `/site/[id]/[slug]` | gallery, at-a-glance, location, timeline, legends, conflicts, feature cards, visiting, routes, itinerary preview, sources | 2.2, 2.3, 2.8, 2.14 (features), 2.10 (timed preview) | 5.x | 5.19 | open: feature cards and competing area figures need `features.csv` (2.14); until then "Not documented" |
| 31 | Site page · Baliati · mobile (dark) | site page (mobile) | `SectionNav` select, dark theme | as above | 5.15 | 5.19, 13.2 | |
| 32 | Site page · Elangi · desktop (sparse, beside Baliati) | site page, sparse | unknowns as text, no photo, no pin | 2.12, 2.13 | 5.2, 5.6, 5.14 | 5.19 | |
| 33 | Site page · Elangi · no photo, no pin | `NoPhotoPanel`, `LocationPanel` (no pin) | outbound photo search, Share a photo | 2.12 (O10), 5.13 | 5.14, 5.13 | 5.19 (no coordinates in the HTML) | open: outbound link policy (O10) |
| 34 | Source page · the core book · mobile | `/sources/[id]` | author, publisher, edition, ISBN, verification method, counts by division, examples, link to all citing sites | 2.15 | 10.4 | 10.13; owner review | |
| 35 | Sources · list · desktop | `/sources`, `SourcesTable` | filter, sort, paging | `sources.json` | 10.3 | 10.13 | fixed 22 Oct 2026: copy rewritten |
| 36 | বাংলা · Baliati · mobile | site page in Bangla mode | translates long prose | Bangla prose (not in the data) | O6; post-MVP 11a | not applicable for the MVP | open: board 36 shows prose translation; the MVP default (O6) is interface-only |
| 37 | বাংলা · Explore · desktop | Explore in Bangla mode | Bangla interface, Bangla digits | none | 3.1, 3.2, 6.x | 3.x tests; 6.12 run in Bangla | |
| 38 | বাংলা · Home · desktop | home in Bangla mode | layout identical to English | none | 11.7 | owner review | |
| 39 | বাংলা · Home · mobile | home in Bangla mode (mobile) | as above | none | 11.7 | owner review | |
| 40 | বাংলা · type and conjunct check | `font-bn` scale, conjuncts, Latin digits for IDs and coordinates | none | none | 3.2, 13.4 | 13.4 on real devices | |

**Print pages:** exported on 22 Oct 2026 as `Print A4 · page 1 · route and stops.png` and `Print A4 · page 2 · before you go.png` (boards 41 and 42 in the folder). Tasks 9.10–9.12 use them.

**Visible actions and where they lead (finding C3):**
- Share a site or an itinerary: 5.16 and 9.9, falling back to copying the link.
- Copy the Explore view: 6.11. Copy coordinates: 5.16.
- Directions: 5.18 and 7.6.
- Open all of an itinerary's stops on the map: 9.8.
- View every site that cites a source: 10.4.
- From a family search result to its sites: 8.2.
- The header's Divisions menu: 3.9.
- The footer's Licences link: 3.9 and 10.8.
- Photo contributions and corrections: 5.13.
