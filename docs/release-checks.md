# Release checks

The log of the Phase 14 checks (roadmap tasks 14.1, 14.2, 14.4, 14.5; spec `.claude/specs/16-Release.md` FR-1, FR-2, FR-7, FR-10). Add a dated entry for each run, and never edit an old one.

## Fresh-clone comparison (14.4, FR-7)

How to run it:

1. Wait for the CI run on the commit to finish, then download its `release-build` artifact (`gh run download <run-id> -n release-build -D <ref-dir>`).
2. Clone the same commit into an empty folder, with no `../images` beside it.
3. Build it with the CI release job's environment and Node 24 (`.nvmrc`):
   ```sh
   npm ci
   SITE_URL=http://localhost:4174 NEXT_PUBLIC_TILE_KEY=ci-placeholder-not-deployed npm run build
   ```
4. In the clone, run `npm run compare:out -- <ref-dir>`. It must exit 0.

| Date | Commit | CI run | Node | Result |
|---|---|---|---|---|
| 11 Nov 2026 | `8f3637d` | [42840123736](https://github.com/Shojibmahmud/jomidarpedia/actions/runs/42840123736) | 24.18.0 | **pass**: 16,491 files identical after normalisation; `data/build/**` and `index.json` byte-identical. Clone on macOS with no `../images`. The first build differed on one page (`/site/JB-RAJ-005/kahaloo-zamindar-bari/`) in the *order* of two `<head>` tags only, same tags; a rebuild of the same clone matched exactly. Next's head order is not stable between builds, so `compare:out` now compares `<head>` meta and link tags as a sorted list (branch 37). |

## Production checks (14.5, FR-10)

Run these after the release commit has deployed, from a checkout of that commit built with `npm run build`:

- `npm run check:prod`: every sitemap URL answers 200, there are no leaks, canonical, Open Graph and sitemap URLs are on `https://jomidarpedia.vercel.app` (FR-2), and the data download is readable.
- `npm run e2e:prod`: the smoke tests against production.
- `curl -sI https://jomidarpedia.vercel.app/`: the security headers (`docs/security.md`).
- `docs/tiles.md`: the 13.6 tile check repeated on production (14.1, FR-1).

| Date | Commit | check:prod | e2e:prod | Headers | Tiles |
|---|---|---|---|---|---|
