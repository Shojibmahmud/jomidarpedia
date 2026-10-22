# Data contracts

**Status:** Draft
**Roadmap reference:** `DEVELOPMENT_ROADMAP.md` §3 Phase 2 (tasks 2.1–2.17); also §2.2 I5 and I7, §2.3 O10, O11 and O13, §2.5 Dataset baseline
**Source task:** "Generated JSON that carries what the designs need, with attribution, units and dates preserved, and with uncertainty kept rather than filled in."
**Branch:** `03-phase-2-data-contracts`
**Date:** 2026-10-22

## 1. Problem and intended outcome
The Phase 1 pipeline is safe and deterministic, but its output loses information the UI will need:
- `conflict()` copies all sources onto a single-version conflict, and none onto split versions (`scripts/build-data.mjs` `conflict`).
- Legends and the facts `era`, `founder`, `style` and `preservation` have no sources of their own, so the page footnotes imply that every source supports every claim.
- Routes with an unknown mode are drawn as buses (52 "Other / mixed", 3 "Unknown").
- A trip budget is `{ item, amount: Maybe<string> }` built from display prose ("about Tk 150"), with no number, unit or basis.
- A trip has one `lastChecked`, taken from the newest anchor date.
- `features` is always `[]`. There is no plan status, no place coordinates and no legs.
- The index lacks the fields the Explore filters and cards need.

Outcome: a documented, typed and tested contract (`docs/DATA_CONTRACT.md` and `lib/types.ts`) where every fact keeps its own sources, units and date. Unknowns stay unknown, and a value is never inferred to fit a design.

## 2. Scope
### In scope
- Tasks 2.1–2.17 with the decisions in §10.
- I7 field whitelist: only named public fields reach any output (FR-40).
- New optional CSVs, with headers only: `itinerary_places.csv`, `itinerary_legs.csv`, `features.csv`.
- New CSV columns: `itineraries.plan_status`, `visitor_info.closed_days`, `costs.fare_basis`, `costs.legs`, and `sources.author`, `publisher`, `edition`, `isbn`, `verification_method`.
- Filling the SRC-0001 structured fields (2.15) and the alias list (FR-6).
- Baseline additions for the new counts.

### Out of scope
- UI components (`RouteMap`, `DayCheck`, `FeatureList`, cards). The contract only defines what they read and their empty states.
- Filling `plan_status`, `closed_days`, `fare_basis`, `legs`, places, legs rows or features. That is Phase 12 or research work.
- The editor's 20 October Manikganj fares and the Tk 405 check (O15, Phase 12).
- Translating prose, and the i18n and format layers (Phase 3).
- Editing roadmap text, including the §2.5 hours estimate.

## 3. User journeys / use cases
- **UJ-1 Researcher reads a conflict:** each version lists the sources that name it. Sources the build can't tie to a version appear under "Sources for this disagreement (not matched to a version)".
- **UJ-2 Day-tripper reads a trip budget:** sees a known per-person subtotal, the items without an amount listed by name, the unit and basis of each row, and when each cost was estimated.
- **UJ-3 Explore user filters by "Has visiting hours":** gets only sites with documented clock times.
- **UJ-4 Map summary card:** shows index fields only, plus "Read more".
- **UJ-5 Editor (Phase 12):** fills `plan_status` and `closed_days` from the report's suggestions and lists, and watches the editorial count fall.
- **UJ-6 Developer building UI (Phases 5–11):** reads `docs/DATA_CONTRACT.md` to find each field, where it comes from, and its empty state.

## 4. Functional requirements

**Contract document and types (2.1, 2.17)**
- FR-1: `docs/DATA_CONTRACT.md` lists, for each browser-rendered feature (Explore card, map summary, search results, trip card, home tiles), every field it reads, whether that comes from `index.json` (fetched) or from build-time props, and the documented empty state of each optional field. It also covers the build-time shapes changed in this phase.
- FR-2: `lib/types.ts` and `DATA_CONTRACT.md` describe the same fields. Every type change in this phase updates both.
- FR-3: A hand-written runtime validator (in `tests/`, no new dependency) checks every row of the generated `index.json`: required keys present, no unknown keys, value types, and enum values. It fails on the first bad row and names the site ID and key.

**Conflict attribution (2.2)**
- FR-4: A conflict's text is split into versions on " vs " (as today). Each linked source is matched to the versions by publisher name (FR-6).
  - It matches exactly one version → it is attached to that version.
  - It matches none or several → it goes to the conflict's `unattributedSources`.
  - A source is never copied onto more than one version.
- FR-5: A conflict with one version keeps `versions: [{ text, sources: [] }]`, and all its linked sources go to `unattributedSources`.
- FR-6: The match uses the source's `author_or_organization`, cut at the first `.`, `(`, `;` or `,`. Both sides are lower-cased, and a leading "the" and repeated spaces are removed. The name must appear inside the version text as a whole-word match. A reviewed alias list in `scripts/lib/rules.mjs` maps extra names to a publisher (for example "Daily Star" → "The Daily Star"). No other fuzzy matching.
- FR-7: The relation is kept on each source reference: `supports`, `disputed_by` or `reported_by`. `reported_by` is shown as "reported by". (Today every conflict link is `disputed_by`.)
- FR-8: The report gives the number of versions with sources, the number of versions without, and the number of unattributed source links.

**Legend and fact sources (2.3)**
- FR-9: Each legend has `sources: SourceRef[]`: the union of the `SRC-` IDs in `legends.attribution` and the `reported_by` links of its `claim_id`, deduplicated, in first-seen order (A-1).
- FR-10: `era`, `founder`, `style` and `preservation` each carry `sources: SourceRef[]`, from the `fact` claims with field `history.established_era`, `history.founder`, `history.architectural_style` or `history.preservation_status`, joined to `claim_source_links`. The array is empty when no such claim has a source.
- FR-11: The footnote list (`sources`) stays page-level, but each fact, event, legend and conflict version points only to its own references.

**Index additions (2.4)**
- FR-12: `IndexSite` gains the following keys, each omitted when it doesn't apply:
  - `fm`: the `founder_or_family` text, when known;
  - `ty`: the raw `site_type`;
  - `hv: 1`: hours known (FR-19);
  - `oc`: `one_way_cost_bdt_estimate`, when it is a number > 0;
  - `img: { id, credit }`: the site's first Ready image in CSV order.
- FR-13: No summaries in the index. The gzipped index must stay ≤ 150 KB (a gate since Phase 1), and a test fails above 120 KB as an early warning.

**Transport mode (2.5)**
- FR-14: `Route['mode']` adds `unknown` and `mixed`. Nothing defaults to `bus`.
- FR-15: A reviewed label table in `scripts/lib/rules.mjs` maps each `transport_mode` value:
  - a label naming one mode → that mode ("Private car", "CNG" and "Rickshaw / CNG / ride-share" → `car`);
  - a label naming 2+ modes ("Bus + CNG", "Bus or train", "Train + road/boat") → `mixed`;
  - "Unknown" → `unknown`;
  - "Other / mixed" → when `route_description` contains exactly one mode keyword from the table as a whole word, that mode with `inferred: true`; otherwise `mixed`.
- FR-16: A `transport_mode` value that isn't in the table is a structural error naming the cell.

**Budget rows and totals (2.6, 2.7)**
- FR-17: `Itinerary.budget` becomes `{ rows, known, omitted }`. Each row has:
  - `item`, `category`;
  - `amount` (a number), present only when `amount_bdt` is a number > 0;
  - `noTicket: true` for an entry fee of 0;
  - `currency`;
  - `unit` (`per_person` | `per_vehicle` | `per_group`), from a reviewed map of `costs.unit` text;
  - `basis` (`shared` | `reserved`) and `legs`, from the new `fare_basis` and `legs` columns (A-6);
  - `note` (the `basis_and_assumptions` text), `date` (`estimate_date`), `status`, and `sources`.

  A `range: [min, max]` is part of the type but is not emitted until a CSV column supplies it. Display prose (`amount_text`) is never parsed.
- FR-18: Totals.
  - `known` is the sum of the rows with an `amount` and unit `per_person`.
  - `omitted` names each row with no amount, that isn't `noTicket` and whose status isn't `not_applicable`.
  - A `noTicket` row is in neither.
  - The anchor transport row is labelled "Dhaka → [anchor name], one way". No return fare and no fare between stops appear unless a row for one exists.
  - A row with an amount but no unit, or an unmapped unit text, is a structural error naming the cell (A-5).

**Hours known (2.9)**
- FR-19: `hoursKnown` is true only when `visitor_info.opening_hours` contains a clock time (`H:MM`, `H am/pm` or `H:MM AM/PM`), and the value isn't an unknown phrase or a restriction-only phrase. The patterns and phrases live in `scripts/lib/rules.mjs` and are tested on the real values. "Daylight hours" variants are **not** hours known. Today this gives 12 sites.

**Dates per fact (2.8)**
- FR-20: Each visiting block carries its `date` (from `visitor_info.last_verified`), each cost row its `estimate_date`, and each route its `estimateDate`.
- FR-21: `Itinerary.lastChecked` is removed. A trip carries `costsEstimated` (the date range of its cost rows) and, on each site stop, `visitingChecked` (that site's `visitor_info.last_verified`).
- FR-22: `Meta` replaces `generatedAt` with `compiledAt` (the same Phase 1 rule) and `lastUpdated` with `lastVerified` (A-2).

**Itinerary model (2.10)**
- FR-23: `itineraries.csv` gains `plan_status` ∈ {`timed`, `circuit`, `incomplete`}. When blank, the output omits `planStatus` (unknown), and the cell counts as editorial.
- FR-24: The report lists O11's suggested value for each itinerary: `timed` for 2+ stops where every stop has a clock time; otherwise `circuit` when there are 2+ stops; otherwise `incomplete`. Only the editor's value is published.
- FR-25: Each stop has `kind: 'site' | 'place'`: `site` when `site_id` is set, otherwise `place`.
- FR-26: A place stop gets `latlon` only from `itinerary_places.csv` (`itinerary_id`, `stop_order`, `latitude`, `longitude`, `source_ids`), where `source_ids` is required and the coordinates pass the Bangladesh box. A site stop's coordinates follow `isMappable` (Phase 1).
- FR-27: `itinerary_legs.csv` (`itinerary_id`, `from_stop`, `to_stop`, `mode`, `duration`, `cost_row`, `source_ids`) builds `legs`. A trip without legs has `legs: []` and `schematic: true`, so the map labels it "schematic: stops in order, roads not drawn".
- FR-28: Both CSVs are committed with headers only. A missing optional file counts as empty. Their keys and references are checked structurally like any other table: the itinerary, stop orders, `cost_row` → `costs.cost_id`, the mode from the FR-15 set, and the `SRC-` IDs.

**Closing days (2.11)**
- FR-29: `visitor_info.csv` gains `closed_days`, filled by the editor: `unknown`, `none`, or `;`-separated days from `sat;sun;mon;tue;wed;thu;fri`. It is never derived from `weekly_closing_days`.
- FR-30: The output `visiting.closedDays` is `{ known: true, days: [...] }` (`days` empty for `none`) or `{ known: false }`. A blank cell is published as `{ known: false }` and counts as editorial. Other values are structural errors.

**External photo link (2.12, O10)**
- FR-31: A hidden-pin site with no Ready image gets `externalPhotos = { label: 'Search for visitor photos', url }`, a Google Maps search on `name_en, district` only. A test asserts that no such URL contains a decimal-number pattern that looks like a coordinate.

**Bangla names (2.13, O13)**
- FR-32: `name.bn` is optional, and the record has `bnMissing: true` when it is blank. The index key `b` is optional too. The report lists the affected sites (JB-RAJ-059 and JB-RAJ-071 today).

**Features (2.14)**
- FR-33: An optional `features.csv` (`site_id`, `feature`, `feature_bn`, `measurement`, `unit`, `source_ids`, `status`) builds `features: { text, textBn?, measurement?, unit?, status, sources }[]`. It is empty (`[]`) when no rows exist.
- FR-34: Two rows for the same site and feature with different measurements also produce a `Conflict` (field = feature), one version per row, each with its own sources.

**Structured source fields (2.15)**
- FR-35: `sources.csv` gains the optional columns `author`, `publisher`, `edition`, `isbn` and `verification_method`, filled for SRC-0001 only, exactly as given in roadmap 2.15. `SourceEntry` carries them when they are present.
- FR-36: Each `SourceEntry` gains `citationsByDivision: Record<division, number>`, counted from `site_sources`.

**Itinerary titles (2.16, I5)**
- FR-37: `tripTitle` extracts only when the title has the two-group pattern `… (X) (Anchor)`, where the anchor may itself contain parentheses. Otherwise it returns the title unchanged. `tripTitle(tripTitle(t)) === tripTitle(t)`.

**Editorial additions and whitelist**
- FR-38: Release-only editorial categories add blank `plan_status` cells and blank `closed_days` cells, reported by cell as in Phase 1.
- FR-39: The baseline gains: `hoursKnown` (12); versions with and without sources; unattributed links; routes by mode; `bnMissing` (2).
- FR-40 (I7): Every output object is built from an explicit list of public fields. A test fills the internal columns (`citation_note`, `identity_verification`, `local_path`, `license_evidence`, `notes`) of a fixture with a marker string and asserts that the marker appears in no output.

## 5. Non-functional requirements
- NFR-1: No new dependencies. Node built-ins only in `scripts/`.
- NFR-2: The outputs stay byte-deterministic (Phase 1 FR-22) with all the new fields.
- NFR-3: A full data build stays under 10 s.
- NFR-4: The gzipped index stays ≤ 150 KB, and the test warns above 120 KB.
- NFR-5: No invented values (R2). Every new field is either from a CSV cell or omitted.

## 6. Data, interfaces, and integrations
- **Inputs:** the 14 existing tables; the new columns listed in §2; and three optional tables, `itinerary_places`, `itinerary_legs` and `features`.
- **Outputs:** the same files as Phase 1, with the changed shapes above. `docs/DATA_CONTRACT.md` is new.
- **Shared rule module:** `scripts/lib/rules.mjs` holds the hours phrases, the mode label table, the publisher aliases and the unit map.
- **Tests:** an index contract validator, conflict fixtures (matched, unmatched, ambiguous, single-version), budget fixtures (including a shared-basis fixture), title cases, the hours rule on real values, the I7 marker test, and the coordinate-free photo URL.

## 7. Edge cases and failure behavior
- A publisher's name appears in two versions (Bangla vs English Banglapedia) → unattributed.
- A source is linked to a conflict twice → listed once.
- A conflict with no links → versions with no sources, and no unattributed list.
- `amount_bdt = 0` on a non-fee category → treated as no amount, so it is listed under `omitted` (A-9). Only an entry fee of 0 becomes `noTicket`.
- `itinerary_places` gives coordinates for a stop that has a `site_id` → structural error.
- A leg refers to a stop order that doesn't exist → structural error.
- `closed_days` = `Sun` (capitalised) or `sunday` → structural error. Only the exact tokens are allowed.
- `features.csv` is absent → `features: []` everywhere.
- A title like "Old Dhaka (Lalbagh) walk" → unchanged.
- The index exceeds 120 KB gzipped → the test fails, but the build doesn't, until 150 KB.

## 8. Acceptance criteria
- AC-1 (FR-1–FR-3): `DATA_CONTRACT.md` covers the five features. The index validator passes on real data and fails on a fixture row with an unknown key.
- AC-2 (FR-4–FR-8): The fixtures show (a) a matched version with its source, (b) an unmatched source under `unattributedSources`, (c) an ambiguous source left unattributed, and (d) a single-version conflict. On real data, no source appears on two versions, and the report prints the three counts.
- AC-3 (FR-9–FR-11): A legend with SRC attribution and a `reported_by` link lists both. A site whose `history.founder` claim has a `supports` link shows that source on `founder.sources`.
- AC-4 (FR-12, FR-13): The index rows carry `fm`, `ty`, `hv`, `oc` and `img` only when they apply. The gzipped size is reported, and the test asserts ≤ 120 KB.
- AC-5 (FR-14–FR-16): No route has `mode: 'bus'` unless its label maps to bus. "Unknown" → `unknown`. "Bus + CNG" → `mixed`. An unlisted label in a fixture → a structural error.
- AC-6 (FR-17, FR-18): For IT-DHK-064-1 on real data: `known` = 180, `omitted` names Food and Local guide, the Teota entry is `noTicket` and in neither list, and every row has its unit and date. A fixture with `fare_basis = shared` shows `basis: 'shared'`.
- AC-7 (FR-19): `hoursKnown` is true for exactly the 12 sites with clock times. The rule test covers "Daylight hours", "By permission", "Unknown" and each clock format.
- AC-8 (FR-20–FR-22): No trip has `lastChecked`. Each site stop has `visitingChecked`, and `meta` has `compiledAt` and `lastVerified`.
- AC-9 (FR-23–FR-28): All trips are `schematic: true` with `legs: []`. No place stop has `latlon`. The report lists the O11 suggestions (37 timed, 266 circuit, 82 incomplete on 22 Oct data, or the recomputed numbers, recorded in the baseline). Fixtures prove the place and leg checks.
- AC-10 (FR-29, FR-30): The `closed_days` fixtures (blank, `unknown`, `none`, `sun;mon`, invalid) behave as specified.
- AC-11 (FR-31): Hidden-pin sites without photos have a name-only URL, and the test finds no coordinate-like digits.
- AC-12 (FR-32): JB-RAJ-059 and JB-RAJ-071 have `bnMissing: true` and no `b` in the index, and they are listed in the report.
- AC-13 (FR-33, FR-34): With no `features.csv` rows, all `features` are `[]`. A two-row fixture with different measurements produces a conflict.
- AC-14 (FR-35, FR-36): SRC-0001 carries the five fields; other sources carry none. `citationsByDivision` sums to the source's citation count.
- AC-15 (FR-37): The four title cases from 2.16 pass, and each is idempotent.
- AC-16 (FR-38, FR-39): The release report lists the blank `plan_status` and `closed_days` cells. `npm run build:local` exits 0, and the baseline test passes with the new measures.
- AC-17 (FR-40): The I7 marker test passes.
- AC-18 (FR-2, NFR-2): `npm run typecheck`, `npm test` and two byte-identical data builds all pass.

## 9. Dependencies, constraints, and assumptions
### Dependencies
- Phase 1 (importable builders, shared validation, structural checks, report, baseline).

### Constraints
- Static export only, with no runtime server (`next.config.mjs`).
- `scripts/` is dependency-free ESM (`scripts/build-data.mjs` header).
- No pages consume `data/build/**` yet, so the shapes can change without migration.
- The browser fetches only `index.json` (roadmap §1 Architecture).
- Every conflict link is `disputed_by` today (1,785 links), and 780 of the 982 conflicts have one version. Publisher matching attributes about 310 of the 509 links on split conflicts before aliases (measured 22 Oct 2026).

### Assumptions
- A-1: Legend sources are the union of attribution IDs and `reported_by` links.
- A-2: `generatedAt` is renamed `compiledAt` and `lastUpdated` is renamed `lastVerified`, rather than adding fields alongside them.
- A-3: The new optional CSVs are committed with headers only, and a missing file counts as empty.
- A-4: `itinerary_places.csv` uses `itinerary_id` + `stop_order` as its key, and `itinerary_legs.csv` includes `itinerary_id` (the roadmap lists neither).
- A-5: An unmapped unit text is structural, because a mislabelled unit would misstate a price.
- A-6: The `legs` column in `costs.csv` uses stop-order pairs (`1-2;2-4`), blank until researched.
- A-7: `oc` comes from `sites.one_way_cost_bdt_estimate`, not from `costs.csv`.
- A-8: `img` is the first Ready image in `images.csv` row order, the same as `thumb` today.
- A-9: A non-fee cost of 0 is treated as no amount (see §7).

## 10. Key decisions and rationale
- **One spec for the whole phase.** The tasks share the types, the contract doc and the report.
- **Publisher matching, not relations.** The data has no `supports` links on conflicts, so the roadmap's relation rule would attribute nothing. Matching a named publisher is evidence; anything ambiguous stays unattributed.
- **Clock times only for `hoursKnown`.** "Daylight hours" isn't a schedule; the filter promises known opening times. The §2.5 estimate of 286–289 is superseded by the baseline value of 12.
- **Combined labels map to `mixed`.** Showing only the first-named mode would hide the alternative.
- **Reviewed columns stay blank and are editorial.** The roadmap forbids parsing; release blocking keeps them from shipping unreviewed.
- **An unverified "None reported" is `unknown`.** Saying "open every day" would be invented.
- **The Manikganj AC uses current data.** The Tk 405 fares aren't in the CSV yet, and adding them is Phase 12 work (O15).
- **Structured `fare_basis` and `legs` columns.** 2.6 forbids parsing prose, so the basis needs its own column.
- **Include I7.** The contract already names every field; the whitelist costs little and closes a Phase 1 deferral.

## 11. Open questions
- OQ-1: Should the alias list be seeded now from the unmatched links (the report lists them), or start empty and grow during Phase 12?
- OQ-2: Should the "Has visiting hours" filter (Phase 6) use different wording, such as "Opening times known", given that it now covers 12 sites?
- OQ-3: Should `weekly_closing_days` keep being published as text beside `closedDays` until Phase 12, or be dropped from the output now?
