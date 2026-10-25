// Build-time reads for the home page (roadmap Phase 11, spec .claude/specs/11-Home-page.md). Server only: it joins
// the curated photos (lib/home-images.json) with credits.json, the site records and public/home/manifest.json, and
// picks the featured trips, so the page passes plain props to its parts. Counts come from meta.json (FR-1).

import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getCredits, getDivisions, getMeta, getSite } from './data';
import { HOME_IMAGES, featuredTrips } from './home';
import { tripCards } from './trip-data';
import type { Division } from './types';

export interface HomePhoto {
  id: string;
  src: string;
  srcSet: string;
  width: number;
  height: number;
  credit: string;
  alt: string;
  altLang: 'en' | 'bn';
}

type Variant = { width: number; height: number };
let manifest: Record<string, Variant> | undefined;
const variants = (): Record<string, Variant> => manifest ??= JSON.parse(readFileSync(join(process.cwd(), 'public/home/manifest.json'), 'utf8')).images;

/** One curated photo: its widest variant, a srcset with every variant and the 480 px thumbnail, and its exact credit. */
export function homePhoto(id: string): HomePhoto {
  const credit = getCredits().find(c => c.imageId === id);
  if (!credit) throw new Error(`home: ${id} is not a Ready image (lib/home-images.json)`);
  const sizes = Object.entries(variants()).filter(([k]) => k.startsWith(`${id}-`))
    .map(([k, v]) => ({ src: `/home/${k}.webp`, width: v.width, height: v.height })).sort((a, b) => a.width - b.width);
  if (!sizes.length) throw new Error(`home: ${id} has no variant in public/home/ (run npm run thumbs)`);
  const image = getSite(credit.siteId).images.find(im => im.id === id);
  const widest = sizes.at(-1)!;
  return {
    id, src: widest.src, width: widest.width, height: widest.height, credit: credit.credit,
    srcSet: [`${credit.thumb} 480w`, ...sizes.map(s => `${s.src} ${s.width}w`)].join(', '),
    alt: image?.alt ?? credit.siteEn, altLang: image?.altLang === 'bn' ? 'bn' : 'en',
  };
}

export interface DivisionTile { div: Division; photo: HomePhoto }

export function homeData() {
  const { counts } = getMeta();
  return {
    counts,
    hero: homePhoto(HOME_IMAGES.hero),
    categories: Object.fromEntries(Object.entries(HOME_IMAGES.categories).map(([k, id]) => [k, homePhoto(id)])) as Record<keyof typeof HOME_IMAGES.categories, HomePhoto>,
    // Most sites first, then by name (FR-12).
    divisions: [...getDivisions()].sort((a, b) => b.count - a.count || a.en.localeCompare(b.en, 'en'))
      .map((div): DivisionTile => ({ div, photo: homePhoto(HOME_IMAGES.divisions[div.slug]) })),
    trips: featuredTrips(tripCards()),
    // The static map of Bangladesh (3.8), inlined so its token colours follow the theme (FR-11).
    mapSvg: readFileSync(join(process.cwd(), 'public/maps/bd.svg'), 'utf8'),
  };
}
