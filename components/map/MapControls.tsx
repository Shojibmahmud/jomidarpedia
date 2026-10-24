'use client';
// Map controls and key (roadmap task 7.8, spec 07 FR-30 to FR-33): zoom, locate, the base-map menu and
// "Map key". Real buttons with names and 44 px targets. A panel closes on Esc (which then does nothing
// else: the event is marked handled, so an open summary stays open), on a click outside, and on focus leaving.

import { useEffect, useId, useRef, useState } from 'react';
import { SrT, T } from '@/components/T';
import { ConditionGlyph } from '@/components/art/ConditionGlyph';
import type { BaseMapId } from '@/lib/map-config';
import { CONDITION_COLOR, pinSvg } from '@/lib/pins';
import type { Condition } from '@/lib/types';
import { CONDITION_ORDER } from '@/lib/filters';

const btn = 'inline-flex min-h-tap min-w-tap items-center justify-center bg-surface text-ink hover:bg-surface-2';

/** Open/close state for a panel, closed by Esc, an outside click or focus leaving `root`. */
function usePanel(root: React.RefObject<HTMLDivElement | null>, trigger: React.RefObject<HTMLButtonElement | null>) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const outside = (e: Event) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', key, true);
    };
  }, [open, root, trigger]);
  return [open, setOpen] as const;
}

type LocateKey = 'map.locating' | 'map.located' | 'map.locateDenied' | 'map.locateUnavailable';

export function MapControls({ onZoomIn, onZoomOut, onLocate, base, bases, onBase, zoom }: {
  onZoomIn(): void; onZoomOut(): void; onLocate(report: (k: LocateKey) => void): void;
  base: BaseMapId; bases: BaseMapId[]; onBase(id: BaseMapId): void; zoom: number;
}) {
  const [message, setMessage] = useState<LocateKey | null>(null);
  const menuRoot = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = usePanel(menuRoot, menuButton);
  const id = useId();
  return (
    <div className="absolute right-3 top-3 z-controls flex flex-col items-end gap-2" data-map-controls>
      <div className="flex flex-col overflow-hidden rounded-md border border-line shadow-2">
        <button type="button" onClick={onZoomIn} disabled={zoom >= 18} className={`${btn} border-b border-line disabled:text-muted`} data-zoom-in>
          <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          <SrT k="map.zoomIn" />
        </button>
        <button type="button" onClick={onZoomOut} disabled={zoom <= 6} className={`${btn} disabled:text-muted`} data-zoom-out>
          <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M5 12h14" /></svg>
          <SrT k="map.zoomOut" />
        </button>
      </div>
      <div className="flex flex-col rounded-md border border-line shadow-2">
        <button type="button" onClick={() => onLocate(setMessage)} className={`${btn} rounded-t-md border-b border-line`} data-locate>
          <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
          <SrT k="map.locate" />
        </button>
        <div ref={menuRoot} className="relative">
          <button ref={menuButton} type="button" aria-expanded={menuOpen} aria-controls={id} onClick={() => setMenuOpen(o => !o)} className={`${btn} rounded-b-md`} data-base-menu>
            <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round"><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="m3 13 9 5 9-5" /></svg>
            <SrT k="map.baseMap" />
          </button>
          <div id={id} hidden={!menuOpen} className="absolute right-full top-0 mr-2 w-48 rounded-lg border border-line bg-surface p-1 shadow-2">
            <div role="group" aria-labelledby={`${id}-t`}>
              <p id={`${id}-t`} className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted"><T k="map.baseMap" /></p>
              {bases.map(b => (
                <button key={b} type="button" aria-pressed={b === base} data-base={b}
                  onClick={() => { onBase(b); setMenuOpen(false); menuButton.current?.focus(); }}
                  className="flex min-h-tap w-full items-center gap-2 rounded-md px-3 text-left text-sm font-semibold hover:bg-surface-2 aria-pressed:bg-surface-2">
                  <span aria-hidden="true" className="w-4">{b === base ? '✓' : ''}</span><T k={`map.base.${b}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p role="status" aria-live="polite" className={message ? 'max-w-[220px] rounded-md bg-surface px-3 py-2 text-sm shadow-2' : 'sr-only'} data-locate-status>
        {message ? <T k={message} /> : null}
      </p>
    </div>
  );
}

function KeyPin({ condition, fill, flagged = false }: { condition: Condition; fill: 'solid' | 'outlined' | 'hatched'; flagged?: boolean }) {
  return <span aria-hidden="true" className="inline-block w-7 shrink-0" dangerouslySetInnerHTML={{ __html: pinSvg({ condition, fill, flagged }) }} />;
}

/** "Map key" (FR-33): conditions, fills, unverified, the "?" badge, clusters and the approximate circle. */
export function MapKeyButton() {
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = usePanel(root, button);
  const id = useId();
  const row = 'flex items-center gap-3 py-1 text-sm';
  return (
    <div ref={root} className="absolute bottom-8 left-3 z-controls" data-map-key>
      <div id={id} hidden={!open} className="mb-2 max-h-[60vh] w-72 overflow-y-auto rounded-lg border border-line bg-surface p-4 shadow-2">
        <h3 className="font-semibold"><T k="map.key" /></h3>
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted"><T k="map.key.condition" /></p>
        <ul>
          {CONDITION_ORDER.map(c => (
            <li key={c} className={row}>
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-surface" style={{ background: `rgb(var(--${CONDITION_COLOR[c]}))` }}>
                <ConditionGlyph condition={c} size={16} />
              </span>
              <T k={`condition.${c}`} />
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-muted"><T k="map.key.fill" /></p>
        <ul>
          <li className={row}><KeyPin condition="preserved" fill="solid" /><T k="map.key.verified" /></li>
          <li className={row}><KeyPin condition="preserved" fill="outlined" /><T k="map.key.single" /></li>
          <li className={row}><KeyPin condition="preserved" fill="hatched" /><T k="map.key.approximate" /></li>
          <li className={row} data-key-unverified><KeyPin condition="unknown" fill="outlined" flagged /><T k="map.key.unverified" /></li>
          <li className={row}><KeyPin condition="in_ruins" fill="solid" flagged /><T k="map.key.flag" /></li>
          <li className={row} data-key-circle>
            <span aria-hidden="true" className="inline-block h-7 w-7 shrink-0 rounded-full border-2 border-dashed border-muted bg-surface-2" />
            <T k="map.key.circle" />
          </li>
          <li className={row}>
            <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[3px] border-primary text-xs font-bold">#</span>
            <T k="map.key.cluster" />
          </li>
        </ul>
      </div>
      <button ref={button} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}
        className="inline-flex min-h-tap items-center gap-2 rounded-md border border-line bg-surface px-4 font-semibold shadow-2 hover:bg-surface-2">
        <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></svg>
        <T k="map.key" />
      </button>
    </div>
  );
}
