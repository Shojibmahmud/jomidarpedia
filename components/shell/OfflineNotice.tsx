'use client';
// The offline toast (roadmap task 10.12; spec 10 FR-58 to FR-60, O8), rendered once in the root layout. It shows
// on the `offline` event, or at load when the browser already reports offline, and hides itself on `online`.
// There is no service worker (O8), so the copy promises only that this page stays open. Dismiss hides it until
// the next `offline` event; Try again reloads only when the browser reports online.

import { useEffect, useState } from 'react';
import { T } from '@/components/T';
import { OfflineIcon } from '@/components/art/EmptyStates';

export function OfflineNotice() {
  const [offline, setOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [still, setStill] = useState(false);
  useEffect(() => {
    const down = () => { setOffline(true); setDismissed(false); setStill(false); };
    const up = () => setOffline(false);
    if (!navigator.onLine) down();
    window.addEventListener('offline', down);
    window.addEventListener('online', up);
    return () => { window.removeEventListener('offline', down); window.removeEventListener('online', up); };
  }, []);
  const retry = () => {
    if (navigator.onLine) window.location.reload();
    else setStill(true);
  };
  const shown = offline && !dismissed;
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-toast flex justify-center px-4 print:hidden">
      {shown ? (
        <div className="pointer-events-auto flex w-full max-w-md flex-wrap items-center gap-3 rounded-lg bg-ink p-4 text-bg shadow-3" data-offline>
          <OfflineIcon className="shrink-0" />
          <p className="min-w-0 flex-1 text-sm">
            <T k="offline.body" />
            {still ? <> <strong data-offline-still><T k="offline.still" /></strong></> : null}
          </p>
          <div className="flex w-full justify-end gap-2">
            <button type="button" onClick={() => setDismissed(true)} className="min-h-tap rounded-md border border-bg/60 px-4 font-semibold"><T k="common.dismiss" /></button>
            <button type="button" onClick={retry} className="min-h-tap rounded-md bg-bg px-4 font-semibold text-ink" data-offline-retry><T k="offline.retry" /></button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
