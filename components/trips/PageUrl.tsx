'use client';
// The page's full address for the printout (spec 09 FR-47, D8: the URL instead of a QR code). The build knows
// the address only when SITE_URL is set (14.2), so the browser fills it in; until then the path stands.

import { useSyncExternalStore } from 'react';

const noop = () => () => {};

export function PageUrl({ path }: { path: string }) {
  const href = useSyncExternalStore(noop, () => (/^https?:/.test(path) ? path : window.location.origin + path), () => path);
  return <span lang="en" className="break-all font-mono" data-page-url>{href}</span>;
}
