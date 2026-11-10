# Runbook

Operating the live site: https://jomidarpedia.vercel.app (Vercel, deployed from `main`). Roadmap tasks 14.5 and 14.8; spec `.claude/specs/16-Release.md`.

## Accounts and keys

The site depends on five outside accounts. Whoever takes over needs access to all of them; the code alone is not enough to deploy, fix the maps or receive corrections. No secret is stored in the repository: both keys the site uses are public by design.

| Service | What it does | What breaks without access | Where its key or setting lives |
|---|---|---|---|
| **GitHub** (`Shojibmahmud/jomidarpedia`, public) | Holds the code and runs CI (`.github/workflows/ci.yml`) | Nobody can merge to `main`, so nothing deploys | No secrets: CI uses a placeholder tile key |
| **Vercel** (Hobby plan) | Builds and serves the site from `main`; a preview for every branch | No deploys, no rollback, no environment variables | Project settings → Environment Variables: `SITE_URL` (Production), `NEXT_PUBLIC_TILE_KEY` (Production and Preview) |
| **CARTO** (account "jomidarpedia", free non-commercial plan) | The map tiles | Maps stop loading once the key is revoked or the domain changes | The key is `NEXT_PUBLIC_TILE_KEY` in Vercel. Its Referer list is in https://dashboard.basemaps.carto.com/ (`docs/tiles.md`) |
| **Web3Forms** (free plan) | Turns the correction form into an email | Corrections stop arriving, or go to an old inbox | The access key is `WEB3FORMS_KEY` in `lib/nav.ts`. It only names the receiving inbox |
| **Email inbox** (`CONTACT_EMAIL` in `lib/nav.ts`) | Receives corrections and photo offers; the Web3Forms account is tied to it | Readers' corrections go unread | Shown on the site, so a change to it is a code change |

**Who holds access.** Fill this in and keep it current. Record where each password is kept, never the password itself:

| Service | Owner's login | Second person with access | Recovery |
|---|---|---|---|
| GitHub | | | |
| Vercel | | | |
| CARTO | | | |
| Web3Forms | | | |
| Email inbox | | | |

### Hand the project to someone new

1. **GitHub:** add them as a collaborator, or transfer the repository (Settings → General → Transfer). Vercel's link to the repository has to be reconnected after a transfer.
2. **Vercel:** Hobby projects can't be shared, so transfer the project to their account (Project → Settings → General → Transfer), or have them import the repository into their own account and copy both environment variables across.
3. **CARTO:** give them the account's login, or have them request their own key (`docs/tiles.md`) and swap it in as below.
4. **Web3Forms and the inbox:** hand over the inbox. The Web3Forms key belongs to it, so it keeps working.

### Change a key

- **Tile key.** Create a new key in CARTO and restrict it by Referer to the production domain and any preview domains. Set it as `NEXT_PUBLIC_TILE_KEY` in Vercel (Production and Preview) and redeploy. Check a map page loads tiles, then delete the old key.
- **Form key or inbox.** Create a Web3Forms access key for the new inbox, put it in `WEB3FORMS_KEY` (and the address in `CONTACT_EMAIL`) in `lib/nav.ts`, and ship. Send a test correction from the live site in a browser: the free plan rejects requests from scripts such as `curl`, so a test from the command line fails even when the form works.

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
