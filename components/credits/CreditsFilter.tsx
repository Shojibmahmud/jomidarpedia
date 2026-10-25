'use client';
// /credits/'s search box and `?site=` (roadmap task 10.7; spec 10 FR-48, FR-49). The credit groups are static
// HTML from the page; this hides and shows them in place instead of re-rendering 938 rows. The search matches a
// group's site names (data-search, folded at build time) or the text of a credit line, and is not kept in the
// URL. `site` names one site's group: an ID with no group (no Ready photos, or no such site) is dropped from the
// URL with the usual notice. With JavaScript off every group shows.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { T } from '@/components/T';
import { fold } from '@/lib/fold';
import { text } from '@/lib/i18n';
import { useUiLang } from '@/lib/use-ui-lang';

const groups = () => [...document.querySelectorAll<HTMLElement>('[data-credit-group]')];
const rowText = new WeakMap<HTMLElement, string>();
const folded = (row: HTMLElement) => {
  if (!rowText.has(row)) rowText.set(row, fold(row.querySelector('[data-credit]')?.textContent ?? ''));
  return rowText.get(row)!;
};

/** Shows the groups (and rows) that match; returns how many groups are visible. */
function apply(site: string | undefined, q: string): number {
  let visible = 0;
  for (const g of groups()) {
    const rows = [...g.querySelectorAll<HTMLElement>('[data-credit-row]')];
    let show = !site || g.dataset.site === site;
    const siteMatch = !q || (g.dataset.search ?? '').includes(q);
    let rowsShown = 0;
    for (const r of rows) {
      const on = show && (siteMatch || folded(r).includes(q));
      r.hidden = !on;
      if (on) rowsShown++;
    }
    show &&= rowsShown > 0;
    g.hidden = !show;
    const more = g.querySelector<HTMLDetailsElement>('details');
    if (more) more.open = !!q && show;
    if (show) visible++;
  }
  return visible;
}

export function CreditsFilter() {
  const lang = useUiLang();
  const params = useSearchParams();
  const raw = params.get('site') ?? undefined;
  const [query, setQuery] = useState('');
  const [state, setState] = useState<{ site?: string; visible: number }>({ visible: -1 });
  // The notice outlives the URL rewrite that follows it (which re-runs the effect with a clean URL).
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    const unknownKeys = [...params.keys()].some(k => k !== 'site');
    const valid = raw && groups().some(g => g.dataset.site === raw) ? raw : undefined;
    const dropped = unknownKeys || (raw !== undefined && !valid);
    if (dropped) window.history.replaceState(null, '', valid ? `?site=${valid}` : window.location.pathname);
    const visible = apply(valid, fold(query.trim()));
    setState({ site: valid, visible }); // eslint-disable-line react-hooks/set-state-in-effect -- reads the static DOM once it exists
    if (dropped) setNotice(true);
  }, [params, raw, query]);

  return (
    <div className="space-y-3">
      <label className="relative block max-w-lg">
        <span className="sr-only"><T k="credits.find" /></span>
        <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth={2}><circle cx={11} cy={11} r={7} /><path d="m20 20-3.5-3.5" /></svg>
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} maxLength={100} placeholder={text('credits.find', lang)} data-credits-search
          className="min-h-tap w-full rounded-md border border-line-strong bg-surface py-2 pl-10 pr-3" />
      </label>
      {notice ? (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-gold bg-gold-tint p-3 text-sm" data-notice>
          <p className="flex-1"><T k="url.droppedFilters" /></p>
          <button type="button" onClick={() => setNotice(false)} className="min-h-tap px-2 font-semibold underline"><T k="common.dismiss" /></button>
        </div>
      ) : null}
      {state.site ? <p><Link prefetch={false} href="/credits/" className="font-semibold text-primary underline" data-show-all><T k="credits.showAll" /></Link></p> : null}
      {state.visible === 0 ? <p role="status" className="rounded-lg border border-line bg-surface p-4" data-credits-empty><T k="credits.none" /></p> : null}
    </div>
  );
}
