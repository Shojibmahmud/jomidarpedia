# Map tiles

Roadmap task 13.6 and decision O4; spec `.claude/specs/13-Quality-accessibility-and-security.md` FR-19 to FR-21, D3, D14.

The maps (Explore, the site mini map, the itinerary route map) draw raster tiles from one provider, set in `lib/map-config.ts`. Lite mode never loads the map or any tile, so it stays the fallback whatever the provider does.

## Current state (9 Nov 2026)

The owner chose **CARTO** on 9 Nov 2026 (see Decision). `lib/map-config.ts` builds the CARTO entries from `NEXT_PUBLIC_TILE_KEY`:
- **With the key** (production, and previews once the key is set for them): CARTO Positron in light mode and Dark Matter in dark mode, and nothing else. A launched site sends no traffic to OSM's tile servers.
- **Without it** (local builds, and previews without the key): OSM standard, as before.
- **A release build without the key fails** (`scripts/check-tile-key.mjs`, run by `npm run build`), so production never falls back to OSM by accident. CI's release job, which is never deployed, uses a placeholder key.

Tile URL, checked on 9 Nov 2026 (both styles answer with a PNG, with `@2x` for retina screens): `https://basemaps.cartocdn.com/rastertiles/{light_all|dark_all}/{z}/{x}/{y}{r}.png?key=<key>`.

Up to 26 Oct 2026, only OSM standard was offered and the CARTO entries were switched off, because CARTO's basemaps answered "API KEY REQUIRED" without a key (spec 07 D5, amended).

## Candidates

Terms as read on 26 Oct 2026. Check them again on the day you sign up.

| | OpenStreetMap standard | CARTO basemaps | Stadia Maps | MapTiler Cloud |
|---|---|---|---|---|
| **Cost for this site** | Free, no account | Free key | Free plan | Free plan |
| **Free allowance** | No fixed number; "heavy use" may be blocked without notice | Non-commercial: 5M requests a month. Commercial: 1M a month | 200K credits a month (raised from 2,500 views on 13 Apr 2026) | 100K API requests and 5K sessions a month; service pauses when used up |
| **Non-commercial only?** | No, but commercial services and sites seeking donations "may lose access at any point" | No: a non-commercial tier and a commercial tier | Yes: no commercial use on the free plan | Yes: free plan for non-commercial use and R&D |
| **How requests are authorised** | `Referer` header must be sent | Key in the tile URL (`?key=…`); the dashboard can add restrictions to a key (kinds not documented) | Domain-based: the browser's `Origin` and `Referer` are checked; no key in the page | Key in the URL |
| **What happens over the limit** | Blocking without notice | CARTO gets in touch rather than cutting off | Errors (extra usage is off by default) | Service paused until next month |
| **Light and dark styles** | One style (used in both themes) | Positron (`light_all`), Dark Matter (`dark_all`), Voyager: matches spec 07's theme design | Alidade Smooth and Alidade Smooth Dark | Several |
| **Attribution** | © OpenStreetMap contributors | © OpenStreetMap contributors, © CARTO | © Stadia Maps, © OpenMapTiles, © OpenStreetMap contributors | © MapTiler, © OpenStreetMap contributors, plus a MapTiler logo on the map |
| **Already in the code** | Yes | Yes, switched off | No | No |

Sources: [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/), [CARTO basemap API key](https://www.carto.com/basemaps/apikey/) (terms dated 29 Sep 2026; keys registered before 23 Sep 2026 keep working until 30 Nov 2026), [Stadia Maps authentication](https://docs.stadiamaps.com/authentication/), [Stadia Maps on free map API costs](https://stadiamaps.com/learn/what-does-a-free-map-api-cost/), [MapTiler Cloud terms](https://www.maptiler.com/cloud/terms/), [MapTiler pricing](https://www.maptiler.com/cloud/pricing/).

## Recommendation

**CARTO, with a non-commercial key.**
- Its free allowance (5M requests a month) is the largest by far for a site of this size.
- Going over it leads to a conversation, not an outage.
- Its light and dark styles are the ones spec 07 was designed around, and they are already wired into `lib/map-config.ts`.

The cost is a key in the page's JavaScript (D14). That is how browser tile keys work, and the key should be limited to the project's domains in CARTO's dashboard, if CARTO offers that restriction.

**Second choice: Stadia Maps.** Its domain-based authorisation keeps any key out of the page. But the free plan is strictly non-commercial, and its allowance is in credits, which are harder to predict.

**Not for launch: OSM standard.** It has no allowance and may block without notice. It stays fine for development.

## Decision (owner)

- [x] Provider chosen: **CARTO**, with a non-commercial key, on 9 Nov 2026. Terms read that day: [CARTO Basemaps terms](https://carto.com/legal/basemap-terms/), version 29 Sep 2026. What they mean for this site:
  - Non-commercial use (personal projects, research, teaching, non-profits) is free up to 5,000,000 tile requests per calendar month (UTC), counted across all of the account's keys (§12.c).
  - The attribution must credit both OpenStreetMap and CARTO, and be "prominent and conspicuous" on each map (§13). The map shows "© OpenStreetMap contributors © CARTO", with links.
  - The key is for this project only and must not be shared (§8). Requests may not forge the `Referer` (§9.c.vii). Tiles may not be proxied or cached on a server, or kept on a reader's device for more than 30 days (§9.c). The site does none of these: the browser loads tiles straight from CARTO.
  - CARTO may rate-limit, suspend or end a key without notice (§3.c). Lite mode stays the fallback, and the map shows its tile-error overlay.
  - The 30 Nov 2026 change concerns commercial keys made before 23 Sep 2026. It does not affect a new non-commercial key.
- [ ] Key requested at https://carto.com/basemaps/apikey/ (e-mail only, no account), and restricted in https://dashboard.basemaps.carto.com/ to `jomidarpedia.vercel.app` and the preview domain.
- [ ] Set as `NEXT_PUBLIC_TILE_KEY` in Vercel, for **Production and Preview**, **before** this branch is merged. Without it, the production build fails and the previous deployment stays live.

Done in code on 9 Nov 2026 (`29-phase-13-wrap-up`):
- CARTO light and dark in `lib/map-config.ts`, with both credits (FR-20);
- `https://basemaps.cartocdn.com` in the CSP `img-src` (`vercel.json`, `serve.json`);
- `TILE` in `e2e/tiles.ts` already matches CARTO's host, so tests never contact it;
- a release build fails without the key (D14), with unit tests in `tests/release-checks.test.ts` and `tests/map.test.tsx`.

## Preview check (FR-21)

On the preview, with the chosen provider, open DevTools → Network, filter by the tile host, and open the map on Explore:

- [ ] Tile requests carry a `Referer` header. Under `Referrer-Policy: strict-origin-when-cross-origin` this is the origin, e.g. `https://…vercel.app/`.
- [ ] The attribution in the map's corner matches the provider's required wording and is not covered by controls.
- [ ] Checked on ________ by ________ in ________ (browser).
