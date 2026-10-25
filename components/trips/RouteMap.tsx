'use client';
// Where the itinerary map goes (roadmap task 9.5, spec 09 FR-27 to FR-32, D3). The page renders this only
// when 2 or more stops have pins. The map code loads when the box nears the screen and never in Lite mode,
// where "Show map" loads it for this page view only. If tiles fail, the box lists the pinned stops instead and
// drops out of the printout (FR-32, FR-47).

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { Both, T } from '@/components/T';
import { Skeleton } from '@/components/shell/Skeleton';
import { both, formatCount } from '@/lib/format';
import { text } from '@/lib/i18n';
import { useLite, useUiLang } from '@/lib/use-ui-lang';
import type { Itinerary } from '@/lib/types';
import type { RoutePoint } from './RouteMapView';

const RouteMapView = dynamic(() => import('./RouteMapView'), {
  ssr: false,
  loading: () => <Skeleton variant="map" />,
});

export function RouteMap({ points, legs }: { points: RoutePoint[]; legs: Itinerary['legs'] }) {
  const lang = useUiLang();
  const lite = useLite();
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [asked, setAsked] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el || near) return;
    const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) setNear(true); }, { rootMargin: '100% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  if (lite && !asked) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3 text-sm" data-lite-off data-no-print>
        <p className="min-w-0 flex-1"><T k="lite.offTitle" /></p>
        <button type="button" onClick={() => setAsked(true)} className="min-h-tap rounded-md border border-line-strong bg-surface px-4 font-semibold" data-show-map>
          <T k="lite.showMap" />
        </button>
      </div>
    );
  }
  return (
    <div ref={box} className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-line bg-map-land print:aspect-[2/1] print:break-inside-avoid"
      data-route-map-box data-failed={failed || undefined} {...(failed && { 'data-no-print': true })}>
      {failed ? (
        <div role="status" className="h-full space-y-2 overflow-y-auto p-4" data-tiles-failed>
          <p className="font-semibold"><T k="map.tilesFailed" /></p>
          <ol className="space-y-1 text-sm">
            {points.map(p => <li key={p.order}><span className="font-semibold"><Both value={both(formatCount, p.order)} />.</span> <span lang="en">{p.label}</span></li>)}
          </ol>
        </div>
      ) : near ? <RouteMapView points={points} legs={legs} label={text('trip.mapLabel', lang)} onTilesFailed={() => setFailed(true)} /> : null}
    </div>
  );
}
