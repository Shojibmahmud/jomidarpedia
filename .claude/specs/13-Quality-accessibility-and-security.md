# Quality, accessibility and security

**Status:** Approved (by the owner, 2026-10-26)
**Roadmap reference:** `roadmap/DEVELOPMENT_ROADMAP.md` §3 Phase 13 (tasks 13.1–13.11); also O4 (tile provider), O14 (canonical domain), §2.4 (build modes); `.claude/specs/04-Walking-skeleton.md` (noindex, no `vercel.json`); `.claude/specs/07-Map.md` (tiles, Lite mode); `.claude/specs/10-Areas-sources-about-and-system-states.md` (error and offline states); `docs/URLS.md`
**Source task:** "Phase 13: Quality, accessibility and security. Objective: measured performance, manually verified accessibility, a working error handling, and a security policy tested on the deployed preview."
**Branch:** `14-phase-13-quality`
**Date:** 2026-10-26

## 1. Problem and intended outcome

Phase 12 is merged, the release build passes, and production (`main` on `*.vercel.app`) is live and indexable. The site still has gaps, measured on 26 Oct 2026:

| Area | Current state |
|---|---|
| Security headers | None. There is no `vercel.json` (spec 04 left it out on purpose). |
| CSP | None. Each page has about 54 inline scripts (`self.__next_f.push` payloads, different on every page) plus `BOOT_SCRIPT` in `app/layout.tsx:39`. |
| Performance | No budget is enforced. Home JS is about 165 KB gzipped for a modern browser (205 KB including the 40 KB `noModule` polyfills). The framework chunks are about 130 KB of that. `index.json` is about 77 KB gzipped; the home hero is 233 KB. Leaflet and Fuse.js are not on the home page. |
| Accessibility | axe runs in 7 e2e specs (`@axe-core/playwright`), but not over a state matrix. There are no recorded manual or device checks. |
| SEO | `SITE_URL` is unset, so canonical links are root-relative (`lib/site-url.ts`). There is no `sitemap.xml`, no `robots.txt` and no Open Graph tags. Preview and local builds are already `noindex`. |
| Tiles | Only OSM standard is active (`lib/map-config.ts`). OSM's tile policy forbids heavy use, and CARTO now needs a key (O4). |
| Dependencies | `npm audit --omit=dev` reports 0 vulnerabilities. |

**Intended outcome:**
- Budgets enforced in CI.
- An axe state matrix with no serious or critical findings.
- Manual and real-device checks recorded.
- Each error state tested.
- A launch tile provider chosen, with its terms recorded.
- An enforced CSP and security headers, verified on the preview and then on production.
- Leak and link checks over `out/`.
- A generated sitemap and robots file, absolute canonical URLs and Open Graph images.

## 2. Scope

### In scope
- 13.1–13.11 as written in the roadmap, refined by the decisions in §10.
- Setting `SITE_URL` in Vercel production to the current `*.vercel.app` domain (D5).
- A static default Open Graph image (D8).
- Making the Playwright server send the same headers as `vercel.json` (D10).
- New docs: `docs/a11y-checks.md`, `docs/tiles.md`, and `docs/security.md` (the CSP rationale and the header list).
- Fixing blockers found by the manual and device checks (D13).

### Out of scope
- A custom domain and the rest of Phase 14 (14.1, 14.2 and onwards).
- Any claim of WCAG conformance or certification.
- Generated Open Graph cards per page.
- Per-page CSP hashes or nonces.
- Bangla URLs or `hreflang`: language is a client toggle on the same URL.
- Self-hosted vector tiles (a post-MVP option).
- Changes to data content (CSV text, records).
- Fixing minor manual findings: they are listed as open items, not fixed (D13).

## 3. User journeys / use cases

1. **A reader on a slow phone** opens `/`. The page loads without Leaflet or Fuse.js and with JS inside the budget; the hero is under 300 KB.
2. **A VoiceOver user filters Explore** with the keyboard and screen reader. They open the filter drawer, choose a division, close the drawer and land back on the button that opened it. The result count is announced.
3. **A reader whose network blocks the tile host** opens a site page. The map shows the tile-error overlay with Retry, and the rest of the page works.
4. **Someone shares a site page** on social media. The preview shows the site's name, its description and its first photo. A page without a photo shows the default image.
5. **A contributor's PR adds a heavy import to the home page.** Lighthouse CI fails the PR on the JS budget.
6. **A contributor adds a `target="_blank"` link without `rel="noopener noreferrer"`.** The `out/` check fails CI and names the file and link.
7. **The owner checks the CSP on the preview** in Report-Only mode, sees no violations on the key pages, and switches it to enforce.

## 4. Functional requirements

### Performance (13.1)
- **FR-1** Lighthouse CI runs in GitHub Actions against the static export served locally, in mobile mode, on `/`, `/explore/` and `/site/JB-DHK-064/baliati-palace/` (Assumption A-1). It blocks the `check` job.
- **FR-2** These size budgets block:
  - `index.json` ≤ 150 KB gzipped;
  - home-page JS ≤ the budget fixed by FR-3 (Assumption A-2 defines what is counted);
  - the largest image on the home page ≤ 300 KB.
- **FR-3** Before the JS budget is fixed, a bundle analysis of the home page is run and avoidable home-page code is removed. The budget is then 150 KB gzipped if reachable, otherwise the measured value plus 5 KB. The figure and its reason are recorded in the roadmap's Phase 13 notes (OQ-2).
- **FR-4** No request from the home page loads Leaflet, leaflet.markercluster or Fuse.js code. This is asserted by a blocking check: an LHCI assertion or a Playwright request-log test.
- **FR-5** Lighthouse category scores: Accessibility ≥ 0.95 and SEO ≥ 0.9 block on all three URLs. The Performance score is reported in the CI output and does not block.

### Automated accessibility: axe state matrix (13.2)
- **FR-6** A Playwright spec runs axe on each state below. A run fails on any `serious` or `critical` violation:
  1. a sparse record (no pin, no photo);
  2. unknown access and unknown fee;
  3. an unverified pin;
  4. the longest itinerary;
  5. the site with the most recorded conflicts;
  6. Bangla mode;
  7. dark mode;
  8. a failed `index.json` request (Explore and Search);
  9. a failed tile request (Explore map and a site mini map).
- **FR-7** States 1–5 use a fixed real record ID each. The ID is chosen at implementation time and named in the spec file.
- **FR-8** Each fixed record has a guard assertion that checks the record still has its state, read from the built data. Example: the sparse record has no `lat` and no photos. If a data change removes the property, the guard fails with a message naming the state and the ID, so the matrix cannot drift silently.
- **FR-9** States 6 and 7 are applied to at least Home, Explore, a site page and an itinerary page.

### Manual accessibility checks (13.3)
- **FR-10** `docs/a11y-checks.md` records each manual check with its date, device or OS, browser, assistive technology (with version where available), result (pass / fail / partial) and notes. The checks are the 13.3 list:
  - 200% and 400% zoom, and reflow at 320 px;
  - keyboard-only use of the filters, drawer, sheets, map, lightbox and combobox;
  - visible focus, and focus restored when a dialog closes;
  - live-region announcements;
  - non-drag alternatives;
  - language changes read correctly;
  - VoiceOver on iOS and TalkBack on Android.
- **FR-11** The owner's devices are used: iPhone (Safari + VoiceOver), Android (Chrome + TalkBack), Mac (Safari + VoiceOver) and Windows (NVDA, with any browser).
- **FR-12** A **blocker** is a failure where a user cannot reach, operate or understand a control or its content. Blockers are fixed in Phase 13 and rechecked, and the recheck is recorded. Other findings are listed as open items in the doc (D13). The doc states that these checks show progress towards WCAG 2.2 AA and do not certify conformance.

### Bangla rendering (13.4)
- **FR-13** On Android Chrome and iOS Safari, Bangla text including "সংরক্ষিত" and "ধ্বংসাবশেষ" renders with correct conjuncts on a site page and in Bangla mode chrome. The result and a screenshot reference are recorded in `docs/a11y-checks.md`. Garbled rendering is a blocker (FR-12). *(Amended 31 Oct 2026 by spec 15: "ধ্বংসপ্রায়" is no longer shown on the site, and the check covers the pages and rows P1–P8 in spec 15 FR-1.)*

### Error states (13.5)
Each is tested in Playwright by blocking or failing the request:
- **FR-14** A failed `index.json` fetch shows the existing error state with a retry on Explore, Search and the home search box, and nothing throws an unhandled error.
- **FR-15** Failed tiles show the tile-error overlay. The list and page keep working, and Retry reloads the tiles (7.11).
- **FR-16** A failed image falls back to the placeholder art (gallery, cards, home tiles).
- **FR-17** Offline (`context.setOffline(true)`) shows the offline notice (`components/shell/OfflineNotice.tsx`), and it hides again when back online.
- **FR-18** An unknown route serves the 404 page with HTTP status 404.

### Tiles (13.6, O4)
- **FR-19** The owner compares 2–3 tile providers on terms, free-tier limits, key requirements, attribution and dark-mode style, and chooses one. The comparison, the choice, a link to (or quote of) the terms, and the date are recorded in `docs/tiles.md` (OQ-1).
- **FR-20** The chosen provider is set up in `lib/map-config.ts` with its required attribution (Assumption A-6). If it needs a key:
  - the key comes from `NEXT_PUBLIC_TILE_KEY` and is restricted to the production and preview origins in the provider's dashboard;
  - a release build with the keyed provider selected and no key **fails**;
  - local and preview builds without a key fall back to OSM (D14).
- **FR-21** On the preview, DevTools shows that tile requests send a `Referer` (the origin is enough under `strict-origin-when-cross-origin`) and that the attribution matches the provider's requirements. This is recorded in `docs/tiles.md`.

### Content Security Policy (13.7)
- **FR-22** The assets `out/` actually uses are listed in `docs/security.md`: script, style, image, font and connect origins, found by a scan of `out/` and checked against a browser session.
- **FR-23** `vercel.json` sets a CSP for all paths with these directives:
  - `default-src 'self'`;
  - `script-src 'self' 'unsafe-inline'` (D4);
  - `style-src 'self' 'unsafe-inline'`;
  - `img-src 'self' https://thumb.wikimedia.org https://upload.wikimedia.org <chosen tile hosts> data:`;
  - `font-src 'self'`;
  - `connect-src 'self'`;
  - `object-src 'none'`;
  - `base-uri 'self'`;
  - `form-action 'self'`, plus any external form target the corrections link needs, if it is a form;
  - `frame-ancestors 'none'`.

  The final list follows FR-22: a needed origin is added, and an unused one is not.
- **FR-24** `docs/security.md` explains why `script-src` uses `'unsafe-inline'`: per-request nonces don't exist in a static export, and the inline payloads differ on every page. It also lists what limits the risk: React escaping, no user-generated content, `object-src 'none'`, `base-uri 'self'`, `connect-src 'self'`, `frame-ancestors 'none'`, and the `out/` checks.
- **FR-25** Rollout (D9):
  1. deploy as `Content-Security-Policy-Report-Only` on the preview;
  2. visit the key pages (Home, Explore with map, Search, a site page with photos and map, an itinerary, a source page, About, Credits, 404) in light and dark mode and in English and Bangla, and confirm zero violations in the console;
  3. switch to an enforced `Content-Security-Policy` on the preview and repeat the check;
  4. merge to `main` and confirm the enforced header on production with `curl -I`.

  Each step's date and result is recorded in `docs/security.md`.
- **FR-26** The theme and language boot script (`BOOT_SCRIPT`) and the map keep working under the enforced CSP: no flash of the wrong theme, and pins and tiles show.

### Other headers (13.8)
- **FR-27** `vercel.json` sets these headers for all paths, enforced from their first deploy:
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - `Permissions-Policy: geolocation=(self), camera=(), microphone=()`.

  They are verified with `curl -I` on the preview (with authentication) and on production, and the output is recorded in `docs/security.md`.

### Headers in e2e (D10)
- **FR-28** The Playwright web server sends the same response headers as `vercel.json`, either from a generated `serve.json` or with a unit test that fails when the two differ. Every e2e test fails if the page fires a `securitypolicyviolation` event or logs a CSP console error.

### Link and leak checks (13.9)
A new script checks `out/`, with a non-zero exit and a listing of file and match on failure:
- **FR-29** Every `<a target="_blank">`, and every link to an external origin that opens in a new tab, has `rel` containing `noopener` and `noreferrer`.
- **FR-30** No text matches `INTERNAL_TERMS` or `WORKING_FILES` (`scripts/lib/internal-terms.mjs`).
- **FR-31** No local path appears (`LOCAL_PATHS` in the same file, e.g. `/Users/`).
- **FR-32** For each hidden site, its original coordinates from the source CSV do not appear anywhere in `out/`. The check uses the coordinate values at the precision stored, plus 4- and 5-decimal roundings. This complements `scripts/lib/checks.mjs:34`, which checks the data output.

The script runs in CI after `build:local` and after the release build, and it blocks (Assumption A-5).

### Dependencies (13.10)
- **FR-33** `npm audit --omit=dev` is run and the result recorded in `docs/security.md`. Any high or critical finding is fixed, or documented with why it doesn't apply. The audit is added to CI as a step that fails on high or critical.

### SEO (13.11)
- **FR-34** Every page has a `<title>` and `<meta name="description">` built from its data (site name and summary, itinerary title, area name and counts, source title). No two indexable pages share the same title.
- **FR-35** With `SITE_URL` set, canonical links and Open Graph URLs are absolute (`canonicalUrl` in `lib/site-url.ts`). `SITE_URL` is set in Vercel production to the `*.vercel.app` domain (D5). A trailing slash on `SITE_URL` makes no difference to the output.
- **FR-36** A release build writes `out/sitemap.xml` with the canonical URL of every indexable page. It leaves out the `/site/<id>/` redirects, `/dev/` and `404` (Assumption A-3).
- **FR-37** A release build writes `out/robots.txt` that allows crawling and points to the sitemap. Local and preview builds write a `robots.txt` with `Disallow: /`.
- **FR-38** Open Graph and Twitter card tags (`og:title`, `og:description`, `og:url`, `og:type`, `og:image` with width and height, `twitter:card`) are present on every page (D8):
  - Home: the hero image (`IMG-DHK-101-001`, an existing local variant);
  - a site page with a Ready photo: its first Ready photo, as a local image (an existing variant, or a JPEG variant made by `npm run thumbs`);
  - every other page: one static default image in `public/`.

  Image URLs are absolute when `SITE_URL` is set.
- **FR-39** Preview and local builds stay `noindex, nofollow`. The ID redirect pages stay `noindex` in every mode (unchanged, spec 04).

## 5. Non-functional requirements

- **NFR-1** The new CI steps (Lighthouse, axe matrix, `out/` checks, audit) add no more than about 5 minutes to the `check` job.
- **NFR-2** No new runtime dependencies. New tooling is dev-only (e.g. `@lhci/cli`).
- **NFR-3** Accessibility target is WCAG 2.2 AA. Phase 13 measures progress and does not claim conformance.
- **NFR-4** Privacy: no analytics, no CSP report collection and no cookies are added. A tile key is the only new public value.
- **NFR-5** Determinism: blocking checks give the same result on repeated runs of the same commit. Performance score is excluded for this reason (D11).

## 6. Data, interfaces, and integrations

| Item | Kind | Notes |
|---|---|---|
| `vercel.json` | new | `headers` for `/(.*)`: CSP (Report-Only, then enforced), FR-27 headers. No rewrites or redirects. |
| `serve.json` or header-parity test | new | FR-28 |
| `lighthouserc.*` | new | URLs, mobile preset, runs, assertions (FR-1–5) |
| `scripts/check-out.mjs` (name to confirm) | new | FR-29–32; reuses `scripts/lib/internal-terms.mjs` |
| sitemap/robots step | new | runs after `next build`, writes into `out/` (FR-36, FR-37) |
| `lib/map-config.ts` | change | chosen provider, attribution (FR-20) |
| `app/layout.tsx`, page `generateMetadata` | change | Open Graph and descriptions (FR-34, FR-38) |
| `SITE_URL` | env, Vercel production | D5 |
| `NEXT_PUBLIC_TILE_KEY` | env, if needed | D14 |
| `.github/workflows/ci.yml` | change | LHCI, `out/` checks, audit steps |
| `docs/a11y-checks.md`, `docs/tiles.md`, `docs/security.md` | new | records |

## 7. Edge cases and failure behavior

- **`SITE_URL` missing in a release build:** the sitemap is not written. A warning is printed and canonical links stay root-relative. The build does not fail, because `SITE_URL` is a deployment setting.
- **`SITE_URL` with or without a trailing slash, or with a path:** URLs are joined with `new URL`, so there is no double slash.
- **A site whose only photo is not Ready:** it gets the default OG image. A non-Ready image is never published.
- **Hidden-site coordinates inside a URL or an encoded string:** FR-32 searches the raw HTML and the JSON files, including URL-encoded forms.
- **The CSP blocks `BOOT_SCRIPT` or Leaflet inline styles:** the e2e header mirror (FR-28) fails CI before a deploy.
- **A tile URL template with `{s}` subdomains:** each concrete host (or a documented wildcard) is listed in `img-src`.
- **LHCI flakiness:** size and score assertions use the median of 3 runs. The performance score never blocks.
- **An audit finding in a dev-only package:** `--omit=dev` leaves it out of the block. It is noted if it affects the build.
- **A guard fails because data changed:** the fix is to choose a new record for that state, not to remove the state.
- **The provider's key is missing on a preview:** the preview falls back to OSM and says so in the build log.

## 8. Acceptance criteria

- **AC-1** (FR-1, FR-2, FR-4) Given a PR, when CI runs, Lighthouse CI checks the three URLs and the job fails if `index.json` > 150 KB gzipped, home JS > the budget, the largest home image > 300 KB, or Leaflet or Fuse.js loads on Home.
- **AC-2** (FR-3) The roadmap notes record the bundle analysis, what was removed, and the final JS budget with its reason.
- **AC-3** (FR-5) Accessibility < 0.95 or SEO < 0.9 on any of the three URLs fails CI. The Performance score appears in the output.
- **AC-4** (FR-6, FR-9) The axe matrix spec runs all 9 states and has no serious or critical findings.
- **AC-5** (FR-7, FR-8) Editing the data so a matrix record loses its state makes the guard fail with the state and ID named.
- **AC-6** (FR-10, FR-11, FR-13) `docs/a11y-checks.md` contains a dated entry for every 13.3 check and for Bangla rendering on Android Chrome and iOS Safari, with device, browser and assistive technology.
- **AC-7** (FR-12) Every blocker in the doc has a recorded fix and a passing recheck. The remaining findings are listed as open items.
- **AC-8** (FR-14–18) A Playwright test per error state blocks the request (or goes offline, or opens an unknown path) and asserts the documented UI. The unknown route returns 404.
- **AC-9** (FR-19, FR-21) `docs/tiles.md` names the chosen provider, its terms and date, and the preview check of `Referer` and attribution.
- **AC-10** (FR-20) A release build with a keyed provider and no `NEXT_PUBLIC_TILE_KEY` fails. A local build without it uses OSM.
- **AC-11** (FR-22, FR-23, FR-24) `vercel.json` carries the CSP with the directives of FR-23, and `docs/security.md` lists the asset inventory and the `'unsafe-inline'` rationale.
- **AC-12** (FR-25, FR-26) `docs/security.md` records the Report-Only check, the enforced check on the preview with zero console violations on the listed pages, and `curl -I` on production showing the enforced header. Theme boot and map work under it.
- **AC-13** (FR-27) `curl -I` on the preview and production shows the three headers of FR-27.
- **AC-14** (FR-28) Adding an inline `<script>` from a disallowed origin, or a disallowed image host, to a page makes e2e fail. A change to `vercel.json` headers without a matching `serve.json` change fails.
- **AC-15** (FR-29–32) The `out/` check passes on the local and release builds. Planting a `target="_blank"` link without `rel`, an internal term, a local path, or a hidden site's coordinates in `out/` makes it fail with the file named.
- **AC-16** (FR-33) `docs/security.md` records the audit result, and CI fails on a high or critical runtime finding.
- **AC-17** (FR-34) A test over `out/` finds a non-empty title and description on every indexable page and no duplicate titles.
- **AC-18** (FR-35, FR-36, FR-37) A release build with `SITE_URL=https://example.vercel.app/` has absolute canonical links, a `sitemap.xml` without `/site/<id>/` redirects, `/dev/` or `404`, and a `robots.txt` pointing at it. A preview build's `robots.txt` disallows everything.
- **AC-19** (FR-38) Home, a site with a Ready photo, and a site without one each have the Open Graph tags of FR-38, with the hero, the site photo and the default image respectively, and every `og:image` file exists in `out/`.
- **AC-20** (FR-39) Preview and local pages carry `noindex, nofollow`, and ID redirects carry `noindex` in a release build.
- **AC-21** (NFR-1) The CI `check` job's duration grows by no more than about 5 minutes compared with `main` before Phase 13.
- **Phase ACs (roadmap):** the budgets pass in CI (AC-1, AC-3); the axe matrix has no serious or critical findings (AC-4); the manual checks are recorded with open issues listed (AC-6, AC-7); the CSP is enforced on the preview without console violations (AC-12); the leak checks pass (AC-15).

## 9. Dependencies, constraints, and assumptions

### Dependencies
- Phases 5–11 (all pages and states exist).
- The owner's time and devices for 13.3, 13.4, 13.6 and the preview checks.
- Access to the protected preview with Vercel Authentication, for the `curl -I` checks (signed-in cookie or a bypass token, kept out of the repo).
- The tile provider's account and key, if needed (OQ-1).

### Constraints
- Static export: `output: 'export'`, `trailingSlash: true` (`next.config.mjs`). There is no server, so no nonces and no CSP report endpoint.
- Build modes are decided inside the build from `VERCEL_ENV` and `JP_DATA_MODE` (`scripts/data-mode.mjs`; roadmap §2.4).
- `indexable()` and `canonicalUrl()` already exist in `lib/site-url.ts`.
- Playwright serves `out/` with the pinned `serve` on port 4173 (`playwright.config.ts`).
- e2e specs already answer tile requests with a local image (`e2e/tiles.ts`).
- Hidden-site output checks exist in `scripts/lib/checks.mjs:34`; term lists are in `scripts/lib/internal-terms.mjs`.
- Home photos come from `lib/home-images.json`; WebP variants are in `public/home/` (`npm run thumbs`).
- Node `>=24` (`package.json` engines); CI uses `.nvmrc`.

### Assumptions (accepted by the owner, 2026-10-26)
- **A-1** Lighthouse CI uses `@lhci/cli` (a dev dependency), mobile preset, 3 runs per URL, with assertions on the median.
- **A-2** "JS on the home page" means the gzipped scripts a modern browser downloads; the `noModule` polyfills are not counted.
- **A-3** `sitemap.xml` and `robots.txt` are written by a post-build step into `out/`. The sitemap is made only in release mode with `SITE_URL` set, and leaves out `/site/<id>/` redirects, `/dev/` and `404`. Local and preview builds get `robots.txt` with `Disallow: /`.
- **A-4** No CSP `report-uri` or `report-to`: a static host can't collect reports. Report-Only violations are read from the browser console and from Playwright.
- **A-5** The `out/` check is a blocking CI step after `build:local` and after the release build.
- **A-6** The tile-provider change is limited to `lib/map-config.ts`, the attribution and the CSP `img-src`. Map behaviour is unchanged.

## 10. Key decisions and rationale

| # | Decision | Rationale |
|---|---|---|
| D1 | Lighthouse CI runs in GitHub Actions against `out/`, blocking; not against the protected preview. | No secrets needed; deterministic; the same build e2e uses. Vercel's CDN and headers are checked separately (FR-25, FR-27). |
| D2 | Production is live. Headers and CSP are verified on the preview first, then on production. | The roadmap requires preview testing; production must not break. |
| D3 | The tile provider (O4) is an owner decision inside Phase 13, recorded in `docs/tiles.md`; Lite mode is the fallback. | OSM's policy forbids heavy use and CARTO needs a key; the choice depends on terms the owner must accept. |
| D4 | `script-src 'self' 'unsafe-inline'`, documented. | About 54 inline scripts per page, different on every page; no nonces in a static export. Other directives limit the risk. |
| D5 | Set `SITE_URL` in production to the `*.vercel.app` domain now. | The sitemap and Open Graph need absolute URLs; 14.2 changes the domain later. |
| D6 | Devices: iPhone, Android, Mac, Windows with NVDA. | What the owner has. |
| D7 | Run a bundle analysis and trim first; the budget is 150 KB if reachable, otherwise measured value + 5 KB. | Framework chunks are about 130 KB, so "about 150 KB" is already exceeded. The budget must be real and stop growth. |
| D8 | OG images: hero on Home, the first Ready photo on a site page, a static default elsewhere. | Uses reviewed images only; no generated cards to maintain. |
| D9 | CSP rollout is Report-Only on the preview, then enforced, then production. The other headers are enforced at once. | The other headers carry little risk; the CSP can break pages. |
| D10 | The e2e server mirrors `vercel.json` headers and fails on CSP violations. | CSP regressions are caught in CI, not only by hand on the preview. |
| D11 | The size budgets, Accessibility ≥ 0.95 and SEO ≥ 0.9 block; the Performance score is reported only. | The scores and sizes that block are stable on CI runners; the Performance score varies too much. |
| D12 | axe matrix: a fixed real record per state, with a guard assertion. | Same record every run, and drift fails loudly. |
| D13 | Blockers from manual checks are fixed in Phase 13; minor findings are listed. | Keeps the phase bounded while making sure nothing blocks a user. |
| D14 | A domain-restricted tile key may ship in client JS through `NEXT_PUBLIC_TILE_KEY`. A release build with a keyed provider and no key fails; dev falls back to OSM. | This is how browser tile keys work; failing in release prevents a broken production map. |

## 11. Open questions

- **OQ-1** Which tile provider is chosen for launch (FR-19, the owner's decision).
- **OQ-2** The final home-page JS budget (FR-3, depends on the bundle analysis).
- **OQ-3** Whether to pin `engines` to `<27` before launch (carried over from the roadmap's Phase 4 notes; may belong to Phase 14).
