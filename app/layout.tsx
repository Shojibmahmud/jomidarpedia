import type { Metadata, Viewport } from 'next';
import { fontVariables } from './fonts';
import { T } from '@/components/T';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { getMeta } from '@/lib/data';
import { BOOT_SCRIPT } from '@/lib/prefs';
import { indexable } from '@/lib/site-url';
import './tokens.css';

// Titles and descriptions stay English (O6); the count comes from the data, never from copy.
// Local and preview builds are noindex on every page (§2.4, spec 04 FR-9); release pages may be indexed.
export function generateMetadata(): Metadata {
  return {
    ...(indexable() ? {} : { robots: { index: false, follow: false } }),
    title: { default: 'Jomidarpedia · জমিদারপিডিয়া', template: '%s · Jomidarpedia' },
    description: `The zamindar palaces of Bangladesh: ${getMeta().counts.sites} sites with sources, conditions and day trips from Dhaka.`,
    icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F2E8' },
    { media: '(prefers-color-scheme: dark)', color: '#191712' },
  ],
};

// The boot script (lib/prefs.ts) runs before paint, so a saved theme and language never flash the wrong way.
// The HTML already holds every interface string in both languages (components/T.tsx), so nothing is
// translated before first paint: the script only sets data-lang, and CSS shows that language.
// <html lang> is "en" in the static HTML and changes to "bn" only once the script has run; data-lang is
// "en" in the HTML too, so English shows when JavaScript is off.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-toast focus:rounded-md focus:bg-surface focus:px-4 focus:py-3">
          <T k="nav.skip" />
        </a>
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
