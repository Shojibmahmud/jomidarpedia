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

// The correction form: its own page, which every correction link opens as a popup instead (CorrectionDialog).
// The form posts to Web3Forms, which emails it to the project address; the access key is public by design.
export const CORRECTIONS_URL = '/correction/';
export const WEB3FORMS_URL = 'https://api.web3forms.com/submit';
export const WEB3FORMS_KEY = 'd70a4566-f7dd-41de-8a1b-926420f46e99';

export const FOOTER_LINKS: NavLink[] = [
  { href: '/credits/', k: 'footer.credits' },
  { href: '/about/#licences', k: 'footer.licences' },
  { href: '/sources/', k: 'nav.sources' },
  { href: CORRECTIONS_URL, k: 'footer.correction' },
];
