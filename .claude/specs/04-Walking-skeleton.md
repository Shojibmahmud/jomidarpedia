# Walking skeleton

**Status:** Approved (by the owner, 2026-10-23)
**Roadmap reference:** `roadmap/DEVELOPMENT_ROADMAP.md` §3 Phase 4 (tasks 4.1–4.6); also §2.1 R1, R2, R5 and R10, §2.2 I2 and I6, §2.3 O1, O9, O13 and O14, §2.4 (build modes)
**Source task:** "A real site page and a minimal home page, built from real data on a protected Vercel preview."
**Branch:** `05-phase-4-walking-skeleton`
**Date:** 2026-10-23

## 1. Problem and intended outcome
Phase 3 delivered the shared layers: typed readers (`lib/data.ts`), `<T>` and the dictionary (`lib/i18n.ts`), the formatters (`lib/format.ts`), the shell, and the URL contract (`docs/URLS.md`). But:

- **No real pages.** `app/page.tsx` is a placeholder with a hard-coded title and tagline. No `/site/` route exists; `docs/URLS.md` lists both site routes as planned (4.1, 4.2).
- **No page tests.** There is no Playwright, no static server, and CI checks only that `out/index.html` exists.
- **No deployment.** The repository has never been built on Vercel, so the build-mode logic (`scripts/data-mode.mjs`) has not run against a real `VERCEL_ENV`.

Outcome: one thin path from the data through the static export to a protected Vercel preview. That means a site page for every record, an ID redirect for every record, a minimal home page, smoke tests run locally and in CI, and a preview that only the owner can open. Later phases flesh out each page on top of this path.

## 2. Scope
### In scope
- **Tasks 4.1–4.6,** with the decisions in §10.
- **Condition labels:** `condition.<token>` strings for the 5 `Condition` values in `lib/i18n.ts`. Phase 5 (`ConditionBadge`, 5.1) reuses them.
- **noindex outside release:** the robots rule in FR-9.
- **Page-test tooling:** `@playwright/test` and `serve` as pinned devDependencies, `playwright.config.ts`, the `e2e/` folder and an `npm run e2e` script.
- **CI:** smoke-test steps in the existing `check` job.
- **URL contract:** `docs/URLS.md` marks `/`, `/site/<id>/<slug>/` and `/site/<id>/` as built.

### Out of scope
- **Phase 5 components:** badges, `Unknown`, `LastChecked`, `BilingualName`, `Breadcrumb`, `AtAGlance`, `LocationPanel`, the history timeline, the gallery and so on. The site page here is text only.
- **Location on the site page:** no coordinates, map or location status yet (5.6).
- **Full home page:** hero, map teaser, featured cards (Phase 11).
- **SEO files:** `sitemap.xml`, `robots.txt`, Open Graph (13.11).
- **`SITE_URL`:** setting it in Vercel and CI (14.2, O14).
- **Host-level redirects** in `vercel.json` (14.3, optional).
- **Accessibility and budgets:** axe and Lighthouse CI (13.x).
- **Production deployment:** stays off until Phase 12 (§2.4).

## 3. User journeys / use cases
- **UJ-1 Owner reviewing a preview.** They open the preview URL, sign in through Vercel, and see Baliati's page with names, summary and condition, all from the real data.
- **UJ-2 Visitor with an ID link.** They follow `/site/JB-DHK-064/`. The page sends them on to `/site/JB-DHK-064/baliati-palace/`. If the slug later changes, the same ID link still works.
- **UJ-3 Stranger who finds the preview URL.** They get Vercel's sign-in wall, not the site. Search engines that reach any non-release page are told not to index it.
- **UJ-4 Developer.** After `npm run build:local`, they run `npm run e2e`. Playwright serves `out/` on a fixed port and runs the smoke tests in Chromium.
- **UJ-5 Contributor opening a pull request.** CI builds the site once, runs the smoke tests, and blocks the merge if a page breaks.

## 4. Functional requirements

### Site page (4.1)
- **FR-1** `app/site/[id]/[slug]/page.tsx` takes its params from `getIndex()` through `generateStaticParams` (the `i` and `s` fields), with `dynamicParams = false` (R1). Every site in the index gets a page, 413 on 2026-10-23. The page data comes from `getSite(id)`.
- **FR-2** The page has one `<h1>` holding both names (R10):
  - the English name, `lang="en"`;
  - the Bangla name, `lang="bn"`, when present.

  When the Bangla name is missing (O13: JB-RAJ-059 and JB-RAJ-071 on 2026-10-23), the heading shows the English name only, followed by the `<T>` note "Bangla name not yet recorded". The note is outside the `<h1>`.
- **FR-3** The page shows the summary as English prose with `lang="en"` (O6).
- **FR-4** The page shows the condition as text through `<T k="condition.<token>">`, for all 5 tokens, `unknown` included. Bangla wording comes from the boards where they show it, and anything else is a draft with `needsReview: true` (the Phase 3 rule, 03 spec FR-4).
- **FR-5** The page shows no coordinates, map, location status or other location field. R5 then holds on this page by construction.
- **FR-6** Page metadata:
  - `<title>` is the English name (through the layout template);
  - `<link rel="canonical">` points to `/site/<id>/<slug>/`, made absolute with `SITE_URL` when that is set, root-relative otherwise (Assumption A-4).

### ID redirect (4.2)
- **FR-7** `app/site/[id]/page.tsx` builds one page per index entry, with `dynamicParams = false`. Each page has:
  - `<link rel="canonical">` to the site's slug URL (as in FR-6);
  - `<meta name="robots" content="noindex">` in **every** mode;
  - `<meta http-equiv="refresh" content="0;url=/site/<id>/<slug>/">`;
  - a visible link to the slug URL showing both names, for visitors whose browsers ignore the refresh.

  The page adds no client JavaScript of its own.

### Home page (4.3)
- **FR-8** `app/page.tsx` shows:
  - the `<h1>` "Jomidarpedia", with the Bangla tagline kept from the placeholder;
  - counts from `getMeta().counts`, formatted with `formatCount` in both languages: sites, sites on the map, and sources. Nothing is hard-coded;
  - links to 5 site pages whose IDs live in one exported constant, `HOME_SAMPLE_IDS`. Each link shows both names, using the FR-2 rule.

  An ID in `HOME_SAMPLE_IDS` that is not in the data fails the build, because `getSite` throws.
  - **Proposed IDs (Assumption A-1)**, chosen to cover different record states:
    | ID | Site | Why |
    |---|---|---|
    | JB-DHK-064 | Baliati Palace | full record, verified location, photos, preserved |
    | JB-RAJ-002 | Elangi Durga Ghosh Zamindar Bari | sparse, no pin, no photo, condition unknown (the "sparse" boards) |
    | JB-DHK-008 | Dhar Zamindar Bari (Nannar Rajbari) | the only unverified mapped site (O9), in ruins |
    | JB-DHK-020 | Amirabad Estate (Biswas Bari) | approximate location, in ruins |
    | JB-RAJ-059 | Betkhair Bagerbari Zamindar Bari | Bangla name missing (O13) |

### Indexing outside release
- **FR-9** In local and preview mode, the root layout sets robots `noindex, nofollow` on every page. The mode comes from `resolveMode(process.env)` in `scripts/data-mode.mjs`, as in `next.config.mjs`. Release pages carry no robots restriction, except the ID redirects (FR-7).

### Playwright (4.4)
- **FR-10** Page-test tooling:
  - `@playwright/test` and `serve` are devDependencies, pinned to exact versions (I1);
  - `playwright.config.ts` starts `serve` on `out/` at a fixed port (4173, Assumption A-2) through `webServer`, with `reuseExistingServer` turned off in CI;
  - Chromium only; browsers install with `npx playwright install --with-deps chromium`;
  - tests live in `e2e/` and run with `npm run e2e`, which does **not** build. The developer runs `build:local` first;
  - Vitest excludes `e2e/`;
  - `playwright-report/` and `test-results/` are gitignored.
- **FR-11** The served `out/` behaves like the static host: `/site/<id>/<slug>/` returns that directory's `index.html`, and a trailing-slash URL is not redirected away (Assumption A-3; add a `serve.json` if the defaults differ).

### Smoke tests (4.5)
- **FR-12** `e2e/smoke.spec.ts` checks:
  1. `/` shows the `<h1>` "Jomidarpedia" and links to all 5 `HOME_SAMPLE_IDS` slug URLs;
  2. Baliati's slug URL shows an `<h1>` containing its English and Bangla names;
  3. `/site/JB-DHK-064/` ends at the canonical slug URL and shows the same `<h1>`;
  4. Elangi's page renders its `<h1>` and contains no coordinate text;
  5. in a `build:local` output, pages carry the noindex robots meta (FR-9).

  Expected names and slugs are read from `data/build` or `public/data/index.json`, not written into the tests (I6).

### CI
- **FR-13** In the `check` job of `.github/workflows/ci.yml`, after `npm run build:local`, two steps run: `npx playwright install --with-deps chromium`, then `npm run e2e`. They are blocking. When the job fails, the Playwright report is uploaded as an artifact. The `release` job doesn't change.

### Vercel (4.6, owner action)
- **FR-14** The owner imports `Shojibmahmud/jomidarpedia` into Vercel with:
  - Node 24, build command `npm run build`, output directory `out`;
  - Deployment Protection (Vercel Authentication) on preview deployments;
  - `main` left as the production branch. Its production build resolves to `release` and fails on the current editorial problems, so nothing reaches production (§10).

  No `vercel.json` is added in this phase.

### URL contract
- **FR-15** `docs/URLS.md` marks `/` as built (minimal), and marks `/site/<id>/<slug>/` and `/site/<id>/` as built. `tests/urls.test.ts` stays green.

## 5. Non-functional requirements
- **NFR-1 Static.** All new routes are pre-rendered, with no server and no dynamic params (R1).
- **NFR-2 No new client JavaScript.** The new pages are server components. The only client code on them is the existing shell's.
- **NFR-3 Real data only.** Every value shown comes from `data/build/**` or `index.json`. An unknown condition is shown as "unknown" text, never guessed (R2).
- **NFR-4 Language markup.** Names and prose carry the correct `lang`, and interface text uses `<T>`, so the Phase 3 language toggle works on the new pages without a flash.
- **NFR-5 Build size.** The export grows by about 826 pages (413 slug pages and 413 redirects). Report the build time in the PR. It isn't a failing budget.
- **NFR-6 Deterministic tests.** Fixed port, no network beyond `localhost`, no fixed counts in the tests.

## 6. Data, interfaces, and integrations
- **Reads:**
  - `public/data/index.json` through `getIndex()`: `i`, `s`, `e`, `b`;
  - `data/build/sites/<id>.json` through `getSite()`: `id`, `slug`, `name` (`en`, `bn?`), `summary`, `condition`;
  - `data/build/meta.json` through `getMeta()`: `counts.sites`, `counts.onMap`, `counts.sources`.
- **New dependencies (exact pins):** `@playwright/test` and `serve`, both devDependencies.
- **Environment variables:**
  - `VERCEL_ENV` and `JP_DATA_MODE`, through `resolveMode`;
  - `SITE_URL`, optional and unset until 14.2.
- **External:** Vercel (Hobby), its GitHub integration, and Deployment Protection.

## 7. Edge cases and failure behavior
- **Missing Bangla name:** follows FR-2. The page never shows an empty `lang="bn"` element.
- **Unknown condition:** shown as the `condition.unknown` string (141 sites on 2026-10-23).
- **Slugs:** every slug in the index matches `^[a-z0-9]+(-[a-z0-9]+)*$` (checked 2026-10-23), so the URLs need no encoding. An index entry whose slug differs from its site JSON is a build error, not a silent redirect.
- **Unknown ID in `HOME_SAMPLE_IDS`:** the build fails with the reader's error.
- **JavaScript disabled:** the meta refresh still redirects, and the visible link remains as a fallback.
- **Static server differences:** if `serve` and Vercel treat trailing slashes differently, the smoke tests would pass locally and hide a preview bug. FR-11 pins the expected behaviour, and the owner's check in AC-8 confirms it on Vercel.
- **Production builds on Vercel:** pushes to `main` start a production build that fails on purpose. The failure notifications are expected until Phase 12.
- **Preview protection:** if the Hobby plan can't protect a preview URL, follow §2.4: deploy only a hand-picked set of records that pass release checks (Q-1).
- **Editorial text in summaries:** some summaries still read like internal notes (for example JB-RAJ-002, "Not on the book page…"). Local and preview builds show them; cleaning them up is Phase 12 (O3, O15), not a Phase 4 fix.

## 8. Acceptance criteria
- **AC-1** (FR-1–FR-5, NFR-1) After `npm run build:local`:
  - `out/site/<id>/<slug>/index.html` exists for every index entry;
  - Baliati's page shows both names, its summary and "Preserved";
  - JB-RAJ-059's page shows the English name with the "not yet recorded" note.

  A test confirms that no site page contains its own coordinates.
- **AC-2** (FR-6, FR-7) Every `out/site/<id>/index.html` has the canonical link, `noindex`, a refresh to the matching slug URL, and a visible link. Two counts are both equal to the number of index entries: the slug pages and the redirect pages.
- **AC-3** (FR-8) The home page shows the counts from `meta.json` in both languages and 5 working links. When one ID in `HOME_SAMPLE_IDS` is changed to an unknown one, the build fails.
- **AC-4** (FR-9) Pages from `build:local` carry `noindex, nofollow`. In a release-mode render, the home and site pages don't, but the redirect pages do. This is checked by a unit test of the layout metadata with each mode, because the release build fails on editorial problems.
- **AC-5** (FR-10–FR-12, NFR-6) After `build:local`, `npm run e2e` passes on a clean machine, with no server already running.
- **AC-6** (FR-13) The smoke tests run on the PR for this branch, and a deliberately broken `<h1>` makes the `check` job fail.
- **AC-7** (FR-15) `docs/URLS.md` shows the three routes as built, and `npm test` passes.
- **AC-8** (FR-14, roadmap criteria) The owner confirms:
  - the preview URL asks for sign-in when opened in a private window;
  - the preview shows Baliati (JB-DHK-064) from real data, built in `preview` mode (noindex present);
  - `/site/JB-DHK-064/` on the preview reaches the slug URL.
- **AC-9** (roadmap: production fails closed) `npm run build` (release mode) exits non-zero on the current data, and the production build on Vercel fails the same way.
- **AC-10** `npm run lint`, `typecheck`, `test` and `build:local` pass.

## 9. Dependencies, constraints, and assumptions
### Dependencies
- **Phase 3:** readers, `<T>`, formatters, shell, `docs/URLS.md`.
- **O1:** the remote repository exists. The repository is public by the owner's choice (2026-10-22), not private as O1's default said.
- **Owner's Vercel account** for 4.6.

### Constraints (repository evidence)
- **Static export:** `output: 'export'`, `trailingSlash: true` (`next.config.mjs`).
- **Mode resolution** fails closed to `release` (`scripts/data-mode.mjs`). Vercel production is always `release`.
- **Readers** are server-only and throw on an unknown ID (`lib/data.ts`).
- **Metadata:** `/dev/i18n/` already sets robots through the Next `Metadata` API (`app/dev/i18n/page.dev.tsx`). The new pages follow that pattern.
- **CI:** one `check` job on Node from `.nvmrc` (24). Its last step is `test -f out/index.html` (`.github/workflows/ci.yml`).
- **Local sandbox:** `next build` and browser runs need to run outside the agent sandbox (Google Fonts, local ports). This is a development note, not a project requirement.

### Assumptions (A-1 …, not yet confirmed)
- **A-1** The 5 `HOME_SAMPLE_IDS` in FR-8.
- **A-2** Port 4173 for the Playwright server.
- **A-3** `serve`'s default handling of directory indexes and trailing slashes matches Vercel's static hosting. Otherwise a `serve.json` makes it match.
- **A-4** Canonical links are root-relative until `SITE_URL` is set in 14.2.

## 10. Key decisions and rationale
Confirmed by the owner on 2026-10-23:

- **Fixed, reviewed home links.** One constant, not a data rule. The links stay stable for smoke tests and reviews and cover several record states. A rule would shift whenever the data changes.
- **Production stays off through the release gate only.** `main` stays the production branch, and its release build fails on editorial problems. There is no extra config to remember to remove at launch, and it matches CI's `release` job.
- **Smoke tests in the existing `check` job.** The site is built once, and the tests block every push and PR.
- **noindex in every non-release build.** Local and preview output can never be indexed by accident. Release pages are indexable, except the ID redirects, which are always noindex.

Inherited from the roadmap:

- **Meta-refresh redirect pages** are portable to any static host. Host-level redirects stay optional (14.3).
- **Text-only site page.** The skeleton proves the data path. The components come in Phase 5.

## 11. Open questions
- **Q-1** Does Vercel Hobby's Deployment Protection cover every preview URL, including branch alias URLs? The owner checks this during 4.6. If it doesn't, the §2.4 fallback applies.
- **Q-2** Could the release build on Vercel fail for a reason other than editorial problems (for example, fonts or the Node version)? That would still keep production off, but it would hide the real failure. Check the first production build log.
