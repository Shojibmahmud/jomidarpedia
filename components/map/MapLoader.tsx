'use client';
// Loads the map code only when a map is actually shown (roadmap task 7.2, spec 07 FR-1, NFR-2): callers
// render <MapLoader> only for a visible map with Lite mode off, and next/dynamic with ssr: false keeps
// Leaflet, its CSS and every tile out of the page until then. An error boundary keeps a Leaflet failure
// from taking the list down with it (NFR-4).

import dynamic from 'next/dynamic';
import { Component, useState } from 'react';
import { T } from '@/components/T';
import type { MapViewProps } from './MapView';

export function MapPlaceholder({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-map-land p-4 text-center" data-map-placeholder>
      {children ?? <p role="status" className="text-sm text-muted"><T k="map.loading" /></p>}
    </div>
  );
}

const MapView = dynamic(() => import('./MapView'), { ssr: false, loading: () => <MapPlaceholder /> });

class MapBoundary extends Component<{ onReset(): void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <MapPlaceholder>
        <div role="alert" className="max-w-sm space-y-3" data-map-failed>
          <p className="font-semibold"><T k="map.failed" /></p>
          <button type="button" onClick={() => { this.setState({ failed: false }); this.props.onReset(); }}
            className="min-h-tap rounded-md bg-primary px-4 font-semibold text-on-primary"><T k="map.reload" /></button>
        </div>
      </MapPlaceholder>
    );
  }
}

export function MapLoader(props: MapViewProps) {
  const [attempt, setAttempt] = useState(0);
  return (
    <MapBoundary onReset={() => setAttempt(a => a + 1)}>
      <MapView key={attempt} {...props} />
    </MapBoundary>
  );
}
