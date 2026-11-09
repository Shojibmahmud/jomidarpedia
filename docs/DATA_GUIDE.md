# Data guide

The source tables, how they relate, and what the data build does with them. This is the developer's view of the input. Two other files cover the rest:

- `docs/DATA_CONTRACT.md` documents the **output**: every field of the generated JSON, where it comes from and what shows when it is missing.
- `CONTRIBUTING.md` is the **editor's** guide: how to change a fact, add a photo or act on a correction.

Counts in this file were read on 10 November 2026. The live numbers are always in `data/build/meta.json` and `tests/baseline.json`.

## 1. Where the data came from

The data was researched in a spreadsheet workbook and exported once to CSV with `scripts/export-xlsx.py`. Since then the CSV files in `data/csv/` have been the only source, edited directly. The workbook is no longer used.

The starting list of houses came from the book পূর্ববঙ্গের জমিদারবাড়ি by Md. Mahmud Ali (source `SRC-0001`). Its contents and appendix are in `data/reference/`, including 160 appendix houses that aren't in the data yet.

## 2. The tables

Seventeen tables, all in `data/csv/`. Three are optional: a missing file counts as an empty table.

| Table | Rows | One row is | Key |
|---|---:|---|---|
| `sites` | 413 | A house, palace, kachari or related site | `site_id` |
| `visitor_info` | 413 | A site's hours, closing days, fee and rules | `site_id` |
| `travel_routes` | 950 | A way to reach a site from Dhaka | `route_id` |
| `history_events` | 1,736 | A dated event in a site's history | `event_id` |
| `legends` | 205 | A story told about a site, kept apart from history | `legend_id` |
| `claims` | 5,053 | A fact, a disagreement or a legend, as a sourced statement | `claim_id` |
| `claim_source_links` | 4,573 | A source that supports, disputes or reports a claim | `claim_id` + `source_id` |
| `sources` | 1,146 | A book, article, website or other source | `source_id` |
| `site_sources` | 2,671 | A source cited on a site, with its citation text | `site_id` + `source_id` |
| `site_relationships` | 431 | A link between two sites | `relation_id` |
| `images` | 2,303 | A photo and its licence. Only `Ready` ones are published (957) | `image_id` |
| `itineraries` | 385 | A trip plan from Dhaka, anchored on one site | `itinerary_id` |
| `itinerary_stops` | 1,110 | A stop on a trip: a site, or a place such as a terminal | `itinerary_id` + `stop_order` |
| `costs` | 2,069 | A cost estimate for a site or a trip | `cost_id` |
| `itinerary_legs` (optional) | 2 | A researched leg between two stops, with its mode | `itinerary_id` + `from_stop` + `to_stop` |
| `itinerary_places` (optional) | 0 | Coordinates for a stop that isn't a site | `itinerary_id` + `stop_order` |
| `features` (optional) | 0 | An architectural feature with a measurement | none |

### How they relate

```
sites ─┬─ visitor_info        (one per site)
       ├─ travel_routes       (many)
       ├─ history_events      (many)      each lists source_ids
       ├─ legends             (many)      each points to a claim
       ├─ claims ── claim_source_links ── sources
       ├─ site_sources ───────────────── sources
       ├─ site_relationships  (to another site)
       ├─ images              (many)
       ├─ costs               (many)
       └─ features            (many)

itineraries ─┬─ anchor_site_id → sites
             ├─ itinerary_stops ── site_id → sites (or a named place)
             ├─ itinerary_places   coordinates for a place stop
             └─ itinerary_legs  ── cost_row → costs
```

Every reference is checked. A row that points to an ID that doesn't exist is a structural error and fails the build.

### IDs

IDs are permanent. They appear in URLs, so never change or reuse one. The three-letter code is the division: `BSL` Barishal, `CTG` Chattogram, `DHK` Dhaka, `KHL` Khulna, `MYM` Mymensingh, `RAJ` Rajshahi, `RNG` Rangpur, `SYL` Sylhet.

| Kind | Pattern | Example |
|---|---|---|
| Site | `JB-<DIV>-<nnn>` | `JB-DHK-064` |
| Source | `SRC-<nnnn>` | `SRC-0001` |
| Claim | `CL-<DIV>-<site nnn>-<nnn>` | `CL-DHK-064-001` |
| Itinerary | `IT-<DIV>-<site nnn>-<n>` | `IT-DHK-064-1` |
| Image | `IMG-<DIV>-<site nnn>-<nnn>` | `IMG-DHK-064-001` |
| Relation | `RL-<nnnn>` | `RL-0001` |
| Route | `RT-<DIV>-<site nnn>-<n>` | `RT-BSL-001-1` |
| Cost | `CO-<DIV>-<site nnn>-<nn>` | `CO-BSL-001-01` |
| History event | `HE-<DIV>-<site nnn>-<nnn>` | `HE-BSL-001-001` |
| Legend | `LG-<DIV>-<site nnn>-<nn>` | `LG-DHK-002-01` |

The exact patterns are `ID` in `scripts/lib/validate.mjs`.

A site also has a **slug** (`dataset_slug`), used in its URL. A slug may change; `/site/<id>/` always redirects to the current one.

### Columns worth knowing

The builders read only the columns named in `REQUIRED` in `scripts/lib/structure.mjs`. Other columns may exist and are ignored. Allowed values for enum columns are in `ENUMS` in `scripts/lib/validate.mjs`.

**`sites`**

| Column | Notes |
|---|---|
| `map_display` | `show`, `show_flagged` or `hide`. With `hide`, the site's coordinates reach no output at all |
| `coordinates_status` | `verified`, `single_source`, `approximate`, `unverified`, `not_found`. Shown on every pin and site page |
| `latitude`, `longitude` | Both must be inside Bangladesh's bounding box, or both blank. One alone is an error |
| `condition_category` | `preserved`, `preserved_adaptive_reuse`, `in_ruins`, `lost`, `unknown` |
| `visitor_access` | `ticketed`, `open_no_ticket_reported`, `restricted_or_permission`, `unknown`, `not_applicable_lost` |
| `entry_fee_bdt` | A price only when above 0. `0` means "no ticket reported", never free |
| `record_confidence` | `confirmed`, `partially_confirmed`, `unconfirmed`, `not_graded` |
| `site_type` | A key of `TYPE_GROUP`, which groups types for the Explore filter. `unclassified` is an editorial problem |
| `travel_time_bucket`, `travel_time_hours_from_dhaka`, `day_trip_from_dhaka` | Travel from Dhaka. A blank day trip means unknown, never "no" |
| `unverified_fields` | A `;`-separated list shown as "Still to confirm" |
| `coordinates_note`, `google_maps_url` | Published only for mappable sites, because a hidden site's note may name coordinates |

**`images`**

| Column | Notes |
|---|---|
| `publication_readiness` | Only a value starting with `Ready` is published. `Needs review` and `Permission required` never leave the CSV |
| `required_credit` | Printed exactly as written. Licences require the wording |
| `relative_file_path` | The original, under `JP_IMAGES_DIR` (default `../images`) |
| `lead` | `yes` on at most one Ready image per site: the card photo |
| `identity_verification`, `license_evidence`, `notes` | Internal. Never published |

**Reviewed columns.** A few columns exist because the build must not guess: `itineraries.plan_status`, `visitor_info.closed_days`, `costs.fare_basis`, `costs.legs`. A blank means "not reviewed yet", and the page then says less rather than deriving a value. `docs/DATA_CONTRACT.md` §4 lists them with their allowed values.

**Internal columns.** These are never copied to any output, whatever they contain: `site_sources.citation_note`, `sources.local_path`, `images.identity_verification`, `images.license_evidence`, `images.notes`. The repository is public, though, so they are visible in the CSV files themselves.

## 3. What the build does, stage by stage

`npm run data` (`scripts/data.mjs`). Each stage returns its problems, and `scripts/lib/report.mjs` combines them into one result.

### Stage 1: read and validate structure

`scripts/csv.mjs` parses each file and collects every malformed-input problem instead of stopping at the first. `scripts/lib/structure.mjs` then checks:

- required columns are present, and headers aren't empty or repeated;
- IDs match their pattern and aren't duplicated;
- every reference resolves (a claim's site, a link's source, a stop's itinerary…);
- enum columns hold an allowed value;
- dates, numbers and coordinates are well formed, and coordinates are inside Bangladesh;
- slugs are unique, and each site has at most one lead image.

Any failure here is **structural**. Nothing is written, and earlier output is removed, so a stale build can't be mistaken for a good one. Each message names the file, the line, the column and the value.

### Stage 2: build the index

`scripts/build-index.mjs` writes `public/data/index.json`: one row per site with short keys, for Explore, Search and Lite mode. It fails if the file is over 150 KB gzipped.

### Stage 3: build the records

`scripts/build-data.mjs` writes `data/build/**`. Things it does that aren't obvious from the output:

- **Copies named fields only.** Each output object is built field by field (I7).
- **Turns unknowns into `Maybe` values.** A blank, "Unknown" or "Not documented" becomes `{ known: false, text: '…' }`, and the page shows those words. The patterns are in `scripts/lib/rules.mjs`.
- **Splits conflicts into versions.** A conflict claim's text reads "Field: version vs version". A source is attached to a version only when the version names its publisher; the rest are listed as not matched to a version.
- **Normalises transport modes and cost units** through reviewed tables in `scripts/lib/rules.mjs`. An unlisted label is a structural error, so nothing is guessed.
- **Shortens trip titles** that follow the pattern `prefix (X) (Anchor)`, and leaves others alone.
- **Withholds coordinates of hidden sites** from site records, trip stops and map links.
- **Attaches Bangla** from `data/translations/bn/` where the fingerprint matches (§5).
- **Computes every count** the site shows into `meta.json`, `divisions.json` and `districts.json`.

### Stage 4: check the output

`scripts/lib/checks.mjs` reads the files just written and applies the **safety rules**: no coordinate pair in any text of a hidden site's record, no non-Ready image, no "free entry" wording, no fee of 0 as a price. These fail in every mode, but the files stay so you can inspect them.

It also finds **editorial problems**: an internal-note term (`scripts/lib/internal-terms.mjs`) in published text, a credit line not in the standard form, an `unclassified` type, an unreviewed `plan_status` or `closed_days`.

### Stage 5: maps, photos, About, download

- `build-maps.mjs` draws the SVG maps from `data/geo/bgd.json` and the mappable sites.
- `lib/thumbs-check.mjs` checks that each referenced thumbnail is in `public/thumbs/`, and that no thumbnail exists for an image that isn't Ready (any file in `public/` is published).
- `lib/home-check.mjs` checks the photos named in `lib/home-images.json`.
- `lib/about.mjs` checks `content/about.en.md`: an unknown `{{token}}` is structural, and `reviewed: false` in its front matter is editorial.
- `build-export.mjs` writes the data download in release mode, and deletes any earlier copy in other modes.

### The report

`data/reports/release-problems.md` is rewritten on every run. It states the mode and the result, then lists structural errors, safety failures and editorial problems, with editorial ones grouped by the CSV cell to edit. It also reports Bangla translation coverage. It has no timestamp, so the same data gives the same report. CI uploads it as the `release-problems` artifact.

## 4. Photos

Originals are not in the repository. The flow is:

1. A row in `images.csv` names the original (`relative_file_path`) and its licence.
2. `npm run thumbs` reads the originals from `JP_IMAGES_DIR` and writes `public/thumbs/<image_id>.webp` for every Ready image: 480×360, centre-cropped, metadata stripped. It also writes the larger home page variants into `public/home/`.
3. Both folders and their `manifest.json` files are committed. The manifest records checksums, so only new or changed originals are processed.
4. The data build only checks that the committed files match the Ready set. So a clone without the originals builds, and CI never needs them.

The lightbox loads the full-size file straight from Wikimedia (`direct_image_url`), which is why Wikimedia's hosts are in the Content Security Policy.

## 5. Bangla translations

One file per table in `data/translations/bn/`, with the columns `key`, `column`, `bn`, `status` and `en_hash`. There are 13,340 translated cells, all reviewed.

- `key` is the row's key as the report prints it: `JB-DHK-064`, or `IT-BSL-001-1#3` for a stop.
- `en_hash` is a fingerprint of the English cell. A translation shows only while it matches. Edit the English, and that cell shows English again until the Bangla is redrafted and merged.
- The files are written by `npm run bn -- merge`, never by hand, apart from changing `status`.
- A problem in a translation never fails a build. The English shows instead, and the report lists it.

The workflow and the writing rules are in `docs/TRANSLATION_BN.md`. The owner reviews translations on `/dev/bn-review/` in a local or preview build.

## 6. The data download

A release build writes `public/data/jomidarpedia-data.zip`: one CSV per published table, a `LICENSE` and a `README.md` in English and Bangla, under CC BY-SA 4.0. It is linked from About and the footer.

It is built from `data/build/**`, never from `data/csv/`. So it can only contain what the site already publishes, and hidden sites have no coordinates in it. `build-export.mjs` lists every field of the build records as either exported or skipped with a reason, and fails on a field it doesn't know. When you add a field to the build, you must decide here whether the download carries it.

A change to the download's columns is a breaking change for anyone using it: it needs a new major version (`CHANGELOG.md`).

## 7. Changing the data safely

1. Edit the CSV on a branch.
2. Run `npm run dev` or `JP_DATA_MODE=local npm run data`, and read `data/reports/release-problems.md`.
3. Run `npm test`. If `tests/baseline.test.ts` fails, a count changed. If you meant it, update `tests/baseline.json` in the same commit.
4. Run `npm run data` with no mode set to confirm the release build passes.
5. Open a pull request. CI's `release` job is the final gate.

When editing CSV files with a script or a spreadsheet, keep them as UTF-8 with the header row unchanged, and check the diff: a spreadsheet can silently reformat dates, strip leading zeros from IDs or change line endings across a whole file.
