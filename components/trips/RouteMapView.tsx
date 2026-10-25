'use client';
// The itinerary map (roadmap task 9.5, spec 09 FR-27 to FR-32, D3). Loaded through RouteMap with next/dynamic
// (ssr: false), so Leaflet reaches only trip pages that show a map. A numbered marker for each stop with a pin;
// lines only for legs from itinerary_legs.csv, never guessed between pins. Hidden pins never arrive here: the
// build gives a stop latlon only when its site may be mapped (R5).

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/components/map/map.css';
import { useEffect, useRef } from 'react';
import { SrT } from '@/components/T';
import { baseMap, defaultBaseMap, FIT_MAX_ZOOM, TILE_ERRORS, TILE_TIMEOUT_MS } from '@/lib/map-config';
import { useDark } from '@/lib/use-ui-lang';
import type { Itinerary } from '@/lib/types';

export interface RoutePoint { order: number; label: string; latlon: [number, number]; kind: 'site' | 'place' }

const btn = 'inline-flex min-h-tap min-w-tap items-center justify-center bg-surface text-ink hover:bg-surface-2';
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export default function RouteMapView({ points, legs, label, onTilesFailed }: {
  points: RoutePoint[]; legs: Itinerary['legs']; label: string; onTilesFailed(): void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const dark = useDark();
  const failed = useRef(onTilesFailed);
  useEffect(() => { failed.current = onTilesFailed; });

  useEffect(() => {
    const map = L.map(box.current!, { zoomControl: false, scrollWheelZoom: false, keyboard: true, minZoom: 6 });
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    map.fitBounds(L.latLngBounds(points.map(p => p.latlon)), { padding: [36, 36], maxZoom: FIT_MAX_ZOOM });
    const at = new Map(points.map(p => [p.order, p.latlon]));
    for (const leg of legs) {
      const a = at.get(leg.from), b = at.get(leg.to);
      if (a && b) L.polyline([a, b], { className: 'jp-leg', weight: 3, opacity: 0.85, interactive: false }).addTo(map);
    }
    for (const p of points) {
      const html = `<span class="jp-stop jp-stop--${p.kind}" aria-hidden="true">${p.order}</span>`;
      L.marker(p.latlon, {
        icon: L.divIcon({ html, className: 'jp-stop-icon', iconSize: [30, 30], iconAnchor: [15, 15] }),
        keyboard: false,
      }).bindTooltip(esc(p.label), { direction: 'top', offset: [0, -14] }).addTo(map);
    }
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    ro.observe(box.current!);
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  }, [points, legs]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const b = baseMap(defaultBaseMap(dark));
    const layer = L.tileLayer(b.url, { attribution: b.attribution, maxZoom: b.maxZoom, subdomains: b.subdomains ?? 'abc' }).addTo(map);
    let errors = 0;
    let loaded = false;
    const timer = setTimeout(() => { if (!loaded) failed.current(); }, TILE_TIMEOUT_MS);
    layer.on('tileerror', () => { errors += 1; if (errors >= TILE_ERRORS) failed.current(); });
    layer.on('tileload', () => { errors = 0; loaded = true; clearTimeout(timer); });
    return () => { clearTimeout(timer); layer.off(); map.removeLayer(layer); };
  }, [dark]);

  return (
    <div className="relative isolate h-full w-full overflow-hidden" data-route-map>
      <div ref={box} role="region" aria-label={label} className="jp-map absolute inset-0" />
      <div className="absolute right-2 top-2 z-controls flex flex-col overflow-hidden rounded-md border border-line shadow-2" data-no-print>
        <button type="button" onClick={() => mapRef.current?.zoomIn()} className={`${btn} border-b border-line`}>
          <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          <SrT k="map.zoomIn" />
        </button>
        <button type="button" onClick={() => mapRef.current?.zoomOut()} className={btn}>
          <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M5 12h14" /></svg>
          <SrT k="map.zoomOut" />
        </button>
      </div>
    </div>
  );
}
