// The logo mark, lockup A from the "Brand · new mark and wordmark options" board: a rajbari front
// (pediment, frieze, columns, plinth steps), weathered. Its right corner has fallen, a column stands
// broken and a sprig grows from the break. At 32 px and below the ruin details drop and the classic
// front stays ("simple"). One geometry, used by components/brand/Logo.tsx and scripts/build-icons.mjs.

const FULL = [
  // pediment, its right end fallen away
  '<path d="M13 24 L32 12.5 L44 19.8" fill="none" stroke="FG" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  '<path d="M47.5 22 L51 24" fill="none" stroke="FG" stroke-width="3" stroke-linecap="round"/>',
  '<rect x="13" y="26" width="38" height="3" rx="0.5" fill="FG"/>',
  // three standing columns and one broken
  '<rect x="16" y="31" width="4" height="14" fill="FG"/>',
  '<rect x="24" y="31" width="4" height="14" fill="FG"/>',
  '<rect x="32" y="31" width="4" height="14" fill="FG"/>',
  '<path d="M40 45 V36.5 L41.4 35 L42.6 37.2 L44 35.8 V45 Z" fill="FG"/>',
  // sprig from the break
  '<path d="M42.5 35 C42.5 32 44 30.5 46.5 30" fill="none" stroke="FG" stroke-width="1.5" stroke-linecap="round"/>',
  '<path d="M46.5 30 C48.5 28.5 50 29 50.5 30.5 C48.5 31.5 47.2 31.2 46.5 30 Z" fill="FG"/>',
  // plinth steps
  '<rect x="11" y="46.5" width="42" height="3" rx="0.5" fill="FG"/>',
  '<rect x="9" y="51.5" width="46" height="3" rx="0.5" fill="FG"/>'
];

const SIMPLE = [
  '<path d="M13 24 L32 12.5 L51 24" fill="none" stroke="FG" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>',
  '<rect x="13" y="26" width="38" height="3.5" fill="FG"/>',
  '<rect x="16" y="32" width="5" height="13" fill="FG"/>',
  '<rect x="25.5" y="32" width="5" height="13" fill="FG"/>',
  '<rect x="34.5" y="32" width="5" height="13" fill="FG"/>',
  '<rect x="43" y="32" width="5" height="13" fill="FG"/>',
  '<rect x="10" y="47" width="44" height="3.5" fill="FG"/>',
  '<rect x="8" y="52" width="48" height="3.5" fill="FG"/>'
];

export const VIEWBOX = '0 0 64 64';
export const SIMPLE_BELOW = 33; // px: the board drops the ruin details at 32 and 16

/** The glyph's elements (no background), coloured fg. */
export function markGlyph({ simple = false, fg = 'currentColor' } = {}) {
  return (simple ? SIMPLE : FULL).map(s => s.replaceAll('FG', fg)).join('');
}

/** A complete standalone SVG, for public/icon.svg and the touch icon. radius 0 = full bleed. */
export function markSvg({ simple = false, bg = '#A3422A', fg = '#FFFFFF', radius = 14 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}">` +
    `<rect width="64" height="64" rx="${radius}" fill="${bg}"/>${markGlyph({ simple, fg })}</svg>\n`;
}
