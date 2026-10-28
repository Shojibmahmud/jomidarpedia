// What ships, and under which licence (roadmap tasks 10.7, 10.8; spec 10 FR-43, D8, D11, D13). Licence names
// carry digits, so they are data here, not interface strings. The tile credits come from the providers actually
// offered (lib/map-config.ts BASE_MAPS); a provider chosen for O4 appears with no change here. Fonts must match
// the families app/fonts.ts loads (a unit test compares them); boundaries follow data/geo/SOURCE.md.

import { BASE_MAPS } from './map-config';

export interface Licence { name: string; url: string }

/** O5: the site's own text and data. No data download is promised until 14.6 ships (O1, D8). */
export const TEXT_LICENCE: Licence = { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' };
export const ODBL: Licence = { name: 'Open Database License', url: 'https://opendatacommons.org/licenses/odbl/' };
export const BOUNDARIES = {
  country: { name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  districts: { name: 'CC BY 3.0 IGO', url: 'https://creativecommons.org/licenses/by/3.0/igo/' },
} satisfies Record<string, Licence>;
// Library names are data, not interface strings: the strings ship in a client chunk, and tests check that pages
// without a map load no script mentioning the map library.
export const LIBRARIES = {
  library: 'Leaflet',
  libraryLicence: { name: 'BSD 2-Clause', url: 'https://github.com/Leaflet/Leaflet/blob/main/LICENSE' },
  plugin: 'Leaflet.markercluster',
  pluginLicence: { name: 'MIT', url: 'https://github.com/Leaflet/Leaflet.markercluster/blob/master/MIT-LICENCE.txt' },
} satisfies Record<string, Licence | string>;
export const FONTS = ['Cinzel', 'Fraunces', 'Source Sans 3', 'Tiro Bangla', 'Hind Siliguri', 'Noto Sans Bengali'] as const;
export const FONT_LICENCE: Licence = { name: 'SIL Open Font License', url: 'https://openfontlicense.org/' };

/** Each offered provider's attribution as plain text ("© OpenStreetMap contributors"), once each. */
export function tileCredits(): string[] {
  const plain = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&copy;/g, '©').replace(/\s+/g, ' ').trim();
  return [...new Set(BASE_MAPS.map(b => plain(b.attribution)))];
}
