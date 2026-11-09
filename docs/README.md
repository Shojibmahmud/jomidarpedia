# Documentation index

Everything written about Jomidarpedia, and the order to read it in. The project overview and quick start are in the root `README.md`.

## If you are new

Read these four, in order. Together they take about an hour.

1. **`../README.md`**: what the project is, how to run it, the rules the build enforces.
2. **`ARCHITECTURE.md`**: how the system fits together and why. The data build, build modes, how pages get data, how two languages work without separate routes.
3. **`DEVELOPMENT.md`**: commands, environment variables, the three layers of tests, CI, shipping, common pitfalls, and step-by-step recipes.
4. **`CODE_MAP.md`**: every folder and file, with one line on what it does.

Then run `npm run dev`, open `/dev/i18n/` and a site page such as `/site/JB-DHK-064/baliati-palace/`, and read `app/site/[id]/[slug]/page.tsx` alongside it.

## By task

| I want to… | Read |
|---|---|
| Change a fact, add a photo, act on a reader's correction | `../CONTRIBUTING.md` |
| Understand a CSV table, an ID or a build stage | `DATA_GUIDE.md` |
| Know what a JSON field means or what shows when it is blank | `DATA_CONTRACT.md` |
| Add or change a route, query key or anchor | `URLS.md` |
| Style a component or write Bangla interface text | `DESIGN_SYSTEM.md` |
| Draft or review Bangla prose | `TRANSLATION_BN.md` |
| Add a filter, a page, a string or a published field | `DEVELOPMENT.md` §9 |
| Deploy, confirm a release or roll back | `RUNBOOK.md` |
| Load something from a new external host | `security.md`, `DEVELOPMENT.md` §9 |
| Fix map tiles or change the tile provider | `tiles.md` |
| Run or record a screen-reader or phone check | `a11y-checks.md`, `testing/*.pdf` |
| Verify a release is reproducible | `release-checks.md` |
| Find out why something was decided | `../roadmap/DEVELOPMENT_ROADMAP.md` §2 |
| Find the exact requirement behind a piece of code | `../.claude/specs/` (the code comment names the spec and its FR number) |
| See what is planned next | `../roadmap/DEVELOPMENT_ROADMAP.md` §4 |

## Every document

### Guides (kept current)

| File | What it covers |
|---|---|
| `ARCHITECTURE.md` | System design, invariants, rendering model, languages, preferences, search and map, hosting |
| `DEVELOPMENT.md` | Setup, environment variables, commands, tests, CI, shipping, conventions, pitfalls, recipes |
| `CODE_MAP.md` | File-by-file map of `app/`, `components/`, `lib/`, `scripts/`, `data/`, `tests/` |
| `DATA_GUIDE.md` | The 17 source tables, IDs, relationships, the build's stages, photos, translations, the data download |
| `DESIGN_SYSTEM.md` | Colour tokens, type, layout, Bangla text, accessibility conventions, print |
| `../CONTRIBUTING.md` | The editor's guide to changing data |
| `RUNBOOK.md` | Operating production |

### Contracts (tests read these; change them with the code, in the same commit)

| File | What it covers | Checked by |
|---|---|---|
| `DATA_CONTRACT.md` | Every field of the generated JSON and its empty state | Kept in step with `lib/types.ts` |
| `URLS.md` | Every route, query key and anchor | `tests/urls.test.ts` |
| `TRANSLATION_BN.md` | How Bangla text is drafted, checked and written | The build's translation checks |
| `security.md` | Security headers and the Content Security Policy | `tests/release-checks.test.ts`, every page test |

### Records (dated; add entries, don't rewrite old ones)

| File | What it records |
|---|---|
| `tiles.md` | The tile provider comparison, the owner's decision, and the preview check |
| `a11y-checks.md` | Manual accessibility checks by device, and open items |
| `release-checks.md` | The fresh-clone comparison and production checks for each release |
| `testing/jomidarpedia-android-test-guide.pdf`, `testing/jomidarpedia-iphone-test-guide.pdf` | Phone test guides for the owner |
| `../CHANGELOG.md` | What each release contains |
| `../data/reports/classification-*.md`, `spot-check-*.md` | Content decisions made in Phase 12 |
| `../data/geo/SOURCE.md` | Where the boundary outlines came from and how they were processed |

### Planning

| File | What it is |
|---|---|
| `../roadmap/DEVELOPMENT_ROADMAP.md` | The plan: purpose, requirements, decisions, build modes, the dataset baseline, every phase and task |
| `../roadmap/DESIGN_COVERAGE.md` | Each design board mapped to routes, data and tasks |
| `../roadmap/ROADMAP_REVIEW_AND_REVISION_REQUEST.md`, `ROADMAP_REVIEW_RESOLUTION.md` | The review of roadmap v1, and how each finding was handled |
| `../.claude/specs/01` to `16` | One specification per phase |
| `../CLAUDE.md`, `../AGENTS.md` | Standing instructions for AI coding assistants |

The roadmap and the specs are a record of how the site was built. Their early sections describe the repository as it was at the time, so where they differ from the guides above, the guides and the code are right.

## Keeping the documentation true

- A change to a route, a query key, a JSON field or a header goes into its contract file in the same commit.
- A new file gets a header comment, and a line in `CODE_MAP.md` if it is a new module.
- A new command or environment variable goes into `DEVELOPMENT.md`.
- Counts are not written into guides unless dated. The live numbers are in `data/build/meta.json` and `tests/baseline.json`.
- A new decision is recorded where its kind already lives: an owner decision in the roadmap §2.3, a feature decision in its spec.
