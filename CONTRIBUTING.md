# Working on Jomidarpedia

A short guide for the editor and anyone helping them. The rules for writing code here are in `CLAUDE.md`. What each field means is in `docs/DATA_CONTRACT.md`, and how Bangla is written is in `docs/TRANSLATION_BN.md`. This page doesn't repeat them.

## Set up

You need Node 24 (`.nvmrc`) and npm.

```sh
npm ci
npm run dev        # http://localhost:3000, built from your local CSVs (local mode)
```

`npm run dev` rebuilds the data first, then starts Next. Restart it after you edit a CSV.

## Edit the data

All content comes from the CSV tables in `data/csv/`. They are the only source: never edit `data/build/` or `public/data/`, because both are rebuilt every time.

- **Change a fact:** edit its cell, and put the source in `site_sources.csv` or `claim_source_links.csv`. Every fact needs a source.
- **Unknown values stay empty.** The site turns an empty cell into words such as "Not documented". Never write `0`, "free" or a guess.
- **Locations:** a pin that isn't confirmed gets `map_display = hide`. Its coordinates then never reach any page or file.
- **Photos:** only openly licensed ones (Creative Commons or public domain, for example from Wikimedia Commons). Record the licence and the credit line in `images.csv`, and set `publication_readiness = Ready` only once both are checked.
- **Bangla:** translated prose lives in `data/translations/bn/<table>.csv`. When the English cell changes, its Bangla stops showing until it's updated. Write it as a native writer would (`docs/TRANSLATION_BN.md`).

Commit CSV changes on a branch, then open a pull request, so CI checks them before they reach the live site.

## Read the problem report

Every data build writes `data/reports/release-problems.md`, which lists problems by the CSV cell to fix:

- **Structural errors** (a broken ID, a bad date, a missing column) fail every build.
- **Safety rules** (a hidden pin's coordinates, an image that isn't Ready) fail every build.
- **Editorial problems** (an internal note in public text, a credit line not in the standard form) are only reported in local mode, but they fail a release build. Production is a release build, so fix them before merging.

To run the release checks locally:

```sh
npm run build:local     # what `npm run dev` uses
npm run build           # a release build: what production runs (needs NEXT_PUBLIC_TILE_KEY, any value works locally)
npm run check:out       # link and leak checks over out/
npm run check:budgets   # size budgets
```

## Rebuild thumbnails

The thumbnails in `public/thumbs/` and `public/home/` are committed. You only rebuild them after adding or changing a photo in `images.csv`. The originals stay outside the repository:

```sh
JP_IMAGES_DIR=../images npm run thumbs
```

Commit the new `.webp` files and `public/thumbs/manifest.json`. A clone without the originals still builds, because the build only checks that the committed thumbnails exist.

## How corrections arrive

Readers use **Suggest a correction** (on every site page, in the footer, and at `/correction/`) or **Offer a photo** on About. The form sends an email to the project address through Web3Forms, and nothing a reader sends is published automatically. To act on one:

1. Check the claim against a source you can cite.
2. Edit the CSV and add the source.
3. Reply to the sender from the project address if they asked for a reply.

## Tests

```sh
npm run lint
npm run typecheck
npm test               # unit tests (needs a data build first)
npm run e2e            # page tests against out/ (needs `npm run build:local` first)
```

CI (`.github/workflows/ci.yml`) runs all of these, plus a release build, on every push and pull request. If a test fails, fix the cause rather than the test.

## Release and rollback

Production deploys from `main` on Vercel. The checks to run after a release, and how to roll back, are in `docs/RUNBOOK.md`.
