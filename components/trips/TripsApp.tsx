'use client';
// The trips listing's filters, sort and paging (roadmap tasks 9.1, 9.2; spec 09 FR-3 to FR-11, D10, D11).
// The URL is the state (lib/trips.ts, docs/URLS.md): every applied change pushes one history entry; an unknown
// value is dropped, the URL rewritten in place and a notice shown, as in Explore. "Has a timed plan" is offered
// only once a trip has a reviewed timed status (FR-7, D1). The build renders the first 12 cards without this
// component (app/trips/page.tsx), so the list works with JavaScript off.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Both, T } from '@/components/T';
import { bucketLabel } from '@/lib/explore-labels';
import { BUCKET_ORDER } from '@/lib/filters';
import { both, formatCount } from '@/lib/format';
import { dual, text, type Dual } from '@/lib/i18n';
import { filterTrips, lenCounts, LENS, NO_FILTERS, PAGE, parseTrips, serializeTrips, sortTrips, TRIP_SORTS, type Len, type TripCard, type TripFilters, type TripView } from '@/lib/trips';
import { useUiLang } from '@/lib/use-ui-lang';
import type { TravelBucket } from '@/lib/types';
import { ItineraryCard } from './ItineraryCard';

export interface DivisionName { slug: string; en: string; bn: string }

const n = (v: number) => both(formatCount, v);
const LEN_KEY = { 'one-day': 'trip.One day', 'multi-day': 'trip.Overnight / multi-day', 'not-stated': 'trip.Not stated' } as const;
const rawSearch = () => window.location.search.replace(/^\?/, '');
const toggle = <T,>(list: readonly T[], v: T, order: readonly T[]) => order.filter(x => (x === v ? !list.includes(x) : list.includes(x)));

export function TripsApp({ trips, divisions, timed }: { trips: TripCard[]; divisions: DivisionName[]; timed: boolean }) {
  const search = useSearchParams().toString();
  const lang = useUiLang();
  const slugs = useMemo(() => divisions.map(d => d.slug), [divisions]);
  const parsed = useMemo(() => parseTrips(search, slugs), [search, slugs]);
  const view: TripView = useMemo(() => ({ filters: parsed.filters, sort: parsed.sort }), [parsed]);
  const { filters, sort } = view;

  // Canonical URL (FR-9): rewrite in place, and say so when something was dropped.
  const [droppedAt, setDroppedAt] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  if (parsed.dropped && droppedAt !== search) { setDroppedAt(search); setDismissed(false); }
  useEffect(() => {
    const canonical = serializeTrips(view);
    if (canonical !== rawSearch()) window.history.replaceState(null, '', canonical ? `?${canonical}` : window.location.pathname);
  }, [view]);

  const go = useCallback((next: TripView) => {
    const qs = serializeTrips(next);
    if (qs === rawSearch()) return;
    window.history.pushState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, []);
  const set = (f: Partial<TripFilters>) => go({ ...view, filters: { ...filters, ...f } });

  // Paging: back to the first 12 whenever the view changes (FR-3).
  const [pages, setPages] = useState(1);
  const [pagesFor, setPagesFor] = useState(search);
  if (pagesFor !== search) { setPagesFor(search); setPages(1); }
  const focusFrom = useRef<number | null>(null);
  useEffect(() => {
    if (focusFrom.current === null) return;
    document.querySelector<HTMLElement>(`[data-trip-index="${focusFrom.current}"] a`)?.focus();
    focusFrom.current = null;
  }, [pages]);

  const results = useMemo(() => sortTrips(filterTrips(trips, filters), sort, lang), [trips, filters, sort, lang]);
  const counts = useMemo(() => lenCounts(trips, filters), [trips, filters]);
  const shown = Math.min(results.length, pages * PAGE);
  const nextCount = Math.min(PAGE, results.length - shown);

  // Announce the count once a change settles.
  const [announcement, setAnnouncement] = useState('');
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => setAnnouncement(text(results.length === 1 ? 'trips.count.one' : 'trips.count', lang, { count: n(results.length) })), 400);
    return () => clearTimeout(t);
  }, [results.length, lang, search]);

  const divName = (slug: string): Dual => {
    const d = divisions.find(x => x.slug === slug);
    return d ? { en: d.en, bn: d.bn } : { en: slug, bn: slug };
  };
  const activeWords: Dual[] = [
    ...filters.len.map(l => dual(LEN_KEY[l])),
    ...(filters.tt !== 'any' ? [bucketLabel(filters.tt)] : []),
    ...filters.div.map(divName),
    ...(filters.plan ? [dual('trips.plan')] : []),
  ];
  const clear = () => go({ filters: NO_FILTERS, sort });

  const lenButton = (len: Len | null) => {
    const pressed = len ? filters.len.includes(len) : filters.len.length === 0;
    const count = len ? counts[len] : counts['one-day'] + counts['multi-day'] + counts['not-stated'];
    return (
      <button key={len ?? 'all'} type="button" aria-pressed={pressed} data-len={len ?? 'all'}
        onClick={() => set({ len: len ? toggle(filters.len, len, LENS) : [] })}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-semibold aria-pressed:bg-surface aria-pressed:ring-2 aria-pressed:ring-ink">
        {len ? <T k={LEN_KEY[len]} /> : <T k="trips.all" />}
        <span className="font-normal text-muted"><Both value={n(count)} /></span>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <p role="status" aria-live="polite" className="sr-only" data-announce>{announcement}</p>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3" data-trips-filters>
        <div role="group" aria-labelledby="jp-len" className="flex flex-col gap-1">
          <span id="jp-len" className="text-sm font-semibold text-muted"><T k="trips.len" /></span>
          <div className="inline-flex flex-wrap rounded-lg border border-line bg-surface-2 p-1">{lenButton(null)}{LENS.map(lenButton)}</div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-muted"><T k="filter.tt" /></span>
          <select value={filters.tt} onChange={e => set({ tt: e.target.value as TravelBucket | 'any' })} data-tt
            className="min-h-tap rounded-md border border-line-strong bg-surface px-3 font-semibold">
            {(['any', ...BUCKET_ORDER] as const).map(b => <option key={b} value={b}>{bucketLabel(b)[lang]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-muted"><T k="sort.label" /></span>
          <select value={sort} onChange={e => go({ ...view, sort: e.target.value as TripView['sort'] })} data-sort
            className="min-h-tap rounded-md border border-line-strong bg-surface px-3 font-semibold">
            {TRIP_SORTS.map(s => <option key={s} value={s}>{text(s === 'time' ? 'sort.time' : 'sort.name', lang)}</option>)}
          </select>
        </label>
        {timed ? (
          <button type="button" aria-pressed={filters.plan} onClick={() => set({ plan: !filters.plan })} className="chip min-h-tap" data-plan-filter>
            <T k="trips.plan" />
          </button>
        ) : null}
      </div>
      <div role="group" aria-labelledby="jp-div" className="flex flex-wrap items-center gap-2" data-div-filter>
        <span id="jp-div" className="mr-1 text-sm font-semibold text-muted"><T k="trips.div" /></span>
        {divisions.map(d => (
          <button key={d.slug} type="button" aria-pressed={filters.div.includes(d.slug)} data-div={d.slug}
            onClick={() => set({ div: toggle(filters.div, d.slug, slugs) })} className="chip min-h-10 px-3 text-sm">
            <span lang="en" data-l="en">{d.en}</span><span lang="bn" data-l="bn">{d.bn}</span>
          </button>
        ))}
      </div>

      {droppedAt !== null && !dismissed ? (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-gold bg-gold-tint p-3 text-sm" data-notice>
          <p className="flex-1"><T k="url.droppedFilters" /></p>
          <button type="button" onClick={() => setDismissed(true)} className="min-h-tap px-2 font-semibold underline"><T k="common.dismiss" /></button>
        </div>
      ) : null}
      {filters.plan && !timed ? (
        <p role="status" className="rounded-lg border border-gold bg-gold-tint p-3 text-sm" data-no-timed><T k="trips.noTimed" /></p>
      ) : null}

      <p className="text-sm text-muted" data-showing={results.length}>
        <T k="trips.showing" vars={{ shown: n(shown), count: n(results.length) }} />
        {activeWords.length ? <> · {activeWords.map((w, k) => <span key={k}>{k ? ' · ' : ''}<Both value={w} /></span>)}</> : null}
        {activeWords.length ? <> · <button type="button" onClick={clear} className="font-semibold text-ink underline"><T k="trips.clear" /></button></> : null}
      </p>

      {results.length ? (
        <>
          <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" data-trip-list>
            {results.slice(0, shown).map((t, k) => <li key={t.id} data-trip-index={k} className="flex"><ItineraryCard trip={t} /></li>)}
          </ol>
          {shown < results.length ? (
            <div className="flex justify-center">
              <button type="button" onClick={() => { focusFrom.current = shown; setPages(p => p + 1); }} data-more
                className="min-h-tap rounded-md border border-line-strong bg-surface px-5 font-semibold">
                <T k="trips.more" vars={{ count: n(nextCount) }} />
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="space-y-3 rounded-lg border border-line bg-surface p-6 text-center" data-trips-empty>
          <p className="font-serif text-h3"><T k="trips.empty" /></p>
          <button type="button" onClick={clear} className="min-h-tap rounded-md bg-primary px-4 font-semibold text-on-primary"><T k="trips.clear" /></button>
        </div>
      )}
    </div>
  );
}

/** The first page in the default order: the static HTML, shown until TripsApp runs and with JavaScript off (FR-2). */
export function TripsFirstPage({ trips }: { trips: TripCard[] }) {
  return (
    <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" data-trip-list data-static>
      {trips.map((t, k) => <li key={t.id} data-trip-index={k} className="flex"><ItineraryCard trip={t} /></li>)}
    </ol>
  );
}
