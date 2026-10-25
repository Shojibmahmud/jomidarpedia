// Loading placeholders (roadmap task 10.11; spec 10 FR-54 to FR-57), from the Loading skeletons board: rows for
// the Explore and Search lists, cards (for Home, Phase 11) and the map area. One busy region with one status text
// for screen readers; the grey shapes are hidden from them. The shimmer stops under prefers-reduced-motion.
// No hooks, so server and client pages can both use it.

import { T } from '@/components/T';
import type { StringKey } from '@/lib/i18n';

const shape = 'rounded bg-surface-2 motion-safe:animate-pulse';

export function Skeleton({ variant, count = 6, label = variant === 'map' ? 'map.loading' : 'skeleton.loading' }: {
  variant: 'row' | 'card' | 'map'; count?: number; label?: StringKey;
}) {
  if (variant === 'map') {
    return (
      <div aria-busy="true" className="flex h-full w-full flex-col items-center justify-center gap-3 bg-map-land p-4 text-center" data-skeleton="map">
        <svg viewBox="0 0 24 24" width={32} height={32} aria-hidden="true" className="text-muted motion-safe:animate-pulse" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M7 21V10a5 5 0 0 1 10 0v11" />
        </svg>
        <p role="status" className="rounded-full bg-surface px-4 py-2 text-sm font-semibold shadow-1"><T k={label} /></p>
      </div>
    );
  }
  return (
    <div aria-busy="true" className={variant === 'card' ? 'grid gap-5 md:grid-cols-2 xl:grid-cols-3' : 'space-y-2'} data-skeleton={variant}>
      <p role="status" className={variant === 'card' ? 'sr-only' : 'text-sm text-muted'}><T k={label} /></p>
      {Array.from({ length: count }, (_, k) => (variant === 'card' ? (
        <div key={k} aria-hidden="true" className="space-y-3 rounded-lg bg-surface p-2">
          <span className={`block aspect-[4/3] w-full ${shape}`} />
          <span className={`block h-5 w-2/3 ${shape}`} />
          <span className={`block h-4 w-1/2 ${shape}`} />
        </div>
      ) : (
        <div key={k} aria-hidden="true" className="flex gap-3 rounded-lg bg-surface p-3">
          <span className={`aspect-[4/3] w-20 shrink-0 ${shape}`} />
          <span className="flex flex-1 flex-col gap-2 pt-1">
            <span className={`h-4 w-2/3 ${shape}`} />
            <span className={`h-3 w-1/2 ${shape}`} />
            <span className={`h-5 w-1/3 rounded-full ${shape}`} />
          </span>
        </div>
      )))}
    </div>
  );
}
