// A release build needs the map tile key (roadmap 13.6, O4; spec 13 FR-20, D14). Without it the map would fall
// back to OSM's tile servers, whose policy forbids a launched site's traffic, so production fails here instead.
// Local and preview builds fall back to OSM with a notice. The mode comes from scripts/data-mode.mjs.

import { pathToFileURL } from 'node:url';
import { resolveMode } from './data-mode.mjs';

/** @param {Record<string, string | undefined>} [env] @returns {{ ok: boolean, message: string }} */
export function checkTileKey(env = process.env) {
  const { mode } = resolveMode(env);
  if ((env.NEXT_PUBLIC_TILE_KEY ?? '').trim()) return { ok: true, message: 'Map tiles: CARTO (NEXT_PUBLIC_TILE_KEY is set)' };
  if (mode === 'release') {
    return { ok: false, message: 'Map tiles: NEXT_PUBLIC_TILE_KEY is not set. A release build needs the CARTO key (docs/tiles.md).' };
  }
  return { ok: true, message: `Map tiles: no NEXT_PUBLIC_TILE_KEY in ${mode} mode, so the map uses OSM tiles.` };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { ok, message } = checkTileKey();
  (ok ? console.log : console.error)(message);
  if (!ok) process.exit(1);
}
