'use client';
// /sources/'s table (roadmap task 10.3; spec 10 FR-20 to FR-24). The URL is the state (lib/sources.ts,
// docs/URLS.md): a chip, the sort or a page link pushes one history entry; typing in the search box replaces the
// current one, so Back skips the keystrokes. An unknown value, or a page past the last, is dropped, the URL
// rewritten in place and a notice shown, as in Explore. The build renders the first 25 rows without this
// component (SourcesFirstPage), so the list works with JavaScript off.

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Both, Latin, T } from '@/components/T';
import { both, formatCount } from '@/lib/format';
import { text } from '@/lib/i18n';
import {
  filterSources, pageCount, pageLinks, sourceDate, parseSources, serializeSources, sortSources, SOURCE_SORTS, SOURCES_PAGE, sourcesHref, TYPE_TOKENS,
  typeCounts, typeKey, type SourceRow, type SourcesView, type TypeToken,
} from '@/lib/sources';
import { useUiLang } from '@/lib/use-ui-lang';

const n = (v: number) => both(formatCount, v);
const rawSearch = () => window.location.search.replace(/^\?/, '');
const SORT_KEY = { cited: 'sources.sort.cited', title: 'sources.sort.title', date: 'sources.sort.date' } as const;
export const sourceHref = (id: string) => `/sources/${id}/`;

function Row({ r }: { r: SourceRow }) {
  return (
    <tr className="border-b border-line align-top last:border-0" data-source-row={r.id}>
      <td className="py-3 pl-4 pr-3">
        <Link prefetch={false} href={sourceHref(r.id)} className="font-semibold text-primary underline-offset-4 hover:underline [overflow-wrap:anywhere]">{r.title}</Link>
        <span className="mt-0.5 block font-mono text-xs text-muted"><Latin>{r.id}</Latin></span>
        <span className="mt-1 block text-sm text-muted md:hidden [overflow-wrap:anywhere]">
          <T k={typeKey(r.type)} />{r.publisher ? <> · <span className="line-clamp-2">{r.publisher}</span></> : null}
        </span>
      </td>
      <td className="hidden py-3 pr-3 text-sm md:table-cell"><span className="inline-block rounded-full bg-surface-2 px-2 py-0.5"><T k={typeKey(r.type)} /></span></td>
      <td className="hidden max-w-xs py-3 pr-3 text-sm md:table-cell"><span className="line-clamp-2 [overflow-wrap:anywhere]">{r.publisher}</span></td>
      <td className="hidden whitespace-nowrap py-3 pr-3 text-sm md:table-cell">{r.date ? <Both value={both(sourceDate, r.date)} /> : <span className="text-muted"><T k="sources.notDated" /></span>}</td>
      <td className="whitespace-nowrap py-3 pr-4 text-right text-sm"><T k={r.cited === 1 ? 'search.count.sites.one' : 'search.count.sites'} vars={{ count: n(r.cited) }} /></td>
    </tr>
  );
}

function Table({ rows }: { rows: SourceRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <table className="w-full border-collapse text-left" data-sources-table>
        <thead className="border-b-2 border-line-strong text-xs font-bold uppercase tracking-wider text-muted">
          <tr>
            <th scope="col" className="py-3 pl-4 pr-3"><T k="sources.col.source" /></th>
            <th scope="col" className="hidden py-3 pr-3 md:table-cell"><T k="sources.col.type" /></th>
            <th scope="col" className="hidden py-3 pr-3 md:table-cell"><T k="sources.col.publisher" /></th>
            <th scope="col" className="hidden py-3 pr-3 md:table-cell"><T k="sources.col.date" /></th>
            <th scope="col" className="py-3 pr-4 text-right"><T k="sources.col.cited" /></th>
          </tr>
        </thead>
        <tbody>{rows.map(r => <Row key={r.id} r={r} />)}</tbody>
      </table>
    </div>
  );
}

function Range({ from, to, count }: { from: number; to: number; count: number }) {
  return <p className="text-sm text-muted" data-range><T k="sources.range" vars={{ from: n(from), to: n(to), count: n(count) }} /></p>;
}

export function SourcesApp({ rows }: { rows: SourceRow[] }) {
  const search = useSearchParams().toString();
  const lang = useUiLang();
  const parsed = useMemo(() => parseSources(search), [search]);
  const matched = useMemo(() => sortSources(filterSources(rows, parsed), parsed.sort), [rows, parsed]);
  const pages = pageCount(matched.length);
  const past = parsed.page > pages;
  const view: SourcesView = useMemo(() => ({ q: parsed.q, type: parsed.type, sort: parsed.sort, page: past ? 1 : parsed.page }), [parsed, past]);
  const counts = useMemo(() => typeCounts(rows, view.q), [rows, view.q]);

  // Canonical URL (FR-22): rewrite in place, and say so when something was dropped.
  const [droppedAt, setDroppedAt] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  if ((parsed.dropped || past) && droppedAt !== search) { setDroppedAt(search); setDismissed(false); }
  useEffect(() => {
    const canonical = serializeSources(view);
    if (canonical !== rawSearch()) window.history.replaceState(null, '', canonical ? `?${canonical}` : window.location.pathname);
  }, [view]);

  const go = useCallback((next: SourcesView, replace = false) => {
    const qs = serializeSources(next);
    if (qs === rawSearch()) return;
    window.history[replace ? 'replaceState' : 'pushState'](null, '', qs ? `?${qs}` : window.location.pathname);
  }, []);

  // The search box: its own text, sent to the URL a moment after typing stops.
  const [draft, setDraft] = useState(view.q ?? '');
  const [draftFor, setDraftFor] = useState(view.q);
  if (draftFor !== view.q) { setDraftFor(view.q); setDraft(view.q ?? ''); }
  useEffect(() => {
    if (draft.trim() === (view.q ?? '')) return;
    const t = setTimeout(() => go({ ...view, q: draft.trim() || undefined, page: 1 }, true), 300);
    return () => clearTimeout(t);
  }, [draft, view, go]);

  const page = view.page;
  const from = (page - 1) * SOURCES_PAGE;
  const shown = matched.slice(from, from + SOURCES_PAGE);
  const clear = () => { setDraft(''); go({ sort: view.sort, page: 1 }); };
  const chip = (token: TypeToken | undefined) => {
    const count = counts[token ?? 'all'];
    if (token && !count && view.type !== token) return null;
    return (
      <button key={token ?? 'all'} type="button" aria-pressed={view.type === token} data-type={token ?? 'all'}
        onClick={() => go({ ...view, type: view.type === token ? undefined : token, page: 1 })} className="chip min-h-10 px-3 text-sm">
        {token ? <T k={typeKey(token)} /> : <T k="srctype.all" />} <span className="font-normal opacity-80"><Both value={n(count)} /></span>
      </button>
    );
  };
  const pageLink = (p: number, label: React.ReactNode, key: string, current = false) => (
    <Link key={key} prefetch={false} href={sourcesHref({ ...view, page: p })} aria-current={current ? 'page' : undefined} data-page={p}
      onClick={e => { e.preventDefault(); go({ ...view, page: p }); document.getElementById('jp-sources-top')?.scrollIntoView({ block: 'start' }); }}
      className={`inline-flex min-h-tap min-w-tap items-center justify-center rounded-md px-3 font-semibold ${current ? 'bg-ink text-bg' : 'hover:bg-surface-2'}`}>
      {label}
    </Link>
  );

  return (
    <div className="space-y-5" id="jp-sources-top">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="relative block w-full max-w-lg">
          <span className="sr-only"><T k="sources.search" /></span>
          <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth={2}><circle cx={11} cy={11} r={7} /><path d="m20 20-3.5-3.5" /></svg>
          <input type="search" value={draft} onChange={e => setDraft(e.target.value)} maxLength={100} data-sources-search
            placeholder={text('sources.search', lang)} className="min-h-tap w-full rounded-md border border-line-strong bg-surface py-2 pl-10 pr-3" />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm text-muted"><T k="sort.label" /></span>
          <select value={view.sort} onChange={e => go({ ...view, sort: e.target.value as SourcesView['sort'], page: 1 })} data-sort
            className="min-h-tap rounded-md border border-line-strong bg-surface px-3 font-semibold">
            {SOURCE_SORTS.map(s => <option key={s} value={s}>{text(SORT_KEY[s], lang)}</option>)}
          </select>
        </label>
      </div>
      <div role="group" aria-labelledby="jp-types" className="flex flex-wrap gap-2" data-type-chips>
        <span id="jp-types" className="sr-only"><T k="sources.types" /></span>
        {chip(undefined)}
        {TYPE_TOKENS.map(chip)}
      </div>

      {droppedAt !== null && !dismissed ? (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-gold bg-gold-tint p-3 text-sm" data-notice>
          <p className="flex-1"><T k="url.droppedFilters" /></p>
          <button type="button" onClick={() => setDismissed(true)} className="min-h-tap px-2 font-semibold underline"><T k="common.dismiss" /></button>
        </div>
      ) : null}

      <p role="status" aria-live="polite" className="sr-only">{text('sources.range', lang, { from: n(matched.length ? from + 1 : 0), to: n(from + shown.length), count: n(matched.length) })}</p>
      {matched.length ? (
        <>
          <Table rows={shown} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Range from={from + 1} to={from + shown.length} count={matched.length} />
            {pages > 1 ? (
              <nav aria-label={text('sources.pages', lang)} className="flex flex-wrap items-center gap-1" data-pages>
                {page > 1 ? pageLink(page - 1, <><span aria-hidden="true">←</span><span className="sr-only"><T k="sources.prev" /></span></>, 'prev') : null}
                {pageLinks(page, pages).map((p, k) => (p === null
                  ? <span key={`gap${k}`} aria-hidden="true" className="px-2 text-muted">…</span>
                  : pageLink(p, <><span className="sr-only"><T k="sources.page" vars={{ n: n(p) }} /></span><span aria-hidden="true"><Both value={n(p)} /></span></>, String(p), p === page)))}
                {page < pages ? pageLink(page + 1, <><span aria-hidden="true">→</span><span className="sr-only"><T k="sources.next" /></span></>, 'next') : null}
              </nav>
            ) : null}
          </div>
        </>
      ) : (
        <div className="space-y-3 rounded-lg border border-line bg-surface p-6 text-center" data-sources-empty>
          <p className="font-serif text-h3"><T k="sources.empty" /></p>
          <button type="button" onClick={clear} className="min-h-tap rounded-md bg-primary px-4 font-semibold text-on-primary"><T k="trips.clear" /></button>
        </div>
      )}
    </div>
  );
}

/** The first page in the default order: the static HTML, shown until SourcesApp runs and with JavaScript off (FR-23). */
export function SourcesFirstPage({ rows, total }: { rows: SourceRow[]; total: number }) {
  return (
    <div className="space-y-4" data-static>
      <Table rows={rows} />
      <Range from={1} to={rows.length} count={total} />
    </div>
  );
}
