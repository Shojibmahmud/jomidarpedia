// Page metadata for search engines and share previews (roadmap task 13.11; spec 13 FR-34, FR-35, FR-38, D8).
// Titles and descriptions come from the data. Open Graph images are reviewed local photos only: the home hero,
// a site's first Ready photo (its committed 480×360 thumbnail), or the default card made by `npm run icons`.
// Image and page URLs are made absolute through metadataBase when SITE_URL is set (app/layout.tsx).

import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/site-url';

export const SITE_NAME = 'Jomidarpedia';

export interface OgImage { url: string; width: number; height: number; alt: string }

/** The default share image (scripts/build-icons.mjs), for pages without a photo of their own. */
export const DEFAULT_OG_IMAGE: OgImage = { url: '/og-default.png', width: 1200, height: 630, alt: 'Jomidarpedia: the zamindar palaces of Bangladesh' };

/** A site's committed thumbnail (scripts/build-thumbs.mjs PARAMS: 480×360). */
export const thumbImage = (thumb: string, alt: string): OgImage => ({ url: thumb, width: 480, height: 360, alt });

const DESCRIPTION_MAX = 200;

/** A description cut at a word boundary, so share previews and search results show a whole phrase. */
export function shortDescription(text: string, max = DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.–-]+$/, '')}…`;
}

interface PageMeta {
  title: string;
  description: string;
  path: string;
  image?: OgImage;
  type?: 'website' | 'article';
  /** False where the page renders its own <link rel="canonical"> in the body. */
  canonical?: boolean;
}

/**
 * Title, description, canonical link and share tags for one page. Next replaces a parent's openGraph object
 * instead of merging it, so every page passes the full set.
 */
export function pageMeta({ title, description, path, image = DEFAULT_OG_IMAGE, type = 'website', canonical = true }: PageMeta): Metadata {
  const desc = shortDescription(description);
  return {
    title,
    description: desc,
    ...(canonical && { alternates: { canonical: canonicalUrl(path) } }),
    openGraph: { title, description: desc, url: canonicalUrl(path), siteName: SITE_NAME, type, locale: 'en', images: [image] },
    twitter: { card: 'summary_large_image', title, description: desc, images: [image.url] },
  };
}
