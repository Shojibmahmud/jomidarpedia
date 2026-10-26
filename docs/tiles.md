# Map tiles

Roadmap task 13.6 and decision O4; spec `.claude/specs/13-Quality-accessibility-and-security.md` FR-19 to FR-21, D3, D14.

The maps (Explore, the site mini map, the itinerary route map) draw raster tiles from one provider, set in `lib/map-config.ts`. Lite mode never loads the map or any tile, so it stays the fallback whatever the provider does.

## Current state (26 Oct 2026)

Only **OpenStreetMap standard** (`tile.openstreetmap.org`) is offered, in both themes. The CARTO entries in `lib/map-config.ts` are switched off (`needsKey`), because CARTO's basemaps answer "API KEY REQUIRED" without a key (spec 07 D5, amended).

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

- [ ] Provider chosen: ________ on ________ (date). Terms read on that date: link ________
- [ ] Account or key created. If there is a key, it is restricted to `jomidarpedia.vercel.app` and the preview domain, and set as `NEXT_PUBLIC_TILE_KEY` in Vercel (Production and Preview).

Once the decision is made, Claude:
- adds the provider to `lib/map-config.ts` with its attribution (FR-20);
- adds its hosts to the CSP `img-src` in `vercel.json`, then regenerates `serve.json`;
- adds them to `TILE` in `e2e/tiles.ts`;
- makes a release build fail when the key is missing (D14).

## Preview check (FR-21)

On the preview, with the chosen provider, open DevTools → Network, filter by the tile host, and open the map on Explore:

- [ ] Tile requests carry a `Referer` header. Under `Referrer-Policy: strict-origin-when-cross-origin` this is the origin, e.g. `https://…vercel.app/`.
- [ ] The attribution in the map's corner matches the provider's required wording and is not covered by controls.
- [ ] Checked on ________ by ________ in ________ (browser).
