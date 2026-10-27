'use client';
// The Explore map (roadmap tasks 7.3 to 7.5, 7.8, 7.11; spec 07 FR-7 to FR-33). Loaded only through
// MapLoader (next/dynamic, ssr: false), so Leaflet, its CSS and tiles are requested only when the map is
// shown (FR-1, FR-2). React owns the controls, the bar, the key and the popover; Leaflet owns the tiles,
// the pins and the clusters. Pins are divIcons whose marker element is the focusable control (FR-14).

import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import './map.css';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { T } from '@/components/T';
import { formatCount } from '@/lib/format';
import { text, type Lang } from '@/lib/i18n';
import {
  BANGLADESH, baseMap, BASE_MAPS, CIRCLE_MIN_ZOOM, CIRCLE_RADIUS_M, CLUSTER_RADIUS_PX, defaultBaseMap, FIT_MAX_ZOOM,
  LABEL_MIN_ZOOM, SITE_ZOOM, TILE_ERRORS, TILE_TIMEOUT_MS, type BaseMapId,
} from '@/lib/map-config';
import { clusterHtml, clusterSize, CONDITION_COLOR, pinHtml, pinLabel } from '@/lib/pins';
import { useDark, useUiLang } from '@/lib/use-ui-lang';
import type { IndexSite } from '@/lib/types';
import { MapControls, MapKeyButton } from './MapControls';
import { MapSprite } from './MapSprite';

/** What the page can ask of the map: focus a pin (or the cluster holding it) after a summary closes. */
export interface MapApi { focusPin(id: string): boolean }

export interface MapViewProps {
  /** The mappable filtered results (every one has `ll`). */
  sites: IndexSite[];
  /** Changes when an applied filter changes: the map then fits the results (D11). */
  fitKey: string;
  selected?: IndexSite;
  hovered?: string;
  onSelect(id: string, keyboard: boolean): void;
  /** The summary popover, drawn beside the selected pin (desktop). */
  popover?: React.ReactNode;
  /** The "N of M on the map" bar. */
  bar?: React.ReactNode;
  /** Hide controls, bar and key (the phone results sheet at full height). */
  compact?: boolean;
  onReady?(api: MapApi | null): void;
  /** A click on the map itself, not on a pin (closes the phone summary sheet, FR-21). */
  onBackground?(): void;
}

// The base map chosen in the menu lasts for this page session only (A-8).
let chosenBase: BaseMapId | null = null;

/** The popover's width (328 px) plus its 24 px gap from the pin and a margin. */
const POP_ROOM = 24 + 328 + 16;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A divIcon whose element carries its accessible name and site ID from creation (FR-14). */
const LabelledIcon = L.DivIcon.extend({
  createIcon(this: L.DivIcon & { options: L.DivIconOptions & { label?: string; site?: string } }, old?: HTMLElement) {
    const el = L.DivIcon.prototype.createIcon.call(this, old);
    if (this.options.label) el.setAttribute('aria-label', this.options.label);
    if (this.options.site) el.dataset.site = this.options.site;
    return el;
  },
}) as unknown as new (o: L.DivIconOptions & { label?: string; site?: string }) => L.DivIcon;

const pinIcon = (site: IndexSite, lang: Lang) =>
  new LabelledIcon({ html: pinHtml(site), className: 'jp-pin', iconSize: [44, 44], iconAnchor: [22, 40], label: pinLabel(site, lang), site: site.i });

export default function MapView({ sites, fitKey, selected, hovered, onSelect, popover, bar, compact = false, onReady, onBackground }: MapViewProps) {
  const lang = useUiLang();
  const dark = useDark();
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const circlesRef = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const meRef = useRef<L.LayerGroup | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const [zoom, setZoom] = useState(0);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [picked, setPicked] = useState<BaseMapId | null>(chosenBase);
  const base = picked ?? defaultBaseMap(dark); // with no choice made in the menu, the theme decides (A-2)
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Latest values for Leaflet's callbacks.
  const live = useRef({ lang, selected, hovered, onSelect, onBackground, sites, hasPopover: !!popover });
  live.current = { lang, selected, hovered, onSelect, onBackground, sites, hasPopover: !!popover };

  // ------------------------------------------------------------------ create and destroy (FR-3, FR-9)
  useEffect(() => {
    const el = box.current!;
    const map = L.map(el, {
      zoomControl: false, attributionControl: true, keyboard: true, minZoom: 6, maxZoom: 18,
      maxBounds: L.latLngBounds([[15, 82], [32, 98]]), maxBoundsViscosity: 0.8, zoomAnimation: !reducedMotion(),
    });
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    map.fitBounds(BANGLADESH);
    const cluster = L.markerClusterGroup({
      maxClusterRadius: CLUSTER_RADIUS_PX, showCoverageOnHover: true, spiderfyOnMaxZoom: true, zoomToBoundsOnClick: true,
      animate: !reducedMotion(), removeOutsideVisibleBounds: true,
      polygonOptions: { className: 'jp-coverage', weight: 2, opacity: 0.6, fillOpacity: 0.08, interactive: false },
      iconCreateFunction: c => {
        const n = c.getChildCount();
        const size = Math.max(clusterSize(n), 36) + 12;
        return new LabelledIcon({
          html: clusterHtml(n, formatCount(n, live.current.lang)), className: 'jp-cluster', iconSize: [size, size],
          label: text('map.cluster', live.current.lang, { count: { en: formatCount(n, 'en'), bn: formatCount(n, 'bn') } }),
        });
      },
    });
    const circles = L.layerGroup();
    map.addLayer(cluster);
    map.addLayer(circles);
    mapRef.current = map;
    clusterRef.current = cluster;
    circlesRef.current = circles;

    // Enter and Space activate a focused pin or cluster (FR-14, FR-18). Leaflet itself handles Enter only on
    // markers with its own popup, so both keys become a click (detail 0, which marks it as keyboard).
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if ((e.key === 'Enter' || e.key === ' ') && (t.classList.contains('jp-pin') || t.classList.contains('jp-cluster'))) { e.preventDefault(); t.click(); }
    };
    el.addEventListener('keydown', onKey);
    const ro = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    ro.observe(el);
    setZoom(map.getZoom());
    const onZoom = () => setZoom(map.getZoom());
    map.on('zoomend', onZoom);
    map.on('click', () => live.current.onBackground?.());
    const ms = markers.current;
    return () => {
      ro.disconnect();
      el.removeEventListener('keydown', onKey);
      map.off('zoomend', onZoom);
      map.remove();
      mapRef.current = null; clusterRef.current = null; circlesRef.current = null; tileRef.current = null; meRef.current = null;
      ms.clear();
    };
  }, []);

  // ------------------------------------------------------------------ tiles, errors and retry (FR-12)
  const tileTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const watchTiles = useCallback((layer: L.TileLayer) => {
    let errors = 0;
    let loaded = false;
    clearTimeout(tileTimer.current);
    tileTimer.current = setTimeout(() => { if (!loaded) setTilesFailed(true); }, TILE_TIMEOUT_MS);
    layer.on('tileerror', () => { errors += 1; if (errors >= TILE_ERRORS) setTilesFailed(true); });
    layer.on('tileload', () => { errors = 0; loaded = true; clearTimeout(tileTimer.current); setTilesFailed(false); });
  }, []);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const b = baseMap(base);
    const layer = L.tileLayer(b.url, { attribution: b.attribution, maxZoom: b.maxZoom, subdomains: b.subdomains ?? 'abc', detectRetina: false });
    watchTiles(layer);
    layer.addTo(map);
    tileRef.current = layer;
    return () => { clearTimeout(tileTimer.current); map.removeLayer(layer); };
  }, [base, watchTiles]);
  const retryTiles = () => {
    setTilesFailed(false);
    const layer = tileRef.current;
    if (!layer) return;
    layer.off('tileerror').off('tileload');
    watchTiles(layer);
    layer.redraw();
  };

  // ------------------------------------------------------------------ pins (FR-13 to FR-17)
  const markerFor = useCallback((site: IndexSite) => {
    let m = markers.current.get(site.i);
    if (!m) {
      m = L.marker(site.ll!, { icon: pinIcon(site, live.current.lang), keyboard: true, riseOnHover: true });
      m.on('click', e => {
        const ev = (e as L.LeafletMouseEvent).originalEvent as (Event & { detail?: number }) | undefined;
        live.current.onSelect(site.i, !!ev && ev.detail === 0);
      });
      m.on('add', () => paint(site.i));
      markers.current.set(site.i, m);
    }
    return m;
  }, []);

  /** Applies the selected and hover classes to a pin, or to the cluster holding it. */
  function paint(id: string) {
    const m = markers.current.get(id);
    const el = m?.getElement();
    if (!el) return;
    el.classList.toggle('is-selected', live.current.selected?.i === id);
    el.classList.toggle('is-hover', live.current.hovered === id);
  }

  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();
    cluster.addLayers(sites.map(markerFor));
  }, [sites, markerFor]);

  // Names follow the interface language (FR-42).
  useEffect(() => {
    for (const [id, m] of markers.current) {
      const site = live.current.sites.find(s => s.i === id);
      if (site) m.setIcon(pinIcon(site, lang));
    }
    clusterRef.current?.refreshClusters();
  }, [lang]);

  // Approximate circles from zoom 11, only for pins shown on their own (FR-16); labels from zoom 12 (FR-17).
  const drawCircles = useCallback(() => {
    const map = mapRef.current, cluster = clusterRef.current, circles = circlesRef.current;
    if (!map || !cluster || !circles) return;
    circles.clearLayers();
    box.current?.classList.toggle('jp-labels', map.getZoom() >= LABEL_MIN_ZOOM);
    if (map.getZoom() < CIRCLE_MIN_ZOOM) return;
    for (const s of live.current.sites) {
      if (s.lc !== 'approximate') continue;
      const m = markers.current.get(s.i);
      if (!m || cluster.getVisibleParent(m) !== m) continue;
      const color = `rgb(var(--${CONDITION_COLOR[s.c]}))`;
      L.circle(s.ll!, { radius: CIRCLE_RADIUS_M, color, weight: 1.5, dashArray: '4 4', fillColor: color, fillOpacity: 0.08, interactive: false }).addTo(circles);
    }
  }, []);
  useEffect(() => {
    const map = mapRef.current, cluster = clusterRef.current;
    if (!map || !cluster) return;
    map.on('zoomend moveend', drawCircles);
    cluster.on('animationend', drawCircles);
    drawCircles();
    return () => { map.off('zoomend moveend', drawCircles); cluster.off('animationend', drawCircles); };
  }, [drawCircles, sites]);

  // ------------------------------------------------------------------ fit to results (FR-7, D11)
  const fitted = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fitted.current === fitKey) return;
    const first = fitted.current === null;
    fitted.current = fitKey;
    if (first && live.current.selected?.ll) { map.setView(live.current.selected.ll, SITE_ZOOM, { animate: false }); return; }
    if (!sites.length) { map.fitBounds(BANGLADESH, { animate: !first }); return; }
    map.fitBounds(L.latLngBounds(sites.map(s => s.ll!)), { maxZoom: FIT_MAX_ZOOM, padding: [40, 40], animate: !first && !reducedMotion() });
  }, [fitKey, sites]);

  // ------------------------------------------------------------------ selection and hover (FR-15, FR-19, FR-20)
  const prevSel = useRef<string | undefined>(undefined);
  useEffect(() => {
    const before = prevSel.current;
    prevSel.current = selected?.i;
    if (before) paint(before);
    if (!selected) return;
    const m = markers.current.get(selected.i);
    const cluster = clusterRef.current, map = mapRef.current;
    if (!m || !cluster || !map) return;
    if (cluster.hasLayer(m)) {
      cluster.zoomToShowLayer(m, () => {
        paint(selected.i);
        map.panInside(m.getLatLng(), { padding: [40, 60] as L.PointTuple, animate: false });
        // Room for the popover beside the pin (FR-28): if it fits on neither side, move the pin right until
        // it fits on the left.
        if (!live.current.hasPopover) return;
        const p = map.latLngToContainerPoint(m.getLatLng()), w = map.getSize().x;
        if (p.x < POP_ROOM && p.x + POP_ROOM > w) map.panBy([p.x - Math.min(w - 40, POP_ROOM), 0], { animate: false });
      });
    }
    paint(selected.i);
  }, [selected]);

  const hoverEl = useRef<HTMLElement | null>(null);
  useEffect(() => {
    hoverEl.current?.classList.remove('is-hover');
    hoverEl.current = null;
    if (!hovered) return;
    const m = markers.current.get(hovered), cluster = clusterRef.current;
    if (!m || !cluster) return;
    const parent = cluster.getVisibleParent(m) as L.Marker | null;
    const el = parent?.getElement() ?? null;
    el?.classList.add('is-hover');
    hoverEl.current = el;
  }, [hovered]);

  // ------------------------------------------------------------------ popover position (FR-28)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selected?.ll || !popover) { setAnchor(null); return; }
    const place = () => {
      const p = map.latLngToContainerPoint(selected.ll!);
      const size = map.getSize();
      setAnchor({ x: p.x, y: p.y, w: size.x, h: size.y });
    };
    place();
    map.on('move zoom viewreset resize', place);
    return () => { map.off('move zoom viewreset resize', place); };
  }, [selected, popover]);
  const pop = useRef<HTMLDivElement>(null);
  const [popH, setPopH] = useState(0);
  useLayoutEffect(() => { if (pop.current) setPopH(pop.current.offsetHeight); }, [anchor, selected]);

  // ------------------------------------------------------------------ the page's handle (A-1)
  useEffect(() => {
    onReady?.({
      focusPin(id) {
        const m = markers.current.get(id), cluster = clusterRef.current;
        if (!m || !cluster) return false;
        const target = (cluster.getVisibleParent(m) as L.Marker | null) ?? m;
        const el = target.getElement();
        if (!el) return false;
        el.focus({ preventScroll: true });
        return true;
      },
    });
    return () => onReady?.(null);
  }, [onReady]);

  // ------------------------------------------------------------------ locate (FR-32)
  const locate = (report: (k: 'map.locating' | 'map.located' | 'map.locateDenied' | 'map.locateUnavailable') => void) => {
    const map = mapRef.current;
    if (!map) return;
    if (!('geolocation' in navigator)) { report('map.locateUnavailable'); return; }
    report('map.locating');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const ll: L.LatLngTuple = [pos.coords.latitude, pos.coords.longitude];
        meRef.current?.remove();
        meRef.current = L.layerGroup([
          L.circle(ll, { radius: pos.coords.accuracy, color: 'rgb(var(--indigo))', weight: 1, fillOpacity: 0.08, interactive: false }),
          L.circleMarker(ll, { radius: 7, className: 'jp-me', weight: 3, fillOpacity: 1, interactive: false }),
        ]).addTo(map);
        map.setView(ll, Math.max(map.getZoom(), 11));
        report('map.located');
      },
      err => report(err.code === err.PERMISSION_DENIED ? 'map.locateDenied' : 'map.locateUnavailable'),
      { timeout: 10000, maximumAge: 60000 },
    );
  };

  const popLeft = anchor ? (anchor.x + 24 + 328 <= anchor.w - 8 ? anchor.x + 24 : Math.max(8, anchor.x - 24 - 328)) : 0;
  const popTop = anchor ? Math.min(Math.max(8, anchor.y - popH / 2), Math.max(8, anchor.h - popH - 8)) : 0;

  return (
    <div className="relative isolate h-full w-full overflow-hidden" data-map data-zoom={zoom}>
      <MapSprite />
      <div ref={box} className="jp-map absolute inset-0" />
      {compact ? null : (
        <>
          {bar ? <div className="pointer-events-none absolute left-3 top-3 z-controls max-w-[calc(100%-80px)]">{bar}</div> : null}
          <MapControls
            onZoomIn={() => mapRef.current?.zoomIn()} onZoomOut={() => mapRef.current?.zoomOut()} onLocate={locate}
            base={base} bases={BASE_MAPS.map(b => b.id)}
            onBase={id => { chosenBase = id; setPicked(id); }} zoom={zoom} />
          <MapKeyButton />
        </>
      )}
      {tilesFailed ? (
        <div role="alert" className="absolute inset-x-3 top-1/3 z-controls mx-auto max-w-sm rounded-lg border border-line bg-surface p-4 text-center shadow-2" data-tiles-failed>
          <p className="font-semibold"><T k="map.tilesFailed" /></p>
          <button type="button" onClick={retryTiles} className="mt-3 min-h-tap rounded-md bg-primary px-4 font-semibold text-on-primary"><T k="map.retry" /></button>
        </div>
      ) : null}
      {popover && anchor ? (
        <div ref={pop} className="absolute z-panel" style={{ left: popLeft, top: popTop, maxHeight: anchor.h - 16, opacity: popH ? 1 : 0 }} data-popover>
          {popover}
        </div>
      ) : null}
    </div>
  );
}
