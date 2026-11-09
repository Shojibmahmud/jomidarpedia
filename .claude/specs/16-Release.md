# Release

**Status:** Approved (by the owner, 2026-11-10)
**Roadmap reference:** `roadmap/DEVELOPMENT_ROADMAP.md` Phase 14 (Release), tasks **14.1–14.9**, the regression checklist and the phase acceptance criteria; decisions O1, O4, O5, O14. Builds on `.claude/specs/13-Quality-accessibility-and-security.md` (FR-19 to FR-21, FR-29 to FR-36, D5, D14) and `.claude/specs/10-Areas-sources-about-and-system-states.md` (FR-43, D8).
**Source task:** "**Objective:** a reproducible, verified public release." (Phase 14)
**Branch:** `34-phase-14-release`
**Date:** 2026-11-10

## 1. Problem and intended outcome

Production (`https://jomidarpedia.vercel.app`, deployed from `main`) has been live since Phase 12, and Phase 13 is done. But nothing yet proves that:
- a clean clone with no `../images` folder builds the same site as CI;
- the production deployment, as opposed to `out/` on a CI runner, passes the smoke and leak checks;
- the production tiles and `SITE_URL` behave as configured.

The About page also promises "CSV files anyone can read", and spec 10 D8 held that promise back until a cleaned export existed (O1). There is no maintainer guide, no rollback note, no changelog and no tag.

**Outcome:** a `v1.0.0` tag on the deployed `main` commit, backed by:
- a logged fresh-clone comparison;
- logged production checks;
- a public CC BY-SA 4.0 data download linked from About and the footer;
- `CONTRIBUTING.md`, a rollback note in `docs/RUNBOOK.md` and `CHANGELOG.md`.

## 2. Scope

### In scope
- **14.1** Re-run the 13.6 tile check on production.
- **14.2** Verify `SITE_URL` on production.
- **14.4** `scripts/compare-out.mjs`, a CI artifact holding the release build, and a logged fresh-clone run.
- **14.5** An on-demand production check script, smoke tests against the production URL, and a logged run.
- **14.6** The cleaned data export (zip of CSVs, `LICENSE`, README), its checks, and links from About `#licences` and the footer, in both languages.
- **14.7** `CONTRIBUTING.md`.
- **14.8** The rollback note in `docs/RUNBOOK.md`.
- **14.9** `CHANGELOG.md`, the regression checklist, and the `v1.0.0` tag.
- Amending the roadmap wording where these decisions change it (D6, A-6).

### Out of scope
- **14.3** host-level redirects (D3). The meta-refresh pages stay as they are.
- A custom domain (D1).
- A JSON copy of the export, and any export that isn't built from release data.
- Running the production checks in CI.
- Everything in roadmap §4 "After the MVP".

## 3. User journeys / use cases

1. **The owner releases.** They merge the branch, and Vercel deploys `main`. They run `npm run check:prod` and the production smoke tests and confirm the checklist is green. The `main` commit is then tagged `v1.0.0`.
2. **A reader downloads the data.** On About → Licences, or from the footer, the reader picks "Download the data". They get one zip holding a CSV per table, a `LICENSE` (CC BY-SA 4.0) and a README in English and Bangla explaining the columns and the attribution.
3. **A maintainer reproduces the build.** They clone the repository into an empty folder, build it with the CI release environment, and compare the result with the CI artifact using `npm run compare:out`.
4. **A maintainer rolls back.** They follow `docs/RUNBOOK.md`: "Promote" the previous production deployment in Vercel, or revert and push. Data mistakes are fixed in the CSV and rebuilt.
5. **A new helper edits data.** They follow `CONTRIBUTING.md` to edit a CSV, run `npm run dev`, read the problem report and rebuild thumbnails, and they learn how corrections arrive.

## 4. Functional requirements

### Tiles and SITE_URL on production (14.1, 14.2)
- **FR-1** The 13.6 checklist in `docs/tiles.md` is repeated on `https://jomidarpedia.vercel.app`, and the result is logged there with date, browser and tile counts. The checklist covers:
  - CARTO tiles load on Explore, a site mini map and a trip route map, in light (`light_all`) and dark (`dark_all`) mode;
  - tile requests carry a `Referer`;
  - the attribution reads "© OpenStreetMap contributors © CARTO", with links;
  - no request goes to `tile.openstreetmap.org`.

  The production configuration (key set and Referer-restricted, 9 Nov 2026) is treated as already done (A-5).
- **FR-2** On production, these all use the origin `https://jomidarpedia.vercel.app`, and no other host:
  - every page's `<link rel="canonical">`;
  - the `og:url` and `og:image` values;
  - every `<loc>` in `/sitemap.xml`.

  `/robots.txt` names the sitemap at that origin. `SITE_URL` is already set in Vercel Production (D1). FR-2 is checked by the production check script (FR-8).
- **FR-3** The CI release job keeps `SITE_URL=http://localhost:4174` (D6). The roadmap text for 14.2 is amended to say so.

### Fresh-clone comparison (14.4)
- **FR-4** The CI `release` job uploads one artifact named `release-build`, containing `data/build/**`, `public/data/index.json` and `out/` from its release build. It is kept for the default retention period.
- **FR-5** `scripts/compare-out.mjs` (run as `npm run compare:out -- <reference-dir> [<candidate-dir>]`, with the candidate defaulting to the working directory) compares two build trees:
  - `data/build/**` and `public/data/index.json` must be **byte-identical**, with the same set of files;
  - `out/` must have the **same set of file paths**, once hashed names are normalised (FR-6);
  - each text file in `out/` (`.html`, `.json`, `.txt`, `.xml`, `.csv`) must have the same content once normalised (FR-6);
  - the export zip (FR-11) must be byte-identical (A-1);
  - the script exits 0 when everything matches. Otherwise it exits 1 and prints a summary: missing files, extra files and the first differing line per file, capped at a fixed number of files.
- **FR-6** Normalisation replaces only these with fixed placeholders:
  - Next's build ID (in paths and in text);
  - content hashes in `_next/static/**` chunk and asset file names, and references to them in text;
  - nothing else.

  Binary files outside `_next/static` (images, fonts, the zip) are compared byte for byte.
- **FR-7** The fresh-clone run is done and logged in a new `docs/release-checks.md` with date, commit, CI run ID and the script output. The run:
  - clones `main` (or this branch before merge) into an empty folder under `$TMPDIR`, with no `../images` beside it;
  - runs `npm ci && npm run build` with `SITE_URL=http://localhost:4174` and `NEXT_PUBLIC_TILE_KEY=ci-placeholder-not-deployed`, exactly as the CI release job does;
  - downloads `release-build` for the same commit and runs `compare:out` against it.

### Production checks (14.5)
- **FR-8** `scripts/check-prod.mjs` (run as `npm run check:prod`, with base `https://jomidarpedia.vercel.app` unless `PROD_URL` overrides it):
  1. fetches `/sitemap.xml` and `/robots.txt`;
  2. fetches every sitemap URL, plus `/404` and the export zip;
  3. applies the same rules as `scripts/check-out.mjs` to each response body: the new-tab `rel` rule (FR-29), internal terms and working-file names (FR-30), local paths (FR-31) and hidden-site coordinates (FR-32);
  4. applies the FR-2 origin checks;
  5. reports the HTTP status of every URL.

  It fails on any rule violation, any non-200 sitemap URL, or a fetch error that persists after one retry. It reuses the existing rule code instead of copying it.
- **FR-9** The Playwright smoke suite (`e2e/smoke.spec.ts`) can run against a deployed URL. With `PW_BASE_URL` set, Playwright uses it as `baseURL` and starts no local server. Tests that read local build files keep working, because the local build and production come from the same commit. Any that cannot run against a remote host are skipped with a stated reason when `PW_BASE_URL` is set. An npm script `e2e:prod` runs the smoke suite this way.
- **FR-10** After the merge deploys, `check:prod` and `e2e:prod` are run against production and logged in `docs/release-checks.md`, together with the security-header check from `docs/security.md`. The roadmap's "turn on production deployments" wording becomes "deploy the release commit" (A-6).

### Data export (14.6)
- **FR-11** A release build writes `out/data/jomidarpedia-data.zip` (A-2), which contains:
  - one UTF-8 CSV (with header, RFC 4180 quoting, LF line ends) per published table (§6, A-9);
  - `LICENSE`: the CC BY-SA 4.0 legal-code reference, with a note that photos keep their own licences, which are listed in `image_credits.csv`;
  - `README.md` in English, followed by Bangla. It covers what the data is, the build date (`compiledAt`), one line per table, the columns, how unknowns are written (empty cell = not recorded), the attribution line to use, and the link to the site and to `/about/#licences`.
- **FR-12** The export is made **only from published build output** (`data/build/**`), never directly from `data/csv/` (A-9). As a result:
  - it holds release-mode sites and trips only;
  - none of the I7 never-published columns appear (`site_sources.citation_note`, `sources.local_path`, `images.identity_verification`, `images.license_evidence`, `images.notes`);
  - a hidden site (R5) appears with empty coordinate cells (A-3);
  - Bangla appears in `_bn` columns beside the English, wherever the published data has a valid translation.
- **FR-13** Each export table has an explicit column list. A build fails if a column outside the list would be written, and also if a listed column has no source field, so a new field never leaks silently.
- **FR-14** Only a **release** build writes the zip. Local and preview builds do not, so they never publish a download made from unreviewed data. The About and footer links are present only when the zip is.
- **FR-15** `npm run check:out` also checks the zip: it opens it and applies FR-30 to FR-32 to every CSV and the README. `npm run check:budgets` adds a budget for the zip's size, set at implementation from the measured size plus headroom and recorded in the script.
- **FR-16** About `#licences` (`components/about/Licences.tsx`) replaces the "no download promise" state (spec 10 D8) with a line, in both languages, that names CC BY-SA 4.0 and links to the zip. The link shows the file size, with Bengali digits on the Bangla page via `lib/format.ts`. The About body (`content/about.en.md`, `content/about.bn.md`) links its "CSV files anyone can read" sentence to the same place. The Bangla is written natively (`docs/TRANSLATION_BN.md`, A-7).
- **FR-17** The footer (`components/shell/SiteFooter.tsx`) gains a "Download the data" link, in both languages, to the zip. It uses a plain `<a download>` (no `prefetch`) and the same tap-target and underline styles as its other links.

### Documents and tag (14.7–14.9)
- **FR-18** `CONTRIBUTING.md` (repo root) is a short, plain-English maintainer guide (D8) covering:
  - editing a CSV in `data/csv/`, and the rules that matter: sources, unknowns, open licences only, and Bangla in `data/translations/bn/`;
  - `npm run dev`;
  - the build modes;
  - reading the problem report (`data/reports/`);
  - regenerating thumbnails (`npm run thumbs` with `JP_IMAGES_DIR`);
  - how corrections arrive (the correction form emails the editor through Web3Forms);
  - the test commands.

  It links to `CLAUDE.md`, `docs/DATA_CONTRACT.md` and `docs/TRANSLATION_BN.md`, and doesn't repeat them.
- **FR-19** `docs/RUNBOOK.md` (new) holds the rollback note (A-8). It covers:
  - Vercel → Deployments → the previous production deployment → "Promote";
  - or `git revert` the commit on `main` and push;
  - data mistakes are fixed in the CSV and rebuilt;
  - how to confirm the rollback: `curl` the home page and check `check:prod`.
- **FR-20** `CHANGELOG.md` (repo root) has a `1.0.0` entry, dated with the tag date. It summarises the MVP by phase (0–14) in a few lines each, from the roadmap. Later releases add entries above it.
- **FR-21** The regression checklist in the roadmap is completed, each line pointing at evidence: a CI run, a log entry or a test file. It includes "Every link from the header and footer resolves", which is checked by the existing link checks plus FR-8.
- **FR-22** Once FR-7 and FR-10 pass on the merged, deployed `main` commit, `package.json`'s `version` is `1.0.0` and that commit gets the annotated tag `v1.0.0`, which is then pushed (D9). The tag points at the commit Vercel reports as the current production deployment.
  - The version bump lands on this branch, so the tagged commit carries it.

## 5. Non-functional requirements

- **NFR-1 Determinism.** Two release builds of the same commit and environment give byte-identical `data/build/**`, `index.json` and export zip. `out/` text differs only in what FR-6 normalises.
- **NFR-2 No new runtime dependency.** The zip writer and reader use `node:zlib` (A-1). No new dev dependency is added unless the implementation shows it is needed, and then only at a pinned version.
- **NFR-3 Polite crawling.** `check:prod` makes at most 4 requests at a time, sends a generic `User-Agent` (no personal details) and ends a production run of about 2,000 URLs within 10 minutes.
- **NFR-4 Accessibility and layout.** The new About and footer links meet the checks of spec 13. At 390 px, in light and dark mode, and at desktop width, they show no overflow, readable contrast and Bengali digits in the Bangla font (CLAUDE.md UI checklist). The axe matrix stays green.
- **NFR-5 Privacy.** The export holds no field that the site does not show (FR-12, FR-13).
- **NFR-6 Licensing.** The `LICENSE`, the README and the About line all name CC BY-SA 4.0 and say that photos keep their own licences.

## 6. Data, interfaces, and integrations

**Export tables (A-9).** These are a proposal, finalised at implementation against `data/build/**` and `lib/types.ts`. Every column comes from a published field.

| File | One row per | From |
|---|---|---|
| `sites.csv` | published site | `data/build/sites/*.json` (IDs, slug, names en/bn/alt, place en/bn, coordinates if shown, condition, access, confidence, summary en/bn, page URL) |
| `history_events.csv` | published event | site JSON |
| `legends.csv` | published legend | site JSON |
| `visitor_info.csv`, `costs.csv` | published fact, with its date | site JSON |
| `sources.csv`, `site_sources.csv` | published source and site link | `data/build/sources.json`, site JSON |
| `trips.csv`, `trip_stops.csv` | published trip and stop | `data/build/trips/*.json` |
| `image_credits.csv` | published image | `data/build/credits.json` (ID, site, credit line, licence, source URL) |

**New npm scripts:**
- `compare:out` → `node scripts/compare-out.mjs`
- `check:prod` → `node scripts/check-prod.mjs`
- `e2e:prod` → Playwright with `PW_BASE_URL`

**Environment variables:**
- `PROD_URL`: optional, for `check:prod`.
- `PW_BASE_URL`: switches Playwright to a remote host.

**CI:** the `release` job gains an `actions/upload-artifact@v4` step named `release-build` (FR-4).

**Production:** reached only by on-demand scripts (FR-8, FR-9), never from CI.

## 7. Edge cases and failure behavior

- **Artifact problems.** If the `release-build` artifact is missing or expired, or comes from another commit, `compare:out` refuses to run. It says the reference is missing, or that the commit doesn't match (it compares `data/build/meta.json` and records the commit in the log).
- **Different file sets.** When the two trees have different file sets, the output lists the missing and extra paths before any content difference.
- **Sitemap unavailable.** If the sitemap is unreachable or not XML, `check:prod` fails at once with that error and doesn't fall back to a local list.
- **Rate limiting.** If the server answers 429 or 5xx, the URL is retried once after a pause. A second failure counts as a failure.
- **A hidden coordinate in the export.** `check:out` fails (FR-15), and the release build has already failed by then (FR-13 runs at build).
- **CSV schema drift.** A new CSV column that the export list does not include is not exported. A listed field that is no longer in the build fails the build (FR-13).
- **Empty values.** Empty cells mean "not recorded", as the README says. Values are never filled in with `0` or "Free" (R2, R6).
- **CARTO 403 on production during FR-1.** Record it, check the key's Referer list in the CARTO dashboard, and don't tag until it passes. Lite mode stays the fallback.
- **Production lags the merge.** If the production deployment is older than the merged commit, `check:prod` prints the deployed build's `compiledAt`. The run doesn't count until production serves the release commit.
- **Fresh-clone failures.** If the fresh clone fails to build (for example because it reaches for `../images`), that is a 14.4 failure, and it is fixed in the code, not worked around.

## 8. Acceptance criteria

- **AC-1 (FR-1)** `docs/tiles.md` has a production entry dated after the merge that passes every line of the checklist.
- **AC-2 (FR-2, FR-8)** `check:prod` passes the origin checks. A unit test feeds it a page whose canonical uses another host and expects a failure.
- **AC-3 (FR-3)** `.github/workflows/ci.yml` still sets `SITE_URL: http://localhost:4174` in the release job. The roadmap's 14.2 text says why.
- **AC-4 (FR-4)** A CI run on this branch's PR shows a `release-build` artifact that contains `out/index.html`, `public/data/index.json` and `data/build/meta.json`.
- **AC-5 (FR-5, FR-6)** Vitest unit tests for `compare-out.mjs`, run on fixture trees:
  - trees that are identical apart from build ID and chunk hashes → exit 0;
  - one changed byte in `data/build/` → exit 1;
  - one missing `out/` file → exit 1, with the path in the output;
  - a page text difference → exit 1, with the first differing line;
  - a differing image → exit 1.
- **AC-6 (FR-7, NFR-1)** `docs/release-checks.md` logs a fresh-clone run with no `../images` whose `compare:out` exited 0 against the CI artifact for the same commit.
- **AC-7 (FR-8, NFR-3)** Unit tests with a stubbed `fetch` show that `check:prod` fails on:
  - a hidden-site coordinate in a page;
  - an internal term;
  - a new-tab link without `rel`;
  - a 404 sitemap URL;
  - a persistent fetch error.

  They also show that it passes on clean pages and never has more than 4 requests in flight.
- **AC-8 (FR-9)** With `PW_BASE_URL` unset, `npm run e2e` behaves as before (CI green). With it set, Playwright starts no web server. Every test skipped for remote use states its reason.
- **AC-9 (FR-10)** `docs/release-checks.md` logs `check:prod` exit 0, `e2e:prod` green and the security headers, all on production, for the release commit.
- **AC-10 (FR-11, FR-12)** Unit tests on the built export check that:
  - the zip lists exactly the agreed files;
  - every CSV parses with `scripts/csv.mjs`;
  - `sites.csv` has one row per published site, with counts matching `meta.json`;
  - hidden sites have empty coordinate cells;
  - no I7 column name appears;
  - the `_bn` columns hold the published Bangla for a sample site (Baliati, `JB-DHK-064`);
  - `LICENSE` names CC BY-SA 4.0;
  - the README has an English and a Bangla section.
- **AC-11 (FR-13)** A unit test adds an unlisted field to a fixture record and expects the export to fail. It also removes a listed field and expects a failure.
- **AC-12 (FR-14)** After `npm run build:local`, `out/data/jomidarpedia-data.zip` doesn't exist and the About and footer pages have no download link. After a release build, both exist (unit or e2e test).
- **AC-13 (FR-15)** A unit test passes `check:out` a zip that contains a hidden coordinate and expects a failure. `check:budgets` prints the zip's size against its budget.
- **AC-14 (FR-16, FR-17, NFR-4)** Playwright, in a release build, checks that:
  - About `#licences` and the footer link to `/data/jomidarpedia-data.zip`, in English and in Bangla;
  - the Bangla size uses Bengali digits;
  - the link downloads a non-empty zip.

  The manual 390 px light and dark check and the desktop check are logged.
- **AC-15 (FR-18, FR-19, FR-20)** `CONTRIBUTING.md`, `docs/RUNBOOK.md` and `CHANGELOG.md` exist and cover every point their FR lists. Every command they name exists in `package.json`, and a unit test checks that.
- **AC-16 (FR-21)** Every regression-checklist line in the roadmap is ticked and points to its evidence.
- **AC-17 (FR-22)** `git tag -l v1.0.0` exists on the remote and points at the commit of the current Vercel production deployment. `package.json` says `1.0.0` at that commit.
- **AC-18 (NFR-5, NFR-6)** `check:out` and `check:prod` both pass with the export included. `LICENSE`, README and About all name CC BY-SA 4.0 and the photo exception.

## 9. Dependencies, constraints, and assumptions

### Dependencies
- Production stays deployed from `main` on Vercel (Hobby, non-commercial; roadmap §5.6).
- The CARTO key stays valid and Referer-restricted to `jomidarpedia.vercel.app` (`docs/tiles.md`).
- The `SITE_URL` env var is set in Vercel Production (D1).
- GitHub Actions artifacts are used for FR-4.

### Constraints (repository evidence)
- The leak and link rules live in `scripts/check-out.mjs` and `scripts/lib/internal-terms.mjs`, and `check-prod.mjs` reuses them (FR-8). `TEXT_TYPES` currently excludes `.csv`.
- `SITE_URL` handling is in `lib/site-url.ts`, `app/layout.tsx` and `scripts/build-seo.mjs`. Without it there is no sitemap (spec 13 FR-36).
- `npm run build` runs `scripts/check-tile-key.mjs`, so a release build needs `NEXT_PUBLIC_TILE_KEY` (spec 13 D14).
- `scripts/data-mode.mjs` fails closed to release, and Vercel production is always release.
- Thumbnails are committed under `public/thumbs/`. `../images` is needed only by `npm run thumbs` (`scripts/build-thumbs.mjs`), so a fresh clone can build without it (roadmap 3.6).
- Playwright serves `out/` with `serve` and `serve.json` (`playwright.config.ts`). Tests stub tiles (`e2e/tiles.ts`).
- The licence text and URL are in `lib/licences.ts` (`TEXT_LICENCE`). The licences block is `components/about/Licences.tsx`.
- `compiledAt` and `lastVerified` in `data/build/meta.json` come from the data or the commit, not the clock (`scripts/build-data.mjs`). This is what makes NFR-1 achievable.
- Tailwind has no `sm:` breakpoint (`tailwind.config.ts`).

### Assumptions (not yet confirmed)
- **A-1** The zip writer uses `node:zlib` deflate-raw with no new dependency. Entries are sorted, with a fixed DOS timestamp from `compiledAt`, so the zip is byte-identical across builds.
- **A-2** The download path is `/data/jomidarpedia-data.zip` (`out/data/`, beside `index.json`).
- **A-3** Hidden sites are included, with empty coordinate cells, as on their pages.
- **A-4** `check:out` and `check:budgets` cover the export (FR-15).
- **A-5** The production tile configuration is already complete (9 Nov 2026). 14.1 only re-runs and logs the check.
- **A-6** Production deployments are already on, so "turn on production deployments" in 14.5 is reworded to "deploy the release commit".
- **A-7** The About and licences copy drops spec 10 D8's "no download promise" wording, in both languages, and the Bangla is written natively.
- **A-8** `docs/RUNBOOK.md` is a new file whose first section is the rollback note.
- **A-9** The export is built from `data/build/**`, with the table list in §6 to be finalised at implementation.

## 10. Key decisions and rationale

All confirmed by the owner on 10 Nov 2026.

- **D1 Domain (O14):** stays `https://jomidarpedia.vercel.app`, and `SITE_URL` is already set in Vercel Production. It needs no purchase, the CARTO key already allows it, and a domain change later only means changing `SITE_URL` and rebuilding.
- **D2 Licence (O5):** CC BY-SA 4.0 for text and data, with photos under their own licences. This matches what About and `/credits/` already state.
- **D3 Redirects (14.3):** skipped. No slug has been renamed, and the meta-refresh pages already work.
- **D4 Export:** one CSV per table in one zip, with `LICENSE` and a bilingual README. It holds exactly what the site publishes, in English and Bangla, and is linked from About `#licences` and the footer. This keeps the About page's CSV promise and stays inside what is already public.
- **D5 Fresh clone:** a local clone with no `../images` is compared against the CI release build artifact. CI never has `../images`, so its build is the reference, and a manual run avoids a permanent extra CI job.
- **D6 CI `SITE_URL`:** stays `http://localhost:4174`. Lighthouse needs canonicals on its own origin, and the production value is checked on production instead (FR-2).
- **D7 Production checks:** an on-demand script applies the existing leak and link rules to every sitemap URL, and the smoke suite runs against production. Neither is in CI. This meets "against the production URL" without CI depending on production.
- **D8 `CONTRIBUTING.md`:** a short guide for the owner and a future helper, not an open-source contribution process.
- **D9 Tag:** `v1.0.0` goes on the deployed `main` commit after the merge and a green checklist. `CHANGELOG.md` is written on this branch.

## 11. Open questions

- **OQ-1** Production wasn't reachable from the spec session (`curl` timed out), so `SITE_URL` on production is unverified until FR-2 runs. If the canonicals turn out root-relative, the owner sets the variable in Vercel and redeploys before FR-10.
- **OQ-2** Does checking the new links on this branch's Vercel preview need its host (`jomidarpedia-git-34-phase-14-release-shojibs-projects.vercel.app`) added to the CARTO key? Only the map needs it (`docs/tiles.md`, "Preview hosts"). The links and the download don't. Preview builds are not release mode, so the preview has no zip (FR-14), and the download can only be checked locally in a release build and then on production.
