'use client';
// The client half of LastChecked: renders nothing on the server, then "May be out of date" when the date
// is more than 12 months before now (lib/site-page.ts isStale).

import { useSyncExternalStore } from 'react';
import { T } from '@/components/T';
import { isStale } from '@/lib/site-page';

const noop = () => () => {};

export function StaleNote({ date }: { date: string }) {
  const stale = useSyncExternalStore(noop, () => isStale(date, new Date()), () => false);
  if (!stale) return null;
  return <span data-stale className="ml-2 badge bg-gold-tint text-gold"><T k="checked.stale" /></span>;
}
