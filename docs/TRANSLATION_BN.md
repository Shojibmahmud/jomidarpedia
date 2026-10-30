# Bangla translation rules

How the Bangla text in `data/translations/bn/` is drafted and checked. The spec is `.claude/specs/14-Bangla-prose.md`. These rules apply to every draft, whoever writes it.

## Workflow

1. `npm run bn -- todo <table> [column]` writes `data/translations/todo/<table>[.<column>].json`. It lists every cell that is missing, outdated (the English changed) or invalid, grouped by identical English.
2. Draft the Bangla into a JSON list:
   - `{ "en": "…", "bn": "…" }` fills every shown cell of the table with exactly that English.
   - `{ "key": "JB-DHK-064", "column": "short_description", "bn": "…" }` fills one cell.
3. `npm run bn -- merge <table> <drafts.json>` writes `data/translations/bn/<table>.csv`:
   - It fingerprints each cell's current English (`en_hash`).
   - New and changed rows are `draft`.
   - A `reviewed` row stays reviewed unless its Bangla changes.
4. `npm run data` checks the files and reports coverage in `data/reports/release-problems.md`.
5. The owner reviews one table at a time on `/dev/bn-review/` (local and preview builds). Approved rows become `reviewed`, either through `npm run bn -- approve <table> [column] [key …]` or by editing the CSV.

Never type `en_hash` by hand. When the English changes, the old Bangla stops showing until it is drafted again.

## What the build checks

A translation shows only when all of these hold. Otherwise the English shows, and the page's note says part of it is still in English.

- The fingerprint matches the current English.
- It has no internal-note term (`scripts/lib/internal-terms.mjs`).
- It never says entry is free: "বিনামূল্যে", "ফ্রি" and "প্রবেশ ফি নেই" are rejected. A fee of 0 is "টিকিটের খবর নেই" (no ticket reported), as in English.
- It keeps the English structure where the page splits the text:
  - `travel_routes.route_description` has the same number of `->` steps;
  - `claims.claim_text` keeps "Field: version vs version", with the same number of versions. "বনাম" may replace "vs".
  - `sites.unverified_fields` has the same number of `;`-separated items. Bare field names (`history.founder`) already have Bangla labels, so only the items with extra words matter.

## Writing rules

- **Register:** plain, neutral encyclopedia Bangla (চলিত ভাষা), in short sentences. Avoid literal calques and English word order.
- **Uncertainty stays.** "reportedly", "c.", "said to be", "single source", "not verified" all carry over, for example "কথিত আছে", "আনুমানিক", "একটি সূত্রমতে", "যাচাই হয়নি". Never make a claim sound surer than the English.
- **Names in Bangla script.** Use the dataset's Bangla names first: `sites.name_bn`, `district_bn`, `upazila_bn`, `union_bn` and `locality_bn`. Otherwise use the standard Bangla spelling of a person, family or place (লক্ষ্মণ সাহা, রায়চৌধুরী). Don't add the English in brackets.
- **Titles stay as published.** Titles of books, articles, newspapers and websites, and publishers, stay in their original language and script (*Daily Janakantha*, Banglapedia). The sentence around them is translated.
- **Numbers stay in Latin digits in the files:** 1889, 200 ফুট, 50 টাকা, 2.5 ঘণ্টা. The site shows them in Bengali digits in Bangla mode (১৮৮৯, ২.৫ ঘণ্টা), so write them in Latin and never convert them yourself. Digits stay Latin on the page in IDs, codes and any word with Latin letters (bdnews24, HG57+87), URLs, coordinates and phone numbers (spec 15 FR-10). Units and currency are Bangla words: "Tk" becomes "টাকা", "km" becomes "কিমি", "feet" becomes "ফুট". "c. 1850" becomes "আনু. 1850". BS dates keep the Bangla month: 1 বৈশাখ 1300 বঙ্গাব্দ.
- **Never translated:** IDs (`JB-DHK-064`, `SRC-0001`), URLs, coordinates, phone numbers, and image credit lines (licences require them word for word).
- **Sentence ends:** "।" (dari). A question ends with "?".
- **Opening hours:** clock times stay as written, with Bangla words around them ("সকাল 10টা থেকে বিকেল 5টা"; days as শনিবার … শুক্রবার).
- **Trip titles:** translate the whole `title` cell, keeping its brackets. The site cuts the displayed title from it the same way it cuts the English one.
- **Recurring terms:** use one rendering throughout. zamindar is জমিদার, zamindari is জমিদারি, rajbari is রাজবাড়ি, kachari is কাছারি, palace is প্রাসাদ, Indo-Saracenic is ইন্দো-সারাসেনিক, debottar is দেবোত্তর, union parishad is ইউনিয়ন পরিষদ. Nothing enforces these, since there is no glossary (spec 14 D-8); keep them consistent within a table.
