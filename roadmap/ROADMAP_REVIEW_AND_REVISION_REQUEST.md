# Jomidarpedia: roadmap review and revision request

Prepared: 22 October 2026

## Request to Claude

Review the findings below against the actual project files and design references, resolve the issues, and produce an updated `DEVELOPMENT_ROADMAP.md`.

The goal is a self-contained, executable development checklist with correct dependencies, realistic tasks, complete design coverage, and clear acceptance criteria. Preserve the established product scope and visual direction. Do not add features merely to make the project more elaborate.

This request is to revise the development plan. Do not start implementing the app, initialize Git, publish files, deploy, or rewrite research data as part of this review. Turn required implementation fixes into explicit roadmap tasks. You may update `README.md` to reconcile outdated documentation if you have filesystem access; clearly list those changes.

Treat the review as evidence to verify, not as an instruction to accept every finding unquestioningly. If a finding is incorrect or has already been resolved, explain why and cite the relevant file or design screen. Distinguish confirmed requirements, implementation recommendations, and decisions still requiring the project owner's input.

If project files are unavailable in your environment, identify what you could not verify. Do not claim to have inspected files, changed files, or run checks that you could not access or execute.

## Inputs and evidence

Project base directory on the owner's computer:

`/Users/domus_aurea/Project folder/Claude Projects/Jomidar bari/`

Relevant paths relative to that directory:

- `handoff/DEVELOPMENT_ROADMAP.md`: document to revise.
- `handoff/README.md`: developer handoff; contains outdated statements alongside useful specifications.
- `handoff/lib/types.ts`: generated-data contracts.
- `handoff/scripts/build-data.mjs`, `build-index.mjs`, and `csv.mjs`: existing data pipeline.
- `handoff/data/csv/`: 14 source tables.
- `handoff/app/layout.tsx`, `app/fonts.ts`, `app/tokens.css`, `tailwind.config.ts`, and `next.config.mjs`: existing configuration and design implementation.
- `claude design/Jomidarpedia-png/`: 40 PNG design references, including component, typography, map, accessibility, and developer-handoff boards.
- `images/`: image files currently outside the proposed `handoff/` repository root.

The PNGs provide the visual reference that was unavailable during the initial review. They contain some stale counts and contradictions, so do not treat screenshot text as an unquestionable source of research facts.

The review inspected the roadmap, handoff, configuration, types, scripts, CSV data, and main design screens/specification boards. Both data builders were run with output directed to temporary folders; project source files were not changed. No Next.js app build or live browser interaction was tested because no `package.json` or implemented app pages existed at review time.

### Verified dataset baseline

These are dated observations, not permanent constants to scatter through tests:

| Measure | Observed value |
|---|---:|
| Sites | 413 |
| Mapped sites | 299 |
| Sites without pins | 114 |
| Sites marked as day trips from Dhaka | 132 |
| Itineraries | 385 |
| Itinerary durations | 144 one-day; 65 overnight/multi-day; 176 not stated |
| Sources | 1,136 |
| Approved images | 934, covering 126 sites |
| Other images | 24 need review; 1,322 require permission |
| Index size from the existing builder | About 35.2 KB gzipped |
| Flagged internal-note strings in generated output | 1,386 occurrences across 417 output records |
| Unclassified sites | 79 |
| Dhaka Division sites / sites without pins | 111 / 42 |

All 934 approved image paths resolved against the current local `images/` directory during the review. This does not establish that they will be available in a fresh clone or hosting build.

## A. Resolve build order and publication gates first

### A1. Phase 0 has an unsatisfied dependency

Task 0.6 enables a `prebuild` hook that invokes the failing data pipeline. Task 0.8 requires a green CI build. Task 1.2 only subsequently introduces the development-mode bypass. Phase 0 therefore cannot meet its acceptance criteria as written.

Keep the initial placeholder-only build at 0.5 if useful, but move mode handling ahead of enabling the data hook and CI build. Repair the phase dependency statement that says 1.2 must precede any `next build`, since the plan already builds in Phase 0.

### A2. Development-mode output must not become an unchecked production release

The roadmap permits flagged content in development, then publishes real pages publicly in Phase 2. Release enforcement appears much later. Setting `CI_RELEASE=1` in GitHub Actions does not automatically configure Vercel's separate build environment.

Define explicit local, preview, and production build commands and enforcement. Production must fail closed on release validation. Use protected previews or sanitized real records for the early deployed slice. Explain which editorial warnings may be relaxed locally; structural integrity, hidden-coordinate rules, and image eligibility must remain enforced.

### A3. Repository visibility needs a deliberate choice before the first push

The About design explicitly intends public CSV access. However, raw research CSVs contain provenance that the website filters. A public app repository is not technically necessary for correction submissions: a separate public issues repository or email can serve that purpose.

Preserve the intended public-data goal, but document which material will be public and how internal working notes will be handled. Do not assume a release-output scan also sanitizes Git history or raw CSVs.

### A4. Update and pin the toolchain

The roadmap recommends Node 20 as LTS, including for Vercel. Node's official release table lists Node 20 as end-of-life. Select a supported LTS version, such as Node 24, and use it consistently locally, in CI, and in hosting. Pin compatible framework/tool versions, retain Tailwind 3.4.x as agreed, and commit the lockfile.

Reference: https://nodejs.org/en/about/previous-releases

## B. Fix the data contracts before building dependent UI

### B1. Conflict attribution is currently lost

In `build-data.mjs`, `conflict()` assigns empty source arrays to versions when it splits an account around `vs`. The generated output contained 576 conflict versions without source links, out of 1,196 versions. Source relationships such as `supports`, `disputed_by`, and `reported_by` exist in the CSVs but are not preserved adequately in this presentation.

Add an early task to preserve attributable evidence for each account. If source-to-version mapping cannot be established, show that uncertainty rather than assigning every source to every version. A source list at the bottom of a page does not establish support for each individual claim.

Also review source linkage for legends and ordinary factual fields. The current generated legend structure does not expose structured source references even though the builder registers some sources as footnotes.

### B2. Search and card data are incomplete

`IndexSite` lacks a dedicated family field. It also has only a photo-presence flag, without the thumbnail URL, selected image, or credit needed by browser-rendered cards and map summaries. Designs additionally show summaries, one-way costs, and source-count wording that are not all present in the compact index.

Specify the public data contract for each browser-rendered feature. Decide which fields belong in the index and which can be passed as build-time props. Preserve the index budget and avoid accidentally shipping complete site records to every page.

### B3. Itinerary data cannot yet support the complete design

The generated itinerary lacks structured route legs/geometry, closing-day rules, and sufficient budget structure. Non-site stops such as terminals, lunch stops, and riverbanks may also lack coordinates.

Add tasks to model these requirements before `RouteMap`, `DayCheck`, and `BudgetTable`. Mark schematic routes as schematic; do not invent routable geometry, stop coordinates, opening rules, or travel times.

### B4. Budget totals need amounts, units, and coverage

Current budget amounts are display strings such as `about Tk 320`. The generated transport line is the anchor site's one-way journey, not necessarily the full circuit, return journey, or inter-stop travel. Relevant units and assumptions are not retained in the budget output.

Define numeric amounts or ranges, currency, per-person/per-vehicle basis, shared/reserved options, dates, sources, and included journey legs. Render a partial estimate with named omissions until a complete total can be justified. Do not parse arbitrary display prose to calculate money.

The Manikganj design illustrates the intended partial-total behavior: Tk 405 known, plus unestimated onward transport and food. Its shared-rickshaw assumption must remain explicit.

### B5. Unknown transport modes are currently represented as buses

The builder defaults an unidentified mode to `bus`. It reported 37 routes with unknown/mixed mode and no identifiable description during the review.

Add a neutral `unknown`/`mixed` representation and matching icon/text. Do not convert missing knowledge into an asserted transport mode.

### B6. Coordinate validation must be shared

`build-index.mjs` checks missing latitude, while `build-data.mjs` checks both latitude and longitude. Comprehensive finite-number/range checks are absent.

Use a shared validation policy across index rows, site locations, and itinerary stops. Test missing coordinates, invalid numbers, geographic bounds, and every public path through which a hidden site's coordinates could leak.

### B7. Add structural validation for the CSV pipeline

Add required-column checks, unique IDs, foreign-key checks, valid enums, dates, numeric values, unique generated route paths, required image-file checks, and malformed CSV detection. The current parser accepts malformed input without comprehensive structural validation.

Use focused valid/invalid fixtures as well as integration checks against real data. TypeScript interfaces alone do not validate CSV-derived JSON.

### B8. Dates must describe what was actually checked

Trip `lastChecked` currently takes the newest date among anchor costs and anchor visiting information. This can make old costs or other stops appear recently verified. Static `LastChecked` text can also age without a rebuild.

Preserve dates for relevant facts/items, distinguish compilation from verification, and define the rebuild or client-side behavior for age warnings. A new check of one field must not refresh every field's date.

### B9. Narrow automated content rules to their intended meaning

The blanket ban on the word `Free` is broader than the admission-fee rule. The final ban on `audit` may reject legitimate source titles or prose. Conversely, the internal-note detector only recognizes a few keywords and skips URL strings.

Test fee semantics specifically: zero/unknown admission must not be presented as free entry. Use automated editorial checks as a backstop to public-field review. Preserve uncertainty and source limitations when rewording internal notes.

The 1,386 findings are repeated output occurrences, not 1,386 independent source edits. Group cleanup reports by original CSV row/field and list affected outputs separately.

## C. Close the design-to-roadmap gaps

### C1. Implement the complete Explore filter set

`Explore · filter drawer, all groups open.png` includes controls omitted by task 4.5:

- Site type.
- Only well-documented sites.
- Only verified locations.
- Has photos.
- Has visiting hours.

Add each to the contract, filtering function, URL state, counts, controls, and verification. The visiting-hours filter requires a field derived from visitor information; do not equate nonempty unknown prose with known opening hours.

Define invalid-query handling, division/district incompatibilities, unknown-time placement, stable sorting, pagination reset, mobile draft/apply/cancel behavior, and Back/Forward restoration.

### C2. Specify results-sheet and selected-site-sheet interactions separately

`Explore · mobile sheet peek, half, full.png` describes a results sheet. The mobile map summary screen describes a selected-site sheet. Task 5.5 largely covers only the latter.

Define transitions between selection, list position, snap height, closing a summary, and Map/List switching. Include focus movement/restoration, non-drag controls, dismissal, and scroll behavior.

### C3. Give every visible action a destination and task

Account for at least:

- Share site and itinerary, including a fallback.
- Copy Explore view and coordinates, including success/failure feedback.
- Directions and outbound map links.
- Open all sites in an itinerary on the map.
- View all sites citing a source.
- Navigate from a family search result to matching sites.
- Header Divisions navigation.
- Footer Licences link.
- Photo contribution and correction links.

Some require additional URL/filter contracts. A new route is not always necessary; a defined menu, anchor, filtered page, or existing destination may suffice.

### C4. Add the missing timed-itinerary distinction

The trip listing includes `Has a timed plan`, omitted from task 7.1. Of the 385 itineraries, 176 have duration `Not stated`; some have only one recorded stop. The listing's broad promise that every plan is timed and starts/ends in Dhaka is not established by this dataset.

Differentiate timed itineraries, suggested circuits, and incomplete plans. Define a reviewed timed-plan criterion instead of inferring completeness from the presence of any time string.

### C5. Architectural details and itinerary previews need data tasks

Baliati's design includes architectural feature cards, competing area measurements, detailed route-step information, and a timed itinerary preview. The builder currently always writes `features: []`, and the generated site itinerary summaries contain no timed preview.

Map these UI elements to existing research or add structured data preparation tasks. Show documented empty states where information is unavailable. Do not fabricate values to match screenshots.

### C6. Expand source-page and methodology requirements

`Source page · the core book · mobile.png` displays author, publisher, edition, ISBN, verification method, citation counts by division, examples, and a link to all citing sites. Some information currently exists only inside combined prose fields.

`About and methodology · desktop.png` covers grading definitions, research limitations, disagreements, unpublished image counts, possible duplicates, and contributions. Task 7.6's reference to numbers from `meta.json` is insufficient.

Specify data, editorial copy, and UI tasks explicitly. Keep distinctions such as `appendix checked in print; chapters via transcriptions`. Avoid the Sources page's universal claim that every fact has a supporting link until that is actually established.

### C7. Resolve Bangla scope and rendering architecture early

The roadmap promises interface translation while leaving long prose English. The Bangla Baliati mockup translates substantial descriptive content. Decide which is the MVP requirement and align acceptance criteria. If prose translation is required, add storage, translation, and review work.

Many components are designated Server Components, but Phase 8 says they will read a client language context. Specify the actual server/client boundary and hydration strategy. A boot script changing `<html lang>` does not translate English HTML before paint.

The typography board requires ordinary counts/fees/times to use Bangla formatting while IDs and coordinates retain Latin digits. Include date/time formatting and explicit `lang="en"` for English prose and secondary names.

Two current records lack Bangla names: `JB-RAJ-059` and `JB-RAJ-071`. Add a verified translation or explicit fallback task; do not invent names.

### C8. Resolve sparse-site outbound photo behavior

Elangi's no-pin design offers a Google Maps visitor-photo link. The builder suppresses external-photo links for hidden-pin sites.

Choose a consistent policy. A name-based external search may be appropriate while precise unverified coordinates remain excluded. Define the photo-contribution CTA destination without introducing the public upload feature excluded from MVP.

## D. Resolve inconsistencies within the design references

### D1. Generate counts instead of copying screenshot values

| Reference | Inconsistency |
|---|---|
| English desktop Explore | 132-site heading versus `Showing 7 of 126`; filter counts also differ from current data |
| Mobile Explore | Search says 126 results while day-trip state says 132 |
| Dhaka division | Location summary says 42 without pins; lower panel says 37 |
| Developer handoff board | Data-flow panel says 399 rows; route table says 413 sites |

Current CSVs confirm 132 day-trip sites and 42 Dhaka sites without pins. Treat counts as derived data, with one dated baseline for review.

Also keep site-level day-trip counts separate from itinerary counts: 132 day-trip sites and 144 one-day itineraries measure different things.

### D2. Specify the remaining mapped-location state

The pin board describes 38 verified + 217 single-source + 43 approximate locations, totaling 298. The remaining mapped site is `JB-DHK-008`, Dhar Zamindar Bari (Nannar Rajbari), with status `unverified`.

Explicitly define its treatment or review its map eligibility. Do not silently upgrade its certainty. The uniform 1.5 km approximate circle should be described as a display convention unless evidence establishes that radius for an individual site.

### D3. Reconcile offline promises and Lite-mode activation

The offline screen says previously opened pages remain available; service-worker caching is deferred until after MVP. Ordinary browser caching is not a reliable guarantee of offline navigation.

Either implement and verify offline page caching or revise that copy. The screen also says the app automatically switched to Lite mode, while the roadmap says to suggest it. Choose one behavior, with a manual override and a defined persistence policy.

Define whether Lite mode applies to Explore, site mini-maps, and itinerary maps. Assert that map chunks and tile requests are absent where the mode promises suppression.

### D4. Print references and pagination need clarification

The accessibility board mentions print pages 1 and 2, but none of the 40 supplied PNG filenames identifies a dedicated print layout.

Obtain or specify that layout before demanding exact reproduction. Current itineraries have one to nine stops with varying notes/credits. Target two readable A4 pages where practical, or explicitly define an overflow policy. Never clip content to satisfy a page count.

Specify browser targets, long/short records, printed credits/licence information, missing map-tile fallback, and dark-theme override behavior. The existing print CSS needs verification against the dark selectors.

## E. Complete implementation and release planning

### E1. Make image handling reproducible

Task 9.1 reads `../images/`, outside the proposed repository root. Task 9.2's storage options are not connected to normal deployment or CI behavior.

Choose a complete workflow. For example, commit generated thumbnails, regenerate them with a maintenance command, and validate every reference during release builds. A fresh clone must not depend on an undeclared adjacent folder. Specify missing/corrupt image handling and how image changes invalidate generated outputs.

### E2. Define a static-export-compatible security policy

Of 934 approved full-image URLs, 814 use `thumb.wikimedia.org`, whereas the proposed CSP names only `upload.wikimedia.org`. A simple self-only script policy also blocks the existing inline theme/language boot script and needs to account for generated Next.js scripts. Leaflet styling needs verification too.

Plan CSP against actual generated assets and test it in a deployed environment. Do not assume request-specific nonces are compatible with this static architecture. Check that actual tile requests retain the browser-generated referrer; `set a descriptive referrer` is not a precise browser implementation task.

References:

- https://nextjs.org/docs/app/guides/content-security-policy
- https://operations.osmfoundation.org/policies/tiles/

### E3. Add missing Leaflet integration tasks

Include library/plugin CSS, required TypeScript declarations, unmount cleanup, resize behavior, clustering interactions, and keyboard/focus behavior. Avoid duplicate focus targets when nesting buttons inside keyboard-enabled markers.

Place `dynamic(..., { ssr: false })` inside a Client Component boundary. Distinguish code splitting from delaying the map until it is actually requested/rendered.

Reference: https://nextjs.org/docs/app/guides/lazy-loading

### E4. State static-export restrictions precisely

Meta-refresh is a portable redirect fallback, not the only option on Vercel; host-level redirects remain possible. Distinguish runtime APIs from build-generated static GET responses. Keep the agreed no-runtime-backend architecture without overstating platform restrictions.

Define canonical-domain configuration for metadata, sitemap, and Open Graph URLs. Adding a domain may require configuration changes and a rebuild even if application source code stays the same. Include old-slug handling if slugs are expected to change.

References:

- https://nextjs.org/docs/app/guides/static-exports
- https://vercel.com/docs/routing/redirects

### E5. Accessibility scores do not establish conformance

Lighthouse 90 and no serious axe findings do not prove WCAG 2.2 AA compliance. Keep automated checks and add explicit manual checks for zoom/reflow, keyboard operation, focus visibility/restoration, announcements, dialogs, drag alternatives, language changes, and screen readers.

The screenshots' contrast and accessibility boards describe design intentions, not verification of the eventual implementation.

Reference: https://www.w3.org/WAI/test-evaluate/tools/selecting/

### E6. Resolve licensing and asset-preparation tasks without duplicating decisions

CC BY-SA 4.0 for text/data is explicitly present in the credits design; acknowledge that evidence while retaining any necessary owner confirmation. Preserve each photo's own licence and required attribution, including links and change notices where applicable. Do not replace exact credit requirements merely to standardize wording.

Add preparation tasks for the selected logo mark, favicon/touch icon, placeholder illustrations, heritage glyphs, and static map previews. Prefer reusable SVG/code assets for these existing visual systems. Ensure every referenced asset actually exists before release.

### E7. Clarify test setup and coverage

Explicitly install/configure Playwright, its browser dependencies, axe integration, and a pinned static test server. Define the commands and server lifecycle in CI. Add lint and type checking explicitly instead of assuming the selected Next.js build performs every check.

Sample difficult states deliberately: sparse records, no pin/photo, unknown access/fees, unverified pins, long itineraries, source conflicts, Bangla/dark mode, and failed network requests. A single page per route type is a smoke test, not complete state coverage.

### E8. Verify release reproducibility before tagging

The roadmap tags `v1.0.0` before the fresh-clone build check. Move fresh-clone release verification and final deployed smoke tests before tagging.

Define `builds identically`: equivalent content/assets, or byte-identical outputs. `generatedAt: new Date().toISOString()` currently prevents literal deterministic JSON output. Ensure the fresh-clone command uses release validation and does not silently default to development mode. Add a practical rollback instruction.

## F. Remove repetition and improve task sizing

1. **Itinerary-title cleanup already exists.** `tripTitle()` extracts parenthesized content. Task 10.6 also proposes rewriting CSV titles; applying the extractor to already-clean titles containing parentheses can damage them. Choose one normalization layer and test idempotence.
2. **Keep one dated count baseline.** Avoid scattering fixed counts through phase acceptance criteria. Test invariants and require review of intentional dataset changes.
3. **Report source edits rather than repeated output matches.** Group the 1,386 flags by source row/field.
4. **Split oversized tasks.** Tasks such as 7.2, 8.1, 9.4, and 10.6 combine multiple substantial work sessions. Give each checkbox one concrete result with a verification step.
5. **Repair inaccurate dependencies.** Phase 4 claims it needs Phase 3 for `SiteCard`, but `SiteCard` is created in Phase 4. Distinguish required dependencies from a suggested chronological order.
6. **Introduce foundations earlier.** Decide i18n architecture, image metadata, URL contracts, and data validation before building components that depend on them. This reduces late rework without expanding scope.
7. **Use checkpoints without duplicating work.** A final launch checklist may reference earlier verified tasks. It should identify regression checks rather than instructing the owner to perform the same implementation twice.

## Required output from Claude

Produce the following in this order:

1. **Decision summary:** what you verified, what you corrected, and any genuinely unresolved owner decisions. State recommended defaults for nonblocking decisions. Do not ask questions whose answers are already available in the project context.
2. **Revised `DEVELOPMENT_ROADMAP.md`:** provide the full replacement, not just suggested edits. If filesystem editing is available, update the file directly and retain a reviewable diff. Preserve useful existing content while correcting contradictions.
3. **Design coverage matrix:** include it in the roadmap or as `DESIGN_COVERAGE.md`. Map each of the 40 PNGs to its route/component, interaction or state, data prerequisites, roadmap task IDs, and verification. Mark boards that contain stale values, alternatives, or unresolved specifications.
4. **Resolution table:** list each finding ID from this document, its disposition (`resolved in plan`, `already resolved`, `decision required`, or `not applicable`), evidence, and resulting roadmap task IDs. Do not silently omit findings.
5. **Updated first IDE instruction:** a ready-to-paste prompt that performs the first achievable milestone, preserves existing files, and cannot enter the known build-order trap. Do not include commits, publication, or deployment beyond the owner's authorized workflow.

### Standards for the revised roadmap

- Use stable task IDs and Markdown checkboxes.
- Give each phase an objective, actual prerequisites, small actionable tasks, and observable acceptance criteria.
- State data/schema work before dependent UI work.
- Clearly separate local development, protected preview, and public release gates.
- Preserve real-data-only behavior and explicitly represent uncertainty.
- Keep the static Next.js architecture unless you identify a concrete requirement that makes it unsuitable; explain any proposed architecture change before incorporating it.
- Mark optional improvements separately from required MVP corrections.
- Do not claim pixel-perfect fidelity, conformance, release readiness, or passing checks before implementation and verification.
- Make the document self-contained enough for an IDE coding assistant that has no access to this conversation.
