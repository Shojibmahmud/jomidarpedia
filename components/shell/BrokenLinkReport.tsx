'use client';
// "Report a broken link" on the 404 page (spec 10 FR-51): the corrections form with page_url set to the address
// that failed. The static HTML links to the plain form, so it still works with JavaScript off.

import { useSyncExternalStore } from 'react';
import { T } from '@/components/T';
import { CORRECTIONS_URL } from '@/lib/nav';
import { pageCorrectionUrl } from '@/lib/site-page';

const noop = () => () => {};

export function BrokenLinkReport({ className }: { className: string }) {
  const href = useSyncExternalStore(noop, () => pageCorrectionUrl(window.location.href, 'general'), () => CORRECTIONS_URL);
  return <a href={href} className={className} data-report-link><T k="nf.report" /></a>;
}
