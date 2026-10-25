# Search

**Status:** Approved (by the owner, 2026-10-24); amended during implementation on 2026-10-24 (FR-4, FR-5, FR-9, FR-10, FR-28: see §10)
**Roadmap reference:** `roadmap/DEVELOPMENT_ROADMAP.md` §3 Phase 8 (tasks 8.1–8.5); also §1 (Search: Fuse.js loaded only when needed), Phase 11 (11.1 hero `SearchBox`), Phase 13 (13.1: no Fuse.js on the home page); `roadmap/DESIGN_COVERAGE.md` rows 28, 29; `docs/URLS.md` (`/search/`, `q`, `field`); `.claude/specs/06-Explore-list.md` (D4, FR-13); `docs/DATA_CONTRACT.md` (search results)
**Source task:** "Phase 8: Search. Objective: the header and hero search box, and the `/search` page."
**Branch:** `09-phase-8-search`
**Date:** 2026-10-24

## 1. Problem and intended outcome
There is no search today. The header has a search icon linking to `/search/`, which is a planned route (404). Explore keeps `q` in the URL with no effect (spec 06 D4, FR-13), waiting for this phase "so matching and Bangla spelling folding are built once".

The data makes search hard in three ways:
- **Spelling.** The same word is written jomidar, jamidar, zamindar; bari, badi; Chowdhury, Choudhury, Chaudhuri. Bangla has its own variants (বাড়ি / বাড়ী, জমিদার / জমীদার).
- **Generic words.** 300+ of the 413 English names contain "Zamindar Bari", so those words alone tell sites apart poorly.
- **Families are prose.** `fm` (334 sites) is free text, e.g. "Gobinda Ram Saha, salt merchant; palaces built by his descendants (Roy Chowdhury family)"; there is no family entity.

The boards set the target:
- `Search results · desktop`: the box, the "Searching as …" folding note, the All / Sites / Families / Districts rail with counts, site rows with `<mark>` and "matched in …", family cards, the districts note;
- `Search · did you mean + no results · mobile`: "Did you mean Baliati? Showing results for it.", "Search for … exactly instead", and the empty state with the illustration and suggestions.

**Outcome:** English names, Bangla names and variant spellings find the right sites; districts and families lead to real destinations; one matcher serves the header overlay, `/search/` and Explore's `q`; Fuse.js loads only when a search box is opened.

## 2. Scope
### In scope
- Tasks 8.1–8.5.
- Dependency at an exact version: `fuse.js`, imported dynamically only.
- `lib/fold.ts`, `lib/search.ts` (pure, unit-tested), `components/search/*`: `SearchBox`, `SearchOverlay`, `SearchApp`, result rows and cards.
- The header search icon opens `SearchOverlay` (D2).
- `/search/` page (`app/search/page.tsx`) with `SearchApp`.
- **Explore `q`** applied with the same matcher, and a "Search within results" box in the rail and the drawer (D3).
- **Contract changes, in the same commit as the code (URLS.md rule):**
  - `/search/` status → built;
  - new `/search/` keys `in` (D7) and `exact` (D5); `field` as now;
  - Explore `q`: "applied" (no longer "kept but not applied");
  - `lib/urlState.ts` comment and spec 06 FR-13 note for `q`;
  - roadmap Phase 8 wording only where this spec changes it (Families from `fm` phrases, the overlay, Explore `q`).
- Interface strings in `lib/i18n.ts`; Bangla drafts `needsReview`.
### Out of scope
- The hero `SearchBox` on the home page (11.1); it reuses `SearchBox` unchanged.
- District pages (10.2): district results go to Explore until then (A-1).
- Trip suggestions in the empty state (Phase 9); curated per-query hints such as the board's Lalbagh text (D8).
- A reviewed family entity or column (D1).
- Transliteration across scripts (Latin query finding a Bangla-only name or the reverse).
- The search `Skeleton` variant (10.11); the 404 page's search box (10.10).
- Searching upazila, `sm`, or site-page text; a relevance sort in Explore (A-8).
- Any change to `index.json` (A-3).

## 3. User journeys / use cases
- **UJ-1 Header, desktop.** On any page, presses the search icon: an overlay opens with the box focused. Types "teota": suggestions show Teota Zamindar Bari under Sites; ↓ then Enter opens its site page.
- **UJ-2 Variant spelling.** Types "jamidar badi choudhury" and presses Enter: `/search/?q=jamidar+badi+choudhury`. "Searching as zamindar bari chowdhury" explains the folding; sites whose distinctive word "chowdhury" matches come first; Families shows "Roy Chowdhury · named in the founder or family field of N sites".
- **UJ-3 Family.** Selects the "Roy Chowdhury" family card: `/search/?q=Roy+Chowdhury&field=family` lists the sites whose `fm` contains it, each with "matched in family: Roy Chowdhury".
- **UJ-4 Bangla.** Types "বালিয়াটি" (or "বালিয়াটী"): Baliati Palace is first.
- **UJ-5 Did you mean.** Types "baliyati" on a phone: "Did you mean Baliati? Showing results for it." with Baliati Palace, and "Search for "baliyati" exactly instead", which shows the empty state.
- **UJ-6 No results.** "lalbagh kella": illustration, "Nothing matches "lalbagh kella"", a line on what Jomidarpedia covers, "Browse all 413 sites in Explore", "Search in Bangla", three example searches.
- **UJ-7 District.** Types "manikganj": Districts shows Manikganj (N sites); selecting it opens `/explore/?dist=manikganj`.
- **UJ-8 Explore.** In Explore with "Day trips from Dhaka" on, types "saha" in "Search within results": the list and the map narrow to day-trip sites matching "saha"; the URL gains `q=saha`; Back removes it.
- **UJ-9 Keyboard and screen reader.** Opens the overlay with the keyboard; types; hears "5 sites, 1 family, 0 districts"; ↓/↑ move through options across groups; Esc clears the text, a second Esc closes the overlay and focus returns to the icon.

## 4. Functional requirements

### Folding (8.1)
- **FR-1** `lib/fold.ts` exports `fold(text): string`, pure and deterministic, used by the browser and by the build's tests (A-3). In order: Unicode NFC; lower-case; strip diacritics from Latin letters; remove ZWJ and ZWNJ; Bangla folds ী→ি, ূ→ু, য় (U+09DF) ↔ য + nukta → one form, ড় / ঢ় precomposed ↔ decomposed → one form (D6); punctuation other than letters and digits becomes a space; whitespace collapses.
- **FR-2** Latin variant words fold to one canonical spelling, on whole words only: jomidar, jamidar, zomindar, zamidar → zamindar; badi, bary → bari; choudhury, chowdhury, chaudhuri, chaudhury, choudhuri, chowdhuri → chowdhury; rajbadi → rajbari. The table lives in `lib/fold.ts` and is the only list of variants. Bangla and English digits are not folded into each other.
- **FR-3** `foldWithMap(text)` returns the folded string and, for each folded character, the index of its source character, so a match in folded text can be highlighted in the original (FR-17).
- **FR-4** Generic words (D4) are a list in `lib/fold.ts`, in folded form: zamindar, bari, rajbari, palace, house, bhaban, kachari, jomidar's Bangla জমিদার, বাড়ি, রাজবাড়ি, ভবন, প্রাসাদ (OQ-2 for the final list).

### Matching (8.2)
- **FR-5** `lib/search.ts` imports Fuse.js with `import()` and builds one index over the loaded `index.json` rows, folded with FR-1, with keys and weights `e` 3, `b` 3, `a` 2, `d` and `db` 1, `fm` 1 (A-2). Fuse options: `includeMatches`, `ignoreLocation`, threshold 0.3 (tuned so the ACs pass; the value is recorded in the module).
- **FR-6** A query is folded and split into words. Distinctive words are those not in the generic list. If the query has distinctive words, only they are matched and the generic words are ignored; if it has none, the generic words are matched (D4).
- **FR-7** A site is a result when **at least one** matched word hits one of its fields. Results are ranked by the number of matched words that hit (more first), then by Fuse's weighted score, then by `e` (A-9). "Best match first" is the only order on `/search/`.
- **FR-8** Each site result records the highest-weight field that matched and the matched text, for "matched in name / other name / district / family: X" (A-2).
- **FR-9** **Districts** are the 64 rows of `districts.json` (passed as props at build time, as Explore does), matched by folded `en` and `bn`. Each shows the name in the interface language and its site count, and links to `/explore/?dist=<slug>` (A-1).
- **FR-10** **Families** (D1): for each site whose `fm` matched, the family phrase is the run of up to 3 capitalised words (Latin) or up to 3 words (Bangla) around the matched word, stopping at punctuation and at lower-case words (A-5). Phrases are grouped by folded form; each group shows the most frequent original spelling and "Named in the founder or family field of N sites", and links to `/search/?q=<phrase>&field=family`. Groups are ordered by N, then alphabetically.
- **FR-11** `field=family` matches only `fm`, requires the whole folded phrase to appear in folded `fm`, and lists only Sites (no Families or Districts group).
- **FR-12** **Did you mean** (D5): when none of the matched words (FR-6) occurs in any folded field as a whole word or word prefix, but Fuse finds close matches, the correction is the closest folded word from the vocabulary of `e`, `b` and district names. The page then shows "Did you mean <Correction>? Showing results for it." and the results for the corrected query, plus "Search for "<q>" exactly instead", which adds `exact=1`. With `exact=1`, only whole-word or prefix matches count and no correction is made.
- **FR-13** Queries shorter than 2 characters after folding return nothing and show no "no results" state (A-4). `q` is trimmed and capped at 100 characters (URLS.md).

### SearchBox and overlay (8.3, D2)
- **FR-14** `SearchBox` is an ARIA 1.2 combobox: an `<input role="combobox" aria-expanded aria-controls aria-autocomplete="list" aria-activedescendant>` with a `listbox` popup. Options are grouped (Sites, Families, Districts) with group labels; ↓ and ↑ move through all options across groups, Home/End move in the text, Enter opens the active option (or, with none active, goes to `/search/?q=`), Esc clears the text, and Esc on an empty box closes the popup (and the overlay).
- **FR-15** The popup shows up to 5 sites, 3 families and 3 districts, and a last option "See all results for "q"" leading to `/search/?q=`. Suggestions update 150 ms after typing stops (A-4).
- **FR-16** A polite live region announces the counts ("5 sites, 1 family, 0 districts" / "No matches") after each update, in the interface language with its digits.
- **FR-17** In every result (popup, `/search/`, Explore rows when `q` is set) the matched text is wrapped in `<mark>`, mapped back to the original text with FR-3; Bangla text is highlighted on whole grapheme clusters.
- **FR-18** The header search icon becomes a `<button aria-haspopup="dialog">` that opens `SearchOverlay`: a modal dialog under the header on desktop and full screen on phones, with the `SearchBox` focused and a Close button. Esc on an empty box or Close closes it and returns focus to the icon. Without JavaScript the icon stays a link to `/search/` (A-6).
- **FR-19** Fuse.js and the index are requested only when an overlay opens, the `/search/` box mounts, or Explore's box receives input; `index.json` is fetched at most once per page (shared with Explore's loaded copy).

### `/search/` page (8.4)
- **FR-20** `app/search/page.tsx` is a static page rendering `SearchApp` inside `<Suspense>` (spec 06 FR-30). It reads `q`, `field`, `in` and `exact` from the URL, canonicalises them (URLS.md rules; unknown keys and values dropped with the `url.droppedFilters` notice), and updates the URL as the visitor searches: one history entry per submitted query (Enter or 400 ms after typing stops), `replaceState` for the edits in between.
- **FR-21** Under the box, when folding changed the query, a note reads "Searching as **<folded query>**. Spelling variants count as the same word: …", listing the variant groups that applied (from FR-2).
- **FR-22** The group rail (a tab list; a select-like row on phones) shows All, Sites, Families, Districts with counts in the interface's digits; the chosen group is `in` (D7), default All, one history entry per change. Groups with 0 stay visible and selectable.
- **FR-23** **All** shows the top 5 sites, then "Show N more sites" (which switches to `in=sites`), then up to 6 family cards, then districts; when a group is empty a dashed note says so ("Districts: no district matches "q"."). **Sites** shows 20 rows and "Show 20 more" (D9); loaded count and scroll live in `history.state.jp` like spec 06 A-4.
- **FR-24** A site row is the `SiteCard` row (spec 06) with `<mark>` (FR-17) and "matched in …" (FR-8); the name is the only link (`/site/<i>/<s>/`).
- **FR-25** **Empty state** (D8), when the query (after any correction) has no result in any group: `NoResultsArt`, "Nothing matches "q"", one line on what Jomidarpedia covers, then: "Browse all N sites in Explore" (`/explore/`), "Search in Bangla" / "Search in English" (switches the interface language; the query is kept), and three example searches (a Latin name, a Bangla name, a family) that are links to `/search/?q=…`, chosen from the data at build time.
- **FR-26** `/search/` with no `q`: the box focused, a short help line, and the example searches; no empty state.
- **FR-27** The document title is "Search: <q> · Jomidarpedia" when `q` is set, else "Search · Jomidarpedia"; the page is `noindex` when `q` is set.

### Explore `q` (D3)
- **FR-28** A "Search within results" box sits at the top of the filter rail and the filter drawer. It is a plain search input (not a combobox) bound to `q`; it updates the list 300 ms after typing stops with `replaceState`, and a submitted change (Enter or blur) makes one history entry (spec 06 FR-28).
- **FR-29** With `q` set, a site is shown only if it passes the filters **and** is a `/search/` site result for `q` (FR-6, FR-7; no Did-you-mean in Explore). Filter counts in the rail are computed among the `q` matches. The sort stays the chosen sort (A-8). The map shows only matching mappable sites (spec 07 FR-7 refits on the change).
- **FR-30** `q` appears in the active filters bar as a removable chip "Search: q", and "Clear all" clears it. When `q` and the filters give 0 results, `EmptyResults` names `q` as a removable cause.
- **FR-31** `sel` follows spec 07 FR-22: a `q` change that excludes the selected site drops `sel` without a notice.

### Language
- **FR-32** Runtime strings use `text(key, useUiLang())`; server-rendered strings use `T`; counts use `formatCount`. Site names show both languages as in `SiteCard`; district names follow the interface language.

### URL
- **FR-33** `/search/` keys, canonical order `q`, `field`, `in`, `exact`: `field=family`; `in=sites|families|districts` (default all); `exact=1` (default off). `in=families|districts` with `field=family` is dropped (FR-11).
- **FR-34** Every result link is a real destination: site page, `/explore/?dist=<slug>`, or `/search/?q=<phrase>&field=family`.

### Tests (8.5)
- **FR-35** Unit tests for `fold.ts`, `search.ts` and the family phrase rule; Playwright for the overlay, `/search/` and Explore `q` (see §8).

### Performance hooks
- **FR-36** The overlay, `SearchApp` and Explore's box share one lazily created matcher per page (FR-19).
- **FR-37** The header's added code (overlay shell) is small and loads Fuse.js only on open; the home page loads no Fuse.js chunk on load (roadmap 13.1).
- **FR-38** Search over the 413 rows answers in under 50 ms on a mid-range phone after the matcher is built (NFR-2).

## 5. Non-functional requirements
- **NFR-1 Accessibility.** The combobox follows the ARIA 1.2 combobox pattern with a listbox; the overlay is a modal dialog with focus trapped and restored; every result is reachable by keyboard; `<mark>` is not the only cue (the "matched in" text says it in words). axe finds no serious or critical issues on `/search/` (results, Did you mean, empty, light and dark), with the overlay open, and on Explore with `q`. Manual keyboard check as in 13.3.
- **NFR-2 Performance.** No Fuse.js chunk on any page load (home, site, Explore) until a search box is used; `/search/` loads it on mount. Matching ≤ 50 ms for 413 rows (FR-38).
- **NFR-3 Privacy.** Queries never leave the browser; no analytics on queries; no hidden-pin coordinates in any result (results carry `ll` only as the index already does).
- **NFR-4 Reliability.** If Fuse.js or the index fails to load, the box shows "Search isn't available right now. Try again" with Retry, and Explore's filters keep working without `q`.
- **NFR-5 i18n.** Bangla interface strings and digits; new strings `needsReview` (OQ-1).
- **NFR-6 Responsive.** No horizontal scroll at 390 px; `/search/` at 390 and 1440 px and the overlay on both are reviewed by the owner against the two boards.

## 6. Data, interfaces, and integrations
- **Read:** `public/data/index.json` (`IndexSite`: `i`, `s`, `e`, `b`, `a`, `fm`, `d`, `db`, `u`, `c`, `ac`, `ll`, `img`, …); `data/build/districts.json` (`slug`, `en`, `bn`, `count`) as build-time props.
- **New modules:** `lib/fold.ts` (FR-1–FR-4), `lib/search.ts` (FR-5–FR-13, pure apart from the dynamic import), `components/search/*`, `app/search/page.tsx`.
- **Changed:** `SiteHeader` (icon → overlay button, FR-18), `ExploreApp`, `FilterRail`, `FilterDrawer`, `ActiveFilters`, `EmptyResults` (FR-28–FR-31), `lib/urlState.ts` (`q` applied; new `/search/` parser or a sibling), `lib/i18n.ts`, `docs/URLS.md`, `tests/urls.test.ts`.
- **Reused:** `SiteCard`, `BilingualName`, `ConditionBadge`, `NoResultsArt`, `useUiLang`, `formatCount`, the `jp` history-state helpers, `url.droppedFilters`, `lib/filters.ts` `filter`/`counts`.
- **Package:** `fuse.js` at an exact version (I1).

## 7. Edge cases and failure behavior
- Only generic words ("zamindar bari"): matched as generic (FR-6); most sites; no Did-you-mean.
- Mixed scripts ("baliati বাড়ি"): each word is folded in its own script; any word may hit.
- A query that is only punctuation or one character: no results, no empty state (FR-13).
- Over 100 characters: capped (URLS.md).
- `field=family` with a phrase that matches nothing: empty state, without Did-you-mean.
- `exact=1` without `q`: dropped silently in canonicalisation.
- The same family under different spellings ("Roy Chowdhury", "Roy Choudhury"): one group, since FR-2 folds them.
- A district and a site share a word (Dhaka): both groups show.
- Bangla interface: "Did you mean" shows the correction in the script it was typed in.
- Fuse.js or index load failure: NFR-4.
- Explore `q` with `sel` excluded: FR-31.
- JavaScript off: `/search/` shows "Search needs JavaScript" and a link to Explore; the header icon stays a link (A-6).

## 8. Acceptance criteria
- **AC-1** (FR-1–FR-4) Unit: each variant in FR-2 folds to its canonical form; "Choudhury" and "CHOWDHURY" fold equally; বাড়ী = বাড়ি, জমীদার = জমিদার, য় and ড় in both encodings fold equally; ZWJ/ZWNJ removed; `foldWithMap` maps every folded index to a valid source index; `fold` is idempotent.
- **AC-2** (FR-5–FR-8) Unit over the real index: "baliyati" → Baliati Palace first (via correction); "jamidar bari teota" → Teota Zamindar Bari first; "বালিয়াটি" and "বালিয়াটী" → Baliati first; "zamindar bari" returns results without correction; each site's own `e` and `b` find it in the top 3 (every site, A-3).
- **AC-3** (FR-9, FR-34) Unit/Playwright: "manikganj" and "মানিকগঞ্জ" give the Manikganj district with its `count`; selecting it opens `/explore/?dist=manikganj` showing that count.
- **AC-4** (FR-10, FR-11, FR-34) Unit: "chowdhury" yields a family group "Roy Chowdhury" whose N equals the sites whose folded `fm` contains "roy chowdhury" (computed in the test); Playwright: its card opens `/search/?q=Roy+Chowdhury&field=family` listing exactly those N sites, Sites group only.
- **AC-5** (FR-12, FR-33) Playwright: `?q=baliyati` shows "Did you mean Baliati" and Baliati Palace; "exactly instead" adds `exact=1` and shows the empty state; Back returns to the corrected results.
- **AC-6** (FR-14–FR-18, NFR-1) Playwright keyboard-only: open the overlay from the icon, type, hear the live-region text, ↓ through options across groups, Enter opens the site; Esc clears, Esc closes, focus is on the icon; `aria-expanded` and `aria-activedescendant` correct at each step.
- **AC-7** (FR-17) Unit: highlights for "choudhury" in "Chowdhury Bari" cover "Chowdhury"; Bangla highlights never split a grapheme cluster.
- **AC-8** (FR-20–FR-24, FR-27) Playwright: `/search/?q=jamidar+badi+choudhury` shows the "Searching as" note, counts per group that match the unit result, 5 sites then "Show N more sites"; the Sites tab sets `in=sites`, loads 20 then 20 more; Back restores the tab, loaded count and scroll.
- **AC-9** (FR-25, FR-26) Playwright: `?q=lalbagh+kella` shows the empty state with the three suggestions working; "Search in Bangla" switches the interface and keeps `q`; `/search/` with no `q` shows the help and examples.
- **AC-10** (FR-28–FR-31) Playwright: in Explore with `day=1`, typing "saha" narrows the list to the sites in `filter(index, day) ∩ search("saha")` (computed in the test) and the pin count matches; the chip removes `q`; Back after a submitted `q` restores the previous list; a `q` that excludes `sel` drops it with no notice.
- **AC-11** (FR-19, FR-36, FR-37, NFR-2) Playwright request log: on `/`, a site page and `/explore/` with no `q`, no Fuse.js chunk is requested on load; opening the overlay requests it once; `index.json` is fetched at most once per page.
- **AC-12** (FR-38) Unit: 100 random queries over the index each run under 50 ms after build (CI-tolerant bound recorded in the test).
- **AC-13** (FR-32, NFR-5) Playwright in Bangla mode: counts and group labels in Bangla digits and strings.
- **AC-14** (NFR-1) axe: no serious or critical issues in the NFR-1 states.
- **AC-15** (NFR-4) Playwright with the Fuse.js chunk aborted: the box shows the error with Retry; Explore filters still work.
- **AC-16** (FR-33, URLS.md) Unit: `/search/` URL round trip and canonicalisation (`q`, `field`, `in`, `exact` order; unknown values dropped with the notice; `in` incompatible with `field=family` dropped); `tests/urls.test.ts` agrees with URLS.md.
- **AC-17** (NFR-6, A-6) Playwright at 390 px: no horizontal scroll on `/search/` or in the overlay; with JavaScript off `/search/` shows the note and Explore link. `npm run screenshots` adds `/search/` (desktop results; mobile Did you mean and empty) and the overlay for the owner's review against the boards.

## 9. Dependencies, constraints, and assumptions
### Dependencies
- Phase 6 (Explore, `urlState`, filters, `SiteCard`) and Phase 7 (`sel` rules, map refit) are done.
- `fuse.js` at an exact version.
### Constraints
- Static export (`next.config.mjs`: `output: 'export'`, `trailingSlash: true`): `/search/` is one static page; all search runs in the browser.
- `index.json` is the only data file the browser fetches (roadmap §1); `lib/data.ts` is `server-only`, so districts reach `SearchApp` as props.
- `useSearchParams` only inside `<Suspense>` (spec 06 FR-30).
- Interface strings: `T` on the server, `text(key, useUiLang())` in client components (`components/T.tsx`, `lib/use-ui-lang.ts`).
- Tests take expected values from the built data (I6).
- `index.json` budget 150 KB gzipped (today 76 KB): unchanged by this phase.
### Assumptions
Accepted by the owner with the interview summary (2026-10-24):
- **A-1** District results link to `/explore/?dist=<slug>` until 10.2 builds district pages; then they switch to `/district/<slug>/`.
- **A-2** Fields and weights `e` 3, `b` 3, `a` 2, `d`+`db` 1, `fm` 1; upazila not searched; results say which field matched.
- **A-3** No `index.json` change; folding runs in the browser; the build's tests use `fold.ts` to check every site is found by its own names.
- **A-4** Suggestions from 2 characters, 150 ms debounce; overlay limits 5 sites, 3 families, 3 districts; counts announced politely.
- **A-5** Family phrase: up to 3 capitalised words around the matched word in `fm`, stopping at punctuation.
- **A-6** Without JavaScript, `/search/` shows a note and a link to Explore; the header icon stays a link.

Accepted by the owner with the finished spec (2026-10-24):
- **A-7** `/search/` pushes one history entry per submitted query (Enter or 400 ms pause) and replaces in between (FR-20).
- **A-8** Explore keeps its chosen sort when `q` is set; no relevance sort in Explore.
- **A-9** Tie-break after match count and Fuse score is the English name.

## 10. Key decisions and rationale
Confirmed by the owner in the interview on 2026-10-24:
- **D1 Families are phrases matched in `fm`**, grouped by folded form, because `fm` is prose and no family entity exists; no data work this phase.
- **D2 The header icon opens a search overlay** with the combobox; "See all results" goes to `/search/`. Fuse.js loads on open.
- **D3 Explore applies `q`** with the same matcher, ANDed with the filters, from a "Search within results" box (closes spec 06 D4).
- **D4 Any distinctive word may match, ranked by matches; generic words count only when nothing else was typed**, so "jamidar bari teota" finds Teota and common words don't flood results.
- **D5 Did you mean auto-corrects** and offers "Search for … exactly instead" via a new `exact=1` key.
- **D6 Bangla folding beyond NFC** (ZWJ/ZWNJ, ী/ি, ূ/ু, য়, ড়/ঢ়), pending native review.
- **D7 The chosen group is in the URL** as `in`.
- **D8 Generic empty-state suggestions**; no curated per-query hints; trips added in Phase 9.
- **D9 All shows 5 sites; Sites shows 20 and "Show 20 more".**

Amended during implementation (2026-10-24), for the owner's review:
- **FR-5 Fuse.js runs on single words.** It searches the vocabulary of every folded word in the index, not whole fields, and only for a query word with no exact or prefix match; a close spelling may differ in length by one letter (two from eight letters). Over whole fields, a short word "fuzzily" matched inside paragraphs of family history, and near misses outranked exact hits ("manikganj" put Keraniganj first; "kella" became "Kallani"). The field weights still rank the hits, plus a bonus for covering a whole name, so "Chandra Zamindar Bari" comes before longer names that only share "Chandra".
- **FR-4 Generic words** also include "the", "of" and "and", and a generic word matches only itself (no prefix), so "bari" doesn't pull in "Barishal"; a generic word never picks a district.
- **FR-9, A-1 District links** are `/explore/?div=<division>&dist=<district>`: URLS.md drops a district that is not in a selected division.
- **FR-10 Family phrases** never start or end with a generic word or a title (Raja, Zamindars, Nawab…) and are never only a place name; of the windows around the hit, the longest shared by two or more sites wins.
- **FR-28 On phones** the "Search within results" box sits above the list rather than in the filter drawer: the drawer edits a draft applied by "Show N", and a search there would need its own draft and matcher.

### Phase 10 notes
- A district result now leads to its district page, not to Explore (spec 10 FR-63).
- A query that is exactly a site ID (`JB-DHK-064`, any case) finds that site alone, marked "matched by site ID", with no "Did you mean"; an ID that names no site finds nothing (spec 10 FR-53, D14).

## 11. Open questions
- **OQ-1** Bangla wording for the new strings and the Bangla fold list (D6): drafts with `needsReview` until a native reviewer signs them off.
- **OQ-2** The final generic-word list (FR-4), in both scripts.
- **OQ-3** Whether the family phrase rule (A-5) is good enough on the real `fm` text, or Phase 12 should add a reviewed family column.
