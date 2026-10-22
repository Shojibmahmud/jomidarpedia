# Data pipeline gates, validation and determinism

**Status:** Draft
**Roadmap reference:** `DEVELOPMENT_ROADMAP.md` §3 Phase 1 (tasks 1.1–1.13); also §2.4 Build modes and gates, §2.5 Dataset baseline, I6
**Source task:** "Data builds that are safe by default. They validate structure, enforce the non-negotiable rules in every mode, and produce the same output every time they run."
**Branch:** `02-phase-1-data-pipeline`
**Date:** 2026-10-22

## 1. Problem and intended outcome
Today the two data builders trust their input and gate inconsistently:
- `scripts/csv.mjs` silently accepts ragged rows. The 0.7 test is still `it.todo`.
- `build-index.mjs` needs positional arguments, checks only for a missing latitude, and has its own copies of `BUCKET` and the internal-notes check.
- `build-data.mjs` prints referential problems as warnings and continues.
- `meta.generatedAt` changes on every run.
- No mode distinguishes a developer's machine from a production build.
- CI never runs the data scripts.

Outcome: one validated, deterministic pipeline that runs in **release** mode unless told otherwise. It always refuses to publish hidden coordinates, non-Ready images, misrepresented fees or an oversized index. It fails release builds on editorial problems and reports them by the CSV cell that has to be edited.

## 2. Scope
### In scope
- Tasks 1.1–1.13 as written in the roadmap, with the decisions in §10.
- CSV fixes needed for structural validity: 2 orphan claim-source links, 1 duplicate slug, 1 free-text publication date, and 71 stale duplicate audit citations (FR-34–FR-36a).
- `tests/baseline.json` and the invariant tests.
- CI changes (1.13).

### Out of scope
- Phase 2 contract fixes: `conflict()` source loss (2.2), route-mode mapping (2.5), `plan_status` (2.10), trip `lastChecked` (2.8), the field whitelist I7, and the external photo link (2.12).
- Phase 12 editorial clean-up: rewriting flagged cells, classifying the 79 `unclassified` sites, fixing the 15 credit lines.
- `noindex`, pages, sitemap and Open Graph, which don't exist yet.
- Changing roadmap text, including the §2.5 numbers.

## 3. User journeys / use cases
- **UJ-1 Maintainer, local dev:** runs `npm run dev` or `npm run build:local`. Editorial problems are reported in `data/reports/release-problems.md`, and the build continues.
- **UJ-2 Maintainer edits a CSV and breaks it** (a stray comma, a typo in an ID). The build stops in every mode and names the file, row and column.
- **UJ-3 Production or default build:** `npm run build` with no variables runs in release mode. It fails until Phase 12 clears the editorial problems, and the report lists *cells to edit*.
- **UJ-4 Vercel production with `JP_DATA_MODE=local` set by mistake:** still runs in release mode.
- **UJ-5 CI:** branch and PR builds use local mode and block. `main` also runs a release build that is visible but doesn't block.
- **UJ-6 Phase 12 editor:** works from the report, grouped by CSV cell, and watches the *cells to edit* count fall.

## 4. Functional requirements

**Mode (1.1)**
- FR-1: `scripts/data-mode.mjs` exports a pure function that resolves `local | preview | release` from an environment object.
  - `VERCEL_ENV=production` → `release`, whatever `JP_DATA_MODE` says.
  - Otherwise `VERCEL_ENV=preview` → `preview`.
  - Otherwise `JP_DATA_MODE ∈ {local, preview, release}` → that value.
  - Otherwise → `release`.
  - An unrecognised `JP_DATA_MODE` value → `release`, with a printed notice.
- FR-2: CI variables (`CI`, `GITHUB_*`) never influence the mode.
- FR-3 (A-5): `preview` applies the same gates as `local`. The resolved mode is printed and written in the report header.

**Builder interface (1.2, testability)**
- FR-4: `build-index.mjs` defaults to `data/csv/sites.csv`, `data/csv/images.csv` and `public/data` when called with no arguments. Positional arguments still override them.
- FR-5: Each builder exposes an importable function that takes input paths and an output directory, and returns its problems (structural, safety, editorial, warnings) and counts. The mode is applied when the results are combined (`scripts/lib/report.mjs`), so one build can be judged in every mode. The CLI is a thin wrapper that sets the exit code. Tests call the functions directly.

**CSV reader (1.3)**
- FR-6: `parseCsv` returns `{ rows, errors }`.
  - `errors` covers field-count mismatches (row number and expected vs actual), an unclosed quote at end of input, and duplicate or empty header names.
  - Rows are numbered by the line they start on in the file, header = line 1.
  - The 0.7 `it.todo` becomes a passing test.
  - Both builders and the tests are updated for the new return shape.
- FR-7: Blank trailing lines are not errors. A row made only of separators (wrong length) is.

**Shared validation (1.4)**
- FR-8: `scripts/lib/validate.mjs` exports:
  - `isMappable(site)`: lat and lon are finite, lat is in 20.3–26.7, lon is in 88.0–92.7, and `map_display ≠ hide`;
  - the ID patterns;
  - the enum sets (A-1);
  - the date parsers (FR-12);
  - a non-negative-number check.

  Both builders, and the itinerary-stop `latlon`, use `isMappable`. Nothing reimplements it inline.
- FR-9: Shared constants (`BUCKET`, the `TYPE_GROUP` key set, internal terms) each live in one module that both builders import.

**Structural validation (1.5): fatal in every mode**
- FR-10: Each table's required columns are present.
- FR-11: IDs match their patterns and are unique:

  | ID | Pattern |
  |---|---|
  | site | `JB-[A-Z]{3}-\d{3}` |
  | source | `SRC-\d{4}` |
  | claim | `CL-[A-Z]{3}-\d{3}-\d{3}` |
  | itinerary | `IT-[A-Z]{3}-\d{3}-\d` |
  | relation | `RL-\d{4}` |
  | image | `[A-Z]{3}-[A-Z]{3}-\d{3}-\d{3}` |
  | route | `[A-Z]{2}-[A-Z]{3}-\d{3}-\d` |
  | cost | `[A-Z]{2}-[A-Z]{3}-\d{3}-\d{2}` |
  | event | `[A-Z]{2}-[A-Z]{3}-\d{3}-\d{3}` |
  | legend | `[A-Z]{2}-[A-Z]{3}-\d{3}-\d{2}` |

  Tables without an ID column are keyed by a pair, which must also be unique: `site_sources` (site_id, source_id), `claim_source_links` (claim_id, source_id) and `itinerary_stops` (itinerary_id, stop_order).
- FR-12: Dates (two tiers).
  - System dates must be `YYYY-MM-DD` and a real calendar date: `sites.last_verified`, `visitor_info.last_verified`, `sources.access_date`, `images.date_accessed`, `costs.estimate_date`, `travel_routes.estimate_date`.
  - Citation and publication dates (`site_sources.citation_date`, `sources.publication_date`) may be blank, `YYYY`, `YYYY-MM`, `YYYY-MM-DD`, or `<one of those> to <one of those>`.
- FR-13: Foreign keys resolve:
  - every `site_id` in child tables;
  - `site_sources.source_id` and `claim_source_links.source_id`;
  - `claim_source_links.claim_id`;
  - `legends.claim_id` (when not blank);
  - `itinerary_stops.itinerary_id`;
  - `itineraries.anchor_site_id` and each `linked_site_ids` entry;
  - `site_relationships.site_id` and `related_site_id`;
  - every `SRC-` ID embedded in `history_events.source_ids` and `legends.attribution`.
- FR-14: Enum columns hold allowed values (A-1), including `sites.division` among the 8 divisions.
- FR-15: Number columns parse as finite and ≥ 0 when non-blank: `entry_fee_bdt` (sites and visitor_info), `travel_time_hours_from_dhaka`, `one_way_cost_bdt_estimate`, `costs.amount_bdt`, `travel_routes.duration_hours_one_way`, `travel_routes.cost_bdt_one_way`, `itinerary_stops.stop_order` (an integer ≥ 1). Latitude and longitude follow FR-16.
- FR-16: Coordinates.
  - Latitude and longitude are both blank or both present.
  - When present, they must be finite and inside the Bangladesh box. Outside the box is a structural error, not a silent hide.
- FR-17: Generated route paths are unique within each namespace: site `dataset_slug`; district slugs from `slugify` (`/district/[slug]`); division slugs (`/division/[slug]`). A district and a division may share a slug (Dhaka is both), because their routes differ.
- FR-18: Every Ready image has a non-blank `relative_file_path`.
- FR-19: Every structural error names the file, the CSV row (line number), the column and the offending value. All errors are collected before the build stops; it doesn't stop at the first one.

**Determinism (1.7)**
- FR-20: `meta.generatedAt` = `SOURCE_DATE_EPOCH` (seconds → ISO 8601 UTC) if it is set and valid; otherwise `meta.lastUpdated`. Never the wall clock.
- FR-21: Arrays whose order carries no meaning are sorted by a stable key (ID or slug). Arrays with meaning keep their documented order: route kind, stop order, footnote order, CSV row order for sites. Object keys are emitted in a fixed order.
- FR-22: Given identical inputs and environment, two runs produce byte-identical `data/build/**`, `public/data/index.json` and `data/reports/release-problems.md`.

**Gates and modes (1.8)**
- FR-23: Always fatal, every mode:
  - structural errors (FR-10–FR-19);
  - hidden-coordinate rule (FR-27);
  - image eligibility (only Ready images in site records and credits);
  - fee semantics (FR-29);
  - `index.json` over 150 KB gzipped.
- FR-24: Editorial rules fail **only in release**; in local and preview they are reported and the build continues:
  - internal-note terms in public text;
  - non-standard credit lines;
  - `site_type = unclassified`.
- FR-25: Warnings never fail the build: a missing visitor_info row, a trip title without parentheses, an unknown route mode.
- FR-26: Output on failure.
  - On structural failure in any table, no output is written and any existing `data/build/**` and `public/data/index.json` are removed, including the other builder's output.
  - On a rule or editorial failure, output is written for inspection.
  - In both cases the process exits non-zero and the report is written.

**Hidden coordinates (R5)**
- FR-27: For every site where `isMappable` is false:
  - there is no `ll` in `index.json` and no `location.latlon` in the site JSON;
  - no itinerary stop carries `latlon`;
  - no outbound URL in any output contains a coordinate pair.

  The build checks this on its own output after generating it, as a fatal check.

**Report (1.8, 1.10)**
- FR-28: Every run, in every mode, writes `data/reports/release-problems.md`. It contains:
  - the mode;
  - a summary line with `cells to edit` and `output occurrences`;
  - sections for structural errors, gate failures, editorial problems and warnings.

  Internal-note problems are grouped **by CSV source cell** (table, row ID, column), with the affected outputs (file and JSON path) listed under each cell. Groups are sorted deterministically.
  - An output string is traced to a cell whose text contains it, or that it contains. The output's own record wins over other rows, and an exact match wins over containment.
  - Text the build composes itself (for example `stillToConfirm`) is grouped under its output path as "(generated)".
  - Columns that are never published (`site_sources.citation_note`, `sources.local_path`, `images.identity_verification`, `license_evidence`, `notes`) are never blamed. Flagged cells that reach no output are only counted.

**Content rules (1.11)**
- FR-29: Fee rule (meaning-based).
  - A fee that is 0 or unknown never appears as a price.
  - No public string matches "free entry" or "entry: free" (case-insensitive).
  - "Free" elsewhere is allowed, for example in a source title.
  - The blanket `\bfree\b` ban and any ban on "audit" are removed.
- FR-30: Internal terms live in `scripts/lib/internal-terms.mjs`:
  - the existing terms: Orca, "this thread", Claude, ChatGPT, Gemini;
  - `Brave browser` and `Project upload` (see OQ-1);
  - local paths: `/Users/`, `file://`, `C:\`;
  - working-file names ending `.xlsx` or `.md`.
- FR-31: URL-valued strings are scanned only for local paths and the `file:` scheme, not for the other terms.

**Scripts and CI (1.12, 1.13)**
- FR-32: `package.json` scripts:
  - `data:index`, `data:build`;
  - `data` = both;
  - `dev` = `JP_DATA_MODE=local npm run data && next dev`;
  - `build:local` = `JP_DATA_MODE=local npm run data && next build`;
  - `build` = `npm run data && next build` (release by default).
- FR-33: CI.
  - Every push and PR runs lint, typecheck, test and `npm run build:local`. These steps block.
  - On pushes to `main` only (A-6), a separate `release` job runs `npm run build` with `continue-on-error: true` and uploads `data/reports/release-problems.md` as an artifact.

**Data fixes**
- FR-34: Delete the two `claim_source_links` rows whose `claim_id` is `CL-DHK-006-015` or `CL-DHK-015-009`.
- FR-35: Set `dataset_slug` to `rautara-zamindar-bari-magura` for JB-KHL-037 and `rautara-zamindar-bari-sirajganj` for JB-RAJ-066. Leave `dataset_json` and `dataset_profile` unchanged.
- FR-36: Change SRC-0001's free-text `publication_date` "February 2024 (first edition)" to `2024-02`, and add "Publication date is for the first edition." to its `reliability_notes` (A-3).
- FR-36a: Delete the 71 `site_sources` rows that cite the AI-audit documents under the master-list IDs (SRC-1104 Chattogram, SRC-1107 Khulna). Each one duplicates the site's correct audit row (SRC-1117, SRC-1115) apart from the ID; 26 of them repeated a (site, source) pair. Recompute `cited_by_site_count` and `cited_by_site_ids` for SRC-1104 (38 → 35) and SRC-1107 (49 → 7). Decided by the owner during implementation, 22 Oct 2026.

**Baseline (1.9)**
- FR-37: `tests/baseline.json` holds the §2.5 measures as computed after FR-34–FR-36.
- FR-38: An invariant test asserts:
  - `onMap + noPin = sites`;
  - no hidden site has `ll` or `latlon`;
  - Ready images in the output = Ready rows in the CSV;
  - every index row has a site file, and vice versa.
- FR-39: Any difference from the baseline fails the test, which prints a measure-by-measure diff.

## 5. Non-functional requirements
- NFR-1: No new runtime dependencies in `scripts/`; Node built-ins only (A-2).
- NFR-2: A full data build (both builders) completes in under 10 s on the developer's machine.
- NFR-3: The mode fails closed. Any ambiguity resolves to `release`.
- NFR-4: Error messages use plain language and one line per problem. Each line can be found again by file, row and column.
- NFR-5: Runs on Node 24 (CI and `.nvmrc`) and Node 26 (the owner's machine).

## 6. Data, interfaces, and integrations
- **Inputs:** the 14 tables in `data/csv/`. `data/reference/` isn't validated in this phase.
- **Outputs:** `data/build/**` (shapes in `lib/types.ts`, unchanged in this phase except `meta.generatedAt`), `public/data/index.json`, `data/reports/release-problems.md`. All are gitignored.
- **Environment:** `JP_DATA_MODE`, `VERCEL_ENV`, `SOURCE_DATE_EPOCH`.
- **New modules:** `scripts/data-mode.mjs`, `scripts/lib/validate.mjs`, `scripts/lib/internal-terms.mjs`.
- **Tests:** `tests/fixtures/csv/` holds a minimal valid set plus one invalid fixture per rule in FR-8 and FR-10–FR-18, and hostile fixtures for FR-23 and FR-27.
- **CI:** `.github/workflows/ci.yml`.
- **Enum sets (A-1, observed 22 Oct 2026):**

  | Column | Allowed values |
  |---|---|
  | `condition_category` | preserved, preserved_adaptive_reuse, in_ruins, lost, unknown |
  | `visitor_access` | restricted_or_permission, open_no_ticket_reported, unknown, not_applicable_lost, ticketed |
  | `coordinates_status` | verified, single_source, approximate, unverified, not_found |
  | `map_display` | show, show_flagged, hide |
  | `record_confidence` | confirmed, partially_confirmed, unconfirmed, not_graded |
  | `travel_time_bucket` | 0-1h, 1-2h, 2-3h, 3-4h, 4-5h, 4h+, unknown |
  | `day_trip_from_dhaka` | TRUE, FALSE, blank |
  | division | Dhaka, Chattogram, Rajshahi, Khulna, Barishal, Sylhet, Rangpur, Mymensingh |
  | `itineraries.duration` | One day, Overnight / multi-day, Not stated |
  | `claim_type` | fact, conflict, legend |
  | `claim_source_links.relation` | supports, disputed_by, reported_by |
  | `route_kind` | primary, alternative |
  | `site_type` | the `TYPE_GROUP` keys |

## 7. Edge cases and failure behavior
- `JP_DATA_MODE=LOCAL` (wrong case) or `JP_DATA_MODE=dev` → `release`, with a notice (FR-1).
- `SOURCE_DATE_EPOCH` is not an integer → ignored with a notice; fall back to `lastUpdated`.
- Coordinates are `0,0`, swapped, or only one is present → structural error (FR-16).
- `map_display = show` without coordinates → not mappable and no pin. This is not an error; it is the current 114 no-pin behaviour.
- A CSV with a BOM, CRLF line endings, or a quoted newline inside a field → parses correctly.
- A missing CSV file → structural error naming the file.
- Two district names with the same slug (for example "Manikganj" and "manikganj") → structural error (FR-17). A district and a division with the same slug are allowed.
- A Ready image whose site has `map_display = hide` → still published. Image rules are independent of the pin.
- A fee of `0` on a `ticketed` site → shown as "No ticket reported", never as a price. The existing "ticketed but no fee" warning stays a warning.
- An internal term inside a URL query → not flagged, unless it is a local path or `file:` (FR-31).
- `index.json` exactly at 150 KB gzipped → passes; one byte over → fails.

## 8. Acceptance criteria
- AC-1 (FR-1–FR-3): The unit tests cover every combination of `VERCEL_ENV` ∈ {unset, preview, production, development} × `JP_DATA_MODE` ∈ {unset, local, preview, release, garbage}. Given `VERCEL_ENV=production` and `JP_DATA_MODE=local`, the mode is `release`.
- AC-2 (FR-4): `node scripts/build-index.mjs` with no arguments writes `public/data/index.json`.
- AC-3 (FR-6, FR-7): The csv tests cover a ragged row, an unclosed quote, a duplicate header, an empty header, a BOM, CRLF, a quoted comma, an escaped quote and Bangla text. They all pass, and there is no `it.todo`.
- AC-4 (FR-8–FR-18, FR-19): For each invalid fixture, the build fails in `local` mode with a message containing the fixture's file name, row number and column name.
- AC-5 (FR-20–FR-22): Two consecutive `npm run data` runs give byte-identical outputs and reports (checked by a test that hashes both temp output directories). Setting `SOURCE_DATE_EPOCH` changes only `generatedAt`.
- AC-6 (FR-23, FR-27): The hostile fixtures fail in **every** mode: a hidden site with coordinates in a URL, a non-Ready image, a fee of 0 marked known, "Free entry" text, and an index over budget.
- AC-7 (FR-24, FR-25): With the real data, `npm run build:local` exits 0 and its report lists editorial problems. `npm run build` with no variables exits non-zero, and its summary line reports `cells to edit` and `output occurrences`.
- AC-8 (FR-26): A structural fixture failure leaves no `data/build/` or `public/data/index.json`. An editorial failure in release leaves them written.
- AC-9 (FR-28): The report groups internal-note problems by `table / row ID / column`, with the affected outputs listed under each cell.
- AC-10 (FR-29–FR-31): Tests show the following:
  - "Free" in a source title passes;
  - "free entry" anywhere fails;
  - "audit" passes;
  - `/Users/x/file.xlsx` in a note is flagged;
  - an `https://` URL containing "Claude" isn't flagged.
- AC-11 (FR-32): Each script exists and runs as described.
- AC-12 (FR-33): On a PR, CI runs build:local and blocks on failure. On `main`, the release job runs, may fail without failing the workflow, and uploads the report.
- AC-13 (FR-34–FR-36a): The real data passes structural validation. No two sites share a slug. Both Rautara sites have the new slugs.
- AC-14 (FR-37–FR-39): `npm test` passes against `tests/baseline.json`. Changing one count in the baseline makes the test fail with a readable diff.
- AC-15 (FR-8, FR-9): `BUCKET`, the internal-term list and the bounding-box check are each defined in exactly one module under `scripts/`, which both builders import. A grep confirms there are no inline copies.
- AC-16 (NFR-2): `time npm run data` on the real CSVs reports under 10 s.

## 9. Dependencies, constraints, and assumptions
### Dependencies
- Phase 0 is complete: Vitest, the CI workflow and the scripts.
- Phase 2 builds on FR-5 (importable builders) and FR-8 (shared validation).

### Constraints
- Static export only. There is no runtime server (`next.config.mjs`, roadmap §1 Architecture).
- `data/build/`, `public/data/` and `data/reports/` are gitignored (`.gitignore`).
- The scripts are dependency-free ESM (header comments in `scripts/build-*.mjs`).
- `next build` in CI needs network access for `next/font`. Locally, in the sandbox, it needs to run outside it (owner memory).
- The app repository is public. CSV edits in FR-34–FR-36 add no new sensitive data.

### Assumptions
- A-1: The enum sets are the values observed on 22 Oct 2026 (§6).
- A-2: No new dependencies. Shared code goes in `scripts/lib/`.
- A-3: "first edition" moves to `reliability_notes` and the date becomes `2024-02`.
- A-4: The baseline holds post-fix counts. The roadmap §2.5 text isn't edited by this work.
- A-5: `preview` gates are the same as `local` in this phase.
- A-6: The release CI job runs only on pushes to `main`.

## 10. Key decisions and rationale
- **One spec for the whole phase.** The tasks share the mode, validator and report.
- **Fix the 3 bad rows rather than relax the rules.** Structural rules stay fatal everywhere, and `build:local` must pass.
- **Out-of-box coordinates are fatal.** Hiding them silently would mask typos such as swapped lat/lon.
- **Builders are importable functions.** Tests are self-contained and order-independent.
- **CI keeps a blocking gate on `main`.** The literal roadmap wording would leave `main` with no blocking build.
- **The warning split.** An unknown division is a schema problem. A credit line needs editing. The other warnings belong to Phase 2.
- **Two-tier dates.** Citation dates are only as precise as their sources, so YYYY or YYYY-MM is allowed for them, and no day is invented.
- **Output on failure.** After a structural failure, writing output would mislead. A rule failure still needs its output for inspection, and `&&` prevents it from being used.

## 11. Open questions
- OQ-1: `Project upload` matches `sources.source_type_label` on 16 project-file sources ("Project upload: research list", "Project upload: AI audit"). **As implemented, these count as editorial cells (Phase 12 work).** Exempting the field would remove 16 cells from the report.
- OQ-2: Should the RL-0009 relationship note, which quotes the old shared slug, be reworded? It is not published today.
