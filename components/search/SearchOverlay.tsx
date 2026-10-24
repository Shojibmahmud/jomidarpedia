'use client';
// The header's search overlay (spec 08 FR-18, D2): a modal <dialog> under the header on desktop and full
// screen on phones, holding the SearchBox. Close, or Esc on an empty box, closes it; SearchButton puts focus
// back on the icon. Loaded with next/dynamic only when first opened, so pages don't carry it (FR-37).

import { useEffect, useRef } from 'react';
import { T } from '@/components/T';
import { text } from '@/lib/i18n';
import type { SearchDistrict } from '@/lib/search';
import { useUiLang } from '@/lib/use-ui-lang';
import { SearchBox } from './SearchBox';

export default function SearchOverlay({ open, districts, onClose }: { open: boolean; districts: readonly SearchDistrict[]; onClose: () => void }) {
  const lang = useUiLang();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      d.querySelector<HTMLInputElement>('[role="combobox"]')?.focus();
      document.documentElement.style.overflow = 'hidden';
    } else if (!open && d.open) {
      d.close();
    }
    return () => { document.documentElement.style.overflow = ''; };
  }, [open]);

  return (
    <dialog ref={dialog} aria-labelledby="jp-search-title" data-search-overlay
      onCancel={e => { e.preventDefault(); onClose(); }}
      onClick={e => { if (e.target === dialog.current) onClose(); }}
      className="m-0 h-[100dvh] max-h-none w-full max-w-none bg-bg p-0 text-ink backdrop:bg-ink/40 lg:mx-auto lg:mt-[61px] lg:h-auto lg:max-h-[calc(100vh-100px)] lg:max-w-[760px] lg:rounded-b-xl lg:shadow-3">
      {open ? (
        <div className="flex h-full flex-col gap-3 p-4 lg:p-6">
          <div className="flex items-center gap-2">
            <h2 id="jp-search-title" className="font-serif text-h3"><T k="search.title" /></h2>
            <button type="button" onClick={onClose} aria-label={text('search.close', lang)} data-search-close
              className="ml-auto inline-flex h-12 w-12 items-center justify-center rounded-full hover:bg-surface-2">
              <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SearchBox districts={districts} onEscapeEmpty={onClose} onNavigate={onClose} autoFocus />
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
