'use client';
// Every correction link opens the form as a modal <dialog> instead of going to /correction/. One listener on the
// document, in the capture phase so it runs before next/link: a plain click on a link to the form opens the popup
// with the link's site, field and page (or this page when the link names none). Ctrl/Cmd-click and middle-click
// still open the page, and so does every link when JavaScript is off. Esc, Close and a click outside close it.

import { useEffect, useRef, useState } from 'react';
import { text } from '@/lib/i18n';
import { CORRECTIONS_URL } from '@/lib/nav';
import { correctionContext, type CorrectionContext } from '@/lib/site-page';
import { useUiLang } from '@/lib/use-ui-lang';
import { CorrectionForm } from './CorrectionForm';

export function CorrectionDialog() {
  const lang = useUiLang();
  const dialog = useRef<HTMLDialogElement>(null);
  const [ctx, setCtx] = useState<{ n: number; value: CorrectionContext } | null>(null);

  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (!(a instanceof HTMLAnchorElement)) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname !== CORRECTIONS_URL || location.pathname === CORRECTIONS_URL) return;
      e.preventDefault();
      const value = correctionContext(url.searchParams);
      // A full address, so the link in the email works: without SITE_URL the page links carry a bare path.
      const pageUrl = value.pageUrl ? new URL(value.pageUrl, location.href).href : location.href;
      setCtx(c => ({ n: (c?.n ?? 0) + 1, value: { ...value, pageUrl } }));
    };
    document.addEventListener('click', click, true);
    return () => document.removeEventListener('click', click, true);
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (d && ctx && !d.open) d.showModal();
  }, [ctx]);

  const close = () => { dialog.current?.close(); setCtx(null); };

  return (
    <dialog ref={dialog} aria-labelledby="jp-correction-title" data-correction-dialog
      onCancel={e => { e.preventDefault(); close(); }}
      onClick={e => { if (e.target === dialog.current) close(); }}
      className="w-[calc(100%-2rem)] max-w-[560px] rounded-xl bg-bg p-0 text-ink shadow-3 backdrop:bg-ink/40">
      {ctx ? (
        <div className="relative max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 lg:p-6">
          <button type="button" onClick={close} aria-label={text('correct.close', lang)} data-correction-close
            className="absolute right-2 top-2 inline-flex h-12 w-12 items-center justify-center rounded-full hover:bg-surface-2">
            <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          <CorrectionForm key={ctx.n} ctx={ctx.value} titleId="jp-correction-title" onDone={close} />
        </div>
      ) : null}
    </dialog>
  );
}
