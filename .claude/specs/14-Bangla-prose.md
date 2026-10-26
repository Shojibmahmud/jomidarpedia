# Bangla prose

**Status:** Draft
**Roadmap reference:** `roadmap/DEVELOPMENT_ROADMAP.md` §4 "Phase 11a (if O6 changes): Bangla prose"; decision O6 (§2, line 158) and recommendation I3 (dual-span rendering); `.claude/specs/03-App-foundations.md` (i18n), `.claude/specs/05-Site-page.md`, `.claude/specs/08-Search.md` (D4 search fields), `.claude/specs/09-Trips-and-itineraries.md`, `.claude/specs/10-Areas-sources-about-and-system-states.md` (About)
**Source task:** "Phase 11a (if O6 changes): Bangla prose. `_bn` columns, or `content/bn/` files; translation; a review workflow; `lang` handling. The target design is `বাংলা · Baliati · mobile`."
**Branch:** `16-bangla-text`
**Date:** 2026-10-26

## 1. Problem and intended outcome

O6 limited Bangla mode to interface strings, names, numbers and dates; long prose stayed English. On 26 Oct 2026 the owner reversed this: in Bangla mode a site page shows Bangla headings over English paragraphs (summary, at-a-glance values, history timeline, visiting, getting there), and "a person who doesn't have command over English, for him this webapp has no use."

Measured on 26 Oct 2026, the public prose in `data/csv/` is about 1.5 million characters (≈250,000 words): claims ≈415k, history events ≈300k, site summaries and glance fields ≈470k, routes, costs and visiting info ≈300k, trips, legends and photo alt text ≈240k.

**Intended outcome:** in Bangla mode, every public prose field shows Bangla whenever a valid translation exists. Where none exists, the English shows, marked `lang="en"`, and the page says so in one line. Claude drafts all translations; drafts go live immediately and are marked as unchecked until the owner reviews them, one table at a time.

## 2. Scope

### In scope

- Storage for Bangla translations, separate from the 14 source tables, with a fingerprint of the English each was made from.
- Build validation, fallback and reporting for translations.
- Rendering Bangla prose on site pages, trip pages, trip lists, the Home and area pages wherever data prose appears, Explore and map cards (card one-liner), and photo alt text.
- The page-level note (draft and English-fallback states).
- A Bangla About page (`content/about.bn.md`).
- Bangla founder/family text in search.
- A dev/preview review page and scripts that list work and merge drafts.
- Translation rules (`docs/TRANSLATION_BN.md`).
- Drafting the translations, in two batches (§10 D-2):
  - **Batch 1:** site summaries; at-a-glance values (era, founder or family, style, preservation); visiting info; getting there (routes, last mile, cost basis); history timeline (description, date text, people); trips (titles, planning notes, stop names and notes).
  - **Batch 2:** claims (disagreements, open questions), location notes, cost and budget notes, legends, photo alt text, site relationship notes, citation notes, the About page.

### Out of scope

- Searching descriptions, in either language (spec 08 D4 stands).
- Bangla page titles, meta descriptions and Open Graph text; separate `/bn/` routes (roadmap §4, a later phase).
- A glossary of fixed term translations (owner declined, D-8).
- Translating source titles, publishers, authors and quoted titles (D-4); image credit lines, IDs, URLs and coordinates (A-1).
- Changing interface strings in `lib/i18n.ts` (already bilingual; their `needsReview` drafts are a separate review).
- Changing English data.

## 3. User journeys / use cases

- **UJ-1 Bangla reader, site page.** A reader in Bangla mode opens a site. Summary, glance values, history, visiting and getting-there text are Bangla. If any shown text is an unchecked draft, one line under the header says the translation is not yet checked.
- **UJ-2 Partial page.** A site whose legends are not yet translated shows them in English (`lang="en"`); the header note says part of the page is still in English (and, if drafts are present, that the translation is unchecked) in a single line.
- **UJ-3 Trip page and trip lists.** Titles, notes and stop text are Bangla; the trip list cards show Bangla titles.
- **UJ-4 Explore and map.** List and map cards show the Bangla one-liner when the site's summary is translated.
- **UJ-5 Bangla search.** Typing "সাহা" finds sites whose Bangla founder/family text contains it, ranked by the existing rules.
- **UJ-6 Owner review.** On a preview deployment the owner opens `/dev/bn-review/`, filters to `history_events` / draft, reads English and Bangla side by side, and tells Claude which rows to fix and approve (or edits the CSV). Approved rows become `reviewed`; when a page has no drafts left, its "unchecked" note disappears.
- **UJ-7 Claude drafts a table.** A script lists the cells of a table that are missing or outdated; Claude drafts them following `docs/TRANSLATION_BN.md`; a script merges the drafts and computes fingerprints.
- **UJ-8 English correction.** The owner corrects an English fee note. Its Bangla no longer matches the fingerprint, so the page shows the corrected English with the note, and the report lists the row as outdated until it is re-translated.

## 4. Functional requirements

### Storage and validation

- **FR-1** Translations live in `data/translations/bn/<table>.csv`, one file per source table, with the columns `key, column, bn, status, en_hash`. Files are optional; a missing file means no translations for that table.
- **FR-2** `key` is the row key `rowKey(table, row)` from `scripts/lib/structure.mjs` (e.g. `JB-DHK-064`, `IT-BSL-001-1#3`). `column` is the English column name.
- **FR-3** `status` is `draft` or `reviewed`.
- **FR-4** `en_hash` is the first 12 hex characters of SHA-256 over the English cell after: CRLF → LF, Unicode NFC, trimming leading and trailing whitespace.
- **FR-5** Structural errors (fail in every mode, like other structural errors): a file for an unknown table; a `column` not in the allow-list (§6); a bad `status`; a malformed `en_hash`; a duplicate `key`+`column`; malformed CSV.
- **FR-6** A translation is **valid** when all of these hold; otherwise the English is used:
  - its key matches a row and its English cell is non-empty;
  - `en_hash` equals the hash of the current English cell (otherwise **outdated**, D-6);
  - `bn` is non-empty;
  - it contains no internal-note term from `scripts/lib/internal-terms.mjs` (otherwise **invalid**, A-2);
  - for `travel_routes.route_description`, it has the same number of `->` steps as the English (otherwise **invalid**, A-3).
- **FR-7** A translation whose key matches no row is an **orphan**: ignored and reported, never an error.
- **FR-8** No translation state fails a release build (D-9). Structural errors (FR-5) still fail every mode.

### Build output

- **FR-9** Each prose string in the build output that comes from an allow-listed column gains a Bangla sibling when its translation is valid. This covers `SiteRecord` (summary, `Fact` values and notes, visiting values and notes, routes and steps, history items, legends, conflicts, location note, related notes, still-to-confirm free text), `Itinerary` (title, notes, stop names and notes, budget notes), `TripSummary` (title), `ImageRecord` (alt), and `IndexSite` (`smb`: the first sentence of the Bangla summary, ≤160 characters; `fmb`: the Bangla founder/family text).
- **FR-10** Each page-level record carries its translation state: whether any shown string uses a draft, and whether any shown prose falls back to English.
- **FR-11** Route steps in Bangla come from splitting the Bangla `route_description` on `->`, as for English; the Bangla `last_mile` attaches to the last step.
- **FR-12** "Still to confirm" field names are interface strings in both languages; free text after a field name uses its translation when valid, otherwise English (A-6).
- **FR-13** Unknown-value texts ("Not documented", "No ticket reported" and other contract texts) remain interface strings and are never translation entries.
- **FR-14** A hidden-pin site's location note stays absent in both languages (R5).

### Rendering

- **FR-15** Data prose is rendered by one component: with a valid Bangla value, both spans (`lang="en" data-l="en"` and `lang="bn" data-l="bn"`) as in I3; without one, a single `lang="en"` span visible in both modes. It replaces `<Latin>` around data prose; `<Latin>` stays for IDs, coordinates, credits and source titles.
- **FR-16** In Bangla mode, a page shows at most one note under its header, from `lib/i18n.ts`:
  - drafts only → the translation on this page is not yet checked;
  - English fallback only → part of this page is still in English;
  - both → one line saying both;
  - neither → no note.
  It replaces the current `common.pageProseInEnglish` note on site and trip pages and is hidden in English mode.
- **FR-17** Explore list and map cards show `smb` in Bangla mode when present, otherwise the English `sm`.
- **FR-18** Trip list, Home and area cards show the Bangla trip title when valid.
- **FR-19** Image `alt` follows the language when a valid translation exists; credit lines are unchanged (A-1).
- **FR-20** The About page reads `content/about.bn.md` when present. It follows the same structure and tokens as `about.en.md`, has its own reviewed flag, and the page shows the existing draft banner while unreviewed. Without the file, the English About shows with its note.

### Search

- **FR-21** In Bangla mode, `fmb` is searched alongside `fm` in the founder field (same weight as `fm`), folded by `lib/fold.ts`. No other searched field changes.

### Review and tooling

- **FR-22** `/dev/bn-review/` is built in local and preview mode only (`page.dev.tsx`) and is `noindex`. It lists every allow-listed cell with table, key, column, English, Bangla and status (`reviewed`, `draft`, `outdated`, `invalid`, `missing`) and a link to the public page that shows it. It can be filtered by table, column and status, and it shows coverage counts per table and column. It is read-only (A-7).
- **FR-23** A script lists the cells of a given table (optionally one column) that are missing or outdated, with their keys and English text, as a worklist file outside `data/csv/`.
- **FR-24** A script merges drafted Bangla into `data/translations/bn/<table>.csv`, computes `en_hash` from the current English, sets new rows to `draft`, and keeps `reviewed` rows unchanged unless their text is replaced. Output is sorted by key, then column, so diffs stay stable (A-4).
- **FR-25** Approving rows means setting `status` to `reviewed`, by Claude on the owner's instruction or by the owner in the CSV.

### Reporting and rules

- **FR-26** `data/reports/release-problems.md` gains a "Bangla translation" section in every mode: coverage (reviewed, draft, missing) per table and column, plus lists of outdated, invalid and orphan rows grouped by table.
- **FR-27** `docs/TRANSLATION_BN.md` records the drafting rules:
  - names in Bangla script, preferring the dataset's `_bn` names, with no English in brackets (D-3);
  - source, book and article titles in the original language (D-4);
  - Latin digits, with units and currency in Bangla words (D-13);
  - credit lines, IDs, URLs and coordinates are never translated (A-1);
  - route steps are kept separated by `->` (A-3);
  - plain, neutral encyclopedia register;
  - the uncertainty in the English is kept ("reportedly", "c.", "single source").

## 5. Non-functional requirements

- **NFR-1** `public/data/index.json` stays within the 150 KB gzipped budget (79 KB on 26 Oct 2026; about 120 KB expected with `smb` and `fmb`). The existing budget check enforces it.
- **NFR-2** No new client JavaScript for prose: rendering stays in server components; only the existing card and search clients read `smb`/`fmb`.
- **NFR-3** Determinism: the same CSVs and translation files give the same output bytes (as `build-data.mjs` today).
- **NFR-4** Accessibility: every prose span carries the correct `lang`; axe finds no serious or critical issues on a translated, a partial and an untranslated site page and a trip page, in both languages and both themes.
- **NFR-5** Bangla text uses the existing Bangla type scale and line height; conjuncts render on Android Chrome and iOS Safari (as roadmap 13.4).
- **NFR-6** Page weight: site and trip HTML grow by their Bangla text only; no page exceeds the Phase 13 HTML budget, if one applies.

## 6. Data, interfaces, and integrations

**File format** (`data/translations/bn/sites.csv`):

```
key,column,bn,status,en_hash
JB-DHK-064,short_description,"লক্ষ্মণ সাহার তৈরি দোতলা কারুকাজ করা বাড়ি …",draft,9f3a1c4b07de
JB-DHK-064,founder_or_family,"লক্ষ্মণ (লক্খন) সাহা, …",reviewed,77b0e2a913cc
```

**Column allow-list:**

| Table | Batch 1 | Batch 2 |
|---|---|---|
| sites | `short_description`, `established_era`, `founder_or_family`, `architectural_style`, `preservation_status` | `coordinates_note`, `unverified_fields` (free text, A-6) |
| visitor_info | `opening_hours`, `hours_note`, `weekly_closing_days`, `entry_fee_note`, `restrictions_and_permissions`, `photography_rules`, `facilities`, `accessibility`, `best_time_to_visit` | — |
| travel_routes | `route_description`, `last_mile`, `cost_basis` | — |
| history_events | `description`, `date_text`, `people_or_owners` | — |
| itineraries | `title`, `planning_notes` | — |
| itinerary_stops | `stop_name`, `notes` | — |
| claims | — | `claim_text` |
| costs | — | `basis_and_assumptions` |
| legends | — | `narrative`, `attribution` |
| images | — | `caption_alt_text` |
| site_relationships | — | `note` |
| site_sources | — | `citation_note` |

Batches set drafting order only; the build accepts any allow-listed column at any time. A column whose English is not shown publicly is never added.

**Contract updates:** the Bangla siblings and translation state go into `lib/types.ts` and `docs/DATA_CONTRACT.md` together, per the note at the top of `lib/types.ts`. The new index keys `smb` and `fmb` are optional.

**Reused code:**
- `rowKey`, `loadTables` (`scripts/lib/structure.mjs`);
- the internal-term list (`scripts/lib/internal-terms.mjs`);
- the report writer (`scripts/lib/report.mjs`);
- `cardSummary` (`scripts/build-index.mjs`) for `smb`;
- `fold` (`lib/fold.ts`);
- `Both` / `T` (`components/T.tsx`);
- the dev-page pattern (`app/dev/i18n/page.dev.tsx`, `next.config.mjs`);
- the About reviewed flag (`scripts/lib/about.mjs`).

## 7. Edge cases and failure behavior

| Case | Behavior |
|---|---|
| English cell empty, translation present | Translation ignored, reported as orphan (FR-6, FR-7). |
| English corrected after translation | Outdated: English shows, page note, report lists it (FR-6, FR-26). |
| Bangla contains an internal-note term | Invalid: English shows, reported (A-2). |
| Route step count differs | Invalid: English route shows (A-3). |
| Row deleted from source table | Orphan, reported; build continues (FR-7). |
| Unknown table, column or status; duplicate key+column | Structural error, build fails in every mode (FR-5). |
| Bangla with commas, quotes or newlines | Standard CSV quoting via `scripts/csv.mjs`; tested. |
| Identical English in many rows | Each row has its own entry; the merge script may reuse one draft (A-5). |
| Page with drafts and English fallback | One combined note (FR-16). |
| Hidden-pin site | No location note in either language (FR-14). |
| Index over 150 KB gzipped after `smb`/`fmb` | Existing safety check fails the build; `smb` is the first lever to trim. |
| `about.bn.md` missing or unreviewed | English About with note, or Bangla About with draft banner (FR-20). |
| Translation file absent | Treated as no translations (FR-1). |

## 8. Acceptance criteria

- **AC-1** (FR-1–FR-5) Unit tests: a fixture with an unknown table, unknown column, bad status, bad hash format and duplicate key+column each produce a structural error. A missing file produces none.
- **AC-2** (FR-4) Unit test: the hash is identical for CRLF/LF, NFC/NFD and padded variants of the same text, and differs for a one-character change.
- **AC-3** (FR-6, FR-7, FR-11) Given a fixture with reviewed, draft, outdated, empty, internal-term, wrong-step-count and orphan rows, when the data build runs, then only the reviewed and draft rows produce Bangla siblings, and Bangla route steps match the English count.
- **AC-4** (FR-8) A release-mode build with only outdated, invalid, orphan and missing translations succeeds.
- **AC-5** (FR-9, FR-10, FR-12–FR-14) Build-output tests: Bangla siblings appear on each listed shape; the translation state is correct for fully reviewed, draft and partial records; unknown-value texts have no Bangla sibling; a hidden-pin site has no location note.
- **AC-6** (FR-15, FR-16, NFR-4) Playwright, Bangla mode:
  - a fully reviewed site shows Bangla prose and no note;
  - a draft site shows the "not yet checked" note;
  - a partial site shows English blocks with `lang="en"` and the combined note;
  - English mode shows no note and no Bangla prose;
  - axe passes on each of these pages.
- **AC-7** (FR-17, FR-18, FR-19) Playwright: an Explore card and a map card show `smb` in Bangla mode; a trip card shows the Bangla title; a translated image has a Bangla `alt` in Bangla mode and an unchanged credit line.
- **AC-8** (FR-20) With `about.bn.md` present and unreviewed, Bangla mode shows the Bangla About with the draft banner. Without it, the English About shows with its note.
- **AC-9** (FR-21) Unit test: in Bangla mode, a Bangla query matching only `fmb` returns that site, weighted like `fm`. A Bangla word that appears only in a summary returns nothing.
- **AC-10** (FR-22) The local build contains `/dev/bn-review/` with `noindex` and correct counts for a fixture. The release build does not contain it.
- **AC-11** (FR-23–FR-25) Script tests:
  - the worklist lists exactly the missing and outdated cells;
  - a merge writes correct hashes, `draft` status and sorted rows;
  - running the merge twice changes nothing;
  - a reviewed row stays reviewed unless its text changes.
- **AC-12** (FR-26) The report's "Bangla translation" section shows coverage per table and column, and lists the outdated, invalid and orphan rows from the fixture.
- **AC-13** (FR-27) `docs/TRANSLATION_BN.md` exists and states each rule in FR-27.
- **AC-14** (NFR-1, NFR-3) After batch 1 is merged, `index.json` is ≤150 KB gzipped, and two builds of the same input are byte-identical.
- **AC-15** (NFR-5) Bangla prose is checked by hand on Android Chrome and iOS Safari, recorded with roadmap 13.4.

## 9. Dependencies, constraints, and assumptions

### Dependencies

- I3 dual-span rendering and the `html[data-lang]` CSS (`components/T.tsx`, `app/tokens.css`).
- The data pipeline modes and report (`scripts/data-mode.mjs`, `scripts/lib/report.mjs`).
- Search scoring (`lib/search.ts`, spec 08).
- The owner's time to review about 15,000 cells, table by table.

### Constraints

- CSVs in `data/csv/` are the source of truth and round-trip to the workbook (`scripts/export-xlsx.py`); translation files sit outside them so that round trip is unchanged.
- Every output object is built from named public fields only (`scripts/build-data.mjs` header, I7).
- `public/data/index.json` is the only file the browser fetches, with a 150 KB gzipped budget (README).
- Dev pages exist only outside release (`next.config.mjs`, `pageExtensions`).
- Static export, no server code (README).

### Assumptions (not yet confirmed)

- **A-1** Image credit lines are printed word for word, as the licences require; IDs, URLs and coordinates are never translated.
- **A-2** A Bangla text containing an internal-note term is dropped and reported, rather than failing release (consistent with D-9).
- **A-3** A Bangla `route_description` must keep the English number of `->` steps, or it is invalid.
- **A-4** Fingerprints are always computed by script, never typed.
- **A-5** Translations are per row; identical English cells may share one draft at merge time.
- **A-6** "Still to confirm" field names become interface strings; the free text after them is translated through `sites.unverified_fields` (batch 2) and falls back to English until then.
- **A-7** The review page is read-only; approval happens in the CSV.

## 10. Key decisions and rationale

- **D-1** All public prose gets Bangla, drafted by Claude and published as drafts at once. This reverses O6, because the site is unusable for readers without English.
- **D-2** Drafting order: batch 1 holds what a visitor needs to find and visit a site; batch 2 holds the rest.
- **D-3** Names inside prose are in Bangla script, with no English in brackets, so the text reads naturally.
- **D-4** Source titles, publishers and quoted titles stay in their original language, as citations must match the published work.
- **D-5** Translations go in separate files with fingerprints. Source tables stay untouched, and outdated translations can be detected.
- **D-6** Outdated translations fall back to English. Bangla must never contradict a correction (a changed fee or date).
- **D-7** One note per page, not per paragraph. A fully drafted page would otherwise repeat the marker dozens of times.
- **D-8** No glossary (owner's choice); consistency is handled during table reviews (OQ-3).
- **D-9** Release builds only report Bangla gaps, because the English fallback is always safe.
- **D-10** The About page, the card one-liners and Bangla founder/family search are in scope. Searching descriptions is not: spec 08 D4 keeps search to names, places and families in both languages.
- **D-11** No Bangla SEO metadata without `/bn/` routes. One URL can offer Google only one title, and switching it to Bangla would hide English titles.
- **D-12** A side-by-side review page on dev and preview builds, so the owner can review a table without reading raw CSV.
- **D-13** Bangla prose keeps Latin digits (owner's choice), which makes it easy to match against English sources.

## 11. Open questions

- **OQ-1** Will anyone besides the owner (e.g. a native-speaker reviewer) approve translations, and does their approval count as `reviewed`?
- **OQ-2** Numbers formatted by code (timeline year headings, counts, fees) use Bangla digits in Bangla mode, but prose keeps Latin digits (D-13). Is this mix acceptable, or should code-formatted years inside prose-heavy sections also stay Latin?
- **OQ-3** Since there is no glossary, should the review page flag recurring English terms (e.g. "zamindar", "kachari", "single source") that are translated differently across rows?
