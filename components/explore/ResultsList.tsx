'use client';
// The results list (roadmap task 6.5, spec 06 FR-2, FR-3): row cards paged by 24, "Showing N of M" and
// "Load more", plus the loading skeleton and the fetch error with Retry. With a map (spec 07 FR-20), the
// selected site's row is highlighted, hovering or focusing a row highlights its pin, and a mappable row
// has "Show on map".

import { T } from '@/components/T';
import { SiteCard } from '@/components/cards/SiteCard';
import { both, formatCount } from '@/lib/format';
import type { IndexSite } from '@/lib/types';

export const PAGE_SIZE = 24;

export interface MapLink {
  selected?: string;
  onShow(id: string, button: HTMLButtonElement): void;
  onHover(id: string | null): void;
}

/** `terms` marks the words a search within the results matched (spec 08 FR-17). */
export function ResultsList({ sites, pages, onMore, map, terms }: {
  sites: IndexSite[]; pages: number; onMore: () => void; map?: MapLink; terms?: ReadonlyMap<string, ReadonlySet<string>>;
}) {
  const shown = Math.min(sites.length, pages * PAGE_SIZE);
  return (
    <div className="space-y-4">
      <ol className="grid gap-2" data-results>
        {sites.slice(0, shown).map((s, k) => (
          <li key={s.i} data-result-index={k}
            onMouseEnter={map ? () => map.onHover(s.i) : undefined} onMouseLeave={map ? () => map.onHover(null) : undefined}
            onFocus={map ? () => map.onHover(s.i) : undefined} onBlur={map ? () => map.onHover(null) : undefined}>
            <SiteCard site={s} variant="row" highlight={map?.selected === s.i} terms={terms?.get(s.i)}
              action={map && s.ll ? (
                <button type="button" onClick={e => map.onShow(s.i, e.currentTarget)} data-show-on-map={s.i}
                  className="inline-flex min-h-tap items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-sm font-semibold hover:bg-surface-2">
                  <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2.2}>
                    <path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11Z" /><circle cx={12} cy={10} r={2.2} />
                  </svg>
                  <T k="map.showOnMap" /><span className="sr-only">: <span lang="en">{s.e}</span></span>
                </button>
              ) : undefined} />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-sm text-muted" data-showing>
          <T k="results.showing" vars={{ shown: both(formatCount, shown), count: both(formatCount, sites.length) }} />
        </p>
        {shown < sites.length
          ? <button type="button" onClick={onMore} className="min-h-tap rounded-md border border-line-strong bg-surface px-4 font-semibold"><T k="results.more" /></button>
          : null}
      </div>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div aria-busy="true" className="space-y-2">
      <p role="status" className="text-sm text-muted"><T k="results.loading" /></p>
      {Array.from({ length: 6 }, (_, k) => (
        <div key={k} aria-hidden="true" className="flex gap-3 rounded-lg bg-surface p-3">
          <span className="aspect-[4/3] w-20 shrink-0 rounded-md bg-surface-2" />
          <span className="flex flex-1 flex-col gap-2 pt-1">
            <span className="h-4 w-2/3 rounded bg-surface-2" />
            <span className="h-3 w-1/2 rounded bg-surface-2" />
            <span className="h-5 w-1/3 rounded-full bg-surface-2" />
          </span>
        </div>
      ))}
    </div>
  );
}

export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="space-y-3 rounded-lg border border-line bg-surface p-4">
      <p className="font-semibold"><T k="results.error" /></p>
      <button type="button" onClick={onRetry} className="min-h-tap rounded-md bg-primary px-4 font-semibold text-on-primary"><T k="results.retry" /></button>
    </div>
  );
}
