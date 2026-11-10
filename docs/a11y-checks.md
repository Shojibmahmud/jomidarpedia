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
| 1 | 200% zoom: nothing cut off or overlapping on the 5 pages | Mac | Playwright 1.64.1 Chromium, macOS 27.0.1 | none | 9 Nov 2026 | pass | Production, the 5 pages. 200% zoom on a 1280×800 screen is a 640×400 CSS-pixel viewport, which is what was used. No horizontal scrolling on any page; the menu button stays on screen; screenshots checked for clipped or overlapping text: none. |
| 2 | 400% zoom: content reflows into one column, with no horizontal scrolling except the map | Mac | Playwright 1.64.1 Chromium, macOS 27.0.1 | none | 9 Nov 2026 | pass | Production, the 5 pages at 320×200 CSS px (400% of 1280×800). One column, no horizontal scrolling. On Explore the floating "Map" button covers a line of the heading while it is in view (Open items). |
| 3 | Reflow at 320 px wide (DevTools device mode or a narrow window) | Mac | Playwright 1.64.1 Chromium, macOS 27.0.1 | none | 9 Nov 2026 | pass | Production, the 5 pages at 320×640, light and dark: no horizontal scrolling, menu on screen; long licence URLs wrap. |
| 4 | Keyboard only, Explore filters: every filter can be reached and changed; the result count updates | Mac | Brave 156 (Chromium), macOS 27.0.1 | none | 9 Nov 2026 | pass | Explore at 1440 px. Tab reaches the search box, Day trips, every travel-time, condition, access and division filter and "More"; Space toggles them. Turning on "Lost" set the URL to `?cond=lost` and the count to ৮টি বাড়ি in the polite live region; off again, ৪১৩টি. |
| 5 | Keyboard only, filter drawer (narrow window): opens, Tab stays inside, Escape closes, focus returns to the button | Mac | Brave 156 (Chromium), macOS 27.0.1 | none | 9 Nov 2026 | pass | Explore at 600 px. Enter on Filters opens the drawer with focus on its heading; 60 Tabs stayed inside it; Escape closes it and focus returns to Filters. |
| 6 | Keyboard only, map bottom sheet and summary card (narrow window) | Mac | Brave 156 (Chromium), macOS 27.0.1 | none | 9 Nov 2026 | pass | Explore map view at 600 px. "Show more results" (the sheet handle) expands the sheet with Enter, `aria-expanded` true, focus to the "413 sites" heading. "Show on map" on a card opens the summary card; its Close, Read more and Directions are reachable; Escape closes it and focus goes to the pin. Focus is not moved into the card when it opens (Open items). |
| 7 | Keyboard only, map: pins can be reached, a card opens, zoom and Locate work; the list stays usable without the map | Mac | Brave 156 (Chromium), macOS 27.0.1 | none | 9 Nov 2026 | pass | Explore at 1440 px. Tab reaches the map, every cluster and pin (named, e.g. "৬৩টি বাড়ির গুচ্ছ। কাছে যান"), the attribution, Zoom in/out, Locate, Base map and Map key, then the result list. Enter on a cluster zooms in; Enter on a pin opens its card with focus inside; Escape returns focus to the pin. Zoom buttons changed the zoom 7 → 8 → 7; arrow keys pan the focused map. Locate announced "Finding your location…" then "Your location isn't available". The list stays usable without the map. After Enter on a cluster, focus drops to the page (Open items). |
| 8 | Keyboard only, lightbox: opens from the gallery, arrows move, Escape closes, focus returns to the photo | Mac | Brave 156 (Chromium), macOS 27.0.1 | none | 9 Nov 2026 | pass | Baliati. Tab reaches "Open photo 1 of 15" and the rest; Enter on photo 5 opens the lightbox with focus on Close ("5 of 15"); Right and Left move (6, then 4); Tab stays inside; Escape closes it and focus returns to the photo 5 link. |
| 9 | Keyboard only, search combobox (header and Home): arrows move through suggestions, Enter opens, Escape closes | Mac | Brave 156 (Chromium), macOS 27.0.1 | none | 9 Nov 2026 | pass | Home: "bali" opens 9 suggestions (`aria-expanded` true); Down moves `aria-activedescendant` through them; Escape closes the list; "baliati" + Down + Enter opens the Baliati page. Header: the Search button opens the overlay, "saha" + Down ×3 highlights Kumari Saha Zamindar Bari; Escape closes the list, a second Escape the overlay. |
| 10 | Focus is always visible (light and dark mode) | Mac | Brave 156 (Chromium), macOS 27.0.1 | none | 9 Nov 2026 | pass | Light: header links, Home cards (a ring inside the photo card), the search box, Share / Suggest a correction and the lead photo all show a clear ring. Dark: filter chips, the map key button, the lightbox links and the Source link do too. |
| 11 | Focus is restored when the drawer, search overlay, lightbox and map key close | Mac | Brave 156 (Chromium), macOS 27.0.1 | none | 9 Nov 2026 | pass | Filter drawer → Filters button; search overlay → Search button; lightbox → the photo link that opened it; map key (a disclosure) → focus stays on its button, Escape closes it; summary card → its pin. |
| 12 | Live regions: the result count, "Copied" and the offline notice are announced | Mac | Brave 156 (Chromium), macOS 27.0.1 | VoiceOver | 10 Nov 2026 | pass | The owner ran VoiceOver; Claude chose the steps and judged the captions. Explore in Bangla: the day-trip switch is read "off, ঢাকা থেকে দিনে দিনে · দিনে গিয়ে দিনে ফেরা · ১৩২, switch"; turning it on and off announced the new count (১৩২টি / ৪১৩টি বাড়ি). "এই দৃশ্যের লিংক কপি" announced the copied message. Turning Wi-Fi off announced the offline notice. |
| 13 | Non-drag alternatives: the map can be moved and zoomed with buttons and keys; the bottom sheet opens without dragging | Android (planned on iPhone) | Chrome | none | | | Moved to Android: no iPhone is available (owner, 11 Nov 2026). |
| 14 | Language change: in Bangla mode VoiceOver reads Bangla with a Bangla voice, and Latin names and IDs in English | Mac | Brave 156 (Chromium), macOS 27.0.1 | VoiceOver | 10 Nov 2026 | pass | Bangla mode. The Home heading "বাংলাদেশের জমিদার বাড়ি" was read in a Bangla voice; the division heading "ঢাকা Dhaka" switched voice mid-line, ঢাকা in Bangla and Dhaka in English. |
| 15 | VoiceOver on iOS: Home → search "Baliati" → site page → gallery → back; Explore filter by division | iPhone | Safari | VoiceOver | 11 Nov 2026 | waived | No iPhone is available (owner, 11 Nov 2026). **Waived for v1.0.0**; row 16 (TalkBack) covers a phone screen reader on the same journey, and row 18 VoiceOver on the Mac. |
| 16 | TalkBack on Android: the same journey as 15 | Android | Chrome | TalkBack | | | |
| 17 | NVDA on Windows: headings list, landmarks, the Explore filters and results, an itinerary's stops and budget | Windows | | NVDA | 9 Nov 2026 | waived | No Windows PC is available (owner, 9 Nov 2026). Row 18, VoiceOver on Mac, is the desktop screen-reader check instead. **Waived for v1.0.0 by the owner on 10 Nov 2026**; NVDA moves to after the MVP. |
| 18 | VoiceOver on Mac: the same as 17 | Mac | Brave 156 (Chromium), macOS 27.0.1 | VoiceOver | 10 Nov 2026 | pass | Bangla mode, owner at the keys, judged from the caption panel. Home: one level-1 heading, sections at level 2 and their cards and divisions at level 3; landmarks banner, main navigation, main, search, named regions and footer; link names make sense out of context. Explore: the filter switch has name, description, role and state; result cards are links named in English and Bangla. Trip IT-DHK-010-1: headings for the houses, the budget, the timeline and the sources; each stop reads time, number, place, type, note; the budget table reads each cell with its column heading. Minor naming points under Open items. |

Rows 1–11 were done by Claude on 9 Nov 2026 against production: rows 1–3 with a Playwright script at the viewport sizes that 200% and 400% zoom produce (the desktop browser window cannot be made 320 px wide), rows 4–11 in the owner's browser with real key presses. Rows 12, 14 and 18 were done on 10 Nov 2026 with VoiceOver in Brave: the owner pressed the keys and sent the caption panel, and Claude chose the steps and judged the result. Rows 13, 15 and 16 need the phones. Row 13 was also tried with the keyboard in that browser: the zoom buttons, arrow-key panning and the sheet's button all work without dragging.

## Bangla rendering on real devices (13.4 and 11a.9)

Spec `.claude/specs/15-Bangla-device-check.md`. This check covers the interface (13.4) and the reviewed Bangla prose (11a.9).

Testers get a fillable PDF guide for their phone: `docs/testing/jomidarpedia-android-test-guide.pdf` (Chrome) and `docs/testing/jomidarpedia-iphone-test-guide.pdf` (Safari). Their rows P1–P8 match the table below, and they add extra checks E1–E4 (dark mode, sideways, larger text, search with Bangla digits). Copy their results into the table and their notes under Open items or Blockers.

**How to check.** Open https://jomidarpedia.vercel.app on the phone and choose বাংলা from the menu once; the choice is remembered. Open each page below, wait until it has fully loaded, and scroll through every section. Recheck a fix on the branch's Vercel preview instead.

The owner shipped spec 15 before the phone check, so testers without a Vercel login could use production. The results below are from the new build (the screenshots show Bengali digits in prose), so P2 and P4 need no separate recheck.

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

Save one screenshot per row and phone as `<row>-<page>-<device>.jpg` (for example `P2-jalsukha-android.jpg`), and one more of any failing text. The originals stay in the owner's private Drive folder "Jomidar pedia user testing", not in this repository (spec 15 D-7, amended 5 Nov 2026); the Screenshot columns below name files there.

Record the phone model, OS version and browser version once per device:

- Android: Samsung Galaxy S24 Ultra, Android 17, Chrome 156.0.8078.73
- iPhone: iPhone 11 Pro Max, iOS 18.1.1, Safari 18.1.1

| Row | Device | Date | Deployment | Result | Screenshot | Notes |
|---|---|---|---|---|---|---|
| P1 | Android · Chrome | 31 Oct 2026 | production | pass | P1-baliati-android-1.jpg, -2.jpg |  |
| P2 | Android · Chrome | 31 Oct 2026 | production | pass | P2-jalsukha-android-1.jpg, -2.jpg |  |
| P3 | Android · Chrome | 31 Oct 2026 | production | pass | P3-shilaidaha-android-1.jpg, -2.jpg |  |
| P4 | Android · Chrome | 31 Oct 2026 | production | pass | P4-ahsan-manzil-android-1.jpg, -2.jpg |  |
| P5 | Android · Chrome | 31 Oct 2026 | production | pass | P5-trip-android-1.jpg, -2.jpg |  |
| P6 | Android · Chrome | 31 Oct 2026 | production | pass | P6-explore-android-1.jpg, -2.jpg, -3.jpg | Includes the filter sheet and the map card. |
| P7 | Android · Chrome | 31 Oct 2026 | production | pass | P7-sylhet-android.jpg | Tester: "the introduction text is very brief" (see Open items). |
| P8 | Android · Chrome | 31 Oct 2026 | production | pass | P8-about-android.jpg |  |
| P1 | iPhone · Safari | 5 Nov 2026 | production (before the Android fixes) | pass | IMG cf8db33c, 011c5c2f |  |
| P2 | iPhone · Safari | 5 Nov 2026 | production (before the Android fixes) | fail | IMG 904b3b6e, 12f8dbed | Dotted circle (◌) in the location note: the translation had "Googleে", a vowel sign on a Latin word. Tester's note: "in obosthan : Google". Blocker, fixed (see below). |
| P3 | iPhone · Safari | 5 Nov 2026 | production (before the Android fixes) | pass |  |  |
| P4 | iPhone · Safari | 5 Nov 2026 | production (before the Android fixes) | partial | IMG cb20893f | Tester marked a problem with the same note as P2 ("in obosthan: Google"). Ahsan Manzil's location text has no "Google", and the screenshot of it renders correctly. To confirm with the tester at the recheck. |
| P5 | iPhone · Safari | 5 Nov 2026 | production (before the Android fixes) | pass |  |  |
| P6 | iPhone · Safari | 5 Nov 2026 | production (before the Android fixes) | pass |  |  |
| P7 | iPhone · Safari | 5 Nov 2026 | production (before the Android fixes) | pass |  |  |
| P8 | iPhone · Safari | 5 Nov 2026 | production (before the Android fixes) | pass |  |  |
| P2, recheck | iPhone · Safari | 9 Nov 2026 | production | pass | owner screenshot, 11:44 | Location note reads "Google-এ" with no dotted circle; conjuncts (স্থানাঙ্ক, আজমিরীগঞ্জ) correct. Closes the P2 blocker. |
| P4, recheck | iPhone · Safari | 9 Nov 2026 | production | pass | owner screenshot, 11:45 | Ahsan Manzil location panel renders correctly (মঞ্জিল, নিশ্চিত, বুড়িগঙ্গা). Settles the 5 Nov "in obosthan: Google" note. |

**Extra checks**

| Check | Device | Date | Result | Screenshot | Notes |
|---|---|---|---|---|---|
| E1 dark mode (P2, P4) | Android · Chrome | 31 Oct 2026 | pass | E1-jalsukha-android.jpg, E1-ahsan-android.jpg | |
| E2 sideways (P1) | Android · Chrome | 31 Oct 2026 | pass | E2-baliati-android.jpg | |
| E3 larger text (P3) | Android · Chrome | 31 Oct 2026 | partial | E3-shilaidaha-android.jpg, E3-shilaidaha-android-sidescroll.jpg | Tester marked OK. Text wraps and conjuncts are correct, but the screenshots show the page scrolling sideways (see Open items). |
| E3 larger text (P3), recheck | Android · Chrome | 9 Nov 2026 | pass | shilaidaha-150-percent.jpeg | Production, Bangla, dark mode, 150% text. The page fits the screen: the logo text shortens ("JOMI…") and the search and menu buttons stay on screen; long licence URLs wrap. One screenshot of the top of the page, down to the photo credits. Closes the 31 Oct sideways-scroll finding. |
| E4 search ১৮৪০ | Android · Chrome | 31 Oct 2026 | pass | E4-search-android.jpg | Ruplal House is first; the other three results have 1840 in their family history. |
| E1 dark mode (P2, P4) | iPhone · Safari | 5 Nov 2026 | pass | | |
| E2 sideways (P1) | iPhone · Safari | 5 Nov 2026 | pass | | |
| E3 larger text (P3) | iPhone · Safari | 5 Nov 2026 | pass | | |
| E4 search ১৮৪০ | iPhone · Safari | 5 Nov 2026 | pass | | |

Android results come from the tester's filled PDF. Claude also read 19 of the screenshots or slices of them, covering part of every page but not all of each long capture, and found no broken conjuncts, dotted circles or boxes.

iPhone results come from the tester's filled PDF and 39 screenshots, which have generated names (`IMG` plus the first part of the name above). Claude looked at all 39 at small size and zoomed into the marked ones. The iPhone check ran on production before the Android fixes were shipped (history years were still in Latin digits), so it does not cover them.

**Desktop pre-check, 31 Oct 2026** (Chromium, local build, 390 px light and dark and 1440 px light, all 13 pages): no horizontal overflow, no axe colour-contrast violations, no script errors, and every Bangla glyph drawn with the site's fonts once Bangla source titles were moved onto them. `e2e/bangla-device.spec.ts` repeats the font and overflow checks in CI.

## Blockers fixed and rechecked

| Check # | Finding | Fix (commit) | Recheck date | Result |
|---|---|---|---|---|
| 13.3 row 11 (Mac) | The open map key ran past the top of a short map: at 600×733 its top 115 px were behind the site header and the Filters button, so the condition colours could not be read. | The key now fills the map's height below the top-left controls and scrolls (`components/map/MapControls.tsx`); `e2e/map.spec.ts` checks it at 600×733. On `32-a11y-manual-checks`, 9 Nov 2026. | | pending |
| P2 (iPhone) | "Googleে" in the Bangla location note of JB-SYL-005: a vowel sign after a Latin word, drawn on a dotted circle. Android P2 passed on the same text, so Chrome either drew it differently or the tester missed it. The same fault was in claim CL-DHK-005-008 ("Offroad Bangladeshে"). | Both rows now read "-এ". A translation with a vowel sign that has no Bangla letter before it is now invalid, so the English shows, and a unit test scans every translation file and interface string (`scripts/lib/translations.mjs`, `tests/bangla.test.tsx`). Shipped on `28-mobile-test-checklists`, 9 Nov 2026. | 9 Nov 2026 | pass |

## Fixed after the Android check

Not blockers. Fixed on 5 Nov 2026 on `28-mobile-test-checklists`, with automated tests. They need a look on the phones once shipped: the iPhone check covers them, and Android repeats E3.

| Check | Finding | Fix | Automated check |
|---|---|---|---|
| E3 | At 150% text the page scrolled sideways and the menu button moved off screen | The logo text now shortens to fit, the section selector can shrink, and the footer, About and site page columns stay within the screen | `e2e/bangla-device.spec.ts`: no overflow and the menu on screen at 150%, 384 px, both languages, on 5 pages. This emulates Chrome's Text scaling; it is not the phone itself |
| P1–P4 | Plain history years in Latin digits | Each computed year now has a Bangla form: 1,521 of 1,521 | `e2e/bangla-device.spec.ts` |
| P1, P5 | Latin route step numbers and clock times | Step numbers use Bengali digits; `formatClock` gives "সকাল ৮:০০" on trip pages and previews | `tests/format.test.ts`, `e2e/bangla-device.spec.ts` |
| P2 | English visitor-photo buttons | Now interface strings, in Bangla in Bangla mode (draft wording, marked for review) | `e2e/bangla-device.spec.ts` |
| P6 | Two Bangla labels for one condition | The owner chose the badge wording: the Explore filter and the Home badge now say "ধ্বংসাবশেষ", and the filter says "সংরক্ষিত, নতুন ব্যবহারে" | |

## Fixed after the manual checks (13.3)

Not blockers. Fixed on 10 Nov 2026 on `32-a11y-manual-checks`, each with a Playwright test in `e2e/a11y-names.spec.ts` that fails on the old code.

| Row | Finding | Fix |
|---|---|---|
| 7 | After Enter on a map cluster, the cluster was removed and focus dropped to the page | Focus moves to the cluster's first site: its pin, or the smaller cluster that now holds it (`components/map/MapView.tsx`) |
| 6 | At narrow widths, "Show on map" opened the summary card but left focus on the page | When the list gives way to the map, the card takes focus (`components/explore/ExploreApp.tsx`) |
| 18 | The logo link was read with its name twice | The visible lockup is hidden from screen readers; the link is "Jomidarpedia home" / "জমিদারপিডিয়া প্রথম পাতা" |
| 18 | Home's map link ran two labels together ("বাংলাদেশ-এর মানচিত্র মানচিত্রে ৩০৫টি") | One name: "Map of Bangladesh: 305 sites" / "বাংলাদেশ-এর মানচিত্রে ৩০৫টি বাড়ি" (new string `area.mapLink`, marked for review) |
| 18 | Home's trip and site cards were bare "article" landmarks | Each card is named by its heading |
| 18 | The trip budget table had no name | It has the caption "Rough budget" / "আনুমানিক খরচ" for screen readers |

## Open items

Findings that are not blockers, carried forward with a short description and the check number.

- **13.4 / 11a.9 desktop pre-check (31 Oct 2026):** in Bangla mode, footnote markers in prose (¹²) and the numbers of the Sources list are still in Latin digits. Prose numbers are Bengali since spec 15; these markers are generated by code and were outside that spec.
- **P5, 5 Nov 2026:** the numbers on the trip map's pins are still in Latin digits in Bangla mode (`components/trips/RouteMapView.tsx`), like the footnote markers above.
- **E3, emulated 200% text at 384 px, 5 Nov 2026:** after the 150% fix, some pages still scroll sideways by up to 84 px: the Home hero, Explore cards, the trip budget table, a few site badges and an About link. Nothing here was seen on a phone, and 200% is above what the tester used.
- **P4 recheck, iPhone, 9 Nov 2026 (fixed on `30-unknown-place-values`):** Ahsan Manzil's English address read "Islampur (Old Dhaka), Unknown, Kotwali Thana". The sheet writes "Unknown" for an unknown union (129 sites) or upazila (5 sites), and the site showed it as a place name in the address, the breadcrumb and the cards. The data build now leaves such names out (`placeName` in `scripts/lib/rules.mjs`; test in `tests/rules.test.ts`).
- **13.3 row 2, 9 Nov 2026:** at 400% zoom on Explore, the floating "Map" button covers about one line of the content behind it while it is in view. The content scrolls out from under it.
- **P7, Android:** the tester finds the area introduction very brief. It is a generated count ("৪টি জেলায় ২৮টি জমিদার বাড়ি…"), so this is a content matter, not a display fault.
