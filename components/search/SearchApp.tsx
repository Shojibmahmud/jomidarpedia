'use client';
// /search/ (roadmap task 8.4, spec 08 FR-20 to FR-27). The URL is the state: q, field, in and exact are read
// from it (lib/searchUrl.ts). A query is submitted on Enter or 400 ms after typing stops, one history entry
// each (A-7); the group tabs and "Show N more sites" are entries too, while the loaded count and the scroll
// position live in history.state under `jp`, as in Explore. Results come from the shared matcher, which
// loads Fuse.js and index.json when this page mounts (FR-19).

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Both, T } from '@/components/T';
import { NoResultsArt } from '@/components/art/EmptyStates';
import { SiteCard } from '@/components/cards/SiteCard';
import { ListSkeleton } from '@/components/explore/ResultsList';
import { fold, variantsUsed } from '@/lib/fold';
import { both, formatCount } from '@/lib/format';
import { text, type StringKey } from '@/lib/i18n';
import { applyLang, browserStorage } from '@/lib/prefs';
import { MIN_QUERY, searchAll, type SearchDistrict, type SearchResult, type SiteHit } from '@/lib/search';
import { useMatcher } from '@/lib/search-client';
import { GROUPS, parseSearch, searchHref, serializeSearch, type Group, type SearchView } from '@/lib/searchUrl';
import { useUiLang } from '@/lib/use-ui-lang';
import { Marked } from './Marked';
import { announce, districtHref, familyHref, MatchNote } from './results';
import { SearchIcon } from './SearchIcon';

const PAGE = 20;
const ALL = { sites: 5, families: 6 };
const SUBMIT_AFTER = 400;
const TITLE = 'Search';

type Tab = 'all' | Group;
const TABS: Tab[] = ['all', ...GROUPS];
const TAB_LABEL: Record<Tab, StringKey> = { all: 'search.group.all', sites: 'search.group.sites', families: 'search.group.families', districts: 'search.group.districts' };
type Memory = { pages?: number; scroll?: number };

const memory = (): Memory => (window.history.state?.jp ?? {}) as Memory;
const remember = (patch: Memory) => window.history.replaceState({ jp: { ...memory(), ...patch } }, '');
const rawSearch = () => window.location.search.replace(/^\?/, '');
const dualOf = (s: string) => ({ en: s, bn: s });
const countVars = (n: number) => ({ count: both(formatCount, n) });

export interface Examples { latin: string; bangla: string; family: string }

function ExampleLinks({ examples }: { examples: Examples }) {
  const list = [examples.latin, examples.bangla, examples.family].filter(Boolean);
  return (
    <div className="flex flex-wrap items-center gap-2" data-examples>
      <span className="text-sm font-semibold text-muted"><T k="search.examples" /></span>
      {list.map(q => (
        <Link key={q} prefetch={false} href={searchHref({ q })} lang={/\p{Script=Bengali}/u.test(q) ? 'bn' : 'en'}
          className="chip min-h-10 px-3 text-sm">{q}</Link>
      ))}
    </div>
  );
}

function SiteRows({ hits, limit }: { hits: SiteHit[]; limit: number }) {
  return (
    <ol className="grid gap-2" data-search-sites>
      {hits.slice(0, limit).map((h, k) => (
        <li key={h.site.i} data-result-index={k}>
          <SiteCard site={h.site} variant="row" terms={h.terms} note={<MatchNote hit={h} />} />
        </li>
      ))}
    </ol>
  );
}

function Families({ result, limit }: { result: SearchResult; limit: number }) {
  const terms = new Set(result.words);
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-search-families>
      {result.families.slice(0, limit).map(f => (
        <li key={f.key}>
          <Link prefetch={false} href={familyHref(f.phrase)} data-family={f.key}
            className="flex h-full flex-col gap-1 rounded-lg border border-line bg-surface p-4 hover:bg-surface-2">
            <span lang="en" className="font-semibold"><Marked text={f.phrase} terms={terms} /></span>
            <span className="text-sm text-muted"><T k={f.count === 1 ? 'search.family.count.one' : 'search.family.count'} vars={countVars(f.count)} /></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Districts({ result }: { result: SearchResult }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2" data-search-districts>
      {result.districts.map(({ district: d }) => (
        <li key={d.slug}>
          <Link prefetch={false} href={districtHref(d)} data-district={d.slug}
            className="flex min-h-tap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 hover:bg-surface-2">
            <span className="font-semibold"><Both value={{ en: d.en, bn: d.bn }} /></span>
            <span className="text-sm text-muted"><T k={d.count === 1 ? 'search.count.sites.one' : 'search.count.sites'} vars={countVars(d.count)} /></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function NoneNote({ group, q }: { group: Group; q: string }) {
  return (
    <p className="rounded-lg border border-dashed border-line-strong p-4 text-sm" data-none={group}>
      <strong><T k={TAB_LABEL[group]} />:</strong> <T k={`search.none.${group}` as StringKey} vars={{ q: dualOf(q) }} />
    </p>
  );
}

function EmptySearch({ q, total, examples }: { q: string; total: number; examples: Examples }) {
  const lang = useUiLang();
  return (
    <section aria-labelledby="jp-search-empty" className="mx-auto max-w-xl space-y-4 py-6 text-center" data-search-empty>
      <NoResultsArt className="mx-auto w-full max-w-xs" />
      <h2 id="jp-search-empty" className="font-serif text-h2"><T k="search.empty.title" vars={{ q: dualOf(q) }} /></h2>
      <p className="text-muted"><T k="search.empty.body" /></p>
      <div className="grid gap-2 text-left">
        <Link prefetch={false} href="/explore/" className="flex min-h-tap items-center rounded-lg border border-line-strong bg-surface px-4 font-semibold hover:bg-surface-2">
          <T k="search.empty.browse" vars={countVars(total)} />
        </Link>
        <button type="button" onClick={() => applyLang(lang === 'bn' ? 'en' : 'bn', document.documentElement, browserStorage())} data-search-lang
          className="flex min-h-tap items-center rounded-lg border border-line-strong bg-surface px-4 text-left font-semibold hover:bg-surface-2">
          <T k={lang === 'bn' ? 'search.inEnglish' : 'search.inBangla'} />
        </button>
      </div>
      <div className="flex justify-center"><ExampleLinks examples={examples} /></div>
    </section>
  );
}

export function SearchApp({ districts, examples, total }: { districts: SearchDistrict[]; examples: Examples; total: number }) {
  const search = useSearchParams().toString();
  const lang = useUiLang();
  const parsed = useMemo(() => parseSearch(search), [search]);
  const view: SearchView = useMemo(() => ({ q: parsed.q, field: parsed.field, in: parsed.in, exact: parsed.exact }), [parsed]);
  const q = view.q ?? '';
  const tab: Tab = view.field ? 'sites' : view.in ?? 'all';

  // Canonical URL: rewrite in place, and say so when something was dropped (URLS.md).
  const [droppedAt, setDroppedAt] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  if (parsed.dropped && droppedAt !== search) {
    setDroppedAt(search);
    setDismissed(false);
  }
  useEffect(() => {
    const canonical = serializeSearch(view);
    if (canonical !== rawSearch()) window.history.replaceState({ jp: memory() }, '', canonical ? `?${canonical}` : window.location.pathname);
  }, [view]);

  /** One change: one history entry, starting from the first page. */
  const push = useCallback((next: SearchView) => {
    const qs = serializeSearch(next);
    if (qs === rawSearch()) return;
    window.history.pushState({ jp: { pages: 1 } }, '', qs ? `?${qs}` : window.location.pathname);
  }, []);

  // The box follows the URL (Back and Forward); typing submits after a pause, or at once on Enter (A-7).
  // Like Explore's box: a URL change this box didn't send replaces the text; its own doesn't.
  const [value, setValue] = useState(q);
  const [valueFor, setValueFor] = useState(q);
  const [sent, setSent] = useState<string | null>(null);
  if (valueFor !== q) {
    setValueFor(q);
    if (q !== sent) setValue(q);
    setSent(null);
  }
  const submit = useCallback((raw: string) => {
    setSent(raw.trim());
    push({ q: raw.trim() || undefined });
  }, [push]);
  useEffect(() => {
    if (value.trim() === q) return;
    const timer = setTimeout(() => submit(value), SUBMIT_AFTER);
    return () => clearTimeout(timer);
  }, [value, q, submit]);

  const { state, retry } = useMatcher(true);
  const long = fold(q).length >= MIN_QUERY;
  const result = useMemo(
    () => (state.status === 'ready' && long ? searchAll(state.value, districts, q, { exact: view.exact, field: view.field }) : null),
    [state, long, districts, q, view.exact, view.field],
  );
  const shownQ = result?.corrected ?? q;

  // Title (FR-27) and noindex for a query page. Next streams the static page's <title> in after hydration,
  // so the title is re-applied whenever the head changes.
  useEffect(() => {
    const want = q ? `${TITLE}: ${q} · Jomidarpedia` : `${TITLE} · Jomidarpedia`;
    const apply = () => { if (document.title !== want) document.title = want; };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    let meta: HTMLMetaElement | undefined;
    if (q && !document.querySelector('meta[name="robots"]')) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      meta.content = 'noindex';
      document.head.appendChild(meta);
    }
    return () => { observer.disconnect(); meta?.remove(); };
  }, [q]);

  // Loaded sites and scroll, per history entry.
  const [pages, setPages] = useState(() => memory().pages ?? 1);
  const [pagesFor, setPagesFor] = useState(search);
  if (pagesFor !== search) {
    setPagesFor(search);
    setPages(memory().pages ?? 1);
  }
  const pendingScroll = useRef<number | null>(null);
  useEffect(() => { pendingScroll.current = memory().scroll ?? null; }, [search]);
  useEffect(() => {
    if (!result || pendingScroll.current === null) return;
    const y = pendingScroll.current;
    pendingScroll.current = null;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }, [result, pages]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () => remember({ scroll: Math.round(window.scrollY) });
    const onScroll = () => { clearTimeout(timer); timer = setTimeout(save, 200); };
    const flush = () => { clearTimeout(timer); save(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', flush);
    document.addEventListener('click', flush, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('click', flush, true);
    };
  }, []);
  const focusFrom = useRef<number | null>(null);
  const more = () => {
    focusFrom.current = pages * PAGE;
    setPages(pages + 1);
    remember({ pages: pages + 1 });
  };
  useEffect(() => {
    if (focusFrom.current === null) return;
    document.querySelector<HTMLElement>(`[data-search-sites] [data-result-index="${focusFrom.current}"] a`)?.focus();
    focusFrom.current = null;
  }, [pages]);

  const input = useRef<HTMLInputElement>(null);
  const tabsId = useId();
  const counts: Record<Tab, number> = result
    ? { all: result.sites.length + result.families.length + result.districts.length, sites: result.sites.length, families: result.families.length, districts: result.districts.length }
    : { all: 0, sites: 0, families: 0, districts: 0 };
  const selectTab = (t: Tab) => push({ ...view, in: t === 'all' ? undefined : t });
  const onTabKey = (e: React.KeyboardEvent, t: Tab) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = TABS[(TABS.indexOf(t) + step + TABS.length) % TABS.length];
    selectTab(next);
    requestAnimationFrame(() => document.getElementById(`${tabsId}-${next}`)?.focus());
  };

  const variants = view.field ? [] : variantsUsed(q);
  const typed = q.toLowerCase().split(/[^\p{L}\p{N}]+/u);
  const empty = result && !counts.all;

  const box = (
    <form role="search" onSubmit={e => { e.preventDefault(); submit(value); }} className="max-w-3xl space-y-2">
      <label htmlFor="jp-search-input" className="sr-only"><T k="search.inputLabel" /></label>
      <div className="flex items-center gap-2 rounded-xl border-2 border-ink bg-surface px-4 focus-within:ring-2 focus-within:ring-ink">
        <SearchIcon />
        <input ref={input} id="jp-search-input" type="text" value={value} onChange={e => setValue(e.target.value)} autoFocus={!q}
          placeholder={text('search.placeholder', lang)} autoComplete="off" autoCapitalize="off" spellCheck={false} enterKeyHint="search" maxLength={100}
          className="min-h-[56px] min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted" />
        {value ? (
          <button type="button" onClick={() => { setValue(''); submit(''); input.current?.focus(); }} aria-label={text('search.clear', lang)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-2">
            <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        ) : null}
      </div>
      {variants.length && long ? (
        <p className="text-sm text-muted" data-searching-as>
          <T k="search.searchingAs" /> <strong lang="en" className="text-ink">{fold(q)}</strong>. <T k="search.variants" />{' '}
          <span lang="en">{variants.map(g => g.filter((w, k) => k === 0 || typed.includes(w)).join(', ')).join(' · ')}</span>
        </p>
      ) : null}
    </form>
  );

  const notice = droppedAt !== null && !dismissed ? (
    <div role="status" className="flex max-w-3xl items-start gap-3 rounded-lg border border-gold bg-gold-tint p-3 text-sm" data-notice>
      <p className="flex-1"><T k="url.droppedFilters" /></p>
      <button type="button" onClick={() => setDismissed(true)} className="min-h-tap px-2 font-semibold underline"><T k="common.dismiss" /></button>
    </div>
  ) : null;

  let body: React.ReactNode;
  if (!long) {
    body = (
      <div className="max-w-3xl space-y-4" data-search-help>
        <p className="text-muted"><T k="search.help" /></p>
        <ExampleLinks examples={examples} />
      </div>
    );
  } else if (state.status === 'error') {
    body = (
      <div role="alert" className="max-w-3xl space-y-3 rounded-lg border border-line bg-surface p-4" data-search-error>
        <p className="font-semibold"><T k="search.error" /></p>
        <button type="button" onClick={retry} className="min-h-tap rounded-md bg-primary px-4 font-semibold text-on-primary"><T k="results.retry" /></button>
      </div>
    );
  } else if (!result) {
    body = <ListSkeleton />;
  } else if (empty) {
    body = <EmptySearch q={q} total={total} examples={examples} />;
  } else if (view.field) {
    body = (
      <section aria-labelledby="jp-family-title" className="space-y-4" data-count={result.sites.length}>
        <h2 id="jp-family-title" className="font-serif text-h2"><T k="search.familyTitle" vars={{ q: dualOf(q) }} /></h2>
        <SiteRows hits={result.sites} limit={pages * PAGE} />
        <MoreButton shown={Math.min(result.sites.length, pages * PAGE)} total={result.sites.length} onMore={more} />
      </section>
    );
  } else {
    const panel = (() => {
      switch (tab) {
        case 'all':
          return (
            <div className="space-y-8">
              <section aria-labelledby="jp-sites-h" className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id="jp-sites-h" className="font-serif text-h2"><T k="search.group.sites" /> <span className="text-muted"><Both value={both(formatCount, counts.sites)} /></span></h2>
                  <p className="text-sm text-muted"><T k="search.bestFirst" /></p>
                </div>
                {counts.sites ? <SiteRows hits={result.sites} limit={ALL.sites} /> : <NoneNote group="sites" q={shownQ} />}
                {counts.sites > ALL.sites ? (
                  <button type="button" onClick={() => selectTab('sites')} data-more-sites className="min-h-tap rounded-md border border-line-strong bg-surface px-4 font-semibold hover:bg-surface-2">
                    <T k={counts.sites - ALL.sites === 1 ? 'search.moreSites.one' : 'search.moreSites'} vars={countVars(counts.sites - ALL.sites)} />
                  </button>
                ) : null}
              </section>
              {counts.families ? (
                <section aria-labelledby="jp-families-h" className="space-y-3">
                  <h2 id="jp-families-h" className="font-serif text-h2"><T k="search.group.families" /> <span className="text-muted"><Both value={both(formatCount, counts.families)} /></span></h2>
                  <Families result={result} limit={ALL.families} />
                </section>
              ) : <NoneNote group="families" q={shownQ} />}
              {counts.districts ? (
                <section aria-labelledby="jp-districts-h" className="space-y-3">
                  <h2 id="jp-districts-h" className="font-serif text-h2"><T k="search.group.districts" /> <span className="text-muted"><Both value={both(formatCount, counts.districts)} /></span></h2>
                  <Districts result={result} />
                </section>
              ) : <NoneNote group="districts" q={shownQ} />}
            </div>
          );
        case 'sites':
          return counts.sites ? (
            <div className="space-y-4">
              <p className="text-sm text-muted"><T k="search.bestFirst" /></p>
              <SiteRows hits={result.sites} limit={pages * PAGE} />
              <MoreButton shown={Math.min(counts.sites, pages * PAGE)} total={counts.sites} onMore={more} />
            </div>
          ) : <NoneNote group="sites" q={shownQ} />;
        case 'families':
          return counts.families ? <Families result={result} limit={Infinity} /> : <NoneNote group="families" q={shownQ} />;
        case 'districts':
          return counts.districts ? <Districts result={result} /> : <NoneNote group="districts" q={shownQ} />;
      }
    })();
    body = (
      <div className="space-y-6">
        {result.corrected ? (
          <p className="max-w-3xl rounded-lg bg-indigo-tint p-4" data-did-you-mean={result.corrected}>
            <T k="search.didYouMean" />{' '}
            <Link prefetch={false} href={searchHref({ q: result.corrected })} className="font-semibold underline" lang="en">{result.corrected}</Link>?{' '}
            <T k="search.showingFor" />
          </p>
        ) : null}
        <div className="gap-8 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
          <div role="tablist" aria-label={text('search.groups', lang)} aria-orientation="vertical"
            className="-mx-4 mb-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:mb-0 lg:flex-col lg:self-start lg:rounded-xl lg:bg-surface-2 lg:p-2">
            {TABS.map(t => (
              <button key={t} id={`${tabsId}-${t}`} type="button" role="tab" aria-selected={tab === t} aria-controls={`${tabsId}-panel`}
                tabIndex={tab === t ? 0 : -1} onClick={() => selectTab(t)} onKeyDown={e => onTabKey(e, t)} data-tab={t}
                className="flex min-h-tap shrink-0 items-center justify-between gap-4 rounded-lg px-3 font-semibold aria-selected:bg-surface aria-selected:ring-2 aria-selected:ring-ink">
                <T k={TAB_LABEL[t]} />
                <span className="font-normal text-muted" data-tab-count={counts[t]}><Both value={both(formatCount, counts[t])} /></span>
              </button>
            ))}
          </div>
          <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-${tab}`} className="min-w-0">{panel}</div>
        </div>
        {result.corrected ? (
          <p className="text-sm">
            <Link prefetch={false} href={searchHref({ q, exact: true })} className="font-semibold text-primary-tint-ink underline" data-exact-instead>
              <T k="search.exactInstead" vars={{ q: dualOf(q) }} />
            </Link>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {box}
      {notice}
      <p role="status" aria-live="polite" className="sr-only">
        {result ? announce(result, lang) : ''}
      </p>
      {body}
    </div>
  );
}

function MoreButton({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <p className="text-sm text-muted" data-showing><T k="results.showing" vars={{ shown: both(formatCount, shown), count: both(formatCount, total) }} /></p>
      {shown < total ? (
        <button type="button" onClick={onMore} data-more className="min-h-tap rounded-md border border-line-strong bg-surface px-4 font-semibold">
          <T k={Math.min(PAGE, total - shown) === 1 ? 'search.moreSites.one' : 'search.moreSites'} vars={countVars(Math.min(PAGE, total - shown))} />
        </button>
      ) : null}
    </div>
  );
}
