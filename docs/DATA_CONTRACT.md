# Data contract

What the generated data carries, where each field comes from, and what the UI shows when it is missing.
The types are in `lib/types.ts`; this file and the types change together (roadmap 2.17).
The specification is `.claude/specs/02-Data-contracts.md`.

**Rules that hold everywhere**
- The CSVs in `data/csv/` are the only source. A field with no CSV value is **omitted** (or `known: false`), never filled in. An unknown is shown as words, never as a blank, `0` or "Free" (R2, R6).
- Only named public fields reach the output (I7). These columns never do: `site_sources.citation_note`, `sources.local_path`, `images.identity_verification`, `images.license_evidence`, `images.notes`.
- The browser fetches only `public/data/index.json`. Everything in `data/build/**` is read at build time and passed to pages as props.
- Hidden pins (`map_display = hide`, or no coordinates) never carry coordinates anywhere (R5).

## 1. Features rendered in the browser

"Index" means the field comes from `index.json` (fetched); "props" means it comes from build-time JSON.

### Explore card (list row)
| Shows | Field | From | When missing |
|---|---|---|---|
| Names | `e`, `b` | index | No `b`: English name with `lang="en"` and "Bangla name not yet recorded" |
| Place | `dv`, `d`, `db`, `u` | index | No `u`: district only |
| Photo | `img.id` → `/thumbs/<id>.webp`, `img.credit` | index | No `img`: placeholder with no credit |
| Condition, access | `c`, `ac` | index | always present |
| Fee | `fe` | index | No `fe`: "No ticket reported" or "Not documented" from `ac` |
| Travel time | `h`, `tb` | index | `tb = unknown`: "Travel time not documented" |
| One-way cost | `oc` | index | No `oc`: no cost shown |
| Location status | `lc`, `f`, `ll` | index | No `ll`: "No map location yet" |
| Confidence | `rc` | index | always present |

### Explore filters
| Filter | Field | Note |
|---|---|---|
| Day trip | `dt` | absent = unknown, never counted as "no" |
| Type | `ty` (raw `site_type`), `t` (group) | |
| Has visiting hours | `hv` | true only for a clock time in `opening_hours` (12 sites on 22 Oct 2026); "Daylight hours" does not count |
| Has photo | `p` | |
| Condition, access, division, district, travel time, confidence | `c`, `ac`, `dv`, `d`, `tb`, `rc` | |

### Map summary card (pin popover, mobile sheet)
Index fields only: `e`, `b`, `u`, `d`, `db`, `c`, `ac`, `fe`, `sm`, `h`, `tb`, `oc`, `dt`, `lc`, `f`, `ll`, `img`, plus "Read more" to `/site/<i>/<s>/` and "Directions" for a mappable site. The one-line summary is `sm` (spec 07 D1); the location line is the status label from `lc`, with no source count (D2).

### Search results
| Group | Fields | From |
|---|---|---|
| Sites | `e`, `b`, `a` (alternate names), `d`, `db` | index |
| Families | `fm` (founder or family as text; not a normalized family entity) | index |
| Districts | `districts.json`: `slug`, `en`, `bn`, `count` | props |

### Trip card (`/trips`, Home, division pages)
`trips.json` (props): `title`, `duration`, `planStatus`, `anchorEn`, `anchorBn`, `division`, `district`, `stopCount`, `hours`, `bucket`, `dayTrip`, `thumb`, `photos`.
- No `planStatus` (not yet reviewed): the card shows no status badge, and the listing offers no "Has a timed plan" filter (spec 09 D1).
- No `anchorBn`: English name with `lang="en"`.
- `photos` (spec 09 D4): the first Ready photo of up to 4 site stops, one per site, in stop order: `{ n, thumb, credit }`, where `n` is the stop number and `credit` is `required_credit` as written. Absent when no site stop has a Ready photo: placeholder. `thumb` (the anchor's first photo) is kept for Home and division tiles.
- No `hours`: "Travel time unknown"; the card never names a start place or a clock time (spec 09 D15).

### Division and district pages (`/division/<slug>/`, `/district/<slug>/`)
`divisions.json` and `districts.json` (build time) are the one source of every count on these pages (spec 10 FR-1, NFR-2): `count`, `onMap`, `conditions`, `locations`, `dayTrip`, `noPin`, `tripCount`. A division's counts equal the sums over its districts; `locations` sums to `count`.
- `locations`: `{ verified, singleSource, approximate, unverified, noPin }`. The first four count pinned sites by `coordinates_status` (any other status on a pinned site counts as `unverified`); `noPin` counts hidden sites and equals `noPin.length`.
- `dayTrip`: sites with `day_trip_from_dhaka = TRUE`. 0: the intro leaves the day-trip sentence out.
- District `siteIds` are in list order: travel time as in Explore's default sort, unknown last, then English name and ID. The district page numbers its cards 1…N in this order and `scripts/build-maps.mjs` writes the same numbers into the district map's pins (`data-n`); a site without a pin keeps its number in the list.
- District `tripCount`: trips whose anchor site is in the district. "All N trip plans" links to `/trips/?div=` with the division's `tripCount`, because Trips has no district key.
- The no-pin list names sites (index `e`, `b`, `d`, `db`) and never carries coordinates (R5).

### Sources pages (`/sources/`, `/sources/<id>/`)
`sources.json` (props for the list: `id`, `title`, `publisher`, `type` as a chip token, `date`, the count of `sites`). Every `type` must belong to a chip in `TYPE_GROUPS` (`lib/sources.ts`); a new type fails a unit test. `date` is `YYYY`, `YYYY-MM`, `YYYY-MM-DD` or a range `<date> to <date>`; none: "Not dated". A project working file (`projectFile`, or a type in the `project` chip) is labelled as such and gets no outbound link (spec 10 D6).

### About (`/about/`)
`content/about.en.md`: English prose (O6) with `{{counts.<path>}}` tokens for any number in `meta.json` `counts`, plus `{{book.sites}}` (sites citing SRC-0001) and the link tokens `{{url.corrections}}` and `{{url.photoOffer}}` (`scripts/lib/about.mjs`). An unknown token is a structural error in every mode; front matter `reviewed: false` is an editorial cell, so a release build fails until the owner has reviewed the text (spec 10 D10).

### Credits (`/credits/`)
`credits.json`: Ready images only. `credit` is `required_credit`, printed exactly; `view` is `view_category`; `sourcePage` absent for an owner's photo (no "File page" link). Licence counts come from `license`. The page says photos are shown resized and converted to WebP, once, rather than on each credit (spec 10 D11).

Page budgets (spec 10 NFR-3; `e2e/areas-sources-about.spec.ts` warns above them): `/credits/` 150 KB gzipped (126 KB on 25 Oct 2026, 2.1 MB raw), `/sources/` 70 KB gzipped (55 KB).

### Home (`/`, spec 11)
`meta.json` (props) is the one source of every number on the page (spec 11 FR-1): `counts.sites`, `counts.dayTripSites` (Day trips chip, tile and stat), `counts.openToVisitors` (Open to visitors chip), `counts.conditions.*` (category tiles), `counts.images`, `counts.sources`, `counts.legends`, `counts.onMap`, `counts.divisions`, `counts.trips` and `counts.disagreements` (trust band; never `disagreements + openQuestions`). `divisions.json` for the division tiles (`count`, names), in count order; `trips.json` (as trip cards) for the three featured trips, chosen by `featuredTrips` in `lib/home.ts` (spec 11 D4).
Photos: `lib/home-images.json` names the hero, the 4 category tiles and one tile per division slug. Each prints its `credits.json` `credit` exactly. Their larger WebP variants are `public/home/<image_id>-<width>.webp` (hero 960 and 1600 px, tiles 800 px; aspect kept, never enlarged), made by `npm run thumbs` and listed in `public/home/manifest.json`. `scripts/lib/home-check.mjs` fails the data run in every mode when a listed image is not Ready, lacks its thumbnail or a variant, shows a site outside its division or not matching its category tile, or when `public/home/` holds any other `.webp`.

## 2. Index row (`IndexSite`)

| Key | Meaning | CSV source | Present when |
|---|---|---|---|
| `i`, `s` | ID, slug | `sites.site_id`, `dataset_slug` | always |
| `e`, `b` | names | `name_en`, `name_bn` | `b` only when recorded |
| `sm` | card summary | `short_description`: first sentence (two when the first is under 60 characters), cut at a word boundary to 160 characters with "…" (`cardSummary` in `scripts/lib/rules.mjs`) | not blank |
| `a` | alternate names | `alternate_names` | not blank |
| `fm` | founder or family | `founder_or_family` | known (not blank, not "Unknown…") |
| `dv`, `d`, `db`, `u` | place | `division`, `district`, `district_bn`, `upazila` | `u` when not blank |
| `ll` | pin | `latitude`, `longitude` | mappable only |
| `lc`, `f` | location status, flagged | `coordinates_status`, `map_display` | `f` when `show_flagged` |
| `c`, `ac`, `rc` | condition, access, confidence | `condition_category`, `visitor_access`, `record_confidence` | always |
| `fe` | entry fee, Tk | `entry_fee_bdt` | ticketed and > 0 |
| `h`, `tb`, `dt` | travel time, bucket, day trip | `travel_time_hours_from_dhaka`, `travel_time_bucket`, `day_trip_from_dhaka` | `h`/`dt` when known |
| `t`, `ty` | type group, raw type | `site_type` | always |
| `hv` | opening times known | `visitor_info.opening_hours` | a clock time |
| `oc` | one-way cost, Tk | `one_way_cost_bdt_estimate` | a number > 0 |
| `p`, `img` | has photo; the lead photo `{ id, credit }`: the Ready image marked `lead = yes`, else the first Ready one | `images.csv` | a Ready image exists |

Budget: 150 KB gzipped fails the build; a test warns above 120 KB. On 22 Oct 2026 the index was 59 KB; with `sm` (24 Oct 2026, spec 07) it is 76 KB.

## 3. Build-time shapes

### Site record (`data/build/sites/<id>.json`)
- **Footnotes.** `sources` is the page's numbered list. Each fact, event, legend, feature and conflict version points only to its own `SourceRef`s (`{ id, n, relation? }`). The list does not imply that every source supports every claim.
- **Facts** `era`, `founder`, `style`, `preservation`: `Maybe<string>` plus `sources`, from `claims.csv` `fact` rows with field `history.established_era`, `history.founder`, `history.architectural_style`, `history.preservation_status`, joined to `claim_source_links`. Empty `sources`: show no citation marker.
- **Conflicts.** `versions[].sources` holds a source only when the version text names its publisher (normalized name or a reviewed alias in `scripts/lib/rules.mjs`). Anything else goes to `unattributedSources`: "Sources for this disagreement (not matched to a version)". A source is never on two versions. Competing `features.csv` measurements also appear here.
- **Legends.** `sources`: the `SRC-` IDs in the attribution, then the claim's `reported_by` links, shown as "reported by".
- **Features.** From `features.csv` only. `[]`: `FeatureList` shows "Not documented".
- **Visiting.** `hours` (text), `hoursKnown`, `closed` (the unreviewed `weekly_closing_days` text), `closedDays` (reviewed `closed_days`; `known: false` → "Closing days not documented"; `days: []` → no closing day), `date` ("Visiting info checked …").
- **Routes.** `mode` is one of `bus`, `train`, `launch`, `ferry`, `car`, `air`, `boat`, `unknown`, `mixed`; `unknown` and `mixed` use neutral icons. `inferred: true` means the label was "Other / mixed" and the description named exactly one mode. `estimateDate` per route.
- **Photos.** `images` holds Ready images only, the lead photo (`images.csv` `lead = yes`, at most one per site, Ready only) first. Without one, `externalPhotos` links out: a hidden pin gets "Search for visitor photos", a Google Maps search on name and district only (O10).
- **Names.** `name.bn` is optional; `bnMissing: true` when it is blank (O13).
- **Location note.** `location.note` (`coordinates_note`) only for mappable sites. Hidden-pin notes often name nearby landmarks with their coordinates, so they are left out, and the build fails if any text field of a hidden-pin record holds a coordinate pair inside Bangladesh (spec 05 FR-53, FR-54).
- **History.** Events whose description only says nothing is known ("Not documented.", "Unknown", or a founding event whose period is a bare unknown) are dropped; `[]` → "No history recorded yet". A `year_end` before `year_start` is shown as `year_start` alone. Both are listed in the data report (spec 05 FR-51, FR-52).
- **Related sites.** `related[]` has one entry per other site, with `relation` (`site_relationships.relation_type`) and `note`. Only `combine_on_trip` entries are trip suggestions ("Combine with"); the others (`same_name_different_site`, `possible_duplicate`, `possibly_part_of`, `same_complex`, `same_family_separate_site`) are identity notes under the summary. A pair listed twice keeps the relation that is not `combine_on_trip` (spec 05 FR-50).
- **Conflicts and open questions.** A conflict with two or more versions is a disagreement ("Sources disagree"); one with a single version is shown as an open question and not counted as a disagreement (spec 05 FR-34, FR-35).

### Itinerary (`data/build/trips/<id>.json`)
- `title`: shortened only for `prefix (X) (Anchor)` titles; others are kept as written (I5).
- `planStatus`: the editor's `plan_status` (`timed`, `circuit`, `incomplete`); absent until reviewed.
- `stops[]`: `kind` is `site` (has `siteId`) or `place` (terminal, lunch stop, ghat). A site stop has `latlon` only with a pin, and `visitingChecked`. A place has `latlon` only from `itinerary_places.csv`, with its `sources`.
- `legs[]` from `itinerary_legs.csv`; `schematic: true` when there are none: "schematic: stops in order, roads not drawn".
- `budget.rows[]`: from `costs.csv` columns, never from `amount_text`. `amount` only when > 0; an entry fee of 0 is `noTicket` ("No ticket reported"). `unit` from the reviewed unit table; `basis` and `legs` from `fare_basis` and `legs`; `note` is `basis_and_assumptions`; `date`, `status`, `sources` (SRC- IDs). `range` is reserved and not emitted yet.
- `budget.known`: the sum of per-person amounts; absent when there are none. `budget.omitted`: items with no amount (not `noTicket`, not `not_applicable`). The anchor transport row is "Dhaka → [anchor], one way"; there is no return fare or fare between stops unless a row exists.
- `costsEstimated`: `{ from, to }` over the budget rows' dates ("Costs estimated …"). There is no single trip `lastChecked`.
- On the page (spec 09): clock times only when `planStatus` is `timed` (D1); the map only with 2 or more stops with `latlon`, lines only from `legs[]` (D3); DayCheck reads the site stops' `closedDays` only (D2); the budget's closing line is "Known so far" with `known` and the `omitted` items, never a total (D16).
- Site pages: `itineraries[]` entries link to `/trips/<id>/`; a trip whose `planStatus` is `timed` also shows its stops with times (spec 09 FR-51, FR-52).

### Sources (`data/build/sources.json`)
`bib` (`author`, `publisher`, `edition`, `isbn`, `verificationMethod`) when the structured columns are filled (SRC-0001 only, Oct 2026). `citationsByDivision`: site citations per division.

### Meta (`data/build/meta.json`)
`lastVerified`: the newest `last_verified` in the data. `compiledAt`: when the data was compiled (`SOURCE_DATE_EPOCH`, else `lastVerified`). `counts.hoursKnown`.
`counts.dayTrips` counts one-day trip **plans**; `counts.dayTripSites` counts **sites** with `dt = 1` and equals the sum of `divisions.json` `dayTrip`. `counts.openToVisitors`: sites whose `visitor_access` is `ticketed` or `open_no_ticket_reported` (Home, spec 11).
For About (spec 10 §6): `counts.locations` (the same shape as an area's `locations`); `counts.disagreements` (conflicts with two or more versions) and `counts.openQuestions` (one version; never counted as a disagreement, spec 05 FR-34, FR-35); `counts.stillToConfirm` (all `stillToConfirm` items); `counts.imagesNeedReview` and `counts.imagesPermissionRequired` (`publication_readiness`; counted, never published); `counts.possibleDuplicates` (`site_relationships.relation_type = possible_duplicate`).

### Credits (`data/build/credits.json`)
`imageId`, `thumb`, `siteId`, `siteSlug`, `siteEn`, `siteBn`, `creator`, `license` (without the "Open license:" prefix), `credit` (`required_credit`), `view` (`view_category`), `sourcePage` (`source_page_url`, absent when blank).

## 4. Reviewed columns and optional tables

| Column or table | Values | Blank or missing |
|---|---|---|
| `itineraries.plan_status` | `timed`, `circuit`, `incomplete` | unknown; an editorial cell (fails release only). The report suggests a value (O11). |
| `visitor_info.closed_days` | `unknown`, `none`, or `;`-separated `sat`…`fri` | unknown; an editorial cell. Never derived from `weekly_closing_days`. |
| `costs.fare_basis` | `shared`, `reserved` | omitted |
| `costs.legs` | stop-order pairs, `1-2;2-4` | omitted |
| `site_relationships.relation_type` | `combine_on_trip`, `same_name_different_site`, `possible_duplicate`, `possibly_part_of`, `same_complex`, `same_family_separate_site` | structural (required) |
| `costs.unit` | a key of `UNIT` in `scripts/lib/rules.mjs` | required when `amount_bdt` is set (structural) |
| `travel_routes.transport_mode` | a key of `MODE_LABEL` in `scripts/lib/rules.mjs` | an unlisted label is structural |
| `sources.author`, `publisher`, `edition`, `isbn`, `verification_method` | text | omitted |
| `itinerary_places.csv` | `itinerary_id`, `stop_order`, `latitude`, `longitude`, `source_ids` (required) | no place coordinates |
| `itinerary_legs.csv` | `itinerary_id`, `from_stop`, `to_stop`, `mode`, `duration`, `cost_row`, `source_ids` | `legs: []`, schematic |
| `features.csv` | `site_id`, `feature`, `feature_bn`, `measurement`, `unit`, `source_ids`, `status` | `features: []` |
