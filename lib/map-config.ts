// Map settings (roadmap Phase 7, spec .claude/specs/07-Map.md). One place for the tile providers (D5), so
// the launch choice (O4) is a change here, and for the numbers the pin board sets: zoom thresholds, the
// approximate circle and cluster sizes. No Leaflet import: pure data, safe for any bundle and for tests.

export type BaseMapId = 'carto-light' | 'carto-dark' | 'osm';

export interface BaseMap {
  id: BaseMapId;
  url: string;
  subdomains?: string;
  maxZoom: number;
  attribution: string; // HTML, shown by Leaflet's attribution control (R8)
  /** Off: the provider needs an API key we don't have yet (O4). */
  needsKey?: true;
}

const OSM_CREDIT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO_CREDIT = `${OSM_CREDIT} &copy; <a href="https://carto.com/attributions">CARTO</a>`;

/**
 * Every provider we may use. Development and protected previews only: OSM's tile policy forbids heavy use,
 * and the launch provider is decision O4. CARTO's basemaps answer "API KEY REQUIRED" without a key
 * (checked 24 Oct 2026), so they stay off until O4 provides one (spec 07 D5, amended).
 */
export const ALL_BASE_MAPS: readonly BaseMap[] = [
  { id: 'osm', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19, attribution: OSM_CREDIT },
  { id: 'carto-light', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', subdomains: 'abcd', maxZoom: 20, attribution: CARTO_CREDIT, needsKey: true },
  { id: 'carto-dark', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', subdomains: 'abcd', maxZoom: 20, attribution: CARTO_CREDIT, needsKey: true },
];

/** The providers offered in the base-map menu. */
export const BASE_MAPS: readonly BaseMap[] = ALL_BASE_MAPS.filter(b => !b.needsKey);

/** The theme's own base map when one is available (A-2), otherwise the first one offered. */
export function defaultBaseMap(dark: boolean): BaseMapId {
  const preferred: BaseMapId = dark ? 'carto-dark' : 'carto-light';
  return BASE_MAPS.some(b => b.id === preferred) ? preferred : BASE_MAPS[0].id;
}
export const baseMap = (id: BaseMapId): BaseMap => BASE_MAPS.find(b => b.id === id) ?? BASE_MAPS[0];

/** Bangladesh, south-west and north-east corners: the initial view and the view with no mappable result. */
export const BANGLADESH: [[number, number], [number, number]] = [[20.6, 88.0], [26.65, 92.7]];

export const FIT_MAX_ZOOM = 12;      // fitting to results never zooms closer (D11)
export const CIRCLE_MIN_ZOOM = 11;   // approximate circles show from here (FR-16)
export const LABEL_MIN_ZOOM = 12;    // pin name labels show from here (A-3)
export const CIRCLE_RADIUS_M = 1500; // a display convention, not a measured area
export const CLUSTER_RADIUS_PX = 60;
export const SITE_ZOOM = 14;         // zoom used to show one selected site
export const MINI_ZOOM = 13;         // the site page's mini map; the 1.5 km circle fits at this zoom

/** Tile errors in a row, or seconds without any tile, before the "couldn't load" overlay (A-7). */
export const TILE_ERRORS = 3;
export const TILE_TIMEOUT_MS = 8000;
