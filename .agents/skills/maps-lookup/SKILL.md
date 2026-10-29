---
name: maps-lookup
description: Find Google Maps pins for a list of heritage sites (zamindar houses, temples, mosques) in the browser, in small resumable batches that stop cleanly at a CAPTCHA. Use when the user says "maps lookup", "find the pins", "geolocate these sites", or hands over a district list to locate.
argument-hint: "[site list, file path, or district]"
---

# maps-lookup

Look up Google Maps pins for heritage sites, at most **5 sites per run**, saving after every site so an interruption never loses finished work.

Arguments (optional): `$ARGUMENTS` — the sites to look up: a list, a file path, or a district plus where its list lives. If nothing tells you which sites, ask.

## 1. Load the queue and the progress file

- Progress file: `research/maps-lookups.json`, unless the task names another. Create it as `[]` if it doesn't exist. Each entry:
  ```json
  {"id": "JB-RNG-012", "name": "…", "district": "…", "status": "exact|likely|village|not_found",
   "lat": 25.75, "lng": 89.25, "url": "https://maps.google.com/…", "plus_code": "…",
   "evidence": "one line: what matched", "checked_at": "2026-10-30T10:00:00Z"}
  ```
- Drop every site already in the file. If nothing is left, the work is done: point to the existing results instead of searching again. This also covers a repeated "go" message.
- Take the first 5 remaining sites. Say which ones, and how many are left after this batch.

## 2. Search, one site at a time

- Use the Chrome browser tools in a new tab. Stay read-only: search and look, never sign in, review, save or edit.
- Search the site name with its upazila or district (in English, then in Bangla if that fails). Wait at least 20 seconds between searches.
- Classify:
  - **exact**: a pin named for this house or site, in the right place
  - **likely**: a nearby pin or landmark that probably is it; flag it for the owner to confirm
  - **village**: no pin for the site itself, only its village or union
  - **not_found**
- Append the entry to the progress file **right after each site**, before starting the next one.

## 3. Stop rules

- On a CAPTCHA, an "unusual traffic" page, or a sign-in wall: **stop at once.** Don't retry or work around it. Report what's done and what's left.
- If a search cap was given (e.g. "6 searches max"), count every search against it.

## 4. Report once

Post one table to the thread that asked, then close the tab:

| Site | Status | lat, lng | Maps URL or plus code |
|---|---|---|---|

Under it, list the "likely" rows that need confirming, and how many sites remain in the queue. Send the report only once.
