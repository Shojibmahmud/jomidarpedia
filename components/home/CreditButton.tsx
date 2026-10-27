'use client';
// A tile photo's credit behind a camera button, as on the trip cards (PhotoCredits): the credit line is always in
// the markup (FR-4, AC-19), shown in a popover on press. It closes on Esc, on a click outside and on a second
// press; focus then returns to the button. Above the tile's stretched link, so pressing it never opens the tile.

import { useEffect, useId, useRef, useState } from 'react';
import { T } from '@/components/T';

export function CreditButton({ credit }: { credit: string }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const close = (refocus: boolean) => { setOpen(false); if (refocus) button.current?.focus(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); close(true); } };
    const click = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!box.current?.contains(t) && !button.current?.contains(t)) close(false);
    };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', click);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', click); };
  }, [open]);
  return (
    <div className={`absolute inset-x-2 top-2 flex justify-end ${open ? 'z-20' : 'z-10'}`} data-no-print>
      <button ref={button} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)} data-photo-credits
        className="inline-flex min-h-tap min-w-tap items-center justify-center rounded-full bg-ink/70 text-bg hover:bg-ink">
        <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx={12} cy={13} r={3.5} />
        </svg>
        <span className="sr-only"><T k="trip.credits" /></span>
      </button>
      <div ref={box} id={id} role="region" aria-labelledby={`${id}-t`} hidden={!open}
        className="absolute inset-x-0 top-full mt-2 rounded-md border border-line bg-surface p-3 text-left shadow-3" data-credits-list>
        <p id={`${id}-t`} className="mb-1 text-sm font-semibold"><T k="trip.credits" /></p>
        <p lang="en" data-credit className="text-xs text-muted [overflow-wrap:anywhere]">{credit}</p>
      </div>
    </div>
  );
}
