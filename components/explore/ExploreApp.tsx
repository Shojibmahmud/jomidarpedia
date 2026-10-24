'use client';
// Explore (roadmap tasks 6.5 to 6.11, spec 06). The URL is the state: filters and sort are read from
// it (lib/urlState.ts) and every applied change pushes one history entry (FR-28). Load more, the list's
// scroll position and canonicalisation never add an entry: the loaded page count and scroll live in
// history.state under `jp` (A-4), which Next's router keeps across Back and Forward.
// The browser fetches public/data/index.json once; division and district names come as props (A-6).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { T } from '@/components/T';
import { CopyButton } from '@/components/site/CopyButton';
import { counts as countAll, EMPTY, filter, makePlaces, activeCount, type FilterState, type PlaceList } from '@/lib/filters';
import { both, formatCount } from '@/lib/format';
import { text, type StringKey } from '@/lib/i18n';
import { sortSites } from '@/lib/sort';
import { exploreHref, parse, serialize, SORTS, type Sort, type View } from '@/lib/urlState';
import { useUiLang } from '@/lib/use-ui-lang';
import type { IndexSite } from '@/lib/types';
import { ActiveFilters } from './ActiveFilters';
import { EmptyResults } from './EmptyResults';
import { FilterDrawer } from './FilterDrawer';
import { FilterRail } from './FilterRail';
import { ListSkeleton, LoadError, PAGE_SIZE, ResultsList } from './ResultsList';

type Load = { status: 'loading' | 'error' } | { status: 'ready'; sites: IndexSite[] };
type Memory = { pages?: number; scroll?: number };

const NO_SITES: IndexSite[] = [];
const SORT_LABEL: Record<Sort, StringKey> = { time: 'sort.time', name: 'sort.name', district: 'sort.district' };

const memory = (): Memory => (window.history.state?.jp ?? {}) as Memory;
/** Updates this entry's memory without changing the URL or adding an entry. */
const remember = (patch: Memory) => window.history.replaceState({ jp: { ...memory(), ...patch } }, '');
const rawSearch = () => window.location.search.replace(/^\?/, '');

function useIndex() {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    fetch('/data/index.json')
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((sites: unknown) => {
        if (!Array.isArray(sites)) throw new Error('index.json is not a list');
        if (live) setLoad({ status: 'ready', sites: sites as IndexSite[] });
      })
      .catch(() => { if (live) setLoad({ status: 'error' }); });
    return () => { live = false; };
  }, [attempt]);
  const retry = useCallback(() => { setLoad({ status: 'loading' }); setAttempt(a => a + 1); }, []);
  return { load, retry };
}

export function ExploreApp({ places: list }: { places: PlaceList }) {
  const places = useMemo(() => makePlaces(list), [list]);
  const search = useSearchParams().toString();
  const lang = useUiLang();
  const { load, retry } = useIndex();
  const sites = load.status === 'ready' ? load.sites : NO_SITES;
  const ids = useMemo(() => (load.status === 'ready' ? new Set(load.sites.map(s => s.i)) : undefined), [load]);
  const parsed = useMemo(() => parse(search, places, ids), [search, places, ids]);
  const view: View = useMemo(() => ({ state: parsed.state, sort: parsed.sort, extras: parsed.extras }), [parsed]);
  const { state, sort } = view;

  // Canonical URL (FR-11, FR-12): rewrite in place, and say so when something was dropped.
  const [droppedAt, setDroppedAt] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  if (parsed.dropped && droppedAt !== search) {
    setDroppedAt(search);
    setDismissed(false);
  }
  const notice = droppedAt !== null && !dismissed;
  useEffect(() => {
    const canonical = serialize(view);
    if (canonical !== rawSearch()) window.history.replaceState({ jp: memory() }, '', canonical ? `?${canonical}` : window.location.pathname);
  }, [view]);

  /** One applied change: one history entry, back on the first page (FR-3, FR-28). */
  const go = useCallback((next: View) => {
    const qs = serialize(next);
    if (qs === rawSearch()) return;
    window.history.pushState({ jp: { pages: 1 } }, '', qs ? `?${qs}` : window.location.pathname);
  }, []);
  const apply = useCallback((next: FilterState) => go({ ...view, state: next }), [go, view]);
  const clear = useCallback(() => apply(EMPTY), [apply]);

  // Loaded pages and scroll position, restored for this history entry (FR-29).
  // ExploreApp renders only in the browser (useSearchParams bails out of the static render), so window is there.
  const [pages, setPages] = useState(() => memory().pages ?? 1);
  const [pagesFor, setPagesFor] = useState(search);
  if (pagesFor !== search) {
    setPagesFor(search);
    setPages(memory().pages ?? 1);
  }
  const pendingScroll = useRef<number | null>(null);
  useEffect(() => { pendingScroll.current = memory().scroll ?? null; }, [search]);
  useEffect(() => {
    if (load.status !== 'ready' || pendingScroll.current === null) return;
    const y = pendingScroll.current;
    pendingScroll.current = null;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }, [load.status, pages, search]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => remember({ scroll: Math.round(window.scrollY) });
    const onScroll = () => { clearTimeout(timer); timer = setTimeout(save, 200); };
    const flush = () => { clearTimeout(timer); save(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', flush);
    document.addEventListener('click', flush, true); // before a link to a site page adds an entry
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('click', flush, true);
    };
  }, []);

  const focusFrom = useRef<number | null>(null);
  const more = () => {
    focusFrom.current = pages * PAGE_SIZE;
    setPages(pages + 1);
    remember({ pages: pages + 1 });
  };
  useEffect(() => {
    if (focusFrom.current === null) return;
    document.querySelector<HTMLElement>(`[data-result-index="${focusFrom.current}"] a`)?.focus();
    focusFrom.current = null;
  }, [pages]);

  const results = useMemo(() => sortSites(filter(sites, state, places), sort, lang), [sites, state, places, sort, lang]);
  const counts = useMemo(() => countAll(sites, state, places), [sites, state, places]);
  const unclassified = useMemo(() => sites.filter(s => s.t === 'unclassified').length, [sites]);

  // The result count, announced once a run of changes settles (FR-32, A-5).
  const [announcement, setAnnouncement] = useState('');
  const announced = useRef<string | null>(null);
  useEffect(() => {
    if (load.status !== 'ready') return;
    const key = `${search}|${results.length}`;
    if (announced.current === null) { announced.current = key; return; } // not on first load
    if (announced.current === key) return;
    const timer = setTimeout(() => {
      announced.current = key;
      setAnnouncement(text(results.length === 1 ? 'results.count.one' : 'results.count', lang, { count: both(formatCount, results.length) }));
    }, 500);
    return () => clearTimeout(timer);
  }, [load.status, search, results.length, lang]);

  // The drawer, below lg only (A-1): it closes, discarding its draft, if the window widens.
  const [drawer, setDrawer] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeDrawer = useCallback(() => { setDrawer(false); trigger.current?.focus(); }, []);
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)');
    const onChange = () => { if (wide.matches) setDrawer(false); };
    wide.addEventListener('change', onChange);
    return () => wide.removeEventListener('change', onChange);
  }, []);

  const ready = load.status === 'ready';
  const active = activeCount(state);
  const shareUrl = typeof window === 'undefined' ? exploreHref(view) : new URL(exploreHref(view), window.location.origin).href;
  const count = { count: both(formatCount, results.length) };

  return (
    <div className="gap-8 lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
      <FilterRail state={state} counts={counts} places={places} unclassified={unclassified} disabled={!ready} onChange={apply} onClear={clear} />
      <section aria-labelledby="jp-results-title" className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="jp-results-title" className="font-serif text-h2" data-count={ready ? results.length : undefined}>
            {ready ? <T k={results.length === 1 ? 'results.count.one' : 'results.count'} vars={count} /> : <T k="results.label" />}
          </h2>
          <button ref={trigger} type="button" onClick={() => setDrawer(true)} disabled={!ready} aria-haspopup="dialog" data-open-filters
            className="ml-auto inline-flex min-h-tap items-center gap-2 rounded-md border border-line-strong bg-surface px-4 font-semibold lg:hidden">
            <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
            <T k="filter.title" />
            {active ? (
              <span className="rounded-full bg-ink px-2 text-sm text-bg" data-active-count={active}>
                <T k="filter.activeCount" vars={{ count: both(formatCount, active) }} />
              </span>
            ) : null}
          </button>
        </div>
        <p role="status" aria-live="polite" className="sr-only" data-announce>{announcement}</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div role="group" aria-labelledby="jp-sort" className="flex flex-wrap items-center gap-2">
            <span id="jp-sort" className="text-sm font-semibold text-muted"><T k="sort.label" /></span>
            {SORTS.map(s => (
              <button key={s} type="button" aria-pressed={sort === s} onClick={() => go({ ...view, sort: s })} data-sort={s}
                className="chip min-h-10 px-3 text-sm"><T k={SORT_LABEL[s]} /></button>
            ))}
          </div>
          <CopyButton value={shareUrl} label="explore.copyLink" ok="share.copied" failed="share.failed" />
        </div>

        {notice ? (
          <div role="status" className="flex items-start gap-3 rounded-lg border border-gold bg-gold-tint p-3 text-sm" data-notice>
            <p className="flex-1"><T k="url.droppedFilters" /></p>
            <button type="button" onClick={() => setDismissed(true)} className="min-h-tap px-2 font-semibold underline"><T k="common.dismiss" /></button>
          </div>
        ) : null}

        <ActiveFilters state={state} places={places} onChange={apply} onClear={clear} />

        {load.status === 'loading' ? <ListSkeleton />
          : load.status === 'error' ? <LoadError onRetry={retry} />
            : results.length ? <ResultsList sites={results} pages={pages} onMore={more} />
              : <EmptyResults sites={sites} state={state} places={places} onChange={apply} onClear={clear} />}
      </section>
      <FilterDrawer open={drawer} applied={state} sites={sites} places={places} unclassified={unclassified}
        onApply={next => { setDrawer(false); apply(next); trigger.current?.focus(); }} onClose={closeDrawer} />
    </div>
  );
}
