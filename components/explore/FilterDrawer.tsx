'use client';
// The mobile filter drawer (roadmap task 6.8, spec 06 FR-26, D11): a modal <dialog> that works on a draft.
// "Show N sites" applies it; X, Esc and the backdrop discard it; "Clear all" clears the draft only.
// Focus stays inside while open and returns to the Filters button on close; the page behind does not scroll.

import { useEffect, useMemo, useRef, useState } from 'react';
import { T } from '@/components/T';
import { counts as countAll, EMPTY, type FilterState, type Places } from '@/lib/filters';
import { both, formatCount } from '@/lib/format';
import { text } from '@/lib/i18n';
import { useUiLang } from '@/lib/use-ui-lang';
import type { IndexSite } from '@/lib/types';
import { FilterGroups } from './FilterGroups';

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

export function FilterDrawer({ open, applied, sites, places, unclassified, onApply, onClose }: {
  open: boolean; applied: FilterState; sites: IndexSite[]; places: Places; unclassified: number;
  onApply: (next: FilterState) => void; onClose: () => void;
}) {
  const lang = useUiLang();
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(applied);
  const counts = useMemo(() => countAll(sites, draft, places), [sites, draft, places]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      setDraft(applied);
      d.showModal();
      d.querySelector<HTMLElement>('[data-drawer-title]')?.focus();
      document.documentElement.style.overflow = 'hidden';
    } else if (!open && d.open) {
      d.close();
    }
    return () => { document.documentElement.style.overflow = ''; };
    // The draft starts from the applied state each time the drawer opens, not on every applied change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function trap(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !dialog.current) return;
    const items = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current.querySelector('[data-drawer-title]'))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  return (
    <dialog ref={dialog} aria-labelledby="jp-drawer-title" onKeyDown={trap}
      onCancel={e => { e.preventDefault(); onClose(); }}
      onClick={e => { if (e.target === dialog.current) onClose(); }}
      className="m-0 mt-6 h-[calc(100dvh-24px)] max-h-none w-full max-w-none rounded-t-xl bg-bg p-0 text-ink backdrop:bg-ink/50 lg:hidden">
      <div className="flex h-full flex-col">
        <div className="flex items-center border-b border-line py-2 pl-4 pr-1">
          <h2 id="jp-drawer-title" data-drawer-title tabIndex={-1} className="font-serif text-h3 outline-none"><T k="filter.title" /></h2>
          <button type="button" onClick={onClose} aria-label={text('filter.close', lang)} data-drawer-close
            className="ml-auto inline-flex h-12 w-12 items-center justify-center rounded-full">
            <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4">
          <FilterGroups mode="drawer" state={draft} counts={counts} places={places} unclassified={unclassified} onChange={setDraft} />
        </div>
        <div className="flex gap-2 border-t border-line bg-bg px-4 pb-5 pt-3 shadow-3">
          <button type="button" onClick={() => setDraft(EMPTY)} className="min-h-[52px] rounded-lg px-4 font-bold ring-1 ring-inset ring-line-strong"><T k="filter.clearAll" /></button>
          <button type="button" onClick={() => onApply(draft)} data-drawer-show
            className="min-h-[52px] flex-1 rounded-lg bg-primary font-bold text-on-primary">
            <T k={counts.total === 1 ? 'filter.show.one' : 'filter.show'} vars={{ count: both(formatCount, counts.total) }} />
          </button>
        </div>
      </div>
    </dialog>
  );
}
