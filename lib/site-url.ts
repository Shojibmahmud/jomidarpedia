// Site URLs and indexing rules (docs/URLS.md; spec 04 FR-6, FR-7, FR-9).

import { resolveMode } from '@/scripts/data-mode.mjs';

/** The canonical path of a site page. */
export const siteHref = (id: string, slug: string) => `/site/${id}/${slug}/`;

/** The ID route, which always leads to the current slug. */
export const siteIdHref = (id: string) => `/site/${id}/`;

/** A path made absolute with SITE_URL when it is set (14.2, O14), otherwise left root-relative. */
export function canonicalUrl(path: string, env: Record<string, string | undefined> = process.env): string {
  const base = env.SITE_URL?.trim();
  return base ? new URL(path, base).href : path;
}

/** Local and preview output must never be indexed; release pages may be (§2.4). */
export function indexable(env: Record<string, string | undefined> = process.env): boolean {
  return resolveMode(env).mode === 'release';
}
