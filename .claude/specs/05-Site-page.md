# Site page

**Status:** Approved (by the owner, 2026-10-23)
**Roadmap reference:** `roadmap/DEVELOPMENT_ROADMAP.md` §3 Phase 5 (tasks 5.1–5.19); also §2.1 R2, R3, R4, R5, R6 and R10, §2.2 I2 and I3, §2.3 O1, O2, O6, O9, O10 and O13; `roadmap/DESIGN_COVERAGE.md` rows 30–33
**Source task:** "The site page covers every state in the designs, including sparse records."
**Branch:** `06-phase-5-site-page`
**Date:** 2026-10-23

## 1. Problem and intended outcome
Phase 4 shipped a text-only site page (`app/site/[id]/[slug]/page.tsx`) for all 413 sites: names, ID, summary and condition. Everything else in `SiteRecord` (`lib/types.ts`) is built but never shown: facts and their sources, location status, history, legends, conflicts, features, visiting info, routes, images, related sites, itineraries, sources and still-to-confirm.

Four design boards set the target:
- `Site page · Baliati · desktop (full record)`;
- `Site page · Baliati · mobile (dark)`;
- `Site page · Elangi · desktop (sparse, beside Baliati)`;
- `Site page · Elangi · no photo, no pin`.

The interview also found data problems that a full page would expose:
- **Coordinate text on hidden pins.** 38 of the 114 hidden-pin records hold coordinates in text: 37 in `location.note`, and 1 in a conflict on JB-RAJ-014.
- **Relation type lost.** `related[]` drops the relation type, so "possible duplicate" records would be offered as trip companions.
- **Reversed year ranges.** 376 history events show reversed years (`2026–2010`).
- **Placeholder events.** 148 history events only say "Not documented".
- **One-version conflicts.** 781 of the 982 conflicts have a single version, so they are notes, not disagreements.

**Outcome:** every site page renders every section of the boards from real data, with unknowns as words. Each section's state (full, partial or empty) is honest, and no hidden-pin page exposes a coordinate. Automated tests cover six representative sites, an axe check finds no serious or critical issues, and the owner reviews screenshots against the boards.

## 2. Scope
### In scope
- **Tasks 5.1–5.19.**
- **Additions from the boards** that no 5.x task names:
  - the "Little is documented" banner and the "What we know so far" checklist with "Help complete this page", for sparse records (FR-6, FR-14);
  - the related-records note (FR-12);
  - the itineraries preview, as unlinked text (FR-44).
- **Build and contract changes:**
  - a relation type on `related[]` (FR-50);
  - history year and placeholder fixes (FR-51, FR-52);
  - hidden-pin coordinate rules (FR-53, FR-54);
  - one CSV text fix (FR-55).
- **Tooling:**
  - `@axe-core/playwright` as a pinned devDependency;
  - Playwright tests for the six sites (5.19);
  - a screenshot script for the owner's visual review (FR-58).
- **Interface strings** for every new label, in `lib/i18n.ts`.

### Out of scope
- **The map.** There is no Leaflet mini map in `LocationPanel`: no tiles, no drawn pin, no drawn radius. Phase 7 adds it.
- **Itinerary links and the timed preview.** Links to `/trips/[id]` and the stop-by-stop preview with clock times shown on the Baliati board wait for Phase 9.
- **Translated prose** (O6). Prose stays English with `lang="en"`.
- **The correction email link,** until O2 provides an address.
- **Editorial rewrites** of the 37 hidden-pin `coordinates_note` cells (Phase 12). They are hidden instead (FR-53).
- **Inventing data.** No disambiguation record is added for Elangi, because the Dhunat/Chaukibari house has no site record (see §10, D3).
- **Later-phase checks:** Lighthouse budgets, sitemap, Open Graph and print styles for the site page (Phase 13).
- **Explore and home cards.** `SiteCard` belongs to Phase 6; `CombineWith` here uses its own small card.

## 3. User journeys / use cases
- **UJ-1 Day-tripper on a phone (Baliati).** They see the photo, the badges (preserved, ticketed Tk 30, day trip, location confirmed) and the at-a-glance box. They jump to "Getting there" with the section `<select>`, read the bus route with its cost basis and date, and tap Directions, which opens Google Maps in a new tab.
- **UJ-2 Researcher.** They read the history timeline with its footnotes and see the legends in a separate box with their attribution. In "Sources disagree" each version shows its own sources, plus the sources not matched to any version, and they follow a footnote to the numbered source list.
- **UJ-3 Descendant visiting a sparse record (Elangi).** The banner says little is documented. The placeholder art and "No open-licence photo yet" stand where a photo would be, and the location panel says "No map location yet", with no coordinates anywhere. The checklist shows what is known and what isn't. "Share what you know" opens the corrections form, pre-filled with the site ID, the field and the page URL.
- **UJ-4 Contributor with a photo.** On a site without photos they choose "Have a photo you can share? Tell us". The photo-offer issue form opens pre-filled; nothing is uploaded.
- **UJ-5 Keyboard or screen-reader user.**
  - They open the gallery lightbox and move with the arrow keys or buttons; Esc closes it and focus returns to the image they opened.
  - Share and Copy announce their result in a polite live region.
- **UJ-6 Returning visitor a year later.** The page was built months ago. The "Last checked" date now carries "May be out of date", because the client checks against today's date.

## 4. Functional requirements

### Page frame
- **FR-1** The page keeps Phase 4's routing, metadata and canonical link (spec 04 FR-1, FR-6). Sections appear in the board's order:
  1. header;
  2. gallery or no-photo panel;
  3. Summary;
  4. Location;
  5. History and owners;
  6. Architecture and grounds;
  7. Stories told about this place;
  8. Visiting;
  9. Getting there from Dhaka;
  10. Itineraries;
  11. Combine with;
  12. Sources and open questions.

  The at-a-glance box sits in a sidebar on desktop and after the summary on mobile.
- **FR-2** Every section is always rendered, with its empty state when it has no data (R2). Each section heading shows the English title with the Bangla title beneath it, as on the boards.

### Header (5.1, 5.4)
- **FR-3** `Breadcrumb`: the division, district and upazila as text, then the site's English name. Division and district pages arrive in Phase 10, so the crumbs are not links yet. The current page is marked `aria-current="page"`. *(Phase 10: the division and district now link to their pages, spec 10 FR-34; each source's SRC ID links to its source page, spec 10 FR-33.)*
- **FR-4** `BilingualName` replaces `components/site/SiteNames.tsx`.
  - The `<h1>` holds the English name (`lang="en"`) and the Bangla name (`lang="bn"`).
  - When `bnMissing` is set (O13), it shows the English name only, with "Bangla name not yet recorded" outside the `<h1>`.
  - The alternate names follow as "Also called …", then the ID in Latin digits.
- **FR-5** The badge row (Assumption A-4):
  - `ConditionBadge`;
  - `AccessBadge`, with the fee when `visiting.fee.known`;
  - `DayTripBadge`, with the travel time when known;
  - `LocationBadge`;
  - "N sources";
  - "Sources disagree on N points", where N counts conflicts with 2 or more versions (FR-34);
  - "N open questions", where N counts one-version conflicts (FR-35).

  The last three appear only when N > 0.
- **FR-6** `RecordBanner` "Little is documented about this site" appears on **sparse** records only, with a link to the "What we know so far" box. A record is sparse when 3 or more of these 7 items are unknown:
  1. union (`place.union`);
  2. founder (`founder.known`);
  3. a route (`travel.routes.length > 0`);
  4. an exact location (`location.status` is `verified` or `single_source`);
  5. a date or history (`era.known`, or at least one history event after FR-52);
  6. style and condition (`style.known` and `condition !== 'unknown'`);
  7. a photo (`images.length > 0`).

  The rule is a pure function in `lib/` so that the banner and the checklist cannot disagree.
- **FR-7** `ShareButton` and `SuggestCorrection` (`field=general`) sit in the header.

### Badges (5.1)
- **FR-8** `ConditionBadge` covers the 5 `Condition` values; it reuses the Phase 4 `condition.*` strings and `components/art/ConditionGlyph.tsx`.
- **FR-9** `AccessBadge` covers the 5 `Access` values. A fee is shown as "Tk N" only when `visiting.fee.known` and N > 0. It is never "Free" and never "Tk 0" (R6).
- **FR-10** `DayTripBadge` has three states: `dayTrip === true`, `false`, and absent ("Day trip not stated"). An absent value is never shown as "no".
- **FR-11** `LocationBadge` covers verified, single source, approximate, **unverified** (O9: outlined, with the "?" badge and the label "Location unverified") and no pin (`latlon` absent: "No map location yet"). A `flagged` site shows the "?" mark.

### Summary (5.4 and board)
- **FR-12** Summary: `site.summary` as English prose with `lang="en"`. Below it comes the **related-records note**, one line for each `related[]` entry whose relation is not `combine_on_trip`:
  - `same_name_different_site`: "Not the same place as [name]";
  - `possible_duplicate`: "May be the same place as [name]";
  - `possibly_part_of`: "May be part of [name]";
  - `same_complex`: "Part of the same complex as [name]";
  - `same_family_separate_site`: "Same family, separate site: [name]".

  Each line links to the other site's page and shows the relation note as English prose.

### At a glance (5.5)
- **FR-13** `AtAGlance` shows:
  - era, founder or family, style, condition with preservation, entry, access, time from Dhaka, one-way cost, hours and best time;
  - each `Fact` as its value, or its `text` when unknown (`Unknown`, FR-16);
  - footnote markers only for the fact's own `sources` (R3).

  Below come `LastChecked` for `site.lastVerified` (Assumption A-2) and the record confidence in words.
- **FR-14** On sparse records (FR-6) only, "What we know so far" lists the 7 items of FR-6 plus "It exists (listing)", which is always ticked. Each item is shown as known or not known, as text with an icon, never by colour alone. "Help complete this page" links to `SuggestCorrection` (`field=general`).
- **FR-15** On desktop the sidebar ends with a "Plan the day trip" action only when `itineraries.length > 0`. It scrolls to the Itineraries section.

### Unknowns and dates (5.2, 5.3)
- **FR-16** `Unknown` renders a `Maybe<T>`:
  - `known: true`: the formatted value, with its `note` if present;
  - `known: false`: its `text` in an italic muted style.

  It never renders an empty string, `0` or "Free".
- **FR-17** `LastChecked` renders "Last checked {date}" on the server, using the date formatters in `lib/format.ts`. A client island adds "May be out of date" when the date is more than 12 months before the client's current time. Without JavaScript only the date shows. Tests use a fixed clock.

### Location (5.6, 5.16, 5.18)
- **FR-18** `LocationPanel` has five states, keyed on `location.status` and on whether `latlon` is present: verified, single source, approximate, unverified, and no pin. There is **no map** in this phase. Each state shows:
  - the place lines in English and Bangla (union, upazila, district and division where present);
  - the `LocationBadge` with a short explanation;
  - `location.note` as English prose (mappable sites only; FR-53).
- **FR-19** Mappable sites also show:
  - the coordinates in Latin digits (5 decimal places);
  - a "Copy coordinates" button (FR-41);
  - a **Directions** link to `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lon>` (5.18);
  - "Open in Google Maps" using `location.googleMapsUrl`.

  Both links open in a new tab with `rel="noopener noreferrer"`, and their visible labels say they open Google Maps.
- **FR-20** For approximate sites, the panel carries the label "display radius, not a measured area". The map that draws the radius arrives in Phase 7; the label is in place for it now.
- **FR-21** Hidden pins (no `latlon`) show "No map location yet", the explanation, and "Know where it is? Suggest a location" (`SuggestCorrection`, `field=location`). There are no coordinates, no Copy button, no Directions link and no "Open in Google Maps" link (R5).

### History, legends (5.7, 5.8)
- **FR-22** `HistoryTimeline` lists `history[]` in order: the year (or "Date unknown"), the text, its status as words, and the event's own footnotes. The founder line ("Founder: …") opens the section when `founder.known`.
- **FR-23** When `history` is empty after FR-52, the empty state shows "No history recorded yet", the founder line when known, and "Share what you know" (`SuggestCorrection`, `field=history`).
- **FR-24** `LegendBox` is a separate section, "Stories told about this place", **after** the timeline and outside it (R3). For each legend it shows:
  - its evidence type as a label (local oral account, unattributed report, legend or folklore);
  - the text and the attribution;
  - its `sources`, with `reported_by` shown as "reported by";
  - the line "Not verified. Kept apart from the history above."

  With no legends it shows "none recorded yet" and "Tell us a story" (`field=stories`).

### Architecture (5.10)
- **FR-25** "Architecture and grounds" shows the style fact, then `FeatureList`:
  - each feature with its Bangla text when present, its measurement and unit when present, its status and its sources;
  - "Not documented in the sources checked" when `features` is empty.

  Competing feature measurements appear as conflicts (FR-34).

### Visiting (5.11)
- **FR-26** `VisitingInfo` shows hours, closed days, entry fee, photography, facilities, accessibility, restrictions and best time, each through `Unknown`.
  - Closed days come only from `closedDays`:
    - known with days: the days named;
    - known with `[]`: "No weekly closing day";
    - `known: false`: "Closing days not documented".

    The unreviewed `closed` text is shown only as a secondary note marked as unverified.
  - The fee follows R6:
    - "Tk N per person" only when known and > 0;
    - "No ticket reported" for an `open_no_ticket_reported` access;
    - otherwise the `fee.text`;
    - never "Free" or "Tk 0".
  - Section header: `LastChecked` with `visiting.date`, and "Visiting info not dated" when there is no date.
- **FR-27** A private-house notice appears when `access = restricted_or_permission` (Assumption A-1): "Private or unmanaged. People may live here." It also says to ask before entering and to photograph from outside unless invited.

### Getting there (5.12)
- **FR-28** `RouteSteps` shows the primary route's steps in order. Each step has a mode icon and its label, note and cost text.
  - `unknown` and `mixed` modes get **neutral** icons; `unknown` is never drawn as a bus.
  - `inferred` routes say the mode was inferred.
- **FR-29** A summary line shows the hours ("about N h") and the cost ("about Tk N one way") only when known. The `costBasis` and `estimateDate` follow ("Estimate per person …, made {date}"). When a value is missing, the text says it is not documented instead of showing a number.
- **FR-30** `RouteAccordion` lists the alternative routes as disclosures (`<details>` or an equivalent accessible pattern), each with its mode, description, hours and cost when known.
- **FR-31** `CostTable` shows each cost with its unit, basis and date; no cost is shown without its date or the words "undated". With no routes, the section shows "No route documented yet" and "Suggest a route" (`field=getting-there`).

### Itineraries (board)
- **FR-44** "Itineraries" lists each `itineraries[]` entry as its title and duration, as plain text with no link until Phase 9. With none, it shows "Not part of a suggested itinerary yet". *(Phase 9, 2026-10-25: each entry now links to `/trips/<id>/`, and a reviewed timed plan shows its stops with times; spec 09 FR-51, FR-52.)*

### Combine with (5.15)
- **FR-32** `CombineWith` shows only the `related[]` entries whose relation is `combine_on_trip`. Each has its thumbnail or `PlaceholderArt`, both names, district, travel time when known, condition, and a link to its site page. With none, it shows "No nearby suggestions yet".

### Conflicts and open questions (5.9)
- **FR-34** `ConflictNote` covers each conflict with **2 or more versions**: the field, then each version with its **own** sources. If present, `unattributedSources` follows under "Sources for this disagreement (not matched to a version)". No source is shown against a version it isn't attached to (R3).
- **FR-35** A conflict with **one version** is an "Open question" box under Sources and open questions, showing the field, the text and any sources. It is not counted in "Sources disagree".
- **FR-36** `ConflictNote`s appear in the section their field belongs to when that mapping exists (e.g. "Site area" under Architecture). Otherwise they appear under Sources and open questions. A summary box "Where sources disagree" under Sources and open questions lists every multi-version conflict with an in-page link.

### Sources and still to confirm (5.15)
- **FR-37** "Sources and open questions" holds:
  - the numbered `sources` list, each with its title, publisher, date and URL when present, and its `SRC-` ID; footnote markers elsewhere link to these anchors;
  - the open questions (FR-35);
  - `StillToConfirm`, listing `stillToConfirm`, followed by "Suggest a correction".
- **FR-38** `StillToConfirm` with an empty list says "Nothing listed".

### Corrections (5.13)
- **FR-39** `SuggestCorrection` builds a URL from `CORRECTIONS_URL` (`lib/nav.ts`) and adds these query parameters: `site_id`, `field` (a section key or `general`; Assumption A-3) and `page_url` (the canonical URL).
  - The email link appears only when an O2 address is configured; none is configured now.
  - The "Share a photo" variant targets the `photo-offer.yml` template with `site_id` and `page_url`.
  - Neither variant uploads anything.

### Photos (5.14, 5.17)
- **FR-40** With `images.length > 0`, `Gallery` shows the first image large and up to 4 more as tiles, plus "All N photos" when N > 5 (Assumption A-6).
  - Each image uses its committed `thumb` and its `alt` with `lang=altLang`.
  - The `credit` (verbatim) and a link to `sourcePage` sit **below** each image (R4).
  - The full-size `full` URL is requested only when the lightbox opens.
- **FR-41** `Lightbox` behaviour:
  - It opens as a modal dialog, with focus trapped while it is open and returned to the trigger on close.
  - Left and right arrows, Esc, swipe, and Previous, Next and Close buttons all work.
  - It shows a counter ("3 of 12"), and each image's credit and source link below it.
- **FR-42** With no images, `NoPhotoPanel` shows `PlaceholderArt` (`components/art/PlaceholderArt.tsx`) and "No open-licence photo yet" with its explanation. It also shows:
  - the `externalPhotos` link when present (O10: "Search for visitor photos", name-only for hidden pins), opening in a new tab, with a visible note that those photos can't be copied here;
  - "Have a photo you can share? Tell us" (FR-39 photo variant).

### Navigation and sharing (5.15, 5.16)
- **FR-43** `SectionNav` has two forms:
  - **Desktop:** a sticky "On this page" list of anchor links, with the current section marked. Each item may carry a status hint: "No pin" for Location without `latlon`, "Not yet" for an empty section, "None" for no legends (Assumption A-7).
  - **Mobile:** a `<select>` that moves to the chosen section and focuses its heading.
- **FR-45** `ShareButton` uses `navigator.share` when available. Otherwise it copies the canonical URL to the clipboard. A polite live region announces "Link copied" or "Couldn't copy the link". Cancelling the share sheet is not reported as a failure.
- **FR-46** "Copy coordinates" (mappable sites only) copies `lat, lon` in Latin digits and announces the result in the same live region.

### Interface strings
- **FR-47** Every new label is a `lib/i18n.ts` key rendered through `<T>`. The Bangla wording comes from the boards where they show it; every other Bangla string is a draft marked `needsReview: true` (D11). Client-built strings (live-region messages) read the language through `lib/use-ui-lang.ts`.

### Build and contract changes
- **FR-50** `related[]` entries carry `relation` (one of `combine_on_trip`, `same_name_different_site`, `possible_duplicate`, `possibly_part_of`, `same_complex`, `same_family_separate_site`) and `note`, from `site_relationships.csv`.
  - When the same pair appears more than once, the non-`combine_on_trip` relation wins.
  - `lib/types.ts` and `docs/DATA_CONTRACT.md` are updated together.
- **FR-51** History years: when `year_end` is earlier than `year_start`, the build emits `year_start` alone and lists the row in the data report. (376 `present_condition` rows were affected on 2026-10-23.)
- **FR-52** History placeholders: the build drops events whose description is only a "Not documented…" statement and lists them in the data report. Before this, 148 events on 108 sites; 34 sites had no other event. The exact match rule lives in `scripts/lib/rules.mjs` and has a unit test.
- **FR-53** For hidden-pin sites (no `latlon`), the build omits `location.note` from the site record.
- **FR-54** A new **structural** gate (enforced in every mode) fails the build when any string field of a hidden-pin site record contains a coordinate pattern: two decimal numbers in Bangladesh's latitude and longitude ranges, with 3 or more decimal places. A hostile fixture in `tests/fixtures/csv/hostile/` covers it.
- **FR-55** Fix the one remaining case in the CSV: JB-RAJ-014's conflict text in `claims.csv` names a museum's coordinates. The coordinates are removed and the place name is kept.

### Tests and tooling (5.19)
- **FR-56** Unit tests (Vitest):
  - every badge label in both languages (5.1);
  - `Unknown` for known, unknown and noted values;
  - `LastChecked` with a fixed clock on both sides of 12 months;
  - the sparse rule (FR-6);
  - the `SuggestCorrection` URL builder;
  - the FR-51, FR-52 and FR-54 build rules.
- **FR-57** Playwright tests on six sites. Assertions are built from `data/build/**`, never from typed numbers (I6). The sites:
  - **Baliati** (JB-DHK-064): full record;
  - **Elangi** (JB-RAJ-002): no photo, no pin, unknowns, sparse;
  - **conflict-heavy**: JB-MYM-019 (Assumption A-5);
  - **unknown access and fee**: JB-BSL-004 (Assumption A-5);
  - **unverified**: JB-DHK-008 (O9);
  - **missing Bangla name**: JB-RAJ-059 (O13).

  The tests assert that:
  - the legends are outside the timeline element;
  - no fee renders as a price or as "free entry" where it is unknown or 0;
  - hidden-pin HTML contains no coordinate pattern (the FR-54 pattern) and no `/maps/dir/` link;
  - every `<img>` in the gallery has a visible credit and source link;
  - the lightbox keyboard behaviour (FR-41) and the focus return work;
  - every section heading of FR-1 is present on every tested site.

  In addition, an axe check (`@axe-core/playwright`, pinned) runs on the six sites in light and dark mode and fails on serious or critical issues (Assumption A-8).
- **FR-58** `npm run screenshots` captures full-page PNGs into a gitignored folder:
  - Baliati and Elangi at 390 px and 1440 px (light);
  - Baliati at 390 px in dark mode.

  The owner compares them with the four boards.

## 5. Non-functional requirements
- **NFR-1 Accessibility:** WCAG 2.2 AA.
  - one `<h1>` and ordered headings;
  - visible focus;
  - targets at least 24×24 px;
  - status is never shown by colour alone;
  - the lightbox is a modal with a focus trap;
  - live regions for share and copy.
- **NFR-2 Little client JavaScript:** only these are client components: the `LastChecked` freshness island, `ShareButton` and Copy, `Gallery` with `Lightbox`, and the mobile `SectionNav` `<select>` (plus the scroll marker on desktop). Everything else is a Server Component.
- **NFR-3 Slow networks:**
  - page images are committed thumbnails with `width` and `height` set, and `loading="lazy"` below the first image;
  - full-size Wikimedia files load only inside an open lightbox.
- **NFR-4 Privacy and R5:** no coordinates on any hidden-pin page, in the HTML, inline data, links or metadata.
- **NFR-5 Static:** no new runtime dependency on a server. The pages stay `output: 'export'`.
- **NFR-6 Both themes:** every component uses the tokens in `app/tokens.css`. The dark board is the reference.

## 6. Data, interfaces, and integrations
- **Inputs:** `getSite(id)` (`lib/data.ts`) → `SiteRecord`. No new browser fetch.
- **Contract changes:** `related[].relation` and `related[].note` (FR-50); `location.note` absent for hidden pins (FR-53); the history changes (FR-51, FR-52). `lib/types.ts` and `docs/DATA_CONTRACT.md` change together (roadmap 2.17).
- **Outbound links:**
  - the corrections repository's issue forms `correction.yml` and `photo-offer.yml` (O1, task 0.9);
  - Google Maps Directions and "Open in Google Maps" for mappable sites;
  - the O10 name-only photo search;
  - Wikimedia Commons for full images and source pages.
- **Browser APIs:** `navigator.share` and `navigator.clipboard`, each feature-detected.

## 7. Edge cases and failure behavior
- **A missing field anywhere** → the `Unknown` text or the section's empty state. Never a blank.
- **`bnMissing`** → FR-4. Related cards and breadcrumbs follow the same rule.
- **Unverified site (JB-DHK-008):**
  - it gets coordinates, Copy and Directions, because it is mappable;
  - the badge says "Location unverified", never verified or single source.
- **Approximate site** → coordinates are shown, with the display-radius label (FR-20).
- **More than 5 images** → "All N photos" opens the lightbox at image 1. **Exactly 1 image** → no tiles, and the lightbox has no Previous or Next.
- **A broken Wikimedia full image** in the lightbox → the thumbnail stays, with the message "Full-size image unavailable" and the source link.
- **No `navigator.share` and no clipboard** → the live region reports failure and the URL is shown as selectable text.
- **JavaScript off** → the date shows without the freshness note. The gallery thumbnails link to `sourcePage`. The `SectionNav` `<select>` is replaced by the anchor list.
- **Conflict sources:** a conflict with no sources at all shows its versions with "No source matched".
- **Fees:** `visiting.fee.known` with value 0 cannot occur (the build rejects it). If it ever did, the component would treat it as unknown (R6).
- **Coordinates in text:** a coordinate pattern in a mappable site's note is allowed, since that site's coordinates are already public.
- **Relation pairs:** a pair listed as both `combine_on_trip` and another relation → only the note (FR-50).

## 8. Acceptance criteria
- **AC-1** (FR-1, FR-2) On all six test sites, every heading from FR-1 is present, and no section renders empty (no element with an empty value cell).
- **AC-2** (FR-4) JB-RAJ-059's `<h1>` contains the English name only, and "Bangla name not yet recorded" follows outside it. On Baliati, both names are inside the `<h1>` with the right `lang`.
- **AC-3** (FR-5, FR-34, FR-35)
  - On JB-MYM-019 the "Sources disagree on N points" pill equals the number of its multi-version conflicts in the built JSON.
  - On Elangi, no disagreement pill appears, and an Open question with the "Record" text is shown.
- **AC-4** (FR-6, FR-14) Given the sparse rule:
  - Elangi shows the banner and the checklist;
  - Baliati shows neither;
  - a unit test checks the rule on fixtures at 2 and 3 unknown items.
- **AC-5** (FR-8–FR-11, FR-56) Unit tests render every badge value in both languages. JB-DHK-008 shows "Location unverified".
- **AC-6** (FR-9, FR-26, R6)
  - On JB-BSL-004 and Elangi, no text matches `Tk\s*0`, `free entry` or `Free` in the fee cells.
  - On Baliati, the fee is "Tk 30".
- **AC-7** (FR-16, FR-17) Given a fixed clock 13 months after `visiting.date`, the island shows "May be out of date". At 11 months it doesn't.
- **AC-8** (FR-18–FR-21, FR-53, FR-54, NFR-4)
  - Elangi's and every other tested hidden-pin page's HTML contains no match for the coordinate pattern and no `/maps/dir/` link.
  - Baliati's page has a Directions link containing its coordinates, which opens in a new tab.
- **AC-9** (FR-54) The hostile fixture with coordinates in a hidden-pin text field fails the build in `local` mode.
- **AC-10** (FR-24, R3) On Baliati, the legend elements are not descendants of the timeline element, and each legend shows its attribution.
- **AC-11** (FR-22, FR-23, FR-51, FR-52)
  - No history year in the built data matches a reversed range.
  - Elangi shows "No history recorded yet".
  - Baliati's present-condition event shows "2026".
- **AC-12** (FR-12, FR-32, FR-50)
  - `CombineWith` never lists a site whose relation is not `combine_on_trip`.
  - On a site with a `same_name_different_site` relation (e.g. JB-DHK-090), the related-records note shows "Not the same place as …".
- **AC-13** (FR-28–FR-31) A route with mode `unknown` or `mixed` renders the neutral icon. Every cost shown on Baliati has a date or the word "undated".
- **AC-14** (FR-39, FR-42)
  - The header's "Suggest a correction" href contains `site_id=`, `field=general` and an encoded `page_url=`.
  - On Elangi, "Tell us" targets `photo-offer.yml`.
  - No `mailto:` link is present.
- **AC-15** (FR-40, FR-41, R4)
  - Every gallery image on Baliati has a visible credit and source link below it.
  - In the lightbox, ArrowRight advances, Esc closes, and focus returns to the opener.
  - No `upload.wikimedia.org` or `thumb.wikimedia.org` request occurs before the lightbox opens.
- **AC-16** (FR-43) At 390 px the section `<select>` moves to "Getting there" and focuses its heading.
- **AC-17** (FR-45, FR-46) With `navigator.share` stubbed out and the clipboard mocked, Share announces "Link copied" in the live region. Copy coordinates on Baliati copies Latin digits.
- **AC-18** (FR-44) Baliati lists its itineraries with titles and durations, and contains no `/trips/` link.
- **AC-19** (NFR-1, FR-57) The axe check reports no serious or critical violations on the six sites in light and dark mode.
- **AC-20** (FR-58) The owner has reviewed the screenshots against the four boards ("reviewed against the design", not pixel-perfect) and records that in the roadmap.
- **AC-21** (FR-47) Every new string key has `en` and `bn`, and the i18n test lists the `needsReview` drafts.
- **AC-23** (FR-15, FR-25, FR-36, FR-38)
  - Baliati shows "Plan the day trip"; a site with `itineraries: []` does not.
  - Baliati's "Site area" conflict appears under Architecture and is listed in "Where sources disagree".
  - A site with `features: []` shows "Not documented in the sources checked".
  - A fixture with empty `stillToConfirm` shows "Nothing listed".
- **AC-22** (FR-1) The Phase 4 smoke tests still pass, and `npm run lint`, `typecheck`, `test` and `build:local` exit 0.

## 9. Dependencies, constraints, and assumptions
### Dependencies
- **Phase 4** (the routes, smoke tests and CI). **Phase 3** (`<T>`, `lib/i18n.ts`, `lib/format.ts`, `PlaceholderArt`, the committed thumbnails). **Phase 2** (the `SiteRecord` contract, per-fact sources, conflict attribution, features, closed days).
- **The corrections repository** `Shojibmahmud/jomidarpedia-corrections`, whose forms take the `site_id`, `page_url` and `field` prefills (roadmap 0.9).

### Constraints
- **Static export** with `dynamicParams = false` (R1, `app/site/[id]/[slug]/page.tsx`).
- **Bilingual markup** via `<T>`; no React context in Server Components (I3, `components/T.tsx`, `lib/use-ui-lang.ts`).
- **Build code:**
  - relations are built in `scripts/build-data.mjs` (around line 291) and history years around line 250;
  - reviewed rules live in `scripts/lib/rules.mjs`;
  - the hostile-fixture pattern is in `tests/fixtures/csv/hostile/`.
- **Smoke tests** in `e2e/smoke.spec.ts` derive their expectations from `data/build/**` (I6).
- **The correction link base** is `lib/nav.ts` `CORRECTIONS_URL`.
- **Tooling and builds:** exact-pinned devDependencies (I1). Run `next build` outside the sandbox (fonts).

### Assumptions (all accepted by the owner, 2026-10-23)
- **A-1** The private-house notice shows when `access = restricted_or_permission`.
- **A-2** `LastChecked` uses `site.lastVerified` in the header and at-a-glance box, and `visiting.date` in Visiting. "Out of date" means more than 12 months, measured against the client's clock.
- **A-3** `SuggestCorrection`'s `field` values are the section keys `summary`, `location`, `history`, `architecture`, `stories`, `visiting`, `getting-there` and `sources`, plus `general`.
- **A-4** The header badge set and the rule that count pills appear only when greater than 0 (FR-5).
- **A-5** The test sites: JB-MYM-019 as conflict-heavy (6 multi-version conflicts, the most of any site on 2026-10-23) and JB-BSL-004 for unknown access and fee.
- **A-6** The gallery layout: 1 large image, up to 4 tiles, and "All N photos" above 5 images.
- **A-7** `SectionNav` keeps every section and adds status hints.
- **A-8** The axe check runs on the six sites in both themes.

## 10. Key decisions and rationale
- **D1 One spec for the phase,** consistent with specs 01–04.
- **D2 No map in `LocationPanel`.** Leaflet, tiles and attribution belong to Phase 7. Without them, Phase 5 stays free of map code (R7).
- **D3 Relation type on `related[]`.** Without it, `CombineWith` would recommend possible duplicates. While writing this spec we found that the Dhunat/Chaukibari house named on the Elangi board **has no site record**, so no `same_name_different_site` row can be added. Elangi's "must not be merged" text still appears as its open question (D6), and the note is shown wherever a real relation row exists.
- **D4 Itineraries listed without links** until Phase 9, so the protected preview has no 404s.
- **D5 "Sparse" comes from the data,** not from `record_confidence`: Baliati is `not_graded` and Elangi is `partially_confirmed`. 3 or more unknown items out of 7 matched 135 sites at interview time (before FR-52), including Elangi and excluding Baliati.
- **D6 Conflicts split by version count.** A one-version "conflict" is a note, not a disagreement. Calling it a disagreement would overstate uncertainty on 364 sites.
- **D7 History fixed in the build,** not in the component, so that every consumer (later trip and division pages) gets clean data, and the report shows the editors what to fix.
- **D8 Hidden-pin notes omitted, plus a structural gate.** R5 is enforced in every mode. The 37 notes are mostly useful landmark text, but editing them is Phase 12 work, so hiding them is the safe default.
- **D9 Google Maps for Directions,** because it is the most familiar to Bangladeshi users. The CSV link is used for "Open in Google Maps" on mappable sites only.
- **D10 A screenshot script for the visual review,** so the review is repeatable and doesn't depend on the protected preview.
- **D11 Bangla wording** follows the Phase 3 rule.

## 11. Open questions
- **Q-1** The owner reviews the new Bangla drafts marked `needsReview` (FR-47).
- **Q-2** Should the Dhunat/Chaukibari house be added as a site record (Phase 12)? If so, add a `same_name_different_site` row for Elangi then.
