# Boundary geometry

`bgd.json` holds the outlines that `scripts/build-maps.mjs` draws under the pins of the static maps (roadmap task 3.8). It contains no site data.

## Source

geoBoundaries gbOpen, Bangladesh (BGD), pinned to commit `9469f09` of `github.com/wmgeolab/geoBoundaries` (build date 12 December 2023). The `_simplified.geojson` file of each level was downloaded:

| Level | boundaryID | What | Original source | Licence |
|---|---|---|---|---|
| ADM0 | BGD-ADM0-71232402 | country | geoBoundaries, Wikimedia Commons (2015) | CC0 1.0 |
| ADM1 | BGD-ADM1-32408957 | 8 divisions | geoBoundaries, Wikimedia Commons (2015) | CC0 1.0 |
| ADM2 | BGD-ADM2-16705992 | 64 districts | Bangladesh Bureau of Statistics (BBS), OCHA ROAP (2020) | CC BY 3.0 IGO |

URLs: `https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/BGD/<LEVEL>/geoBoundaries-BGD-<LEVEL>_simplified.geojson`.

**Attribution.** The district outlines need credit, so every map carries "Boundaries: geoBoundaries; districts BBS/OCHA, CC BY 3.0 IGO" (`MAP_CREDIT` in `scripts/build-maps.mjs`). The same credit appears in the site footer.

## Processing

`node scripts/prepare-geo.mjs ADM0.geojson ADM1.geojson ADM2.geojson`, with no dependencies:
- Douglas–Peucker simplification at 0.004° (about 400 m);
- rings smaller than 0.0004 square degrees (about 4 km²) dropped;
- coordinates rounded to 3 decimals;
- two misspelt names in the source corrected (`NAME_FIXES` in the script): "Rajshani" becomes Rajshahi (division) and "Brahamanbaria" becomes Brahmanbaria (district).

The result is about 14,500 points. Divisions and districts were simplified separately, so their shared borders can differ by a few hundred metres. That is invisible at teaser size.

## Names (`names.csv`)

A reviewed map from our division and district slugs (`data/build/divisions.json`, `districts.json`) to geoBoundaries `shapeName`. It is needed because geoBoundaries uses older spellings, for example Chittagong for Chattogram, Jessore for Jashore, Comilla for Cumilla, Bogra for Bogura, and Nawabganj for Chapainawabganj. These are older official spellings, so they are mapped here and not changed. A division or district without a row here, or whose `gb_name` is missing from `bgd.json`, is a structural error in `npm run data`.
