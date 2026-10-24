'use client';
// The site page's mini map (roadmap task 7.10, spec 07 FR-40): one pin, styled like Explore's, and the
// 1.5 km circle for an approximate location. Loaded through MiniMap (next/dynamic, ssr: false) only once the
// Location section nears the screen. Only mappable sites ever render it (R5).

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './map.css';
import { useEffect, useRef } from 'react';
import { SrT } from '@/components/T';
import { baseMap, CIRCLE_RADIUS_M, defaultBaseMap, MINI_ZOOM } from '@/lib/map-config';
import { CONDITION_COLOR, pinHtml } from '@/lib/pins';
import { useDark } from '@/lib/use-ui-lang';
import type { Condition, LocationStatus } from '@/lib/types';
import { MapSprite } from './MapSprite';

export interface MiniMapSite { e: string; ll: [number, number]; lc: LocationStatus; f?: 1; c: Condition }

const btn = 'inline-flex min-h-tap min-w-tap items-center justify-center bg-surface text-ink hover:bg-surface-2';

export default function MiniMapView({ site, label }: { site: MiniMapSite; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const dark = useDark();

  useEffect(() => {
    const map = L.map(box.current!, { zoomControl: false, scrollWheelZoom: false, keyboard: true, minZoom: 6 });
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    map.setView(site.ll, MINI_ZOOM);
    if (site.lc === 'approximate') {
      const color = `rgb(var(--${CONDITION_COLOR[site.c]}))`;
      L.circle(site.ll, { radius: CIRCLE_RADIUS_M, color, weight: 1.5, dashArray: '4 4', fillColor: color, fillOpacity: 0.08, interactive: false }).addTo(map);
    }
    L.marker(site.ll, { icon: L.divIcon({ html: pinHtml(site), className: 'jp-pin', iconSize: [44, 44], iconAnchor: [22, 40] }), interactive: false, keyboard: false }).addTo(map);
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    ro.observe(box.current!);
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  }, [site]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const b = baseMap(defaultBaseMap(dark));
    const layer = L.tileLayer(b.url, { attribution: b.attribution, maxZoom: b.maxZoom, subdomains: b.subdomains ?? 'abc' }).addTo(map);
    return () => { map.removeLayer(layer); };
  }, [dark]);

  return (
    <div className="relative isolate h-full w-full overflow-hidden" data-mini-map>
      <MapSprite />
      <div ref={box} role="region" aria-label={label} className="jp-map absolute inset-0" />
      <div className="absolute right-2 top-2 z-controls flex flex-col overflow-hidden rounded-md border border-line shadow-2">
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
