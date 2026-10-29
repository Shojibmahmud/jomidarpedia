'use client';
// Explore (roadmap tasks 6.5 to 6.11 and 7.5 to 7.9; specs 06 and 07). The URL is the state: filters, sort,
// `view` and `sel` are read from it (lib/urlState.ts) and every applied change pushes one history entry
// (spec 06 FR-28). Load more, the list's scroll position, the sheet's snap point and canonicalisation never
// add an entry: they live in history.state under `jp` (A-4), which Next's router keeps across Back and Forward.
// The browser fetches public/data/index.json once (shared with the search overlay, lib/search-client.ts);
// division and district names come as props (A-6). `q` (spec 08 D3, FR-28 to FR-31) keeps the sites the
// search matcher finds, ANDed with the filters; Fuse.js loads only once there is a query or the box is used.
//
// Layouts (spec 07 D7): from 1280 px rail | map | list; from 1024 px rail | a Map/List pane; below, the list
// with a Map button, or the full-screen map with the results sheet. The map loads only when it is shown and
// Lite mode is off (FR-1, FR-38).

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { T } from '@/components/T';
import { CopyButton } from '@/components/site/CopyButton';
import { LiteToggle } from '@/components/shell/Toggles';
import { BottomSheet, type Snap } from '@/components/map/BottomSheet';
import { MapLoader } from '@/components/map/MapLoader';
import type { MapApi } from '@/components/map/MapView';
import { SummaryCard } from '@/components/map/SummaryCard';
import { counts as countAll, EMPTY, filter, makePlaces, activeCount, type FilterState, type PlaceList } from '@/lib/filters';
import { both, formatCount } from '@/lib/format';
import { text, type StringKey } from '@/lib/i18n';
import { useIndexData, useMatcher } from '@/lib/search-client';
import { sortSites } from '@/lib/sort';
import { exploreHref, parse, Q_MAX, serialize, SORTS, type Extras, type Sort, type View } from '@/lib/urlState';
import { useLite, useMedia, useUiLang } from '@/lib/use-ui-lang';
import type { IndexSite } from '@/lib/types';
import { ActiveFilters } from './ActiveFilters';
import { EmptyResults } from './EmptyResults';
import { ExploreSearch } from './ExploreSearch';
import { FilterDrawer } from './FilterDrawer';
import { FilterRail } from './FilterRail';
import { LiteNotices, LiteOffPanel } from './LiteNotices';
import { Skeleton } from '@/components/shell/Skeleton';
import { LoadError, PAGE_SIZE, ResultsList } from './ResultsList';

type Load = { status: 'loading' | 'error' } | { status: 'ready'; sites: IndexSite[] };
/** Per-entry memory. selFrom: this entry was pushed by selecting a site from the same view without one (D9). */
type Memory = { pages?: number; scroll?: number; snap?: Snap; sheetScroll?: number; selFrom?: boolean };

const NO_SITES: IndexSite[] = [];
const SORT_LABEL: Record<Sort, StringKey> = { time: 'sort.time', name: 'sort.name', district: 'sort.district' };

// `next dev` server-renders a URL with a query string, so there is no window there; the static export never does.
const memory = (): Memory => (typeof window === 'undefined' ? {} : window.history.state?.jp ?? {}) as Memory;
/** Updates this entry's memory without changing the URL or adding an entry. */
const remember = (patch: Memory) => window.history.replaceState({ jp: { ...memory(), ...patch } }, '');
const rawSearch = () => window.location.search.replace(/^\?/, '');
const withoutSel = ({ sel: _sel, ...rest }: Extras): Extras => rest; // eslint-disable-line @typescript-eslint/no-unused-vars
const withoutQ = ({ q: _q, ...rest }: Extras): Extras => rest; // eslint-disable-line @typescript-eslint/no-unused-vars
const withoutIds = ({ ids: _ids, ...rest }: Extras): Extras => rest; // eslint-disable-line @typescript-eslint/no-unused-vars

function useIndex(): { load: Load; retry: () => void } {
  const { state, retry } = useIndexData();
  const load: Load = state.status === 'ready' ? { status: 'ready', sites: state.value } : { status: state.status === 'error' ? 'error' : 'loading' };
  return { load, retry };
}

const FilterIcon = () => <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>;
const MapIcon = () => <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></svg>;
const ListIcon = () => <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></svg>;

export function ExploreApp({ places: list }: { places: PlaceList }) {
  const places = useMemo(() => makePlaces(list), [list]);
  const search = useSearchParams().toString();
  const lang = useUiLang();
  const lite = useLite();
  const xl = useMedia('(min-width: 1280px)');
  const lg = useMedia('(min-width: 1024px)');
  const layout: 'three' | 'pane' | 'phone' = xl ? 'three' : lg ? 'pane' : 'phone';
  const { load, retry } = useIndex();
  const indexReady = load.status === 'ready';
  const sites = indexReady ? load.sites : NO_SITES;
  const byId = useMemo(() => new Map(sites.map(s => [s.i, s])), [sites]);
  const ids = useMemo(() => (indexReady ? new Set(byId.keys()) : undefined), [indexReady, byId]);
  const raw = useMemo(() => parse(search, places, ids), [search, places, ids]);

  // q (spec 08 FR-29): the sites the matcher finds for it. If search can't load, the filters work without it (NFR-4).
  const q = raw.extras.q;
  const [searchWanted, setSearchWanted] = useState(false);
  const { state: matcher, retry: retrySearch } = useMatcher(!!q || searchWanted);
  const searchFailed = !!q && matcher.status === 'error';
  const hits = useMemo(() => (q && matcher.status === 'ready' ? matcher.value.match(q) : undefined), [q, matcher]);
  // ids ("Open all stops on the map", spec 09 FR-43): only those sites, ANDed with the search and the filters.
  const idList = raw.extras.ids;
  const pool = useMemo(() => {
    const searched = !q || searchFailed ? sites : hits ? sites.filter(s => hits.has(s.i)) : NO_SITES;
    if (!idList?.length) return searched;
    const keep = new Set(idList);
    return searched.filter(s => keep.has(s.i));
  }, [q, searchFailed, sites, hits, idList]);
  const ready = indexReady && (!q || searchFailed || !!hits);
  const filtered = useMemo(() => filter(pool, raw.state, places), [pool, raw.state, places]);

  // A sel that names a hidden pin or a filtered-out site is dropped with the notice (spec 07 FR-22, D12) —
  // unless the visitor's own search, sent before the matcher could check it, excluded it (spec 08 FR-31).
  const [quietSel, setQuietSel] = useState<{ q: string; sel: string } | null>(null);
  const parsed = useMemo(() => {
    const sel = raw.extras.sel;
    if (!ready || !sel || filtered.some(s => s.i === sel && s.ll)) return raw;
    const quiet = quietSel?.sel === sel && quietSel.q === raw.extras.q;
    return { ...raw, extras: withoutSel(raw.extras), dropped: raw.dropped || !quiet };
  }, [raw, ready, filtered, quietSel]);
  const view: View = useMemo(() => ({ state: parsed.state, sort: parsed.sort, extras: parsed.extras }), [parsed]);
  const { state, sort, extras } = view;
  const selSite = extras.sel ? byId.get(extras.sel) : undefined;

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

  /**
   * One applied change: one history entry. A filter or sort change goes back to the first page (FR-3);
   * a view or selection change keeps this entry's memory (loaded pages, scroll, snap point).
   */
  const go = useCallback((next: View, keep?: { selFrom?: boolean }) => {
    const qs = serialize(next);
    if (qs === rawSearch()) return;
    const jp: Memory = keep ? { ...memory(), selFrom: keep.selFrom || undefined } : { pages: 1, snap: memory().snap };
    window.history.pushState({ jp }, '', qs ? `?${qs}` : window.location.pathname);
  }, []);

  // A filter change that excludes the selected site drops sel in the same entry, with no notice (D12).
  const suppressFocus = useRef(false);
  const apply = useCallback((next: FilterState) => {
    let ex = view.extras;
    if (ex.sel && !filter(pool, next, places).some(s => s.i === ex.sel && s.ll)) { ex = withoutSel(ex); suppressFocus.current = true; }
    go({ ...view, state: next, extras: ex });
  }, [go, view, pool, places]);
  /** Clear all: the filters, the search (FR-30) and a trip's stops (spec 09 FR-43); a selected site stays. */
  const clear = useCallback(() => go({ ...view, state: EMPTY, extras: withoutIds(withoutQ(view.extras)) }), [go, view]);
  /** The "N trip stops" chip: back to every site, keeping the filters and the selection. */
  const removeIds = useCallback(() => go({ ...view, extras: withoutIds(view.extras) }), [go, view]);

  /**
   * A new search text (FR-28, FR-31): the first update of a run of typing pushes an entry, the rest replace
   * it. A query that excludes the selected site drops sel in the same entry, with no notice.
   */
  const setQuery = useCallback((text: string, push: boolean) => {
    const next = text.trim().slice(0, Q_MAX).trim();
    let ex: Extras = next ? { ...view.extras, q: next } : withoutQ(view.extras);
    let quiet: { q: string; sel: string } | null = null;
    if (ex.sel && matcher.status === 'ready') {
      const kept = next ? matcher.value.match(next) : undefined;
      const p = kept ? sites.filter(s => kept.has(s.i)) : sites;
      if (!filter(p, view.state, places).some(s => s.i === ex.sel && s.ll)) { ex = withoutSel(ex); suppressFocus.current = true; }
    } else if (ex.sel && next) quiet = { q: next, sel: ex.sel }; // checked once the matcher is ready, without the notice
    const qs = serialize({ ...view, extras: ex });
    if (qs === rawSearch()) return;
    setQuietSel(quiet);
    const jp: Memory = { pages: 1, snap: memory().snap };
    if (push) window.history.pushState({ jp }, '', qs ? `?${qs}` : window.location.pathname);
    else window.history.replaceState({ jp }, '', qs ? `?${qs}` : window.location.pathname);
  }, [view, matcher, sites, places]);
  const wantSearch = useCallback(() => setSearchWanted(true), []);
  const setView = (v: 'list' | 'map') => go({ ...view, extras: { ...extras, view: v } }, {});

  // Loaded pages and scroll position, restored for this history entry (FR-29).
  // In the static export ExploreApp renders only in the browser (useSearchParams bails out of the static render).
  const [pages, setPages] = useState(() => memory().pages ?? 1);
  const [snap, setSnapState] = useState<Snap>(() => memory().snap ?? 'peek');
  const [pagesFor, setPagesFor] = useState(search);
  if (pagesFor !== search) {
    setPagesFor(search);
    setPages(memory().pages ?? 1);
    setSnapState(memory().snap ?? 'peek');
  }
  const setSnap = useCallback((s: Snap) => { setSnapState(s); remember({ snap: s }); }, []);
  const pendingScroll = useRef<number | null>(null);
  useEffect(() => { pendingScroll.current = memory().scroll ?? null; }, [search]);
  useEffect(() => {
    if (!ready || pendingScroll.current === null) return;
    const y = pendingScroll.current;
    pendingScroll.current = null;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }, [ready, pages, search]);
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

  const results = useMemo(() => sortSites(filtered.slice(), sort, lang), [filtered, sort, lang]);
  const onMap = useMemo(() => filtered.filter(s => s.ll), [filtered]);
  const counts = useMemo(() => countAll(pool, state, places), [pool, state, places]);
  const unclassified = useMemo(() => sites.filter(s => s.t === 'unclassified').length, [sites]);
  const fitKey = useMemo(() => serialize({ state, sort: 'time', extras: { q: extras.q, ids: extras.ids } }), [state, extras.q, extras.ids]);

  // The result count, announced once a run of changes settles (FR-32, A-5).
  const [announcement, setAnnouncement] = useState('');
  const announced = useRef<string | null>(null);
  const filterKey = `${fitKey}|${sort}|${results.length}`;
  useEffect(() => {
    if (!ready) return;
    if (announced.current === null) { announced.current = filterKey; return; } // not on first load
    if (announced.current === filterKey) return;
    const timer = setTimeout(() => {
      announced.current = filterKey;
      setAnnouncement(text(results.length === 1 ? 'results.count.one' : 'results.count', lang, { count: both(formatCount, results.length) }));
    }, 500);
    return () => clearTimeout(timer);
  }, [ready, filterKey, results.length, lang]);

  // The drawer, below lg only (A-1): it closes, discarding its draft, if the window widens.
  const [drawer, setDrawer] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeDrawer = useCallback(() => { setDrawer(false); trigger.current?.focus(); }, []);
  if (lg && drawer) setDrawer(false);

  // ------------------------------------------------------------------ the map and selection (spec 07)
  const mapShown = layout === 'three' || extras.view === 'map';
  const [hovered, setHovered] = useState<string | null>(null);
  const mapApi = useRef<MapApi | null>(null);
  const onReady = useCallback((api: MapApi | null) => { mapApi.current = api; }, []);
  const returnTo = useRef<HTMLElement | null>(null);
  const [focusSummary, setFocusSummary] = useState(false);

  /** Selecting a pin or "Show on map": one entry with sel (FR-19, D9). */
  const select = useCallback((id: string, keyboard: boolean, from?: HTMLElement, ex: Extras = view.extras) => {
    if (view.extras.sel === id && (ex.view ?? 'list') === (view.extras.view ?? 'list')) return;
    returnTo.current = from ?? null;
    setFocusSummary(keyboard);
    go({ ...view, extras: { ...ex, sel: id } }, { selFrom: !view.extras.sel && ex.view === view.extras.view });
  }, [go, view]);
  // Below 1280 px the map may be off screen: "Show on map" switches to it in the same entry (FR-20).
  const onShow = useCallback((id: string, button: HTMLButtonElement) => {
    if (layout !== 'three' && view.extras.view !== 'map') select(id, false, button, { ...view.extras, view: 'map' });
    else select(id, false, button);
  }, [layout, select, view.extras]);

  /** Close, X and Esc: back to the entry before the selection, or this entry without sel (FR-21, A-1). */
  const close = useCallback(() => {
    if (!view.extras.sel) return;
    if (memory().selFrom) { window.history.back(); return; }
    const qs = serialize({ ...view, extras: withoutSel(view.extras) });
    window.history.replaceState({ jp: { ...memory(), selFrom: undefined } }, '', qs ? `?${qs}` : window.location.pathname);
  }, [view]);

  // Focus returns to the pin, or to the "Show on map" button that opened the summary, when it closes.
  const prevSel = useRef<string | undefined>(extras.sel);
  useEffect(() => {
    const before = prevSel.current;
    prevSel.current = extras.sel;
    if (!before || extras.sel) return;
    if (suppressFocus.current) { suppressFocus.current = false; return; }
    const button = returnTo.current;
    returnTo.current = null;
    requestAnimationFrame(() => {
      if (button?.isConnected && button.offsetParent) button.focus();
      else mapApi.current?.focusPin(before);
    });
  }, [extras.sel]);

  useEffect(() => {
    if (!selSite || drawer) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); close(); } };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [selSite, drawer, close]);

  const active = activeCount(state);
  const shareUrl = typeof window === 'undefined' ? exploreHref(view) : new URL(exploreHref(view), window.location.origin).href;
  const count = { count: both(formatCount, results.length) };
  const mapLink = { selected: extras.sel, onShow, onHover: setHovered };

  const bar = ready ? (
    <p className="inline-block rounded-full bg-surface px-3 py-1.5 text-sm font-semibold shadow-2" data-map-bar data-on-map={onMap.length} data-off-map={results.length - onMap.length}>
      {onMap.length === results.length
        ? <T k="common.sitesOnMap" vars={{ count: both(formatCount, onMap.length) }} />
        : <T k="map.onMapOf" vars={{ shown: both(formatCount, onMap.length), count: both(formatCount, results.length), hidden: both(formatCount, results.length - onMap.length) }} />}
    </p>
  ) : null;

  const theMap = (compact = false, popover = true) => (lite ? <LiteOffPanel /> : (
    <MapLoader sites={ready ? onMap : NO_SITES} fitKey={ready ? fitKey : ''} selected={selSite?.ll ? selSite : undefined}
      hovered={hovered ?? undefined} onSelect={(id, keyboard) => select(id, keyboard)} onReady={onReady} compact={compact}
      onBackground={popover ? undefined : close}
      bar={popover ? bar : undefined} popover={popover && selSite ? <SummaryCard site={selSite} variant="popover" onClose={close} focusOnOpen={focusSummary} /> : undefined} />
  ));

  const viewSwitch = (
    <div role="group" aria-label={text('map.view', lang)} className="inline-flex rounded-full border border-line-strong bg-surface p-0.5" data-view-switch>
      <button type="button" aria-pressed={extras.view === 'map'} onClick={() => setView('map')} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold aria-pressed:bg-ink aria-pressed:text-bg">
        <MapIcon /><T k="map.show" />
      </button>
      <button type="button" aria-pressed={extras.view !== 'map'} onClick={() => setView('list')} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold aria-pressed:bg-ink aria-pressed:text-bg">
        <ListIcon /><T k="map.list" />
      </button>
    </div>
  );

  const sortGroup = (
    <div role="group" aria-labelledby="jp-sort" className="flex flex-wrap items-center gap-2">
      <span id="jp-sort" className="text-sm font-semibold text-muted"><T k="sort.label" /></span>
      {SORTS.map(s => (
        <button key={s} type="button" aria-pressed={sort === s} onClick={() => go({ ...view, sort: s })} data-sort={s}
          className="chip min-h-10 px-3 text-sm"><T k={SORT_LABEL[s]} /></button>
      ))}
    </div>
  );

  const filtersButton = (floating: boolean) => (
    <button ref={trigger} type="button" onClick={() => setDrawer(true)} disabled={!ready} aria-haspopup="dialog" data-open-filters
      className={`inline-flex min-h-tap items-center gap-2 rounded-md border border-line-strong bg-surface px-4 font-semibold ${floating ? 'shadow-2' : 'ml-auto lg:hidden'}`}>
      <FilterIcon />
      <T k="filter.title" />
      {active ? (
        <span className="rounded-full bg-ink px-2 text-sm text-bg" data-active-count={active}>
          <T k="filter.activeCount" vars={{ count: both(formatCount, active) }} />
        </span>
      ) : null}
    </button>
  );

  const noticeBox = notice ? (
    <div role="status" className="flex items-start gap-3 rounded-lg border border-gold bg-gold-tint p-3 text-sm" data-notice>
      <p className="flex-1"><T k="url.droppedFilters" /></p>
      <button type="button" onClick={() => setDismissed(true)} className="min-h-tap px-2 font-semibold underline"><T k="common.dismiss" /></button>
    </div>
  ) : null;

  const listBody = load.status === 'error' ? <LoadError onRetry={retry} />
    : !ready ? <Skeleton variant="row" label="results.loading" />
      : results.length ? <ResultsList sites={results} pages={pages} onMore={more} map={mapLink} terms={hits} />
        : <EmptyResults sites={pool} state={state} places={places} onChange={apply} onClear={clear} q={extras.q} onRemoveQ={() => setQuery('', true)} />;

  const searchError = searchFailed ? (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3 text-sm" data-search-error>
      <p className="flex-1 font-semibold"><T k="search.error" /></p>
      <button type="button" onClick={retrySearch} className="min-h-tap rounded-md bg-primary px-4 font-semibold text-on-primary"><T k="results.retry" /></button>
    </div>
  ) : null;
  const searchBox = (id: string, className = '') => (
    <ExploreSearch id={id} q={extras.q ?? ''} onIntent={wantSearch} onChange={setQuery} className={className} />
  );

  const listColumn = (
    <section aria-labelledby="jp-results-title" className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="jp-results-title" className="font-serif text-h2" data-count={ready ? results.length : undefined}>
          {ready ? <T k={results.length === 1 ? 'results.count.one' : 'results.count'} vars={count} /> : <T k="results.label" />}
        </h2>
        {layout === 'pane' ? <span className="ml-auto">{viewSwitch}</span> : null}
        {filtersButton(false)}
      </div>
      <LiteNotices />
      {searchBox('jp-search-within-list', 'lg:hidden')}
      {searchError}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {sortGroup}
        <CopyButton value={shareUrl} label="explore.copyLink" ok="share.copied" failed="share.failed" />
        <LiteToggle />
      </div>
      {noticeBox}
      <ActiveFilters state={state} places={places} onChange={apply} onClear={clear} q={extras.q} onRemoveQ={() => setQuery('', true)}
        ids={extras.ids?.length} onRemoveIds={removeIds} />
      {listBody}
    </section>
  );

  // ------------------------------------------------------------------ phone map (FR-4, FR-24 to FR-29)
  const overlay = useRef<HTMLDivElement>(null);
  const [total, setTotal] = useState(0);
  const [sheetH, setSheetH] = useState(0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [summaryH, setSummaryH] = useState(0);
  const phoneMap = layout === 'phone' && extras.view === 'map';
  useEffect(() => {
    if (!phoneMap) return;
    const ro = new ResizeObserver(() => {
      setTotal(overlay.current?.clientHeight ?? 0);
      setSummaryH(summaryRef.current?.offsetHeight ?? 0);
    });
    if (overlay.current) ro.observe(overlay.current);
    if (summaryRef.current) ro.observe(summaryRef.current);
    setTotal(overlay.current?.clientHeight ?? 0);
    setSummaryH(summaryRef.current?.offsetHeight ?? 0);
    return () => ro.disconnect();
  }, [phoneMap, selSite]);
  const sheetList = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sheetList.current;
    if (!phoneMap || !el) return;
    el.scrollTop = memory().sheetScroll ?? 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => { clearTimeout(timer); timer = setTimeout(() => remember({ sheetScroll: Math.round(el.scrollTop) }), 200); };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearTimeout(timer); el.removeEventListener('scroll', onScroll); };
  }, [phoneMap, search]);
  const sheetHeading = useId();

  const rail = <FilterRail state={state} counts={counts} places={places} unclassified={unclassified} disabled={!ready} onChange={apply} onClear={clear}
    search={searchBox('jp-search-within')} />;
  const drawerEl = (
    <FilterDrawer open={drawer} applied={state} sites={pool} places={places} unclassified={unclassified}
      onApply={next => { setDrawer(false); apply(next); trigger.current?.focus(); }} onClose={closeDrawer} />
  );
  const live = <p role="status" aria-live="polite" className="sr-only" data-announce>{announcement}</p>;

  if (phoneMap) {
    const mapBottom = selSite ? summaryH : sheetH;
    return (
      <div ref={overlay} className="fixed inset-x-0 bottom-0 top-[61px] z-panel overflow-hidden bg-map-land" data-phone-map>
        {live}
        <div className="absolute inset-x-0 top-0" style={{ bottom: mapBottom }}>
          {theMap(snap === 'full' && !selSite, false)}
          <div className="pointer-events-none absolute inset-x-3 top-3 z-panel space-y-2">
            <div className="pointer-events-auto flex items-start gap-2">{filtersButton(true)}</div>
            <div className="pointer-events-auto space-y-2">{noticeBox}<LiteNotices /></div>
          </div>
        </div>
        <BottomSheet snap={snap} onSnap={setSnap} total={total} headingId={sheetHeading} onHeight={setSheetH} hidden={!!selSite} listRef={sheetList}
          header={(
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <h2 id={sheetHeading} tabIndex={-1} className="font-serif text-h3 outline-none" data-count={ready ? results.length : undefined}>
                    {ready ? <T k={results.length === 1 ? 'results.count.one' : 'results.count'} vars={count} /> : <T k="results.label" />}
                  </h2>
                  {ready ? (
                    <p className="text-sm text-muted" data-sheet-bar>
                      {onMap.length === results.length
                        ? <T k="common.sitesOnMap" vars={{ count: both(formatCount, onMap.length) }} />
                        : <T k="map.onMapOf" vars={{ shown: both(formatCount, onMap.length), count: both(formatCount, results.length), hidden: both(formatCount, results.length - onMap.length) }} />}
                    </p>
                  ) : null}
                </div>
                {snap === 'peek'
                  ? <button type="button" onClick={() => setSnap('full')} className="inline-flex min-h-tap items-center gap-1 px-2 font-semibold text-primary-tint-ink"><T k="map.list" /><span aria-hidden="true">⌃</span></button>
                  : snap === 'full' ? viewSwitch : null}
              </div>
              {snap !== 'peek' ? sortGroup : null}
              {snap === 'full' ? <LiteToggle /> : null}
            </div>
          )}>
          {listBody}
        </BottomSheet>
        {selSite ? (
          <div ref={summaryRef} className="absolute inset-x-0 bottom-0 z-panel max-h-[75%] overflow-y-auto" data-summary-sheet>
            <SummaryCard site={selSite} variant="sheet" onClose={close} focusOnOpen={focusSummary} />
          </div>
        ) : null}
        {drawerEl}
      </div>
    );
  }

  if (layout === 'three') {
    return (
      <div className="grid grid-cols-[300px_minmax(0,1fr)_400px] gap-6">
        {live}
        {rail}
        <div className="sticky top-[77px] h-[calc(100vh-180px)] min-h-[420px] overflow-hidden rounded-lg border border-line" data-map-pane>{theMap()}</div>
        {listColumn}
        {drawerEl}
      </div>
    );
  }

  return (
    <div className="gap-8 lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
      {live}
      {rail}
      {layout === 'pane' && mapShown ? (
        <section aria-labelledby="jp-results-title" className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="jp-results-title" className="font-serif text-h2" data-count={ready ? results.length : undefined}>
              {ready ? <T k={results.length === 1 ? 'results.count.one' : 'results.count'} vars={count} /> : <T k="results.label" />}
            </h2>
            <span className="ml-auto">{viewSwitch}</span>
          </div>
          <LiteNotices />
          {noticeBox}
          {searchError}
          <div className="sticky top-[77px] h-[calc(100vh-250px)] min-h-[420px] overflow-hidden rounded-lg border border-line" data-map-pane>{theMap()}</div>
        </section>
      ) : listColumn}
      {layout === 'phone' ? (
        <button type="button" onClick={() => setView('map')} data-open-map
          className="fixed bottom-4 left-1/2 z-panel inline-flex min-h-tap -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 font-semibold text-bg shadow-3">
          <MapIcon /><T k="map.show" />
        </button>
      ) : null}
      {drawerEl}
    </div>
  );
}
