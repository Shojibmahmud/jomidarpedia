# Bangla device check

**Status:** Approved (by the owner, 2026-10-31)
**Roadmap reference:** `roadmap/DEVELOPMENT_ROADMAP.md` Phase 11a, task **11a.9**, and Phase 13, task **13.4**; `.claude/specs/14-Bangla-prose.md` (NFR-5, AC-15, D-13, OQ-2); `.claude/specs/13-Quality-accessibility-and-security.md` (FR-12, FR-13, AC-6, AC-7, D6, D13)
**Source task:** "**11a.9** Bangla rendering of the new prose on real devices, together with 13.4." and "**13.4** Bangla rendering on real devices (Android Chrome, iOS Safari): conjuncts such as "সংরক্ষিত" and "ধ্বংসপ্রায়" render correctly."
**Branch:** `27-phase-11a-9-device-check`
**Date:** 2026-10-31

## 1. Problem and intended outcome

All 13,340 Bangla prose cells were reviewed by the owner on 30 Oct 2026 (11a.8), and production (`https://jomidarpedia.vercel.app`) serves them with no draft marker. Nobody has yet looked at that prose on a phone. Bangla needs correct conjunct shaping (ক্ষ, ক্ষ্ম, ন্দ্র, ষ্ট্র, reph and ya-phala), and a phone browser can draw it differently from desktop Chromium.

Two further problems were found while preparing the check (31 Oct 2026):

- The 13.4 instructions in `docs/a11y-checks.md` and spec 13 FR-13 name "ধ্বংসপ্রায়", which no longer appears anywhere on the site. The "in ruins" label is now "ধ্বংসাবশেষ" (`lib/i18n.ts`, `condition.in_ruins`).
- Bangla prose shows Latin digits ("1947 সালের", "এপ্রিল 2026") next to labels in Bengali digits ("১৪ অক্টোবর ২০২৬"). This was decision D-13 in spec 14, and spec 14 OQ-2 left the mix open. The owner settled it on 31 Oct 2026: in Bangla mode, prose numbers show Bengali digits too.

**Intended outcome:**

1. The owner has checked the reviewed Bangla on Android Chrome and iOS Safari on 8 representative pages. Each result is recorded in `docs/a11y-checks.md` with a screenshot. Any garbled rendering has been fixed and rechecked. This closes 11a.9 and 13.4.
2. In Bangla mode, numbers in prose show Bengali digits, while IDs, codes, coordinates and URLs keep Latin digits. The data keeps Latin digits.
3. Search accepts a query typed with Bengali digits.
4. An automated test guards Bangla font use and layout on the same pages.

## 2. Scope

### In scope

- The owner's check on real phones, recorded in `docs/a11y-checks.md` as rows P1–P8 per device. These replace rows B1 and B2.
- Committed, resized screenshots under `screenshots/a11y/`.
- Fixing every blocker the check finds, then rechecking it.
- Showing Bengali digits in Bangla-mode prose at render time, with exceptions (FR-8 to FR-12).
- Converting Bengali digits in search queries to Latin before matching (FR-13).
- A Playwright guard for fonts, horizontal overflow and prose digits (FR-14 to FR-16).
- Documentation updates: `docs/TRANSLATION_BN.md`, an amendment to spec 14 D-13 and OQ-2, and spec 13 FR-13's sample words.

### Out of scope

- Roadmap 13.3, including the screen-reader walk-throughs (rows 15 VoiceOver on iOS and 16 TalkBack on Android). They stay in Phase 13.
- Judging the brief first paint in the phone's own font before the web fonts load (`display: swap`).
- Fixing findings that are not blockers, such as awkward line breaks, heading wraps or spacing. These are listed under Open items (spec 13 D13).
- Rewriting digits in `data/translations/bn/*.csv`. The data keeps Latin digits (D-3).
- The English-name-first layout of Explore cards.
- Browsers other than Chrome on Android and Safari on iOS. Desktop browsers are covered by the automated guard and earlier phases.

## 3. User journeys / use cases

- **U1. Owner, phone check.** The owner opens `https://jomidarpedia.vercel.app` on their Android phone in Chrome and switches to বাংলা from the menu. They open each checklist page, scroll through all its sections, and look at the named words and the prose. They take one screenshot per page, then repeat everything on the iPhone in Safari. They report pass or fail per row, and the results are recorded.
- **U2. Owner, recheck.** After a blocker fix is deployed to the branch preview, the owner reopens the failing page on the failing device. The recheck is recorded in its own row.
- **U3. Bangla reader.** A reader in Bangla mode reads "প্রতিষ্ঠা / নির্মাণকাল: ১৮৯৯" and "১৭শ শতক" in a site's history. Site IDs such as `JB-DHK-088` and outlet names such as `bdnews24` stay in Latin script.
- **U4. Bangla reader searching.** The reader types "১৮৯৯" in search and gets the same results as "1899".

## 4. Functional requirements

### Device check

- **FR-1** The check covers these pages in Bangla mode, on production (Assumption A-1):

  | Row | Page | Words to inspect |
  |---|---|---|
  | P1 | `/site/JB-DHK-064/baliati-palace/` | সংরক্ষিত, the Bangla name in the heading, summary, history |
  | P2 | `/site/JB-SYL-005/jalsukha-zamindar-bari-cluster/` | ধ্বংসাবশেষ, সারসংক্ষেপ, প্রত্নতত্ত্ব, any ক্ষ্ম in the prose |
  | P3 | `/site/JB-KHL-031/shilaidaha-rabindra-kuthibari/` | রবীন্দ্র, ষ্ট্র, ন্ধ্য, ত্ত্ব in the summary and history |
  | P4 | `/site/JB-DHK-002/ahsan-manzil/` | মঞ্জিল (ঞ্জ), ক্ষ, জ্ঞ, visiting info, getting there |
  | P5 | `/trips/IT-KHL-026-1/` | the title, planning notes, stop notes |
  | P6 | `/explore/` and `/explore/?view=map&sel=JB-DHK-064` | card text, condition badges, the map summary card |
  | P7 | `/division/sylhet/` | area page text and cards |
  | P8 | `/about/` | the Bangla About page |

- **FR-1a** *(Added 31 Oct 2026, owner's choice.)* The first pass runs on production before this branch ships, so it shows Latin prose digits and Bangla source titles in the phone's own font. After this branch ships, P2 (prose digits) and P4 (Bangla source titles) are rechecked on production on both devices and recorded as rechecks.
- **FR-2** On every page, the owner scrolls through all visible sections. A row **passes** when, on that device, all Bangla text (prose, headings, labels and buttons) shows joined conjuncts, with no separated hasanta (্), no dotted circle (◌) and no empty box (tofu).
- **FR-3** The check judges the page only after it has fully loaded and the web fonts are shown. The brief system-font flash before then is not a finding (D-4).
- **FR-4** Devices: Android with Chrome, and iPhone with Safari (spec 13 D6). Each row records the device model, OS version, browser version, date, result (`pass`, `fail` or `partial`) and the screenshot file name.
- **FR-5** Screenshots are saved under `screenshots/a11y/` as JPEG, resized to about 1000 px wide. They are named `<row>-<page>-<device>.jpg`, for example `P2-jalsukha-android.jpg`. One screenshot per row per device is the minimum; any failure gets a screenshot of the failing text as well.
- **FR-6** A **blocker** is any FR-2 failure on either device. Blockers are fixed on this branch, deployed to the branch preview, and rechecked on the failing device. The recheck goes in the "Blockers fixed and rechecked" table of `docs/a11y-checks.md`, together with the fixing commit. Other findings are listed under "Open items" with their row number (spec 13 FR-12, D13).
- **FR-7** When every P1–P8 row passes on both devices, or passes after recheck, 11a.9 and 13.4 are complete. The 13.4 section of `docs/a11y-checks.md` and spec 13 FR-13 name words the site actually shows, so "ধ্বংসপ্রায়" is replaced by "ধ্বংসাবশেষ".

### Bengali digits in Bangla prose

- **FR-8** In Bangla mode, every Bangla translation shown from `data/translations/bn/` shows the digits 0–9 as ০–৯, except in the cases in FR-10. This covers prose on site, trip, area, Home, Explore and map pages, card one-liners, and photo alt text. The conversion happens at render or build time (D-3). The CSV files are not changed.
- **FR-9** The Bangla About page (`content/about.bn.md`) follows the same rule for its visible text. Link targets are never changed.
- **FR-10** These keep Latin digits:
  1. any whitespace-delimited token that contains both Latin letters and digits (for example `JB-DHK-088`, `(bdnews24),`, `HG57+87`, `AGD.27`, `ADD-10`, `!3d/!4d`, Google place IDs);
  2. URLs (`http://…`, `https://…`);
  3. Bangladeshi phone numbers ("01711-362913", "+880 1711362913"), as `docs/TRANSLATION_BN.md` already keeps them, and so a phone still offers to call them (added during implementation, 31 Oct 2026);
  4. coordinates, as decimal pairs ("23.9174, 90.0622") and degree forms ("23°44‘N", "90°21’E");
  5. text inside a `lang="en"` element (source titles, credits, English fallback prose and IDs rendered through `<Latin>`).
- **FR-11** Only the digit characters change. The decimal point, thousands commas, hyphens in ranges, "+", "%" and the attached Bangla suffixes stay as written: "2.5" → "২.৫", "1,200" → "১,২০০", "18শ-19শ শতক" → "১৮শ-১৯শ শতক", "7:30" → "৭:৩০" (Assumptions A-2, A-3).
- **FR-12** English mode shows exactly what it showed before. The English-fallback prose in Bangla mode (where no valid translation exists, spec 14 FR-15) also stays unchanged, because it is English text in `lang="en"`.

### Search

- **FR-13** Before matching, search converts the Bengali digits ০–৯ in the query to 0–9. A query for "১৮৯৯" returns the same results as "1899", and highlighting (`components/search/Marked.tsx`) marks the matched text as it does for the Latin query. The URL keeps the query as the visitor typed it.

### Automated guard

- **FR-14** A Playwright test opens the FR-1 pages in Bangla mode at 390 px. On each page it checks that every Bangla glyph in the main heading and in the longest Bangla prose block is drawn with Hind Siliguri, Tiro Bangla or the Noto Sans Bengali digit subset. The check reads the browser's own font report (Chromium DevTools protocol `CSS.getPlatformFontsForNode`). Any other font drawing Bangla glyphs fails the test.
- **FR-15** The same test checks that no page has horizontal overflow at 390 px: `document.documentElement.scrollWidth` must not exceed the viewport width.
- **FR-16** A test checks the FR-8 and FR-10 rules on rendered pages. At least one Bangla prose block shows Bengali digits (for example a year in Jalsukha's history), at least one ID, URL or coordinate inside Bangla prose keeps Latin digits, and the same page in English mode shows Latin digits.

## 5. Non-functional requirements

- **NFR-1 (i18n)** The digit rule matches the project rule: numbers on Bangla pages use Bengali digits, while IDs and coordinates keep Latin digits (CLAUDE.md, `lib/format.ts`).
- **NFR-2 (accessibility)** The conversion changes no `lang` attribute. Screen readers keep reading Bangla prose as Bangla, and Latin tokens inside it as they did before.
- **NFR-3 (performance)** The conversion adds no client-side JavaScript dependency. `index.json` stays under its 150 KB gzipped budget, and the digit conversion must not grow it.
- **NFR-4 (CI)** The guard runs in the existing `npm run e2e` job on Chromium (`.github/workflows/ci.yml`). It needs no network access, because the fonts are self-hosted by next/font.
- **NFR-5 (repository size)** All committed screenshots together stay under about 5 MB.

## 6. Data, interfaces, and integrations

- **Translations:** `data/translations/bn/*.csv` (`key, column, bn, status, en_hash`) is unchanged, with Latin digits. On 31 Oct 2026, 4,401 of 13,340 cells contained digits.
- **Rendering:** Bangla prose goes through `Prose` in `components/T.tsx`. Alt text and card one-liners are rendered in `components/home/HomeParts.tsx`, `components/map/SummaryCard.tsx`, `components/site/Related.tsx`, `components/trips/SiteCards.tsx` and `components/trips/ItineraryCard.tsx`, among others. Markdown prose goes through `lib/markdown.tsx`. `lib/format.ts` already exports `bnDigits` (a plain 0–9 → ০–৯ map). The exception-aware conversion belongs next to it, so every caller uses one rule.
- **Search:** the query normaliser in `lib/search.ts` (`createMatcher`, `searchAll`, `marks`). The index (`index.json`) is unchanged.
- **Docs:** `docs/a11y-checks.md` (the 13.4 section is rewritten as P1–P8 per device), `docs/TRANSLATION_BN.md` line 38 (data keeps Latin digits and the display converts them), spec 14 D-13 and OQ-2 (amended and resolved), spec 13 FR-13 (sample words).
- **Deployments:** production `https://jomidarpedia.vercel.app` for the first pass, and this branch's Vercel preview for rechecks.

## 7. Edge cases and failure behavior

- **A Bangla cell made only of an ID or a coordinate.** It stays Latin (FR-10).
- **A token with Bangla attached to Latin, e.g. `bdnews24-এর`.** It contains Latin letters and digits, so it stays Latin (FR-10.1).
- **A number directly followed by a Bangla suffix, e.g. "17শ", "4টি".** It converts to "১৭শ", "৪টি".
- **A number in parentheses or quotes, e.g. "(2016)".** It converts. Only Latin letters in the same token prevent conversion.
- **A decimal number that is not a coordinate, e.g. "2.40 টাকা".** It converts. Only a pair of decimals, or a degree form, counts as a coordinate.
- **Search highlighting.** Bengali and Latin digits are each one UTF-16 code unit, so converting them keeps text offsets aligned.
- **A blocker that appears on only one device.** It is still a blocker. The fix must not break the other device, so both are rechecked.
- **A blocker caused by the platform font rather than the site** (for example, a very old iOS version whose fallback font draws conjuncts wrongly while the web font is still loading). It is out of scope under FR-3, unless the web font itself also renders wrongly.
- **Production changes between the check and the recheck.** The rows record the date and the deployment (production or preview URL).
- **The owner cannot test one device.** The row is left `not checked`, with the reason. 11a.9 and 13.4 stay open until both devices are recorded.

## 8. Acceptance criteria

- **AC-1** (FR-1, FR-2, FR-4, FR-5) `docs/a11y-checks.md` has a P1–P8 row for Android Chrome and one for iOS Safari. Each row has the date, device, OS and browser versions, a result and a screenshot file name, and every named screenshot exists under `screenshots/a11y/`.
- **AC-2** (FR-6) Every `fail` or `partial` row caused by a blocker has a matching recheck row showing `pass` and the fixing commit. Non-blocker findings appear under Open items.
- **AC-3** (FR-7) `docs/a11y-checks.md` and spec 13 FR-13 no longer name "ধ্বংসপ্রায়". Roadmap 11a.9 and 13.4 are ticked only after AC-1 and AC-2 hold.
- **AC-4** (FR-8, FR-11) Unit tests: given Bangla text, the conversion turns "1947 সালের", "এপ্রিল 2026", "17শ শতক", "2.5 কিমি", "1,200 টাকা" and "7:30" into "১৯৪৭ সালের", "এপ্রিল ২০২৬", "১৭শ শতক", "২.৫ কিমি", "১,২০০ টাকা" and "৭:৩০".
- **AC-5** (FR-10) Unit tests: the conversion leaves `JB-DHK-088`, `(bdnews24),`, `bdnews24-এর`, `HG57+87`, `AGD.27`, `https://example.org/a1`, "23.9174, 90.0622" and "23°44‘N, 90°21’E" unchanged when they appear inside Bangla sentences.
- **AC-6** (FR-8, FR-9, FR-12, FR-16) Playwright: in Bangla mode, Jalsukha's history shows a year in Bengali digits, and an ID, URL or coordinate in Bangla prose on a checked page keeps Latin digits. In English mode, the same year is in Latin digits. On the Bangla About page, link `href`s are unchanged.
- **AC-7** (FR-13) Unit test: `searchAll` returns the same site IDs for "১৮৯৯" as for "1899", and for a Bangla query containing Bengali digits as for the same query with Latin digits. `marks` highlights the same spans.
- **AC-8** (FR-14, FR-15) Playwright: on all FR-1 pages in Bangla mode at 390 px, only the allowed fonts draw Bangla glyphs, and there is no horizontal overflow. The test passes in CI.
- **AC-9** (NFR-3) `npm run check:budgets` passes, and `index.json` is no larger than before the change (129.1 KB gzipped on 30 Oct 2026, ± the build's normal variation).
- **AC-10** (NFR-5) The committed screenshots total under about 5 MB.
- **AC-11** `docs/TRANSLATION_BN.md` states that drafts keep Latin digits and the display converts them, with the FR-10 exceptions. Spec 14 D-13 carries an amendment note and OQ-2 is marked resolved, both pointing to this spec.
- **AC-12** The UI verification checklist in CLAUDE.md passes for the changed pages: 390 px light and dark, and desktop width.

## 9. Dependencies, constraints, and assumptions

### Dependencies

- The owner's Android phone with Chrome and iPhone with Safari, and time to check 8 pages on each.
- Production serving the reviewed prose (confirmed 31 Oct 2026: no draft marker on Jalsukha, and the reviewed text is present).
- A Vercel preview of this branch for rechecks after the digit change and after any blocker fix.

### Constraints

- Fonts: `app/fonts.ts`. Tiro Bangla is used for Bangla headings and Hind Siliguri for Bangla body text, with Noto Serif Bengali and Noto Sans Bengali as fallbacks. A Noto Sans Bengali digit subset is placed first by `unicode-range`. The Bangla fonts are not preloaded (`preload: false`, `display: swap`).
- Bangla mode is a stored preference (`jp-lang` in localStorage, `lib/prefs.ts`) with no separate URL. On a phone, the owner switches it once from the menu.
- `next build` runs outside the sandbox. On this machine Turbopack fails to bind a port, so the webpack build (`npx next build --webpack`) is the fallback.
- `CSS.getPlatformFontsForNode` exists only in Chromium, which is the only Playwright project (`playwright.config.ts`).
- Desktop pre-check, 31 Oct 2026, local build of `main` at `f87a067`, Chromium. All 13 pages passed at 390 px in light and dark and at 1440 px in light:
  - no page overflow;
  - no axe colour-contrast violations;
  - no JavaScript errors;
  - Bangla glyphs drawn only with Tiro Bangla, Hind Siliguri and the Noto digit subset.

### Assumptions (not yet confirmed)

- **A-1** The FR-1 page list and the words named for each page are enough to cover the reviewed prose tables and the interface.
- **A-2** The decimal point stays ".", and thousands commas stay as written in the translation.
- **A-3** Clock times ("৭:৩০") and centuries ("১৭শ শতক") convert like any other number.

## 10. Key decisions and rationale

| # | Decision | Rationale |
|---|---|---|
| D-1 | This phase closes both 11a.9 and 13.4, and rows P1–P8 replace B1 and B2. | It is the same check on the same devices. One session covers the interface and the prose. |
| D-2 | Garbled Bangla is a blocker and is fixed here. Other findings are listed. | Matches spec 13 D13, and keeps the phase bounded. |
| D-3 | Prose digits are converted at display time, and the data keeps Latin digits. | Keeps D-13's original reason, easy matching against English sources for the owner and future drafts. It also avoids rewriting 4,401 reviewed cells. |
| D-4 | Only the final render is judged. | The system-font flash is expected with `display: swap`, and the platform's fallback fonts are outside the site's control. |
| D-5 | Tokens with Latin letters, URLs, coordinates and `lang="en"` text keep Latin digits. | Follows the project rule that IDs and coordinates keep Latin digits. Outlet names such as bdnews24 are proper names in Latin script. |
| D-6 | Search converts Bengali digits in the query to Latin. | Readers can type what they see on the page, and the index stays unchanged. |
| D-7 | Screenshots are committed, resized to about 1000 px JPEG. | They are evidence for the record, and the size keeps the public repository small. They show only the public site. |
| D-8 | A Playwright font and overflow guard is added. | It stops a later font or CSS change from silently breaking Bangla in CI. The phones remain the real check. |
| D-9 | The 13.3 screen-reader walk-throughs stay out of scope. | They come with their own fixes, and including them would widen this phase. |

## 11. Open questions

None blocking. Assumptions A-1 to A-3 await the owner's acceptance with this spec.
