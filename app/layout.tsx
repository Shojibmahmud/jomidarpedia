import type { Metadata, Viewport } from 'next';
import { fontVariables } from './fonts';
import { T } from '@/components/T';
import { CorrectionDialog } from '@/components/correction/CorrectionDialog';
import { OfflineNotice } from '@/components/shell/OfflineNotice';
import { SiteFooter } from '@/components/shell/SiteFooter';
import { SiteHeader } from '@/components/shell/SiteHeader';
import { getMeta } from '@/lib/data';
import { BOOT_SCRIPT } from '@/lib/prefs';
import { DEFAULT_OG_IMAGE, SITE_NAME } from '@/lib/seo';
import { indexable } from '@/lib/site-url';
import './tokens.css';

// Titles and descriptions stay English (O6); the count comes from the data, never from copy.
// Local and preview builds are noindex on every page (§2.4, spec 04 FR-9); release pages may be indexed.
// metadataBase makes canonical and share URLs absolute once SITE_URL is set (spec 13 FR-35); pages set their own
// title, description and share tags through pageMeta (lib/seo.ts), and these defaults cover the rest (404).
export function generateMetadata(): Metadata {
  const base = process.env.SITE_URL?.trim();
  const description = `The zamindar palaces of Bangladesh: ${getMeta().counts.sites} sites with sources, conditions and day trips from Dhaka.`;
  return {
    ...(base && { metadataBase: new URL(base) }),
    ...(indexable() ? {} : { robots: { index: false, follow: false } }),
    title: { default: 'Jomidarpedia · জমিদারপিডিয়া', template: '%s · Jomidarpedia' },
    description,
    icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' },
    openGraph: { siteName: SITE_NAME, type: 'website', locale: 'en', title: SITE_NAME, description, images: [DEFAULT_OG_IMAGE] },
    twitter: { card: 'summary_large_image', images: [DEFAULT_OG_IMAGE.url] },
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
        <OfflineNotice />
        <CorrectionDialog />
      </body>
    </html>
  );
}
