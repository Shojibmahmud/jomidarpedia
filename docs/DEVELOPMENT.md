# Development guide

How to set up, run, test, change and ship Jomidarpedia. For how the system is designed, read `docs/ARCHITECTURE.md` first. For editing the data rather than the code, see `CONTRIBUTING.md`.

## 1. Set up

You need:

- **Node 24 or newer.** `.nvmrc` says 24, which is what CI and Vercel use. `package.json` allows anything from 24 up.
- **npm.** Versions are pinned exactly in `package.json`, and `package-lock.json` is committed, so use `npm ci`, not `npm install`.
- **Playwright's Chromium**, only for the page tests: `npx playwright install chromium`.
- **The original photos**, only if you need to rebuild thumbnails. They live outside the repository, by default in `../images/`. A clone without them builds fine.

```sh
git clone https://github.com/Shojibmahmud/jomidarpedia.git
cd jomidarpedia
npm ci
npm run dev
```

`npm run dev` builds the data in local mode and then starts Next on http://localhost:3000. The data is built once at start, so restart it after editing a CSV, a translation file or `content/about.*.md`.

No `.env` file is needed for local work.

## 2. Environment variables

| Variable | Used by | Meaning |
|---|---|---|
| `JP_DATA_MODE` | `scripts/data-mode.mjs` | `local`, `preview` or `release`. Unset means `release`. `npm run dev` and `npm run build:local` set `local`. |
| `VERCEL_ENV` | `scripts/data-mode.mjs` | Set by Vercel. `production` forces `release`, and `preview` forces `preview`, whatever `JP_DATA_MODE` says. |
| `SITE_URL` | `lib/site-url.ts`, `app/layout.tsx`, `scripts/build-seo.mjs` | The site's origin, for example `https://jomidarpedia.vercel.app`. Makes canonical links and share images absolute, and is needed for `sitemap.xml`. Unset locally. |
| `NEXT_PUBLIC_TILE_KEY` | `lib/map-config.ts`, `scripts/check-tile-key.mjs` | The CARTO map tile key. It is public by design (it ends up in the page's JavaScript) and is restricted by Referer in CARTO's dashboard. Without it, maps use OpenStreetMap tiles. A release build fails without it; locally any value works. |
| `SOURCE_DATE_EPOCH` | `scripts/build-data.mjs` | Overrides the "compiled at" date. Otherwise it is the newest `last_verified` in the data. |
| `JP_IMAGES_DIR` | `scripts/build-thumbs.mjs` | Where the original photos are. Default `../images`. |
| `PW_BASE_URL` | `playwright.config.ts` | Run the page tests against a deployed host instead of a local server. |
| `PROD_URL` | `scripts/check-prod.mjs` | The origin `npm run check:prod` checks. Default: the production site. |
| `CHROME_PATH` | `scripts/lighthouse.mjs` | A Chrome to use for Lighthouse instead of Playwright's Chromium. |
| `CI` | `playwright.config.ts`, tests | Set by GitHub Actions: one retry, an HTML report, no reused server. |

In Vercel, `SITE_URL` is set for Production, and `NEXT_PUBLIC_TILE_KEY` for Production and Preview.

## 3. Commands

### Every day

| Command | What it does |
|---|---|
| `npm run dev` | Data build in local mode, then the Next dev server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests. Needs a data build first, because some tests read `data/build/` |
| `npm run build:local` | Data (local mode) → `next build` → `robots.txt`. Writes `out/` |
| `npm run e2e` | Playwright page tests against `out/`. Doesn't build: run `npm run build:local` first |

### Data

| Command | What it does |
|---|---|
| `npm run data` | The whole data build and its report. Release mode unless `JP_DATA_MODE` is set |
| `npm run data:index`, `npm run data:build` | One builder alone, for debugging |
| `npm run bn -- todo\|merge\|approve …` | The Bangla translation workflow (`docs/TRANSLATION_BN.md`) |
| `npm run thumbs` | Rebuild thumbnails and home photos from the originals. Output is committed |
| `npm run icons` | Rebuild the favicon, touch icon and default share image. Output is committed |

### Release and checks

| Command | What it does |
|---|---|
| `npm run build` | A release build, as production runs it: data → tile key check → `next build` → `robots.txt` and `sitemap.xml` |
| `npm run check:out` | Over `out/`: new-tab links have `rel="noopener noreferrer"`, no internal terms or local paths, no hidden site's coordinates |
| `npm run check:budgets` | Size budgets: `index.json`, the home page's JavaScript and largest image, no map or search code on the home page, the data download |
| `npm run lighthouse` | Lighthouse on `out/`. Fails under 0.95 for accessibility or 0.9 for SEO. Run it on a release build |
| `npm run check:prod` | The `check:out` rules against the deployed site, for every sitemap URL |
| `npm run e2e:prod` | The smoke tests against production |
| `npm run compare:out -- <reference>` | Compares two build trees: the fresh-clone check (`docs/release-checks.md`) |
| `npm run screenshots` | Full-page screenshots into `screenshots/` for visual review |

To run a release build locally:

```sh
NEXT_PUBLIC_TILE_KEY=local-placeholder npm run build
```

## 4. Tests

There are three layers, and each has a rule about where its expected values come from.

### Unit tests (`tests/`, Vitest)

They cover the build scripts and the pure rules in `lib/`. Run one file with `npx vitest run tests/search.test.ts`.

- **Fixtures.** `tests/fixtures/csv/valid/` is a minimal valid data set. Each folder under `invalid/`, `hostile/` and `editorial/` holds only the tables it changes plus an `expected.json`. The folders are generated: after changing a rule or a column, edit `tests/fixtures/make-fixtures.mjs` and run `node tests/fixtures/make-fixtures.mjs`.
- **The baseline.** `tests/baseline.test.ts` builds the real `data/csv/` and compares its counts with `tests/baseline.json`. When a data edit changes a count on purpose, update `baseline.json` in the same commit. That file is the reviewed record of the data's shape, so a surprise there is worth reading.
- **`server-only`** is stubbed (`vitest.config.mts`), so tests can import `lib/data.ts` directly.

### Page tests (`e2e/`, Playwright)

They run in Chromium against `out/`, served by `serve` with the production headers (`serve.json`).

- **Import `test` and `expect` from `./fixtures`**, not from `@playwright/test`. The fixture fails any test that causes a Content Security Policy violation.
- **Never type an expected name or count.** Compute it from `data/build/**` or `public/data/index.json` with the same `lib/` function the page uses. Then a data edit doesn't break tests.
- **Tile requests are answered locally** (`e2e/tiles.ts`), so no test contacts a map server.
- **Accessibility.** `e2e/a11y-matrix.spec.ts` runs axe on 18 page states and fails on any serious or critical finding. Each state uses a fixed real record with a guard. If a data change makes a guard fail, choose a new record for that state rather than removing it.
- Run one file with `npx playwright test e2e/explore.spec.ts`, or add `--headed` or `--debug`.

### Checks on the built site

`check:out`, `check:budgets` and `lighthouse` (above). They test what is actually served, after the build's own checks.

### Manual checks

Some things can't be automated: screen readers, real phones, real map tiles. Their procedures and logs are in `docs/a11y-checks.md`, `docs/release-checks.md`, `docs/tiles.md` and the PDF guides in `docs/testing/`.

**UI checklist.** Before calling UI work done, check every changed page at 390 px in both light and dark mode, and at desktop width, in both languages. Look for horizontal overflow (long URLs and licence text must wrap), poor contrast, and Bengali digits in the wrong font.

## 5. Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and on every pull request.

| Job | Steps | Notes |
|---|---|---|
| `check` | `npm ci` → `npm audit` (runtime dependencies, high or critical fails) → lint → typecheck → `build:local` → unit tests → `check:out` → `check:budgets` → page tests | On failure it uploads the Playwright report |
| `release` | `npm ci` → `npm run build` (with a placeholder tile key) → `check:out` → `check:budgets` → Lighthouse | Uploads `release-problems`, `release-build` and `lighthouse` as artifacts |

The `release` job is what catches a new editorial problem (an internal note, an unreviewed cell, a non-standard credit line) before it reaches production. Its build is never deployed.

If a test fails, fix the cause. Don't skip the test or loosen it to get a green run.

## 6. Branches, commits and shipping

- **`main` is production.** Vercel deploys every push to it.
- **Work on a numbered branch:** `NN-short-description`, where `NN` is one more than the highest number used so far (`git branch -a` shows them).
- **Merge with a merge commit**, so `main` reads as a list of branches (`git log --first-parent main`).
- **After merging, check that CI on `main` is green** and that the deployment went live. `docs/RUNBOOK.md` covers confirming a release and rolling back.
- **Versions** follow Semantic Versioning, as described at the top of `CHANGELOG.md`: major for a change to URLs or to the data download's columns, minor for new pages or data, patch for fixes. Data edits alone need no release.

### The phase workflow

Larger pieces of work have followed one flow, and it is worth keeping:

1. Start a branch.
2. Write a specification in `.claude/specs/NN-Title.md`: the problem, numbered requirements (FR), decisions (D), assumptions (A) and acceptance criteria (AC).
3. The owner approves the spec.
4. Implement it with unit and page tests. Code comments cite the spec's numbers.
5. Update `roadmap/DEVELOPMENT_ROADMAP.md`.
6. Merge, push, and confirm CI on `main`.

### Working with an AI coding assistant

The project was built with Claude Code, and its setup is in the repository:

- `CLAUDE.md` holds the standing instructions. `AGENTS.md` is the same text for other assistants.
- `.claude/skills/` (mirrored in `.agents/skills/`) holds four workflow commands: `/git-start` (prepare a numbered branch), `/new-spec` (write a specification), `/git-ship` (merge and push) and `/maps-lookup` (find map pins in small, resumable batches).
- A hook type-checks the project and lints the edited file after every edit to a `.ts` or `.tsx` file (`.codex/hooks/`; Claude Code's copy lives in `.claude/hooks/`, which isn't committed).
- The roadmap also has a progress dashboard, a Claude artifact linked from `CLAUDE.md`. It is kept in step with the roadmap file.

None of this is required to work on the code by hand.

## 7. Conventions

- **Start every file with a comment** that says what it does and why, and names its roadmap task and spec. This is how the codebase documents itself, so keep it up when you add or change a file.
- **Put rules in `lib/` as pure functions.** No React, no DOM, no `fs`. Components call them, and so do tests.
- **Files that read from disk import `server-only`** (`lib/data.ts`, `lib/*-data.ts`), so importing one from a client component is a build error.
- **Imports use the `@/` alias** for the repository root.
- **Scripts are `.mjs` with no dependencies**, apart from `sharp` (thumbnails, icons) and Lighthouse.
- **Never type a number or a count into copy.** Take it from `meta.json` or the area files.
- **Never invent a value.** If the data doesn't have it, show the contract's words for unknown (`docs/DATA_CONTRACT.md`).
- **Every interface string goes in `lib/i18n.ts`, in both languages.** Bangla must read as a native writer would write it (`docs/TRANSLATION_BN.md`).
- **Keep `docs/URLS.md` and `docs/DATA_CONTRACT.md` in step with the code**, in the same commit. Tests read both.

## 8. Things that will trip you up

- **There is no `sm` breakpoint.** Tailwind's screens are only `md` (768), `lg` (1024), `xl` (1280) and `2xl` (1440). A `sm:` class compiles to nothing, silently.
- **Tailwind's `content` covers only `app/` and `components/`.** A class name built in `lib/` won't be generated unless it also appears in those folders.
- **Colours are tokens, not `dark:` variants.** `bg-surface` and `text-ink` change with the theme by themselves. Reach for `dark:` only for something that isn't a colour.
- **`npm test` fails on a fresh clone until the data is built.** Run `npm run build:local` (or `JP_DATA_MODE=local npm run data`) first.
- **`npm run data` without `JP_DATA_MODE` is a release build**, and fails on editorial problems. That is intended.
- **`npm run e2e` tests whatever is in `out/`.** If you forget to rebuild, you test old pages.
- **`vercel.json` and `serve.json` must carry the same headers.** A unit test fails if they differ. Change both together.
- **A new external origin needs a CSP change.** An image, fetch or form to a new host is blocked until you add the host to both header files and to `docs/security.md`.
- **`useSearchParams` needs `<Suspense>`** in a static export, or the build fails.
- **Dynamic routes need `generateStaticParams()` and `dynamicParams = false`.**
- **Trailing slashes.** Every internal link ends with `/` (`trailingSlash: true`). `check:out` and the URL tests assume it.
- **Sandboxed environments.** `next build` downloads fonts from Google at build time, so it needs network access. If the default build fails in a restricted environment, `JP_DATA_MODE=local npm run data && JP_DATA_MODE=local npx next build --webpack` has worked as a fallback.

## 9. Recipes

### Add or change an interface string

1. Add an entry to `STRINGS` in `lib/i18n.ts` with `en` and `bn`. Use `{name}` placeholders for values.
2. Mark a Bangla draft `needsReview: true` until the owner signs it off.
3. Render it with `<T k="your.key" />`, passing `vars` for placeholders. Format numbers and dates with `lib/format.ts` first, never by hand.
4. In a client component that builds a string at run time, use `text(key, lang)` with `useUiLang()`.

### Add a filter to Explore

1. If the filter needs a new field, add it to the index row: `scripts/build-index.mjs`, `IndexSite` in `lib/types.ts`, `tests/index-contract.ts` and `docs/DATA_CONTRACT.md` §2. Watch the 150 KB budget.
2. Add it to `FilterState`, `EMPTY`, matching and facet counts in `lib/filters.ts`.
3. Add its URL key to `parse()` and `serialize()` in `lib/urlState.ts`, and to the table in `docs/URLS.md`.
4. Add its labels in `lib/explore-labels.ts` and `lib/i18n.ts`.
5. Add its control in `components/explore/FilterGroups.tsx`.
6. Test it in `tests/explore.test.tsx` and `e2e/explore.spec.ts`.

### Add a page

1. Create `app/<route>/page.tsx`. Start with the header comment. Read data with `lib/data.ts`.
2. Export metadata through `pageMeta` in `lib/seo.ts`.
3. For a dynamic segment, add `generateStaticParams()` and `export const dynamicParams = false`.
4. Wrap content in `<main id="main">`, so the skip link works.
5. Add the route to `docs/URLS.md`. Add links in `lib/nav.ts` if it belongs in the header or footer.
6. Add it to `e2e/a11y-matrix.spec.ts` and write its page tests.

### Publish a new field from the CSVs

1. Add the column to the table's required list in `scripts/lib/structure.mjs` if it must exist, and its allowed values to `ENUMS` in `scripts/lib/validate.mjs` if it is an enum.
2. Emit it by name in `scripts/build-data.mjs`. Omit it when blank rather than writing an empty value.
3. Add it to the type in `lib/types.ts` and to `docs/DATA_CONTRACT.md`.
4. Decide whether the data download carries it: `scripts/build-export.mjs` fails until every field is either exported or skipped with a reason.
5. If it is prose that should be translated, add the column to the table's list (`ALLOW`) in `scripts/lib/translations.mjs` and to `docs/DATA_CONTRACT.md` §5.
6. Regenerate the fixtures and update `tests/baseline.json` if a count changed.

### Add a photo

See `CONTRIBUTING.md`. In short: add the row to `images.csv` with its licence and credit line, set `publication_readiness = Ready` only when both are checked, put the original under `../images/`, run `npm run thumbs`, and commit the new `.webp` and `public/thumbs/manifest.json`.

### Change the home page's photos

Edit `lib/home-images.json` (the hero, four category tiles, one tile per division), run `npm run thumbs` to make the larger variants, and commit `public/home/`. `scripts/lib/home-check.mjs` fails the data build if a listed photo isn't Ready or doesn't match its tile.

### Load something from a new external host

1. Add the host to the right directive of the CSP in `vercel.json` **and** `serve.json`.
2. Record it in the asset table in `docs/security.md`.
3. Run the page tests: the CSP fixture fails on anything still blocked.

### Change the map tile provider

Edit `lib/map-config.ts` (URL, attribution), the CSP `img-src` in both header files, `e2e/tiles.ts` (so tests still intercept the tiles), `lib/licences.ts` if the credit changes, and `docs/tiles.md`.

### Update dependencies

Versions are exact. Update one group at a time, then run the full local sequence from the README and a release build. Next.js, React and `eslint-config-next` move together. Tailwind stays on 3.4: the config and tokens are written for v3. Playwright and `@axe-core/playwright` updates can change accessibility findings, so read any new failure before treating it as noise.
