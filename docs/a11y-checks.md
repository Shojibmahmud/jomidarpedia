# Accessibility checks

Roadmap tasks 13.3 and 13.4; spec `.claude/specs/13-Quality-accessibility-and-security.md` FR-10 to FR-13, D6, D13.

These checks show progress towards **WCAG 2.2 AA**. They do not by themselves certify conformance.

## How to record a check

Fill one row per check and device. **Result** is `pass`, `fail` or `partial`. Notes say what you did and what happened, specifically enough that someone else could repeat it.

A **blocker** is a failure where someone cannot reach, operate or understand a control or its content, or where Bangla text renders garbled. Blockers are fixed in Phase 13 and checked again, with the recheck recorded in its own row. Any other finding goes under **Open items** at the end (D13).

Devices (D6):
- iPhone: iOS Safari with VoiceOver
- Android phone: Chrome with TalkBack
- Mac: Safari with VoiceOver
- Windows: NVDA with any browser

Record the OS version and the browser version for each.

Pages to use unless a check names others:
- Home `/`
- Explore `/explore/` (filters, drawer, map)
- Baliati `/site/JB-DHK-064/baliati-palace/` (gallery and lightbox, mini map)
- an itinerary `/trips/IT-DHK-010-1/`
- Search `/search/`

## Automated checks (13.2), for reference

`e2e/a11y-matrix.spec.ts` runs axe on 18 states, and fails on any serious or critical finding:
- 4 site records: sparse with no pin and no photo; unknown access and fee; an unverified pin; the most conflicts;
- the longest itinerary;
- Bangla mode and dark mode, each on 4 pages;
- a failed `index.json` request;
- failed tiles.

First run on 26 Oct 2026: no serious or critical findings.

Lighthouse Accessibility (`npm run lighthouse`, mobile settings): 1.00 on Home, Explore and Baliati.

## Manual checks (13.3)

| # | Check | Device / OS | Browser | Assistive technology | Date | Result | Notes |
|---|---|---|---|---|---|---|---|
| 1 | 200% zoom: nothing cut off or overlapping on the 5 pages | Mac | | none | | | |
| 2 | 400% zoom: content reflows into one column, with no horizontal scrolling except the map | Mac | | none | | | |
| 3 | Reflow at 320 px wide (DevTools device mode or a narrow window) | Mac | | none | | | |
| 4 | Keyboard only, Explore filters: every filter can be reached and changed; the result count updates | Mac | | none | | | |
| 5 | Keyboard only, filter drawer (narrow window): opens, Tab stays inside, Escape closes, focus returns to the button | Mac | | none | | | |
| 6 | Keyboard only, map bottom sheet and summary card (narrow window) | Mac | | none | | | |
| 7 | Keyboard only, map: pins can be reached, a card opens, zoom and Locate work; the list stays usable without the map | Mac | | none | | | |
| 8 | Keyboard only, lightbox: opens from the gallery, arrows move, Escape closes, focus returns to the photo | Mac | | none | | | |
| 9 | Keyboard only, search combobox (header and Home): arrows move through suggestions, Enter opens, Escape closes | Mac | | none | | | |
| 10 | Focus is always visible (light and dark mode) | Mac | | none | | | |
| 11 | Focus is restored when the drawer, search overlay, lightbox and map key close | Mac | | none | | | |
| 12 | Live regions: the result count, "Copied" and the offline notice are announced | Mac | Safari | VoiceOver | | | |
| 13 | Non-drag alternatives: the map can be moved and zoomed with buttons and keys; the bottom sheet opens without dragging | iPhone | Safari | none | | | |
| 14 | Language change: in Bangla mode VoiceOver reads Bangla with a Bangla voice, and Latin names and IDs in English | Mac | Safari | VoiceOver | | | |
| 15 | VoiceOver on iOS: Home → search "Baliati" → site page → gallery → back; Explore filter by division | iPhone | Safari | VoiceOver | | | |
| 16 | TalkBack on Android: the same journey as 15 | Android | Chrome | TalkBack | | | |
| 17 | NVDA on Windows: headings list, landmarks, the Explore filters and results, an itinerary's stops and budget | Windows | | NVDA | | | |
| 18 | VoiceOver on Mac: the same as 17 | Mac | Safari | VoiceOver | | | |

## Bangla rendering on real devices (13.4)

Open Baliati in Bangla mode, and a site whose condition is "ধ্বংসপ্রায়" (In ruins, e.g. from Explore with that filter). Check that conjuncts join correctly: "সংরক্ষিত" (ক্ষ), "ধ্বংসপ্রায়" (ধ্ব, প্র), and the site's Bangla name in the heading. Take a screenshot of each page and save it under `screenshots/a11y/` with the device in the file name.

| # | Device / OS | Browser | Date | Result | Screenshot | Notes |
|---|---|---|---|---|---|---|
| B1 | Android | Chrome | | | | |
| B2 | iPhone | Safari | | | | |

## Blockers fixed and rechecked

| Check # | Finding | Fix (commit) | Recheck date | Result |
|---|---|---|---|---|
| | | | | |

## Open items

Findings that are not blockers, carried forward with a short description and the check number.

- (none yet)
