# Security headers and checks

Roadmap tasks 13.7 to 13.10; spec `.claude/specs/13-Quality-accessibility-and-security.md` FR-22 to FR-33.

The site is a static export served by Vercel. There are no accounts, no cookies and no analytics. The one form that sends data elsewhere is the correction form, which posts to Web3Forms (`https://api.web3forms.com`), which emails it to the project address. The headers below are set for every path in `vercel.json`. `serve.json` is a copy of them for the Playwright test server, and `tests/release-checks.test.ts` fails if the two differ.

## Assets the export uses (FR-22)

Scanned on 26 Oct 2026 in two ways: over `out/`, and against the code that loads things at runtime.

| Kind | Origins | Where |
|---|---|---|
| Scripts | `'self'` (`/_next/static/chunks/…`), plus inline scripts | Next's bootstrap and page data: about 54 inline `self.__next_f.push(…)` blocks per page, different on every page. The theme and language boot script (`BOOT_SCRIPT`, `lib/prefs.ts`) |
| Styles | `'self'`, plus inline | Leaflet positions tiles and markers with inline styles; React `style` props |
| Fonts | `'self'` (`/_next/static/media/*.woff2`) | `next/font`, self-hosted at build time |
| Images | `'self'` (thumbnails, home photos, icons, `/placeholder.svg`) | Static HTML. No external `src` or `srcset` |
| | `https://thumb.wikimedia.org`, `https://upload.wikimedia.org` | Lightbox only: the full-size file (`full` in the site data: 814 and 122 images) |
| | `https://tile.openstreetmap.org` | Map tiles (until O4, see `docs/tiles.md`) |
| | `data:` | Kept for Leaflet and the browser's own images (roadmap 13.7) |
| Fetch / XHR | `'self'` | `/data/index.json` (`lib/search-client.ts`) |
| | `https://api.web3forms.com` | The correction form's submission (`components/correction/CorrectionForm.tsx`) |
| Forms | `'self'` | The 404 and hero search forms submit to `/search/` |
| | `https://api.web3forms.com` | The correction form's plain post, when JavaScript is off |
| Frames | none | Nothing embeds a frame, and nothing may frame the site |

Links to GitHub, Wikipedia, Commons and source websites are plain links, not loaded resources, so the CSP does not list them.

## Content Security Policy (FR-23, FR-24)

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https://thumb.wikimedia.org https://upload.wikimedia.org https://tile.openstreetmap.org;
font-src 'self';
connect-src 'self' https://api.web3forms.com;
manifest-src 'self';
worker-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self' https://api.web3forms.com;
frame-ancestors 'none'
```

### Why `script-src` allows `'unsafe-inline'`

A nonce is a new random value per response. A static export has no server to make one, so nonces are not possible.

Hashes are possible in principle, but every page carries about 54 inline scripts that differ from page to page (the React Server Components payload). There are 2,400 pages, so one header for all paths would need tens of thousands of hashes. A header per path would make `vercel.json` enormous and would have to be regenerated on every build.

So `script-src` is `'self' 'unsafe-inline'` (spec 13 D4).

**What this costs:** if an attacker could inject markup into a page, the CSP would not stop an inline script.

**What limits that risk:**
- **No user content.** Every page is built from the project's own CSV data, and readers can't post anything to it (the correction form only sends an email).
- **React escapes text.** The only raw HTML is the boot script, the escaped credits list (`app/credits/page.tsx`) and generated SVG maps. All three are built from project data at build time.
- **No external script origin is allowed.** Even an injected `<script src>` can only load from this site.
- **`connect-src 'self' https://api.web3forms.com`.** An injected script could not send data to another server with `fetch`, apart from the form service, which only emails the project address.
- **`object-src 'none'`, `base-uri 'self'`, `form-action` (this site and the form service only) and `frame-ancestors 'none'`** close the other common routes: plugins, base-tag hijacking, form redirection and clickjacking.
- **Checks over `out/` on every build:** `npm run check:out` and the data gates in `scripts/lib/checks.mjs`.

## Other headers (FR-27)

| Header | Value | Why |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | The browser uses the declared type and never guesses |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Other sites, including the tile provider, see only the origin, never the page path or query. Tile providers need at least the origin (`docs/tiles.md`) |
| `Permissions-Policy` | `geolocation=(self), camera=(), microphone=()` | The map's Locate button may ask for location. Nothing else may use the camera or microphone |

Vercel already sends `Strict-Transport-Security` on its domains.

## Rollout (FR-25, D9)

The CSP is deployed first as `Content-Security-Policy-Report-Only`. It reports violations in the browser console but blocks nothing. The other three headers are enforced from the first deploy.

There is no `report-uri`, because a static host has nowhere to collect reports (A-4). Violations are read in the browser console. Every e2e test also fails on any violation (`e2e/fixtures.ts`).

**Vercel Toolbar:** on preview deployments Vercel may inject its toolbar script from `vercel.live`, which this CSP does not allow. Before checking the preview, turn the toolbar off for the project (Settings → General → Vercel Toolbar) so its violations don't hide real ones.

### Checklist

1. [ ] **Report-Only on the preview.** Push the branch to `preview`. Open these pages with DevTools → Console open: Home, Explore with the map, Search (`/search/?q=baliati`), a site page with photos and map (Baliati) including its lightbox, an itinerary with a map, a source page, About, Credits, and an unknown path (404). Repeat in dark mode and in Bangla. Expected: no "Content Security Policy" messages. Date, browser and result: ________
2. [ ] **Enforce on the preview.** Rename the header to `Content-Security-Policy` in `vercel.json` and run `node -e` (see below) to regenerate `serve.json`, then push. Repeat the visit list; theme boot (no flash), map pins and tiles, the lightbox and search all work. Date and result: ________
3. [ ] **Production.** Merge to `main`, then run `curl -sI https://jomidarpedia.vercel.app/ | grep -i -E 'content-security|x-content|referrer|permissions'`. Paste the output here: ________

To regenerate `serve.json` after editing `vercel.json`:

```
node -e 'const v=require("./vercel.json");require("fs").writeFileSync("serve.json",JSON.stringify({headers:v.headers.map(h=>({source:"**",headers:h.headers}))},null,2)+"\n")'
```

### Checking headers on the protected preview (FR-27)

Previews ask for Vercel sign-in, so a plain `curl -I` only shows the redirect. Use one of these:
- A **Protection Bypass for Automation** secret (Project → Settings → Deployment Protection), sent as `curl -sI -H "x-vercel-protection-bypass: $SECRET" https://<preview-url>/`. Keep the secret out of the repository.
- Or sign in in the browser and read the response headers of the document request in DevTools → Network.

Preview headers checked on ________: ________

## Dependencies (FR-33)

`npm audit --omit=dev` (runtime dependencies) on 26 Oct 2026 found **0 vulnerabilities**. CI runs `npm audit --omit=dev --audit-level=high` in the `check` job and fails on any high or critical runtime finding.

The full audit, including dev tools, lists 5 findings (2 high, 3 moderate). The same 5 are on `main` before Phase 13, and none of them reaches the published site:

| Package | Severity | Comes from | Why it doesn't apply |
|---|---|---|---|
| `compression` < 1.8.2 | high | `serve` (the local test server) | Only serves `out/` to Playwright and Lighthouse on localhost; never deployed |
| `postcss-selector-parser` < 7.1.6 (with `postcss-nested`, `tailwindcss` 3.4) | moderate | Tailwind CSS 3 at build time | Parses only the project's own CSS. The fix needs Tailwind 4, a separate migration |

`lighthouse` and `chrome-launcher` (added in Phase 13) add no findings. `@lhci/cli` 0.15.1 was tried and rejected: it would have added 21 (15 high), through old puppeteer and chromium-bidi versions.

## Link and leak checks (FR-29 to FR-32)

`npm run check:out` runs after every CI build (local and release). It reads every HTML, JSON, text and XML file in `out/` and fails on:
- a link with `target="_blank"` that lacks `rel="noopener noreferrer"`;
- an internal term, a working-file name or a local path (`scripts/lib/internal-terms.mjs`);
- the coordinates of a hidden site.

The coordinates come from every column of the hidden site's `sites.csv` row, and the check looks for them at the precision stored and at 4 and 5 decimals. A pair within about 100 m of a shown site's own pin is skipped. For example, JB-KHL-046's note names the location of the neighbouring Jessoreshwari temple (JB-KHL-047), which is published.

First run on 26 Oct 2026: 14,573 files, 57 coordinate pairs searched, no problems.
