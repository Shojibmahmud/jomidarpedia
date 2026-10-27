'use client';
// The form on /correction/ itself (opened in a new tab, or with JavaScript off): the site, field and page come
// from this page's query. The static HTML has none of them, so the form still works without JavaScript.

import { useSyncExternalStore } from 'react';
import { correctionContext } from '@/lib/site-page';
import { CorrectionForm } from './CorrectionForm';

const noop = () => () => {};

export function CorrectionPageForm() {
  const query = useSyncExternalStore(noop, () => location.search, () => '');
  return <CorrectionForm key={query} ctx={correctionContext(new URLSearchParams(query))} titleId="jp-correction-title" />;
}
