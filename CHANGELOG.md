# Changelog

All notable changes to Jomidarpedia (https://jomidarpedia.vercel.app). Newest first. Versions follow [Semantic Versioning](https://semver.org/): a new major version for a change in URLs or in the data download's columns, a minor one for new pages or data, and a patch for fixes. Data edits alone don't need a release.

## [1.0.0] - 2026-11-10

The first public release: the MVP in `roadmap/DEVELOPMENT_ROADMAP.md`, built statically from the CSV tables and verified as a reproducible build (spec `.claude/specs/16-Release.md`).

### What the site offers
- **413 zamindar houses, palaces and kacharis**, each with its own page: who built it and when, what became of the family, today's condition, where it stands and how sure that is, how to get there from Dhaka, and what to expect on arrival. Every fact shows its source. Disagreements show every version, and local stories are kept apart from the history.
- **Explore**: every filter in the design, a shareable URL, a map limited to sites whose location is known well enough, both mobile sheets, and a Lite mode that loads no map.
- **Search** by English and Bangla names, spelling variants, districts and families.
- **Trips**: 385 plans from Dhaka. They are honest about which are timed and which are circuits, and their budgets list what they leave out. Itineraries print cleanly.
- **Areas, sources, About and credits**: division and district pages, 1,146 sources, and every photo credit line.
- **Full Bangla**: the interface and all 13,340 prose cells, reviewed by the owner, with Bengali digits.
- **Data download**: every published table as CSV under CC BY-SA 4.0, linked from About and the footer.

### By phase
- **0. Toolchain:** Next.js static export, Tailwind, lint, type checks, unit tests.
- **1. Data pipeline:** validation, safety rules in every build mode (hidden pins, image eligibility, no "free" prices), deterministic output.
- **2. Data contracts:** generated JSON that keeps attribution, units, dates and uncertainty.
- **3. Foundations:** language switching, URLs, thumbnails, icons, page shell.
- **4. Walking skeleton:** the first real site page, on a protected preview.
- **5. Site page:** every state in the design, including sparse records.
- **6. Explore:** the list and its filters, with URL state.
- **7. Map:** Leaflet beside the list, the mobile map sheets, Lite mode.
- **8. Search:** header and hero search, and `/search`.
- **9. Trips:** the trips listing and the itinerary pages.
- **10. Remaining routes:** areas, sources, About, credits, the error and empty states.
- **11. Home page:** photo-led, in both languages.
- **11a. Bangla prose:** translations tied to their English, reviewed table by table.
- **12. Content readiness:** release mode passes, with public text rewritten rather than deleted.
- **13. Quality:** performance budgets, Lighthouse, axe and manual accessibility checks, error handling, an enforced Content Security Policy, SEO, and CARTO map tiles.
- **14. Release:** the data download, the fresh-clone comparison (`npm run compare:out`), production checks (`npm run check:prod`, `npm run e2e:prod`), `CONTRIBUTING.md` and `docs/RUNBOOK.md`.
