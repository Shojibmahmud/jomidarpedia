# Runbook

Operating the live site: https://jomidarpedia.vercel.app (Vercel, deployed from `main`). Roadmap tasks 14.5 and 14.8; spec `.claude/specs/16-Release.md`.

## Roll back a bad release

Production is a static export, so rolling back just means serving an earlier build. Pick one of these:

1. **Promote the previous deployment (fastest, no rebuild).** Open Vercel → the project → **Deployments**, find the last good production deployment, open its menu and choose **Promote**. It goes live in seconds. `main` still holds the bad commit, so follow up with option 2 or a fix, or the next push will deploy it again.
2. **Revert the commit.** On `main`, run `git revert <commit>` (for a merge commit, `git revert -m 1 <merge-commit>`) and push. Vercel builds and deploys the reverted state. This keeps the history honest and is the right lasting fix.

**Data mistakes** (a wrong fact, a wrong pin, a bad credit line) need neither of these. Fix the cell in `data/csv/`, open a pull request, and merge it. The rebuild replaces the page. A pin that must not be shown gets `map_display = hide`, and its coordinates disappear from every page and from the data download.

If a release build fails on Vercel, the previous deployment stays live. Read the build log and `data/reports/release-problems.md`, which CI also uploads as the `release-problems` artifact.

## Confirm a release or a rollback

```sh
curl -sI https://jomidarpedia.vercel.app/ | head -1          # HTTP/2 200
curl -sI https://jomidarpedia.vercel.app/ | grep -i -E 'content-security|x-content|referrer|permissions'
npm run check:prod                                             # every sitemap page: status, leaks, canonical origin
npm run e2e:prod                                               # smoke tests against production
```

Before running `npm run e2e:prod`, build the same commit locally (`npm run build`), because the tests read their expected names from `data/build/`. `npm run check:prod` prints the date the deployed data was compiled. Compare it with `data/build/meta.json` to confirm that production serves the commit you expect.

## Map tiles

The maps load CARTO tiles with the key in `NEXT_PUBLIC_TILE_KEY` (Vercel, Production and Preview). If tiles stop loading (403 in the browser's Network tab), check the key's Referer list in the CARTO dashboard (`docs/tiles.md`). Readers can switch to Lite mode, which loads no map at all. A release build without the key fails on purpose, and the previous deployment stays live.

## Domain

The site uses `SITE_URL=https://jomidarpedia.vercel.app` (Vercel Production) for canonical links, the sitemap and share images. To move to a custom domain, change `SITE_URL`, add the domain to the CARTO key's Referer list, redeploy, and run `npm run check:prod` with `PROD_URL` set to the new origin.
