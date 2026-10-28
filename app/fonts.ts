// Self-hosted at build time by next/font: no request to Google from the visitor's browser.
import { Cinzel, Fraunces, Source_Sans_3, Tiro_Bangla, Hind_Siliguri } from 'next/font/google';
import localFont from 'next/font/local';

// Wordmark only: inscriptional capitals, like names carved on palace friezes.
// Not used for page titles (long names in capitals are hard to read).
export const cinzel = Cinzel({
  weight: ['600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-cinzel',
});

// English headings. Variable font with the optical-size axis.
export const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  display: 'swap',
  variable: '--font-fraunces',
});

// UI and English body. Preloaded: it renders the first screen.
export const sourceSans = Source_Sans_3({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-source-sans',
});

// Bangla headings and names. Not preloaded (large file); Noto Serif Bengali is the fallback.
export const tiroBangla = Tiro_Bangla({
  weight: '400',
  style: 'normal',
  subsets: ['bengali'],
  display: 'swap',
  preload: false,
  fallback: ['Noto Serif Bengali', 'serif'],
  variable: '--font-tiro-bangla',
});

// Bangla UI and body. Static weights only, so list the ones the design uses.
// Chosen over Noto Sans Bengali: ~5% narrower, shapes all conjuncts correctly
// (checked in Chromium). Android ships Noto Sans Bengali, so the fallback never shows boxes.
export const hindSiliguri = Hind_Siliguri({
  weight: ['400', '500', '600'],
  subsets: ['bengali'],
  display: 'swap',
  preload: false,
  fallback: ['Noto Sans Bengali', 'sans-serif'],
  variable: '--font-hind-siliguri',
});

// Bangla digits (০–৯) only, placed before Hind Siliguri: its ১ is a curl readers took for another sign.
// Subset of Noto Sans Bengali (SIL OFL 1.1), ~4 KB a weight; unicode-range keeps it to digits.
export const bnDigits = localFont({
  src: [
    { path: './font-files/noto-sans-bengali-digits-400.woff2', weight: '400' },
    { path: './font-files/noto-sans-bengali-digits-500.woff2', weight: '500' },
    { path: './font-files/noto-sans-bengali-digits-600.woff2', weight: '600' },
  ],
  display: 'swap',
  preload: false,
  fallback: [],
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+09E6-09EF' }],
  variable: '--font-bn-digits',
});

export const fontVariables = [cinzel, fraunces, sourceSans, tiroBangla, hindSiliguri, bnDigits].map((f) => f.variable).join(' ');
