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

## Bangla rendering on real devices (13.4 and 11a.9)

Spec `.claude/specs/15-Bangla-device-check.md`. This check covers the interface (13.4) and the reviewed Bangla prose (11a.9).

**How to check.** Open https://jomidarpedia.vercel.app on the phone and choose বাংলা from the menu once; the choice is remembered. Open each page below, wait until it has fully loaded, and scroll through every section. Recheck a fix on the branch's Vercel preview instead.

The first pass (owner's choice, 31 Oct 2026) is on production as it was before spec 15 shipped, so prose there still shows Latin digits and Bangla source titles still use the phone's own font. After spec 15 ships, recheck P2 (Bengali digits in prose) and P4 (Bangla source titles) on production on both phones, and record them under "Blockers fixed and rechecked" even if they pass.

A row **passes** when all Bangla text on the page (headings, prose, labels and buttons) shows joined conjuncts, with no separated hasanta (্), no dotted circle (◌) and no empty box. A brief moment in the phone's own font before the page's fonts load doesn't count. Any failure is a blocker (see "How to record a check").

| Row | Page | Look closely at |
|---|---|---|
| P1 | `/site/JB-DHK-064/baliati-palace/` | সংরক্ষিত, the Bangla name in the heading, the summary and history |
| P2 | `/site/JB-SYL-005/jalsukha-zamindar-bari-cluster/` | ধ্বংসাবশেষ, সারসংক্ষেপ, প্রত্নতত্ত্ব, years such as ১৯৪৭ |
| P3 | `/site/JB-KHL-031/shilaidaha-rabindra-kuthibari/` | রবীন্দ্র, ষ্ট্র, ন্ধ্য, ত্ত্ব in the summary and history |
| P4 | `/site/JB-DHK-002/ahsan-manzil/` | মঞ্জিল (ঞ্জ), ক্ষ, জ্ঞ, visiting info, getting there, the Bangla source titles |
| P5 | `/trips/IT-KHL-026-1/` | the title, planning notes and stop notes |
| P6 | `/explore/`, then `/explore/?view=map&sel=JB-DHK-064` | card text, condition badges, the map's summary card |
| P7 | `/division/sylhet/` | the area text and its cards |
| P8 | `/about/` | the Bangla About page |

Save one screenshot per row and phone under `screenshots/a11y/` as `<row>-<page>-<device>.jpg` (for example `P2-jalsukha-android.jpg`), and one more of any failing text. They are resized to about 1000 px wide before they are committed.

Record the phone model, OS version and browser version once per device:

- Android: model ________, Android ____, Chrome ____
- iPhone: model ________, iOS ____, Safari ____

| Row | Device | Date | Deployment | Result | Screenshot | Notes |
|---|---|---|---|---|---|---|
| P1 | Android · Chrome | | production | | | |
| P2 | Android · Chrome | | production | | | |
| P3 | Android · Chrome | | production | | | |
| P4 | Android · Chrome | | production | | | |
| P5 | Android · Chrome | | production | | | |
| P6 | Android · Chrome | | production | | | |
| P7 | Android · Chrome | | production | | | |
| P8 | Android · Chrome | | production | | | |
| P1 | iPhone · Safari | | production | | | |
| P2 | iPhone · Safari | | production | | | |
| P3 | iPhone · Safari | | production | | | |
| P4 | iPhone · Safari | | production | | | |
| P5 | iPhone · Safari | | production | | | |
| P6 | iPhone · Safari | | production | | | |
| P7 | iPhone · Safari | | production | | | |
| P8 | iPhone · Safari | | production | | | |

**Desktop pre-check, 31 Oct 2026** (Chromium, local build, 390 px light and dark and 1440 px light, all 13 pages): no horizontal overflow, no axe colour-contrast violations, no script errors, and every Bangla glyph drawn with the site's fonts once Bangla source titles were moved onto them. `e2e/bangla-device.spec.ts` repeats the font and overflow checks in CI.

## Blockers fixed and rechecked

| Check # | Finding | Fix (commit) | Recheck date | Result |
|---|---|---|---|---|
| | | | | |

## Open items

Findings that are not blockers, carried forward with a short description and the check number.

- **13.4 / 11a.9 desktop pre-check (31 Oct 2026):** in Bangla mode, footnote markers in prose (¹²) and the numbers of the Sources list are still in Latin digits. Prose numbers are Bengali since spec 15; these markers are generated by code and were outside that spec.
