# URL contract

Roadmap task 3.7. This file is the single list of the site's routes, query keys and page anchors. Pages, links, the sitemap and tests follow it, and `tests/urls.test.ts` checks it against the roadmap and the shell's links. Change it when a route or key changes, in the same commit.

## Rules for every URL

- **Static and trailing slash.** Every route is a static page with a trailing slash (`next.config.mjs`: `output: 'export'`, `trailingSlash: true`). Dynamic segments are pre-rendered with `generateStaticParams()` and `dynamicParams = false` (R1).
- **Permanent IDs.** Site, trip and source IDs never change. A slug may change; the ID route (`/site/<id>/`) always leads to the current slug.
- **No coordinates in URLs.** A URL never carries a hidden site's coordinates (R5). Selection is by ID (`sel`, `ids`), never by latitude and longitude.
- **Unknown keys and values are dropped.** A key not listed here, or a value not allowed for its key, is removed from the URL (with `history.replaceState`). The page then shows a notice the visitor can dismiss: "Some filters in this link were not recognised and have been removed." (`url.droppedFilters` in `lib/i18n.ts`). Dismissing it is not remembered. A district that is not in the selected division is dropped the same way (6.3).
- **Multi-value keys** are a comma list of the full tokens listed below, for example `cond=in_ruins,lost`. Commas are not encoded. Duplicates are removed.
- **One URL per view.** The app rewrites the query into canonical form: keys in the order of the tables below, values in the order listed for their key, defaults left out. So a shared link and a rebuilt link are byte-identical.
- **Free text** (`q`) is URL-encoded, trimmed, and capped at 100 characters.
- **Language and theme are never in the URL.** They live in `localStorage` (`jp-lang`, `jp-theme`; `lib/prefs.ts`). Separate `/bn/...` routes may come after the MVP.

## Routes

Status: **built** means the page exists in `app/` now; **planned** names the task that builds it. Links to planned routes are allowed in the shell until then: they show the static 404.

| Route | Page | Status | Task |
|---|---|---|---|
| `/` | Home | built (spec 11) | 4.3, 11.x |
| `/explore/` | Explore list and map | built (list and map) | 6.5, 7.x |
| `/search/` | Search results | built | 8.x |
| `/site/<id>/<slug>/` | Site page | built (with mini map for mappable sites, 7.10) | 4.1, 5.x, 7.10 |
| `/site/<id>/` | ID redirect to the canonical site URL (noindex) | built | 4.2 |
| `/division/<slug>/` | Division page (8) | built | 10.1 |
| `/district/<slug>/` | District page (64), sites numbered as on its map | built | 10.2 |
| `/trips/` | Day trips listing (first 12 cards static; filters in the browser) | built | 9.1, 9.2 |
| `/trips/<id>/` | Itinerary page, with print layout | built | 9.3–9.12 |
| `/sources/` | Sources list (first 25 rows static; search, chips, sort and paging in the browser) | built | 10.3 |
| `/sources/<id>/` | Source page (1,136) | built | 10.4 |
| `/about/` | About and methodology (text: `content/about.en.md`) | built | 10.5–10.9 |
| `/credits/` | Image credits and licences | built | 10.7 |
| `/correction/` | Correction and photo-offer form (noindex); every correction link opens it as a popup instead | built | 5.13 |
| `/404.html` | Not found (served for any unknown path, status 404) | built | 10.10 |
| `/dev/i18n/` | Language test page: local and preview builds only, never in release | built | 3.1 |

Slugs come from the data: site `dataset_slug`; division and district `slug` in `data/build/divisions.json` and `districts.json`. A district and a division may share a slug (Dhaka), because they live under different prefixes.

## Query keys

### Explore (`/explore/`)

| Key | Values (canonical order) | Multi | Default | Meaning | Task |
|---|---|---|---|---|---|
| `day` | `1` | no | off | Only day trips from Dhaka (`dt = 1`) | 6.2 |
| `tt` | `0-1`, `1-2`, `2-3`, `3-4`, `4+`, `unknown` | no | any | Travel time from Dhaka (`tb`); one segment | 6.2 |
| `cond` | `preserved`, `preserved_adaptive_reuse`, `in_ruins`, `lost`, `unknown` | yes | all | Condition (`c`) | 6.2 |
| `acc` | `ticketed`, `open_no_ticket_reported`, `restricted_or_permission`, `unknown`, `not_applicable_lost` | yes | all | Visitor access (`ac`) | 6.2 |
| `div` | division slugs, in `divisions.json` order | yes | all | Division | 6.2 |
| `dist` | district slugs, in `districts.json` order | yes | all | District; dropped with a notice if not in a selected division | 6.2, 6.3 |
| `type` | `house`, `rajbari`, `kachari`, `kuthi`, `chief`, `religious`, `fort`, `other`, `unclassified` | yes | all | Site type group (`t`; `TYPE_GROUP` in `scripts/lib/validate.mjs`); spec 06 D1 | 6.2 |
| `doc` | `1` | no | off | Only well-documented (`rc` is `confirmed` or `partially_confirmed`) | 6.2 |
| `vloc` | `1` | no | off | Only verified locations (`lc = verified`) | 6.2 |
| `photo` | `1` | no | off | Has photos (`p`) | 6.2 |
| `hours` | `1` | no | off | Opening times known (`hv`: a clock time is recorded) | 6.2 |
| `sort` | `time`, `name`, `district` | no | `time` | List order: travel time (unknown last), name or district, in the interface language (spec 06 D5, D8) | 6.4 |
| `q` | free text | no | none | Search within the results: keeps the sites `/search/` finds for it, combined with the filters; no "Did you mean" (spec 08 D3, FR-29) | 8.x |
| `view` | `list`, `map` | no | `list` below 1280 px; ignored at 1280 px and above, where map and list both show (kept in the URL) | Which pane is shown below 1280 px (spec 07 D6, D7) | 6.5, 7.5 |
| `sel` | one site ID | no | none | Selected site (summary sheet or popover). Must have a pin and match the filters: a link whose `sel` names a hidden pin or a filtered-out site loses it with the notice; a filter change that excludes it drops it without one (spec 07 D12) | 7.5, 7.6 |
| `ids` | site IDs | yes | none | Show only these sites, in stop order ("Open all stops on the map"), ANDed with the filters and `q`. A chip "N trip stops" removes it; Clear all removes it too. An ID that names no site is dropped with the notice. A hidden-pin site is listed but not mapped (R5) (spec 09 FR-43, D13) | 9.8 |

### Search (`/search/`)

| Key | Values | Multi | Default | Meaning | Task |
|---|---|---|---|---|---|
| `q` | free text | no | none | The query; English and Bangla, spelling variants folded. A query that is exactly a site ID (`JB-DHK-064`, any case) finds that site alone, with no "Did you mean" (spec 10 FR-53) | 8.x, 10.10 |
| `field` | `family` | no | all fields | Limit the match to founder or family (`fm`): the whole phrase, Sites only (spec 08 FR-11). Dropped silently without `q` | 8.x |
| `in` | `sites`, `families`, `districts` | no | all groups | Which result group is shown (spec 08 D7). With `field=family` only `sites` is allowed; another value is dropped with the notice | 8.x |
| `exact` | `1` | no | off | Match the words as typed: no close spellings and no "Did you mean" (spec 08 D5, FR-12). Dropped silently without `q` | 8.x |

### Trips listing (`/trips/`)

| Key | Values (canonical order) | Multi | Default | Meaning | Task |
|---|---|---|---|---|---|
| `len` | `one-day`, `multi-day`, `not-stated` | yes | all | Trip length (`duration`: One day, Overnight / multi-day, Not stated) | 9.2 |
| `tt` | `0-1`, `1-2`, `2-3`, `3-4`, `4+`, `unknown` | no | any | Travel time from Dhaka to the anchor site | 9.2 |
| `div` | division slugs | yes | all | Division of the anchor site | 9.2 |
| `plan` | `timed` | no | off | Has a timed plan (`plan_status = timed`, O11) | 9.2 |
| `sort` | `time`, `name` | no | `time` | Travel time (unknown last), or name | 9.2 |

### Sources (`/sources/`)

| Key | Values (canonical order) | Multi | Default | Meaning | Task |
|---|---|---|---|---|---|
| `q` | free text | no | none | Matches the title, publisher or SRC ID, folded as in Search; capped at 100 characters | 10.3 |
| `type` | `news`, `wiki`, `government`, `travel`, `encyclopedia`, `blog`, `map`, `academic`, `book`, `project`, `other` | no | all | Type chip; each groups `sources.csv` types (`TYPE_GROUPS` in `lib/sources.ts`; spec 10 FR-21) | 10.3 |
| `sort` | `cited`, `title`, `date` | no | `cited` | Most cited (sites citing it, then ID), title A to Z, or newest first (undated last) | 10.3 |
| `page` | a whole number from 2 | no | 1 | Page of 25 rows; a page past the last is dropped with the notice | 10.3 |

### Credits (`/credits/`)

| Key | Values | Multi | Default | Meaning | Task |
|---|---|---|---|---|---|
| `site` | one site ID | no | none | Show only that site's image credits, with "Show all sites". An ID with no Ready photos, or that names no site, is dropped with the notice. The search box on the page is not kept in the URL (spec 10 FR-48, FR-49) | 10.7 |

## Anchors

| Anchor | On | Section |
|---|---|---|
| `#visiting` | `/site/<id>/<slug>/` | Visiting: hours, closing days, fees, access |
| `#getting-there` | `/site/<id>/<slug>/` | Routes from Dhaka |
| `#sources` | `/site/<id>/<slug>/` | Sources and citations |
| `#sites` | `/sources/<id>/` | Every site citing the source |
| `#core-book`, `#grading`, `#locations`, `#disagreements`, `#costs`, `#photos`, `#not-done`, `#contribute` | `/about/` | The About sections (spec 10 FR-35); area pages link their location tiles to `#locations` |
| `#licences` | `/about/` | Text, data and photo licences |
| `#main` | every page | Skip-link target |

## Outbound links

- **Corrections:** not an outbound link any more. Links go to `/correction/`, prefilled where known with `site_id`, `page_url` and `field` (`field=photo` for a photo offer; `lib/nav.ts` `CORRECTIONS_URL`). `CorrectionDialog` opens the form as a popup, and it posts to Web3Forms, which emails the project address.
- **Visitor photos for hidden-pin sites:** a name-only Google Maps search, with no coordinates (O10, 2.12).
