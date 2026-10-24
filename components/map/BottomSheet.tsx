'use client';
// The phone results sheet (roadmap task 7.7, spec 07 FR-24 to FR-27). Three snap points: peek, half, full.
// The handle is a button that steps peek → half → full → peek and moves focus to the sheet's heading;
// dragging it (or, below full, the sheet itself) snaps to the nearest point. The list scrolls inside the
// sheet only at full. The sheet reports its height so the map above it and scroll-padding follow it.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SrT } from '@/components/T';

export const SNAPS = ['peek', 'half', 'full'] as const;
export type Snap = (typeof SNAPS)[number];

const PEEK_PX = 128;
const FULL_GAP_PX = 96; // a strip of map, with its attribution, stays visible above the full sheet (R8)

export function snapHeight(snap: Snap, total: number): number {
  if (snap === 'peek') return Math.min(PEEK_PX, total);
  if (snap === 'half') return Math.round(total * 0.5);
  return Math.max(PEEK_PX, total - FULL_GAP_PX);
}
const next = (s: Snap): Snap => SNAPS[(SNAPS.indexOf(s) + 1) % SNAPS.length];

export function BottomSheet({ snap, onSnap, total, headingId, header, children, onHeight, hidden = false, listRef }: {
  snap: Snap; onSnap(s: Snap): void; total: number; headingId: string;
  header: React.ReactNode; children: React.ReactNode; onHeight(px: number): void; hidden?: boolean;
  listRef?: React.Ref<HTMLDivElement>;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ y: number; h: number; moved: boolean } | null>(null);
  const dragged = useRef(false); // the click that ends a drag does not also cycle
  const height = drag ?? snapHeight(snap, total);

  useLayoutEffect(() => { if (!hidden) onHeight(height); }, [height, hidden, onHeight]);
  useEffect(() => {
    if (hidden) return;
    const root = document.documentElement;
    root.style.scrollPaddingBottom = `${height}px`;
    return () => { root.style.scrollPaddingBottom = ''; };
  }, [height, hidden]);

  const focusHeading = () => requestAnimationFrame(() => document.getElementById(headingId)?.focus());
  const cycle = () => { onSnap(next(snap)); focusHeading(); };

  // Pointer drag: on the handle always, on the sheet body below full. A move under 6 px is a tap.
  const down = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    start.current = { y: e.clientY, h: height, moved: false };
  };
  const move = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dy = s.y - e.clientY;
    if (!s.moved && Math.abs(dy) < 6) return;
    if (!s.moved) { s.moved = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
    setDrag(Math.min(snapHeight('full', total), Math.max(snapHeight('peek', total), s.h + dy)));
  };
  const up = () => {
    const s = start.current;
    start.current = null;
    if (!s?.moved || drag === null) return;
    dragged.current = true;
    setTimeout(() => { dragged.current = false; }, 0);
    const nearest = SNAPS.reduce((a, b) => (Math.abs(snapHeight(b, total) - drag) < Math.abs(snapHeight(a, total) - drag) ? b : a));
    setDrag(null);
    onSnap(nearest);
  };
  const handlers = { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up };
  const full = snap === 'full' && drag === null;

  return (
    <section aria-labelledby={headingId} data-sheet={snap} aria-hidden={hidden || undefined} inert={hidden}
      className={`absolute inset-x-0 bottom-0 z-panel flex flex-col rounded-t-xl bg-surface shadow-3 ${hidden ? 'invisible' : ''} ${drag === null ? 'transition-[height] duration-200' : ''}`}
      style={{ height }}>
      <div {...handlers} className="flex shrink-0 justify-center pt-1 [touch-action:none]">
        <button type="button" aria-expanded={snap !== 'peek'} onClick={() => { if (dragged.current) dragged.current = false; else cycle(); }} data-sheet-handle
          className="inline-flex min-h-tap w-24 items-center justify-center rounded-full">
          <span aria-hidden="true" className="h-1.5 w-12 rounded-full bg-line-strong" />
          <SrT k={snap === 'full' ? 'sheet.less' : 'sheet.more'} />
        </button>
      </div>
      <div {...(full ? {} : handlers)} className={`flex min-h-0 flex-1 flex-col ${full ? '' : '[touch-action:none]'}`}>
        <div className="shrink-0 px-4 pb-2">{header}</div>
        <div ref={listRef} className={`min-h-0 flex-1 px-2 pb-4 ${full ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden'}`} data-sheet-list>
          {children}
        </div>
      </div>
    </section>
  );
}
