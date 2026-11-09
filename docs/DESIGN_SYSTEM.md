# Design system

The visual and interaction conventions the code follows: colours, type, layout, Bangla text, accessibility and print. The source files are `app/tokens.css`, `tailwind.config.ts` and `app/fonts.ts`. The design canvas with every screen is linked from `roadmap/DEVELOPMENT_ROADMAP.md`.

## Colour

Colours are CSS variables, stored as space-separated RGB channels so Tailwind can add opacity (`bg-primary/20`). Tailwind's colour names map straight to them, so **one class works in both themes**: write `bg-surface text-ink`, and never a `dark:` variant for colour.

| Token | Use |
|---|---|
| `bg`, `surface`, `surface-2` | Page background; cards and sheets; panels and placeholders |
| `ink`, `muted` | Body text; secondary text |
| `line`, `line-strong` | Decorative dividers; borders of inputs and chips (3:1 contrast) |
| `primary`, `primary-hover`, `on-primary`, `primary-tint`, `primary-tint-ink` | Terracotta: links, main buttons, the "in ruins" condition |
| `moss`, `moss-tint`, `moss-ink` | The "preserved" condition |
| `teal`, `teal-tint`, `teal-ink` | The "now in other use" condition |
| `indigo`, `indigo-tint`, `on-indigo` | Day trip |
| `gold`, `gold-tint` | Warnings and the flagged "?" |
| `lost`, `lost-tint`, `unknown` | The "lost" and "unknown" conditions |
| `focus` | The focus ring |
| `map-land` | Land on the static maps |

Each `-tint` is a background and each `-ink` is the text colour that passes contrast on it. Contrast ratios are noted beside the values in `app/tokens.css`.

**Themes.** Light is the default. Dark applies when the visitor chose it (`data-theme="dark"` on `<html>`), or when the OS prefers dark and the visitor hasn't chosen light. The dark values appear twice in `tokens.css`, once for each case, and the two blocks must stay identical. Print sets every token back to light.

**Never rely on colour alone.** A condition has a glyph and a word as well as a colour. A selected chip has a check mark. A pin's accessible name repeats what its colour and fill say.

## Type

Six families, all self-hosted at build time by `next/font`, so the visitor's browser never contacts Google.

| Family | Tailwind class | Used for |
|---|---|---|
| Source Sans 3 | `font-sans` (default) | Interface and English body |
| Fraunces | `font-serif` | English headings |
| Cinzel | `font-wordmark` | The logo's wordmark only |
| Hind Siliguri | `font-bn` | Bangla interface and body |
| Tiro Bangla | `font-bn-serif` | Bangla headings and names |
| Noto Sans Bengali, digits only | (automatic) | The digits ০–৯, placed ahead of Hind Siliguri, whose ১ readers misread |

**The font follows the language, not the class.** `tokens.css` gives every element with `lang="en"` a Latin face and every element with `lang="bn"` a Bangla face. So what matters is that text carries the right `lang`, which `<T>`, `<Both>`, `<Prose>` and `<Latin>` do for you. A Bangla heading is always in the Bangla serif.

**Sizes** come in pairs, because Bangla runs about 5% larger with about 30% taller lines:

| English | Bangla | Size / line height |
|---|---|---|
| `text-display` | `text-bn-display` | 56/60 · 58/76 |
| `text-h1` | `text-bn-h1` | 40/46 · 42/58 |
| `text-h2` | `text-bn-h2` | 30/36 · 32/46 |
| `text-h3` | `text-bn-h3` | 22/28 · 23/34 |
| `text-lg` | `text-bn-lg` | 18/28 · 19/32 |
| `text-base` | `text-bn-base` | 16/24 · 17/28 |
| `text-sm` | `text-bn-sm` | 14/20 · 15/24 |
| `text-xs` | `text-bn-xs` | 12/16 · 13/20 |

Bangla text never has a line height below 1.6.

## Layout

- **Breakpoints:** `md` 768 px, `lg` 1024 px, `xl` 1280 px, `2xl` 1440 px. **There is no `sm`**: a `sm:` class does nothing. The design was drawn at 390 px (the base styles) and 1440 px.
- **Page width:** `max-w-page` (1280 px), with `px-4` on phones and `lg:px-8` on desktop. Explore runs wider from 1280 px, for filters, map and list side by side.
- **Spacing:** Tailwind's 4 px scale, plus `18` (72 px) and `22` (88 px).
- **Radii:** `rounded-sm` 4, `rounded-md` 10, `rounded-lg` 14, `rounded-xl` 20 px. **Shadows:** `shadow-1` to `shadow-3`.
- **Touch targets:** at least 44 px. Use `min-h-tap` and `min-w-tap`. Map pins are drawn smaller inside a 44 px hit area.
- **Stacking:** named z-index values that sit above Leaflet's own panes (200–700): `z-controls` 800, `z-panel` 900, `z-header` 1000, `z-dropdown` 1100, `z-drawer` 1200, `z-lightbox` 1300, `z-toast` 1400. Use these names, not raw numbers.

Shared component classes in `tokens.css`: `.chip` (a pill button, selected through `aria-pressed="true"`) and `.badge`.

## Bangla text

- Mark every Bangla string `lang="bn"`, and Latin text inside a Bangla passage `lang="en"`. The helpers in `components/T.tsx` do this.
- Numbers on Bangla pages use Bengali digits, through `lib/format.ts`. IDs, coordinates, URLs and phone numbers keep Latin digits.
- A site's Bangla name is shown in Bangla script whatever the interface language (R10).
- Long strings must wrap. Check URLs, licence text and credit lines at 390 px.
- Bangla copy is written, not translated word for word. See `docs/TRANSLATION_BN.md`.

## Accessibility

The target is WCAG 2.2 AA, checked by tools and by hand (`docs/a11y-checks.md`).

- **Focus.** A 3 px ring on `:focus-visible`, everywhere. `scroll-padding-top` keeps the sticky header from hiding a focused element.
- **Skip link.** The first focusable element goes to `#main`, so every page's `<main>` needs `id="main"`.
- **Real controls.** Buttons are `<button>`, with state in `aria-pressed`, `aria-expanded` or `role="switch"` with `aria-checked`. Modal surfaces are `<dialog>`: focus stays inside, Esc closes, and focus returns to what opened it.
- **Icon-only controls** get a name with `<SrT k="…" />`. Decorative drawings are `aria-hidden`.
- **The list is the accessible equivalent of the map.** Anything the map shows must also be reachable from the list.
- **Motion.** CSS transitions only, with no animation library. Everything stops under `prefers-reduced-motion`.
- **Works without JavaScript.** Content pages are static HTML. Filtered lists render a first page, menus use `<details>` where they can, and forms post normally.
- **Live regions** announce results of actions (copied, results count) in the interface language, through `useUiLang()`.

## States of knowledge

Much of the interface exists to show uncertainty honestly. Reuse these patterns rather than inventing new ones.

| State | How it is shown | Component |
|---|---|---|
| A value isn't known | Muted italic words: "Not documented", "No ticket reported" | `components/site/Unknown.tsx` |
| A site has no photo | A drawing of its condition, never a stock photo | `components/art/PlaceholderArt.tsx` |
| A site has no pin | "No map location yet", with no map and no coordinates | `LocationPanel.tsx`, `SiteCard.tsx` |
| A location is uncertain | Pin fill: solid (verified), outlined (single source or unverified), hatched (approximate, with a 1.5 km circle) | `lib/pins.ts` |
| Sources disagree | Every version listed, each with only its own sources | `components/site/Conflicts.tsx` |
| A story, not history | A separate section after the timeline, with its attribution | `components/site/History.tsx` |
| Information may be old | "Last checked" with a date, and "May be out of date" after 12 months | `LastChecked.tsx`, `StaleNote.tsx` |
| Bangla is missing or unchecked | One note under the page header | `components/shell/ProseNote.tsx` |

## Print

Only itinerary pages have a print layout. It uses the browser's own print (R9): A4, 15 mm margins, always light, with the header, footer and controls hidden.

- `data-no-print` hides an element in print. `data-print-only` shows one only in print.
- Tailwind's `print:` variants rearrange the page's two columns into one flow.
- The itinerary page is scaled to fit A4, because the type scale is in pixels.

## Brand

The logo is a weathered rajbari front with the wordmark in Cinzel capitals. Its geometry is in `scripts/lib/logo.mjs`, shared by `components/brand/Logo.tsx` and `npm run icons`, which writes the favicon, the touch icon and the default share image. At 32 px and below, the simpler version of the mark is used.
