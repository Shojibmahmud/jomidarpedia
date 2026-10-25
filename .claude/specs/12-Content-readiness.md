# Content readiness

**Status:** Approved (by the owner, 2026-10-25)
**Roadmap reference:** `roadmap/DEVELOPMENT_ROADMAP.md` §3 Phase 12 (tasks 12.1–12.10); also O3, O11, O15, I7, 1.10, 1.13, 2.10, 2.11; `.claude/specs/01-Data-pipeline-gates.md` (editorial gates); `.claude/specs/09-Trips-and-itineraries.md` (legs, plan status, closing days); `docs/DATA_CONTRACT.md`
**Source task:** "Phase 12: Content readiness. Objective: release mode passes, with public text rewritten rather than deleted."
**Branch:** `13-phase-12-content-readiness`
**Date:** 2026-10-25

## 1. Problem and intended outcome

A release build (`npm run build`) fails while any editorial problem remains (`scripts/data-mode.mjs`, `scripts/lib/report.mjs`). On 25 Oct 2026 the local-mode report `data/reports/release-problems.md` lists **2,254 editorial cells**:

| Group | Cells | Largest parts |
|---|---|---|
| Internal notes in public text | 1,357 + 4 generated | `site_sources.citation_publisher` 643 (39 distinct values), `sites.coordinates_note` 244, `site_sources.citation_title` 110, `claims.claim_text` 78, `sites.short_description` 71, `sources.*` 119 |
| `itineraries.plan_status` not reviewed | 385 | build suggests 37 timed / 266 circuit / 82 incomplete |
| `visitor_info.closed_days` not reviewed | 413 | |
| `site_type = unclassified` | 79 | all in Dhaka Division |
| Credit lines not in the standard form | 15 | e.g. `IMG-RNG-021-004` |
| Text awaiting the owner's review | 1 | `content/about.en.md` |

Most internal notes record *where a lead came from*: the project owner, an AI tool, a browser lookup or a working file. They are not deleted because they carry real information about how far a statement can be trusted.

**Intended outcome:**
- `npm run build` passes in release mode with **zero editorial cells**.
- Every rewritten public string keeps its uncertainty in plain public words.
- The 342 inverted history-event years and the 2 missing Bangla names are fixed.
- CI's release job on `main` becomes blocking, so the result cannot regress.

## 2. Scope

### In scope
- 12.1 Record the starting count from the release report.
- 12.2 A one-off reviewed mapping for the formulaic `citation_publisher`, `citation_title` and repeated `sources.*` values.
- 12.3 Hand rewrites of `sites.coordinates_note`.
- 12.4 Hand rewrites of `short_description`, `claim_text` and `history_events.description`.
- 12.5 Hand rewrites of the small groups:
  - costs and route cost basis;
  - founder, era, preservation status and alternate names;
  - sources reliability notes and type labels;
  - itinerary planning notes and stop notes;
  - entry-fee note and legend narrative.
- 12.6 Classify the 79 `unclassified` sites, each with a recorded source.
- 12.7 Rewrite the 15 non-standard credit lines.
- 12.8 Add the editor's Manikganj fares as cost and leg rows. Add the `rickshaw` and `auto_rickshaw` leg modes.
- 12.9 Fill `plan_status` for all 385 itineraries and `closed_days` for all 413 visitor_info rows.
- 12.10 A 40-site spot check, logged.
- The owner's review of `content/about.en.md` (`reviewed: true`).
- Extra: fix the history events with `year_end` before `year_start` (342 on 25 Oct 2026).
- Extra: Bangla names for JB-RAJ-059 and JB-RAJ-071.
- Make the CI release job on `main` blocking (roadmap 1.13).

### Out of scope
- Changing the gate's term list (`scripts/lib/internal-terms.mjs`) or the editorial rules to make findings disappear.
- Publishing `site_sources.citation_note` or any other internal column (`scripts/lib/checks.mjs:47`, I7).
- The 173 history events dropped as "Not documented" placeholders.
- The `public/maps/division/dhaka.svg` size warning.
- Remapping existing `travel_routes.transport_mode` labels. For example, "CNG" stays `car` in `MODE_LABEL`.
- Adding legs to any itinerary other than `IT-DHK-064-1`.
- Production deployment and other Phase 13–14 work.

## 3. User journeys / use cases

1. **A reader checks how much to trust a site.** The sources list on JB-DHK-001 shows "Md. Mahmud Ali (cited second-hand from an unpublished project list)" instead of "Md. Mahmud Ali (cited by Orca's master list)". The reader learns that the book was not consulted directly, and sees no names of private people or tools.
2. **A reader looks at a pin.** The pin note says "Pin from Google Maps (13 Oct 2026); not yet matched by a published source", not "Google Maps pin supplied by Orca (project owner) on 13 Oct 2026."
3. **A reader plans the Manikganj loop.** `IT-DHK-064-1` shows the Teota → Aricha rickshaw (Tk 15 shared / Tk 30 reserved), the shared auto to Utholi (Tk 10) and the bus to Gabtoli (Tk 200), each dated 20 Oct 2026.
4. **The owner reviews a batch.** Claude presents about 25 cells as an old → new table. The owner approves it or edits it, and only then is the batch committed.
5. **A contributor makes a regression.** A later CSV edit reintroduces "this thread". CI's release job on `main` fails.

## 4. Functional requirements

### Wording rules (apply to every rewrite)
- **FR-1** A rewritten public value contains no match for `INTERNAL_TERMS`, `LOCAL_PATHS` or `WORKING_FILES` (`scripts/lib/internal-terms.mjs`).
- **FR-2** Provenance is described by **kind of source**, not by name. Rewrites use these standard phrases, or a close variant that says the same thing:

  | Internal meaning | Public phrase |
  |---|---|
  | The owner's research list, master list or upload | "Project research list (unpublished)" |
  | An audit or fact-check written by an AI tool | "AI-generated research audit (unpublished)" |
  | An AI-generated guide whose claims are leads only | "AI-generated research summary; claims treated as leads only" |
  | A Google Maps lookup by the project | "Google Maps (looked up by the project, <date>)" |
  | A pin given by the owner | "Pin from Google Maps (<date>)" |
  | A source this project did not open | "… (not consulted directly)" |
  | Something cited only through a project list | "… (cited second-hand from an unpublished project list)" |

- **FR-3** **Uncertainty is kept.** If the old value says or implies any of the following, the new value says it too:
  - unverified;
  - not found;
  - second-hand or not consulted;
  - AI-lead only;
  - not matched by a published source;
  - a conversion made by the project (e.g. Bangla → Gregorian years);
  - a disagreement between sources.

  A rewrite may shorten the wording. It may not turn an uncertain statement into a certain one.
- **FR-4** Second-hand status of a citation goes into the **public field** that carries the citation (normally `citation_publisher`), never into `citation_note`.
- **FR-5** Dates, sources named in the text (book titles, Banglapedia, union portals), places and figures in the old value are kept unless they are themselves internal. A reference to a working file becomes the kind of source, e.g. "see baliati-palace.md" becomes "see the Baliati Palace entry".
- **FR-6** Bangla text in a flagged cell is kept as it is, unless the Bangla text itself contains the internal term.
- **FR-7** Only public text changes. IDs, keys, enum values and the CSV header stay the same. The exceptions are the new rows and enum values in FR-17 to FR-20.

### Review workflow
- **FR-8** Every change is presented to the owner before it is committed. For each cell the presentation shows table, key, column, the old value and the new value. Hand rewrites are presented in batches of at most about 25 cells. Script output is presented as one table per distinct mapping, with the number of cells it changes.
- **FR-9** A script used for a formulaic group (12.2, 12.9 and the year fix) runs once. It is not added to `npm run data`, and is not kept as a build step. Its diff is the reviewed artefact.

### Per task
- **FR-10 (12.1)** The starting count (2,254 editorial cells on 25 Oct 2026, local mode) is recorded in the roadmap's Phase 12 status notes when the work begins.
- **FR-11 (12.2)** Each of the 39 distinct `citation_publisher` values and the flagged `citation_title` and `sources.*` values is mapped to a public value under FR-2 to FR-5.
  - Example: "Orca (project upload)" → "Project research list (unpublished)".
  - Example: "Gemini guide supplied by Orca (claims treated as leads only)" → "AI-generated research summary; claims treated as leads only".
  - Example: "Google Maps (looked up by Claude in Orca's browser)" → "Google Maps (looked up by the project)".
  - Values that appear only once are rewritten by hand in the same review.
- **FR-12 (12.3)** Every flagged `sites.coordinates_note` is rewritten by hand. "Not found" notes keep the date and what was searched (English and Bangla names, landmarks), and drop who searched and in whose browser.
- **FR-13 (12.4, 12.5)** The remaining flagged columns are rewritten by hand under FR-1 to FR-6. A claim whose only content was internal provenance keeps its public meaning. Example: "Not on Orca's Barishal lists. Found only as a named Google Maps place…" → "Not on the project's research lists. Found only as a named Google Maps place; no written source was found."
- **FR-14 (generated text)** The 4 generated findings clear because their source cells are fixed. This covers the `index.json` summaries for JB-KHL-016, JB-MYM-004 and JB-RAJ-002, and the `stillToConfirm` item on JB-CTG-023. If a generated finding remains after its source cells are clean, the generator's own wording is changed (Assumption A-3).
- **FR-15 (12.6)** Every site with `site_type = unclassified` gets a type from `TYPE_GROUP` (`scripts/lib/validate.mjs`) other than `unclassified`.
  - Each classification is based on at least one source already linked to the site in `site_sources.csv`.
  - Claude proposes; cases where the sources support more than one type (e.g. Ahsan Manzil: `royal_palace`, `historic_residence` or `museum`) are listed separately for the owner's decision.
  - Each decision is recorded in `data/reports/classification-2026-10-<dd>.md`, with one row per site: site_id, name, type, source_id(s), reason in one line.
- **FR-16 (12.7)** Each of the 15 credit lines is rewritten to match `STANDARD_CREDIT` (`scripts/build-data.mjs:553`) and keeps every attribution element its licence requires: author, licence name, link. The licence text that was pasted in by mistake is removed from the credit, because the licence link carries it (Assumption A-6).
- **FR-17 (12.8, modes)** `rickshaw` and `auto_rickshaw` are added to the following, so legs using them are valid and shown with their own label in the leg legend:
  - `MODES` (`scripts/lib/rules.mjs:80`);
  - the `Mode` type (`lib/types.ts:105`);
  - the mode list in `docs/DATA_CONTRACT.md`;
  - the leg rendering and legend of spec 09.
  `MODE_LABEL` is unchanged.
- **FR-18 (12.8, rows)** These rows are added for `IT-DHK-064-1` and anchor site JB-DHK-064:
  - In `itinerary_legs.csv`:
    - leg `4 → 5`, mode `rickshaw` (Teota → Aricha);
    - leg `5 → 6`, mode `mixed` (Aricha → Utholi → Gabtoli).
  - In `costs.csv`, each with `unit` "per person, one way", `estimate_date` 2026-10-20, a `basis_and_assumptions` text naming the vehicle and the change point, and the source in FR-19:
    - Tk 15 rickshaw, `fare_basis=shared`, `legs=4-5`;
    - Tk 30 rickshaw, `fare_basis=reserved`, `legs=4-5`;
    - Tk 10 shared auto to Utholi, `fare_basis=shared`, `legs=5-6`;
    - Tk 200 bus from Utholi to Gabtoli, `legs=5-6`.
  - The leg's single `cost_row` points to the shared rickshaw row for leg 4→5 and the auto row for leg 5→6. The budget lists all four rows through `costs.legs`.
  - The itinerary's stop times are not changed, and it stays `timed`.
- **FR-19 (12.8, source)** A new `sources.csv` row holds the editor's fares, with a public title and author such as "Fares reported by the project editor" and `access_date` 2026-10-20. It contains nothing that FR-1 forbids (Assumption A-4).
- **FR-20 (12.9, plan_status)** Every itinerary gets a `plan_status`:
  - The build's suggestion is written for all 385.
  - All 37 suggested `timed` plans are checked by hand: every stop has a real clock time and the times run in order. A plan that fails is set to `circuit` or `incomplete`, with the reason in the review table.
  - A random sample of 20 `circuit` and `incomplete` plans is checked the same way. If the sample finds an error, that whole group is checked.
- **FR-21 (12.9, closed_days)** Every `visitor_info` row gets a `closed_days` value, mapped from `weekly_closing_days`:
  - "None reported (no fixed schedule; unverified)" → `unknown`;
  - "Unknown" → `unknown`;
  - a named day ("Sunday", "Sunday (and public holidays)", "Thursday", …) → that day (`sun`, `thu`) only where `hours_status = reported`, and only after a hand check against the site's sources; otherwise `unknown`.

  `none` is used only where a source states the site is open every day.
- **FR-22 (12.10)** Claude picks 40 sites at random with a recorded seed and checks each against its linked sources: name, location, type, era, condition, access and fee. The findings go in `data/reports/spot-check-<date>.md`, with one entry per site: what was checked, the result, and any correction. Corrections go through FR-8. The owner reviews the log.
- **FR-23 (about)** The owner reviews `content/about.en.md` and sets `reviewed: true`. Claude may propose wording changes, but does not flip the flag.
- **FR-24 (year inversions)** Each history event with `year_end < year_start` is fixed so the build note "History events with year_end before year_start" reaches zero. A script sorts them into kinds; each kind is reviewed (Assumption A-2):
  - A month or day read as a year (e.g. `2019-03` → `year_end` 2003): `year_end` is cleared.
  - An alternative date from another source (e.g. 1802 vs 1699): `year_end` is cleared, and the alternative stays in `date_text` or becomes a conflict claim. It is never a range.
  - A true range entered backwards: the years are swapped.
  - Anything else goes to the owner.
- **FR-25 (Bangla names)** JB-RAJ-059 and JB-RAJ-071 get a `name_bn` from a linked source, or a reviewed transliteration. A transliteration is marked as such in `unverified_fields`, so the site page treats it as unconfirmed.
- **FR-26 (CI)** Once a release build passes on the branch, `continue-on-error: true` is removed from the release job in `.github/workflows/ci.yml`, along with its "Not blocking until Phase 12" comment.

## 5. Non-functional requirements

- **NFR-1 Language:** public rewrites are plain British-spelling English, consistent with the rest of the data, and no longer than needed to keep FR-3.
- **NFR-2 Honesty:** no rewrite makes a record look better sourced than before. Spot-check corrections may lower `record_confidence`; they never raise it without a source.
- **NFR-3 Privacy:** no public value names a private person (the owner included), a local path, a working file or an AI tool.
- **NFR-4 Output shape:** published JSON keeps the shapes in `docs/DATA_CONTRACT.md`. The only additions are the two new mode values, and the legs and cost rows that start to appear for `IT-DHK-064-1`.
- **NFR-5 Traceability:** every changed cell can be traced to a reviewed batch in the commit history. There is one commit per roadmap task or batch (Assumption A-5).
- **NFR-6 Safety:** structural errors and safety rules stay at zero after every batch. `npm run build:local` passes after every commit.

## 6. Data, interfaces, and integrations

**CSV columns edited (text only):**
- `site_sources`: `citation_publisher`, `citation_title`
- `sources`: `author_or_organization`, `title`, `reliability_notes`, `source_type_label`
- `sites`: `coordinates_note`, `short_description`, `founder_or_family`, `established_era`, `preservation_status`, `alternate_names`, `site_type`, `name_bn`
- `claims`: `claim_text`
- `history_events`: `description`, `year_end`, `year_start`
- `costs`: `basis_and_assumptions`
- `travel_routes`: `cost_basis`
- `itineraries`: `planning_notes`, `plan_status`
- `itinerary_stops`: `notes`
- `visitor_info`: `entry_fee_note`, `closed_days`
- `legends`: `narrative`
- `images`: `required_credit`

**Rows added:**
- `itinerary_legs.csv`: 2 rows
- `costs.csv`: 4 rows (IDs continue the `CO-DHK-064-NN` series)
- `sources.csv`: 1 row (next `SRC-` ID)

**Code changed:**
- `scripts/lib/rules.mjs` `MODES`
- `lib/types.ts` `Mode`
- the leg legend and line style in `components/trips/`
- `docs/DATA_CONTRACT.md` (mode list)
- `.github/workflows/ci.yml`
- tests that list modes

**New files:**
- `data/reports/classification-<date>.md`: a Markdown table with columns site_id, name, type, sources, reason.
- `data/reports/spot-check-<date>.md`: the seed, the list of 40 site_ids, and one section per site with checked fields, result and correction.

The workbook stays in step through `scripts/export-xlsx.py` if the owner still uses it. `data/csv/` is the source of truth (README).

## 7. Edge cases and failure behaviour

- **A value that is nothing but provenance** (e.g. "Pin supplied by Orca in the project thread" as a citation title) becomes the public kind of source ("Pin from Google Maps"). It is never left blank, unless the column allows blank and the meaning is already given elsewhere on the same record.
- **One internal term inside a long, otherwise good description:** only that clause is rewritten.
- **Credit licence that cannot fit `STANDARD_CREDIT`:** stop and raise it with the owner. Neither the licence's required wording nor the regex is weakened silently (Open question Q-1).
- **No linked source supports any type for an unclassified site:** the owner decides. Options include adding a source, or setting `map_display`/release handling so the site is not published until it is classified. `unclassified` is never left in the data, because it fails release.
- **The named closing day and the source disagree:** the value is `unknown` and the disagreement is noted in the review table.
- **An ambiguous year inversion** (unclear which year is right): `year_end` is cleared, `date_text` keeps both years, and the case is listed for the owner.
- **A spot-check finding that needs research beyond the sources:** it is logged as open in the spot-check file. It does not block release unless it is a safety or structural problem.
- **A new editorial finding appears during the work** (e.g. a new CSV row): it is handled under the same rules before the release check.
- **A batch is rejected by the owner:** nothing from it is committed. The revised batch is presented again.

## 8. Acceptance criteria

- **AC-1** `npm run build` (release mode) passes, and `data/reports/release-problems.md` shows `Editorial problems (0 cells)`, 0 structural errors and 0 safety-rule failures. *(FR-1, FR-10 to FR-25)*
- **AC-2** Every report group from §1 reports 0: internal notes, credit lines, unclassified, plan_status, closed_days and owner's review. *(FR-11 to FR-16, FR-20, FR-21, FR-23)*
- **AC-3** A sample of 40 rewritten cells has no lost qualifier under FR-3. The sample is spread across groups, with at least 10 from `coordinates_note` and 10 from `claim_text` / `short_description`. The check is recorded in the PR description. *(FR-2 to FR-6, NFR-2)*
- **AC-4** `git diff main -- data/csv` changes no IDs, keys or headers, apart from the rows in FR-18 and FR-19. *(FR-7)*
- **AC-5** Each batch and script diff was shown in the FR-8 format before its commit. Each commit message names its task (12.x) or batch. *(FR-8, FR-9, NFR-5)*
- **AC-6** `package.json` scripts and `scripts/data.mjs` contain no Phase 12 mapping script. *(FR-9)*
- **AC-7** Given the release build output, `/sites/JB-DHK-001/` and three other sample sites show only public provenance phrases in their sources list. *(FR-2, FR-4, FR-11)*
- **AC-8** `classification-<date>.md` lists 79 of 79 former `unclassified` sites. Each row's source_id is linked to that site in `site_sources.csv`. *(FR-15)*
- **AC-9** Each of the 15 credit lines matches `STANDARD_CREDIT` and still names its author, licence and licence link. *(FR-16)*
- **AC-10** In the built `data/build/trips/IT-DHK-064-1.json`:
  - `legs` has the two legs, with modes `rickshaw` and `mixed`;
  - `schematic` is false;
  - the budget has the four fare rows, each with the correct amount, `basis` and `legs`;
  - `planStatus` is `timed`;
  - the trip page shows the legs with their legend labels.
  *(FR-17, FR-18, FR-19)*
- **AC-11** Unit or contract tests cover the new modes, and `npm test`, `npm run typecheck` and `npm run lint` pass. *(FR-17, NFR-6)*
- **AC-12** All 385 itineraries have a `plan_status` value. The review table records the 37 timed checks and the 20-plan sample. *(FR-20)*
- **AC-13** All 413 visitor_info rows have a `closed_days` value. No row has a named day where `hours_status ≠ reported`, and none has `none` without a source. *(FR-21)*
- **AC-14** `spot-check-<date>.md` has the seed and 40 entries, and the owner has reviewed it. *(FR-22)*
- **AC-15** `content/about.en.md` has `reviewed: true`, set by the owner. *(FR-23)*
- **AC-16** The build note "History events with year_end before year_start" is absent or 0. No event that was fixed gained a range it didn't have. *(FR-24)*
- **AC-17** JB-RAJ-059 and JB-RAJ-071 have a `name_bn`, and "Sites without a Bangla name" is absent or 0. *(FR-25)*
- **AC-18** `.github/workflows/ci.yml` has no `continue-on-error` on the release job. A push to the branch shows that job green. *(FR-26)*
- **AC-19** `npm run build:local` passes at every commit on the branch. *(NFR-6)*

## 9. Dependencies, constraints, and assumptions

### Dependencies
- Task 1.10: the per-cell report (`scripts/lib/report.mjs`), done.
- Spec 01: editorial gate behaviour. Spec 09: leg rendering, `planStatus`, `closedDays`. Spec 10: About page `reviewed` flag (D10).
- Owner availability for batch reviews, ambiguous classifications, the About page review and the spot-check review.

### Constraints
- `data/csv/*.csv` is the source of truth (README:32). The build reads all tables through `scripts/build-data.mjs`.
- Internal columns are never published (`scripts/lib/checks.mjs:47`, I7). Text kept in `citation_note` is therefore invisible to readers.
- The internal-term rules live in `scripts/lib/internal-terms.mjs`. `TYPE_GROUP` and `ENUMS` are in `scripts/lib/validate.mjs`. `MODES`, `PLAN_STATUS` and `FARE_BASIS` are in `scripts/lib/rules.mjs`. `STANDARD_CREDIT` is in `scripts/build-data.mjs:553`.
- `closed_days` accepts blank, `unknown`, `none` or `;`-separated days (`scripts/lib/structure.mjs:132`). A blank is an editorial cell.
- A leg has one `cost_row`; extra cost rows attach to a leg through `costs.legs` (`docs/DATA_CONTRACT.md:147`).
- The roadmap rule: an unverified "None reported" is `unknown`, not `none` (roadmap §2.11 notes).
- Network access from the sandbox may be limited. Source checks that need the web (spot check, classification) may need the owner's browser.

### Assumptions (A-n, not yet confirmed)
- **A-1** The term list in `internal-terms.mjs` stays unchanged. Every finding is fixed in the data, not by loosening the gate.
- **A-2** The year inversions fall into the kinds listed in FR-24, and the clear/swap rules are acceptable.
- **A-3** The 4 generated findings come from source cells and clear with them. The generator is changed only if one does not.
- **A-4** The fare source is a new `sources.csv` row titled along the lines of "Fares reported by the project editor", dated 20 Oct 2026.
- **A-5** One commit per task or batch on `13-phase-12-content-readiness`, merged as one PR.
- **A-6** The 15 credit lines can be brought to `STANDARD_CREDIT` without losing licence-required wording, because the pasted licence text duplicates the licence link.
- **A-7** The 5→6 leg uses mode `mixed` (auto, then bus), and its `cost_row` points to the auto fare.
- **A-8** The leg `cost_row` for 4→5 points to the shared rickshaw fare. The reserved fare appears only as a budget row.

## 10. Key decisions and rationale

| # | Decision | Rationale |
|---|---|---|
| D1 | Generic but honest provenance wording (FR-2) | Readers still learn how far to trust a statement (AI lead, second-hand, map lookup) without names of private people or tools. |
| D2 | Claude drafts, owner reviews in batches of about 25 (FR-8) | Keeps the volume manageable; nothing reaches the data unreviewed. |
| D3 | One-off reviewed scripts for formulaic groups (FR-9, O3) | 643 publisher cells have only 39 distinct values; a mapping is safer than 643 hand edits, and the diff is the review. |
| D4 | Second-hand flag in the publisher field (FR-4) | `citation_note` is internal and never published; only the publisher field is visible on the sources list. |
| D5 | `closed_days` mapped from `weekly_closing_days`, named days hand-checked (FR-21) | The column already holds the research; the roadmap counts unverified "None reported" as unknown. |
| D6 | `plan_status` from the build's suggestion, all timed checked plus a sample (FR-20) | The suggestion is rule-based (O11); `timed` is the claim readers rely on, so it gets a full check. |
| D7 | Classification sources in a review log, no schema change (FR-15) | 12.6 needs traceability, not a published field. |
| D8 | New `rickshaw` and `auto_rickshaw` modes (FR-17) | The legs should say what they really are, and the editor's fares are the first legs in the data. |
| D9 | Aricha → Gabtoli as one leg with two cost rows (FR-18) | It keeps the editor's clock times; adding a timed Utholi stop would invent a time. |
| D10 | Claude prepares the spot check and the About changes; the owner signs off (FR-22, FR-23) | Both are owner judgements; the preparation is mechanical. |
| D11 | Year inversions and the 2 Bangla names are in scope (FR-24, FR-25) | They are visible data errors, and this is the content-cleaning phase. |
| D12 | Make the release CI job blocking (FR-26) | Roadmap 1.13: it is non-blocking only until Phase 12 is complete. |

## 11. Open questions

- **Q-1** If any of the 15 credit lines needs licence wording that `STANDARD_CREDIT` cannot hold, should the standard form be widened, or the image withheld until it is resolved? This only matters if A-6 fails.
- **Q-2** For an unclassified site that no linked source can type (if any), should the editor add a source or hold the site back from release? See §7.
