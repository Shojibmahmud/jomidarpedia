'use client';
// Loads the site page's mini map when the Location section comes within a screen of view
// (IntersectionObserver, spec 07 FR-40) and never in Lite mode, where "Show map" loads it for this page view
// only (FR-39, A-4). Until then a placeholder of the same size keeps the layout still.

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { T } from '@/components/T';
import { text } from '@/lib/i18n';
import { useLite, useUiLang } from '@/lib/use-ui-lang';
import type { MiniMapSite } from './MiniMapView';

const MiniMapView = dynamic(() => import('./MiniMapView'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-map-land" />,
});

export function MiniMap({ site }: { site: MiniMapSite }) {
  const lang = useUiLang();
  const lite = useLite();
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [asked, setAsked] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el || near) return;
    const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) setNear(true); }, { rootMargin: '100% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  const show = near && (!lite || asked);
  return (
    <div ref={box} className="aspect-[4/3] w-full overflow-hidden rounded-md border border-line bg-map-land" data-mini-map-box>
      {show ? <MiniMapView site={site} label={text('mini.label', lang, { name: { en: site.e, bn: site.e } })} /> : lite ? (
        <div className="flex h-full items-center justify-center p-4 text-center" data-lite-off>
          <button type="button" onClick={() => setAsked(true)} className="min-h-tap rounded-md border border-line-strong bg-surface px-4 font-semibold" data-show-map>
            <T k="lite.showMap" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
