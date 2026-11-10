# Jomidarpedia · জমিদারপিডিয়া

A free, bilingual (English and Bangla) encyclopedia and travel guide to the zamindar houses, palaces, rajbaris and kacharis of Bangladesh.

**Live site:** https://jomidarpedia.vercel.app · **Version:** 1.0.0 (10 November 2026) · **Changes:** [`CHANGELOG.md`](CHANGELOG.md)

For each of its 413 sites, the site shows what is known, how sure we are, where the sources disagree, and how to get there from Dhaka. Unknowns are shown as words ("Not documented", "No ticket reported"). They are never shown as blanks, zeros or "Free".

## What it is, technically

- **A fully static site.** Next.js (App Router) with `output: 'export'`. There is no server, API, database, login, cookie or analytics. Vercel serves the files in `out/`.
- **CSV files are the only source of truth.** The 17 tables in `data/csv/` are compiled into JSON at build time. Nothing is edited anywhere else.
- **The build is the safety gate.** It refuses to publish a hidden site's coordinates, a photo that isn't cleared, a fee of 0 shown as a price, or an internal research note.
- **Both languages are in every page.** English and Bangla are rendered together, and CSS shows one. There are no `/bn/` routes.

| Area | Choice |
|---|---|
| Framework | Next.js 16 (App Router, static export), React 19, TypeScript |
| Styling | Tailwind CSS 3.4, with colours as CSS variables (`app/tokens.css`) |
| Map | Leaflet and leaflet.markercluster over CARTO raster tiles, loaded only when a map is shown |
| Search | Fuse.js, loaded only when a search box is used |
| Tests | Vitest (unit), Playwright with axe (pages), Lighthouse |
| Hosting | Vercel Hobby, deployed from `main` |
| Corrections | A form that posts to Web3Forms, which emails the editor |

## Quick start

You need Node 24 or newer (`.nvmrc`) and npm.

```sh
npm ci
npm run dev          # builds the data in local mode, then serves http://localhost:3000
```

Restart `npm run dev` after editing a CSV, because the data is built once at start.

To run everything CI runs:

```sh
npm run lint
npm run typecheck
npm run build:local  # data (local mode) + static site in out/ + robots.txt
npm test             # unit tests; they need the data build above
npm run check:out    # link and leak checks over out/
npm run check:budgets
npx playwright install chromium   # first time only
npm run e2e          # page tests against out/
```

Every command is explained in [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

## How it works

```
data/csv/*.csv                17 tables: the only source of truth
data/translations/bn/*.csv    Bangla prose, tied to its English by a fingerprint
content/about.{en,bn}.md      the About page's text
        │
        │  npm run data        validate → build → check → report
        ▼
public/data/index.json        one row per site: the ONLY data file the browser fetches
data/build/**/*.json          everything else, read with fs while pages are pre-rendered
public/maps/*.svg             static preview maps
data/reports/release-problems.md   what to fix, by CSV cell
        │
        │  next build          output: 'export'
        ▼
out/                          about 2,440 static pages → Vercel
```

The data build has three modes. `local` and `preview` report editorial problems and carry on. `release` (the default, and always what production uses) fails on them. Structural errors and the safety rules fail in every mode.

The full picture is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Repository map

| Path | What it holds |
|---|---|
| `app/` | Routes (one `page.tsx` each), the root layout, fonts and `tokens.css` |
| `components/` | React components, grouped by page or feature |
| `lib/` | Pure rules and typed data readers: filters, URL state, search, formatting, interface strings |
| `scripts/` | The data build, the checks and the maintenance commands (plain Node, no dependencies) |
| `data/csv/` | The source tables |
| `data/translations/bn/` | Bangla translations of the prose |
| `data/geo/`, `data/reference/` | Boundary outlines for the static maps; reference tables from the core book |
| `content/` | The About page's Markdown, in both languages |
| `public/thumbs/`, `public/home/` | Committed WebP photos (made by `npm run thumbs`) |
| `tests/`, `e2e/` | Vitest unit tests; Playwright page tests |
| `docs/` | The documentation listed below |
| `roadmap/` | The build plan, with every decision and task |
| `.claude/specs/` | One feature specification per phase |
| `.claude/skills/`, `.agents/skills/` | Workflow commands for AI coding assistants |

Generated and not committed: `data/build/`, `public/data/`, `public/maps/`, `out/`, `.next/`.

## Documentation

Start with the first three.

| Read this | When you want to |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Understand how the whole system fits together, and the rules it never breaks |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) | Set up, run commands, test, deploy, and follow step-by-step recipes for common changes |
| [`docs/CODE_MAP.md`](docs/CODE_MAP.md) | Find the file that does something |
| [`docs/DATA_GUIDE.md`](docs/DATA_GUIDE.md) | Understand the CSV tables, IDs and the data build's stages |
| [`docs/DATA_CONTRACT.md`](docs/DATA_CONTRACT.md) | Look up a field in the generated JSON: where it comes from and what shows when it is missing |
| [`docs/URLS.md`](docs/URLS.md) | Look up a route, a query key or a page anchor |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Style something: colours, type, breakpoints, Bangla text, accessibility conventions |
| [`docs/TRANSLATION_BN.md`](docs/TRANSLATION_BN.md) | Write or review Bangla text |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Edit the data as the editor: facts, photos, corrections |
| [`docs/RUNBOOK.md`](docs/RUNBOOK.md) | Operate the live site: the accounts and keys it needs, handing it over, roll back, confirm a release, fix map tiles, change the domain |
| [`docs/security.md`](docs/security.md) | See the security headers, the Content Security Policy and why each origin is allowed |
| [`docs/tiles.md`](docs/tiles.md) | See the map tile provider, its terms and its key |
| [`docs/a11y-checks.md`](docs/a11y-checks.md), [`docs/release-checks.md`](docs/release-checks.md) | Read or add to the logs of manual accessibility and release checks |
| [`roadmap/DEVELOPMENT_ROADMAP.md`](roadmap/DEVELOPMENT_ROADMAP.md) | See why something was decided (requirements R1–R10, recommendations I1–I7, owner decisions O1–O15) and what comes after the MVP |
| [`CLAUDE.md`](CLAUDE.md), [`AGENTS.md`](AGENTS.md) | Work on the project with an AI coding assistant |

The index with a suggested reading order is [`docs/README.md`](docs/README.md).

## The rules the build enforces

A new developer should know these before changing anything. They come from the roadmap (§2.1) and are checked by the data build, by `npm run check:out` and by tests.

1. **Real data only.** No invented fact, coordinate, time, fare or name. An unknown is shown as words.
2. **Hidden pins stay hidden.** A site with `map_display = hide`, or without both coordinates, has no coordinates on any public path: JSON, HTML, links, the sitemap or the data download.
3. **Fees.** An entry fee of 0 or blank is never a price and never "free entry".
4. **Photos.** Only an image whose `publication_readiness` is `Ready` is published, with its exact credit line.
5. **Uncertainty is visible.** Legends stay out of the history timeline. A disagreement shows every version, each with only its own sources.
6. **Counts come from data.** No number is typed into copy or a test.

## Licences

- **Text and data:** [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The published tables can be downloaded from the About page and the footer.
- **Photos:** each keeps its own licence, listed with its credit on `/credits/`.
- **Maps:** © OpenStreetMap contributors, © CARTO. Boundaries: geoBoundaries; districts BBS/OCHA, CC BY 3.0 IGO (`data/geo/SOURCE.md`).
- **Code:** [MIT](LICENSE).

## Contact

Corrections and photo offers go through **Suggest a correction** on the site, or to jomidarpedia@gmail.com.

Earlier versions of this file are in `archive/`. They are design-time handoff notes and no longer describe the code.
