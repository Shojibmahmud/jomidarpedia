# Jomidarpedia

Bilingual (English / Bangla) static Next.js site about the zamindar houses of Bangladesh.
Roadmap: `roadmap/DEVELOPMENT_ROADMAP.md`. Specs: `.Codex/specs/NN-*.md`.

## Commands

- `npm run lint`, `npm run typecheck`, `npm test` (Vitest), `npm run e2e` (Playwright)
- `npm run build:local` builds the data in local mode, then the site, then SEO files. CI runs the same and then `check:out` and `check:budgets` (`.github/workflows/ci.yml`).
- In the sandbox, run npm with `npm_config_cache=$TMPDIR/npm-cache`. `next build` and Playwright have to run outside the sandbox.
- For anything beyond a one-liner (loops, arrays, heavy quoting), write a `.mjs` or `.py` script and run it instead of inline zsh. zsh arrays are 1-indexed and don't word-split.

## Phase workflow

Every roadmap phase follows the same flow:
branch (`/git-start`) → spec (`/new-spec`, the owner runs it) → owner approves the spec → implement with unit and Playwright tests → update the roadmap → `/git-ship` → check that CI on `main` is green.

- **"Update the roadmap" always means both:** edit `roadmap/DEVELOPMENT_ROADMAP.md`, and update the progress dashboard, the "Jomidarpedia roadmap" artifact (https://claude.ai/artifact/3pDxQV4uuzoH145wwQwnzK). The dashboard's data is written with the ArtifactData tool, not by republishing the page. Read it back to confirm the change landed before reporting done.
- If a test fails, fix it. Don't just flag it and move on.

## Shipping

- `/git-ship` pushes with `-u` on a branch's first push. Writing `.git/config` is denied in the sandbox, so recording the upstream can fail even though the push worked. Carry on with `origin/<branch>` and say so.
- If the sandbox blocks a single git command, retry just that command outside the sandbox and say so. Never leave the working tree half-changed.
- Never check out another branch just to deploy (for example a preview branch). Push instead, and confirm `git status` is clean afterwards.

## UI verification checklist

Before calling UI work done, check every changed page at mobile width (390px) in **both** light and dark mode, and at desktop width. Look for:

- horizontal overflow (long URLs and licence text must wrap)
- text contrast, e.g. white-on-white inputs in light mode
- Bengali digits rendering in the right font

Tailwind breakpoints are only `md`, `lg`, `xl` and `2xl` (`tailwind.config.ts`). There is no `sm`, so `sm:` classes silently do nothing.

## Content rules

- Bangla copy must read as a native writer would write it. Don't translate literally, and keep it as full as the English. See `docs/TRANSLATION_BN.md`.
- Numbers on Bangla pages use Bengali digits through `lib/format.ts`. IDs and coordinates keep Latin digits.
- Use only openly licensed photos (CC or public domain, e.g. Wikimedia Commons), and record the licence and attribution. Never use a supplied link that isn't openly licensed.

## Google Maps lookups

Use the `/maps-lookup` skill. It sets the batch size, spacing, CAPTCHA stop rule and progress file.
