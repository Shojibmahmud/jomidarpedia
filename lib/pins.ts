// Pin and cluster rules (roadmap tasks 7.3, 7.4, spec 07 FR-13 to FR-18, O9), from the "Explore · pin set
// and clusters by zoom" board. Pure: Leaflet's divIcon takes HTML strings, so the markup is built here and
// unit-tested. Colour and inner glyph say the condition; the fill says how sure the location is; a gold "?"
// marks a flagged pin. None depends on colour alone: the glyph and the accessible name repeat it.

import { text, type Lang } from './i18n';
import type { Condition, IndexSite, LocationStatus } from './types';

export type Fill = 'solid' | 'outlined' | 'hatched';
export interface PinStyle { condition: Condition; fill: Fill; flagged: boolean }

/** The CSS colour token of each condition (app/tokens.css). */
export const CONDITION_COLOR: Record<Condition, string> = {
  preserved: 'moss', preserved_adaptive_reuse: 'teal', in_ruins: 'primary', lost: 'lost', unknown: 'unknown',
};

const FILL: Record<LocationStatus, Fill> = {
  verified: 'solid', single_source: 'outlined', approximate: 'hatched', unverified: 'outlined', not_found: 'outlined',
};

/** Sites that get a pin: those with coordinates (hidden pins have none, R5). */
export const mappable = (sites: readonly IndexSite[]) => sites.filter(s => s.ll);

export function pinStyle(site: Pick<IndexSite, 'c' | 'lc' | 'f'>): PinStyle {
  return { condition: site.c, fill: FILL[site.lc], flagged: site.f === 1 };
}

/** The location words for a pin: "Location confirmed", …; not_found reads as unverified (O9). */
export function locationKey(lc: LocationStatus) {
  return lc === 'not_found' ? 'location.unverified' as const : (`location.${lc}` as const);
}

/** "Baliati Palace, Preserved, Location confirmed" (FR-14), plus "needs checking" for a flagged pin. */
export function pinLabel(site: Pick<IndexSite, 'e' | 'c' | 'lc' | 'f'>, lang: Lang): string {
  const parts = [site.e, text(`condition.${site.c}`, lang), text(locationKey(site.lc), lang)];
  if (site.f === 1) parts.push(text('map.flagged', lang));
  return parts.join(', ');
}

/** 36 px up to 9 sites, 44 px up to 99, 52 px for 100 or more (board 19). */
export const clusterSize = (count: number) => (count <= 9 ? 36 : count <= 99 ? 44 : 52);

const GLYPH: Record<Condition, string> = {
  preserved: '<path d="M6.5 12.5 10.5 16.5 17.5 8"/>',
  preserved_adaptive_reuse: '<path d="M8 18V11a4 4 0 0 1 8 0v7"/>',
  in_ruins: '<path d="M6 16.5 10 12l2.5 2.5L18 8.5M14.5 8.5H18V12"/>',
  lost: '<path d="M7.5 7.5l9 9M16.5 7.5l-9 9"/>',
  unknown: '<path d="M9.2 9.3a2.9 2.9 0 1 1 4.2 2.6c-.9.5-1.4 1.1-1.4 2.1v.5"/><circle cx="12" cy="17.6" r="0.9" fill="currentColor"/>',
};

const escape = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** The id of the hatch pattern for a condition; MapSprite defines one per condition. */
export const hatchId = (c: Condition) => `jp-hatch-${c}`;

/** The pin's SVG: a 26 × 34 teardrop with the condition glyph, and the "?" badge when flagged. */
export function pinSvg({ condition, fill, flagged }: PinStyle): string {
  const color = `rgb(var(--${CONDITION_COLOR[condition]}))`;
  const body = fill === 'solid' ? color : fill === 'hatched' ? `url(#${hatchId(condition)})` : 'rgb(var(--surface))';
  const glyph = fill === 'solid' ? 'rgb(var(--surface))' : color;
  const badge = flagged
    ? '<circle cx="23" cy="5" r="5" fill="rgb(var(--gold-tint))" stroke="rgb(var(--gold))" stroke-width="1.5"/>' +
      '<text x="23" y="8.2" text-anchor="middle" font-size="8.5" font-weight="700" font-family="system-ui,sans-serif" fill="rgb(var(--gold))">?</text>'
    : '';
  return (
    `<svg class="jp-pin__svg" viewBox="-2 -2 32 38" width="32" height="38" aria-hidden="true" focusable="false">` +
    `<path d="M13 33s-11-10.2-11-19.5a11 11 0 0 1 22 0C24 22.8 13 33 13 33Z" fill="${body}" stroke="${color}" stroke-width="2.4"/>` +
    (fill === 'hatched' ? `<circle cx="13" cy="13.5" r="7.2" fill="rgb(var(--surface))"/>` : '') +
    `<g transform="translate(4.6 5.1) scale(.7)" fill="none" stroke="${glyph}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" color="${glyph}">${GLYPH[condition]}</g>` +
    badge + `</svg>`
  );
}

/** The marker's inner HTML: the pin and its name label (shown on hover and from zoom 12; aria-hidden). */
export function pinHtml(site: Pick<IndexSite, 'e' | 'c' | 'lc' | 'f'>): string {
  return `<span class="jp-pin__body">${pinSvg(pinStyle(site))}</span><span class="jp-pin__label" aria-hidden="true">${escape(site.e)}</span>`;
}

/** The cluster's inner HTML: a ring with the count, already in the interface's digits. */
export function clusterHtml(count: number, shown: string): string {
  const size = clusterSize(count);
  return `<span class="jp-cluster__ring" style="width:${size}px;height:${size}px" data-count="${count}">${escape(shown)}</span>`;
}
