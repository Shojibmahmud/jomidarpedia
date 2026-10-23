// Every link the page shell renders (roadmap task 3.9). Paths follow docs/URLS.md, with trailing
// slashes (next.config.mjs). tests/shell.test.ts checks each one against the route list there.

import type { StringKey } from './i18n';

export type NavLink = { href: string; k: StringKey };

export const HEADER_LINKS: NavLink[] = [
  { href: '/explore/', k: 'nav.explore' },
  { href: '/trips/', k: 'nav.dayTrips' },
  { href: '/about/', k: 'nav.about' },
];

export const SEARCH_HREF = '/search/';
export const divisionHref = (slug: string) => `/division/${slug}/`;

// The public issues-only repository for corrections (O1, task 0.9); the email fallback stays hidden (O2).
export const CORRECTIONS_URL = 'https://github.com/Shojibmahmud/jomidarpedia-corrections/issues/new?template=correction.yml';

export const FOOTER_LINKS: NavLink[] = [
  { href: '/credits/', k: 'footer.credits' },
  { href: '/about/#licences', k: 'footer.licences' },
  { href: '/sources/', k: 'nav.sources' },
  { href: CORRECTIONS_URL, k: 'footer.correction' },
];
