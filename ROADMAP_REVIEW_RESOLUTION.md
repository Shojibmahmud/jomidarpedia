# Roadmap review: decision summary and resolution table

This document responds to `ROADMAP_REVIEW_AND_REVISION_REQUEST.md`, as of 22 October 2026. The revised plan is in `DEVELOPMENT_ROADMAP.md` (version 2). The board-by-board mapping is in `DESIGN_COVERAGE.md`.

## 1. Decision summary

### What was verified, and how
- **Code read in full:**
  - `scripts/build-data.mjs`, `build-index.mjs`, `csv.mjs`;
  - `lib/types.ts`, `app/layout.tsx`, `app/tokens.css`;
  - `README.md` and the previous roadmap.
- **Both builders run into temporary folders.** Nothing in the project was written.
  - `build-index`: 413 rows, 34.9 KB gzipped.
  - `build-data`: exit code 1, with 1,386 internal-note strings across 417 records.
- **Recomputed from `data/csv/`:**
  - the baseline in roadmap §2.5;
  - conflict versions without sources (576 of 1,196);
  - routes with an unknown mode (37);
  - durations (144 / 65 / 176);
  - stops without a site (200 of 1,110);
  - timed stops (301);
  - mapped location statuses (38 / 217 / 43 / 1 unverified, JB-DHK-008);
  - missing Bangla names (JB-RAJ-059, JB-RAJ-071);
  - Ready image hosts (814 thumb / 120 upload);
  - claim relations (supports / disputed_by / reported_by);
  - CSV cells containing internal terms (1,939, of which 474 are in columns that are never published).
- **Boards opened:** three PNGs, namely the Bangla Baliati, Offline/slow and Filter drawer boards. The other boards were mapped from the canvas source. The canvas was checked for print boards: `Itinerary-Print-1` and `-2` exist.
- **Not verified:**
  - **No app build.** There is no `package.json` yet.
  - **External facts.** I did not fetch the Node, Next.js, Vercel, OSM or W3C pages cited in the review. Where the plan depends on one of them (Node LTS line, Hobby preview protection, tile terms, CSP guidance), a task says to confirm it at the time it is done (0.1, 4.6, 13.6, 13.7).
  - **The other 37 PNGs pixel by pixel.** I did not compare them with the canvas.

### What changed in the plan
- **Build order is fixed.** Phase 0 no longer runs data scripts. Build modes are added in Phase 1, before the data is wired into `npm run build`. Release mode is the default, so builds fail closed.
- **Three explicit gates:** local, protected preview and release. Structural rules, the hidden-coordinate rule and image eligibility are enforced in every mode.
- **A new Phase 2 for data contracts,** which comes before any UI that depends on them. It covers:
  - conflict attribution and fact attribution;
  - index fields;
  - budget amounts and units;
  - the itinerary model;
  - per-fact dates;
  - unknown transport modes;
  - structured source fields;
  - the hours flag.
- **A new Phase 3 for app foundations:**
  - the Bangla rendering architecture (dual server-rendered spans, so no context in Server Components);
  - URL contracts;
  - reproducible thumbnails;
  - assets.
- **Every design gap now has a task:** filters, the two separate sheets, every visible action, plan status, the source and About pages, print overflow, Lite mode and offline.
- **Release planning:**
  - the fresh-clone check happens before tagging;
  - "builds identically" is defined;
  - the CSP is planned for a static export;
  - Leaflet integration details are covered;
  - manual accessibility checks are separate from automated scores;
  - there is a rollback note.

### Owner decisions that remain open
Each has a recommended default, and work proceeds on the default.

| ID | Decision | Default |
|---|---|---|
| **O1** | Repository visibility and public data | **Decided 22 Oct 2026:** the owner confirmed the default. |
| **O4** | Production tile provider | Confirm terms before launch. |
| **O6** | Bangla scope | Interface, names, numbers and dates. Prose comes after the MVP. |
| **O11** | Timed-plan classification | An editor-set `plan_status`. |
| **O12** | Thumbnail storage | Committed WebP thumbnails. |

Nonblocking decisions also have defaults in roadmap §2.3: O2, O3, O5, O7–O10, O13–O15.

### Review findings I disagree with or qualify
- **D4 (print reference missing).** This is only partly right. The print layout exists on the canvas (`Itinerary-Print-1` and `-2`) but was left out of the PNG export.
- **B4 (budgets are display strings).** The *output* is display strings, but the *data* already has numeric `amount_bdt`, `unit`, `basis_and_assumptions`, `estimate_date`, `status` and `source_ids` in `costs.csv`. The builder discards them. The fix is mostly in the builder, plus data for return and inter-stop legs.
- **C5 (features).** There is no `key_features` claim field to map from. Only `history.architectural_style` exists. Feature cards therefore need a new researched table, `features.csv`, rather than a mapping.
- **E6 (licence).** I agree. The CC BY-SA 4.0 evidence is on the credits board, so O5 only needs confirmation.

## 2. Resolution table

| Finding | Disposition | Evidence | Roadmap tasks |
|---|---|---|---|
| A1 Phase 0 dependency | resolved in plan | Old 0.6 added `prebuild` before 1.2 added the mode flag. Phase 0 now has no data hook, and the modes come in 1.1 and 1.8, before 1.12 wires them in. | 0.6, 1.1, 1.8, 1.12, 1.13 |
| A2 Development output vs production | resolved in plan | The default mode is release; `VERCEL_ENV` is read inside the script; previews are protected and `noindex`; no production deploy before Phase 12. | §2.4, 1.1, 4.6, 13.11, 14.5 |
| A3 Repository visibility | resolved: O1 decided 22 Oct 2026 (private app repo, public corrections repo, cleaned CSV export at release) | Raw CSVs hold 1,939 flagged cells, including in non-public columns, and Git history keeps them. The About board promises public CSVs. | O1, 0.9, 5.13, 10.9, 14.6, I7 |
| A4 Toolchain | resolved in plan | Node 24 LTS, exact pins, lockfile, Tailwind 3.4.x. The LTS line is confirmed in 0.1. | I1, 0.1, 0.4, 0.6 |
| B1 Conflict attribution | resolved in plan | `conflict()` sets `sources: []` when it splits a claim; 576 of 1,196 versions are affected. `claim_source_links.relation` has supports, disputed_by and reported_by. | 2.2, 2.3, 5.9 |
| B2 Index and card data | resolved in plan | `IndexSite` has `p` but no family, thumbnail or credit. | 2.1, 2.4 |
| B3 Itinerary data | resolved in plan | No leg or geometry columns; 200 of 1,110 stops have no `site_id` and no coordinates; closing days are free text. | 2.10, 2.11, 9.5, 9.7 |
| B4 Budget amounts | resolved in plan (qualified) | `costs.csv` already has numbers and units; `costAmount()` discards them. | 2.6, 2.7, 9.6, 12.8 |
| B5 Unknown modes as bus | resolved in plan | `routeMode()` returns `'bus'`; 37 routes are affected. | 2.5, 5.12 |
| B6 Shared coordinate validation | resolved in plan | `build-index` checks `!s.latitude` only; `build-data` checks both coordinates. | 1.4, 1.9, 5.19, 13.9 |
| B7 Structural validation | resolved in plan | `parseCsv` silently accepts rows of the wrong length (`r.length > 1`). | 1.3, 1.5, 1.6 |
| B8 Dates | resolved in plan | Trip `lastChecked` is the newest of the anchor's cost and visit dates; `LastChecked` text is fixed at build time. | 2.8, 5.3 |
| B9 Content rules | resolved in plan | The old 1.3 banned "Free" everywhere, and the old Phase 10 banned "audit"; the detector skipped URLs. Counts are now reported per cell. | 1.10, 1.11 |
| C1 Explore filters | resolved in plan | The drawer board shows type, quality, photos and hours, which the old 4.5 omitted. | 2.4, 2.9, 6.2–6.10 |
| C2 Two sheets | resolved in plan | The boards show two separate sheets. | 7.6, 7.7 |
| C3 Visible actions | resolved in plan | See the action list in `DESIGN_COVERAGE.md`. | 3.7, 3.9, 5.13, 5.16, 5.18, 6.11, 8.2, 9.8, 9.9, 10.4, 10.8 |
| C4 Timed plans | resolved in plan + decision (O11) | 176 trips have no duration; 82 have one stop; 45 have any timed stop. | 2.10, 9.1, 9.2, 12.9 |
| C5 Features and itinerary preview | resolved in plan (qualified) | The builder writes `features: []`, and the claims have no features field. | 2.14, 2.10, 5.10 |
| C6 Source and methodology pages | resolved in plan | SRC-0001's publisher and ISBN are inside a prose field. | 2.15, 10.3–10.6 |
| C7 Bangla scope and architecture | resolved in plan + decision (O6) | The Bangla Baliati board translates prose; the boot script only sets `lang` and `data-lang`. | I3, 3.1–3.4, 2.13, 13.4 |
| C8 Outbound photo link | decision required (O10, default given) | `externalPhotos` is suppressed when `hidden(s)`. | 2.12, 5.14 |
| D1 Counts from data | resolved in plan | The stale boards are listed in `DESIGN_COVERAGE.md`. | I6, 1.9, 10.1 |
| D2 The 299th pin | resolved in plan + decision (O9) | JB-DHK-008 is `unverified` and `show_flagged`. | 5.1, 7.3, 7.8 |
| D3 Offline and Lite | resolved in plan + decisions (O7, O8) | The board says "We switched…" and "Pages you already opened are still here". | 7.2, 7.9, 10.12 |
| D4 Print reference | partly already resolved | The canvas has `Itinerary-Print-1` and `-2`; they were not exported. Overflow, browsers and dark mode are now specified. | 9.10–9.12 |
| E1 Images | resolved in plan + decision (O12) | `relative_file_path` resolves under `../images/`. | 3.5, 3.6, 14.4 |
| E2 CSP | resolved in plan | 814 Ready images are on `thumb.wikimedia.org`; there is an inline boot script in `layout.tsx`. | 13.7, 13.8, 13.6 |
| E3 Leaflet integration | resolved in plan | | 7.1–7.4, 7.10 |
| E4 Static export statements | resolved in plan | Meta-refresh is now the portable fallback, with host redirects optional; `SITE_URL` is defined. | 4.2, 14.2, 14.3, 13.11 |
| E5 Accessibility conformance | resolved in plan | | 13.2, 13.3, §6 |
| E6 Licensing and assets | resolved in plan + decision (O5, confirm only) | `layout.tsx` refers to `/icon.svg` and `/apple-touch-icon.png`, which don't exist. | 3.8, 10.7, 10.8, 12.7 |
| E7 Test setup | resolved in plan | | I2, 0.6, 0.7, 4.4, 13.2 |
| E8 Reproducibility before tagging | resolved in plan | `generatedAt: new Date()`. | 1.7, 14.4, 14.8, 14.9 |
| F1 Title normalization | resolved in plan | All 385 titles have parentheses; the CSV rewrite was dropped. | I5, 2.16 |
| F2 One baseline | resolved in plan | | §2.5, I6, 1.9 |
| F3 Report by source cell | resolved in plan | 1,386 output strings vs 1,939 CSV cells, which include non-public columns. | 1.10, 12.1 |
| F4 Split oversized tasks | resolved in plan | The old 7.2, 8.1, 9.4 and 10.6 were split. | 9.3–9.8, 3.1–3.4, 11.1–11.7, 12.6–12.8 |
| F5 Inaccurate dependencies | resolved in plan | Phase 6 (Explore) now needs only Phase 4; `SiteCard` is built in 6.1. | §3 table |
| F6 Foundations earlier | resolved in plan | Phases 2 and 3. | Phases 2, 3 |
| F7 Checkpoints without duplication | resolved in plan | The launch checklist now only re-runs tests that already exist. | 14 regression checklist |

## 3. Files changed in this revision

| File | Change |
|---|---|
| `DEVELOPMENT_ROADMAP.md` | Replaced with version 2. Version 1 is kept at `archive/DEVELOPMENT_ROADMAP.v1-2026-10-22.md`. |
| `DESIGN_COVERAGE.md` | New |
| `ROADMAP_REVIEW_RESOLUTION.md` | New (this file) |
| `README.md` | Out-of-date statements corrected (listed below). Version 1 is kept at `archive/README.v1-2026-10-22.md`. |

**Not changed:**
- code, CSVs or configuration;
- the canvas;
- anything in Git (Git doesn't exist yet);
- deployments.
