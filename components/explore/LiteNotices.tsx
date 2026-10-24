'use client';
// Lite mode on Explore (roadmap task 7.9, O7, spec 07 FR-36, FR-38). Save-Data switched it on: say so.
// A slow connection with Lite off: suggest it, once per browser session (A-6). With Lite on, the map pane
// says the map is off and offers to turn Lite mode off; nothing from Leaflet loads meanwhile.

import { useState, useSyncExternalStore } from 'react';
import { T } from '@/components/T';
import { applyLite, browserStorage } from '@/lib/prefs';
import { useLite, useLiteAuto } from '@/lib/use-ui-lang';

const HINT_KEY = 'jp-lite-hint';
const noop = () => () => {};

function slowConnection(): boolean {
  const c = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return c?.effectiveType === '2g' || c?.effectiveType === 'slow-2g';
}
function hintDismissed(): boolean {
  try { return window.sessionStorage.getItem(HINT_KEY) === '1'; } catch { return false; }
}

const setLite = (on: boolean) => applyLite(on, document.documentElement, browserStorage());
const note = 'flex flex-wrap items-start gap-3 rounded-lg border border-gold bg-gold-tint p-3 text-sm';

export function LiteNotices() {
  const lite = useLite();
  const auto = useLiteAuto();
  const slow = useSyncExternalStore(noop, slowConnection, () => false);
  const [autoClosed, setAutoClosed] = useState(false);
  const [hintClosed, setHintClosed] = useState(() => typeof window !== 'undefined' && hintDismissed());
  const closeHint = () => {
    setHintClosed(true);
    try { window.sessionStorage.setItem(HINT_KEY, '1'); } catch { /* this page only */ }
  };
  if (lite && auto && !autoClosed) {
    return (
      <div role="status" className={note} data-lite-auto-note>
        <p className="min-w-0 flex-1"><T k="lite.auto" /></p>
        <button type="button" onClick={() => setAutoClosed(true)} className="min-h-tap px-2 font-semibold underline"><T k="common.dismiss" /></button>
      </div>
    );
  }
  if (!lite && slow && !hintClosed) {
    return (
      <div role="status" className={note} data-lite-hint>
        <p className="min-w-0 flex-1"><T k="lite.suggest" /></p>
        <button type="button" onClick={() => { setLite(true); closeHint(); }} className="min-h-tap rounded-md bg-ink px-3 font-semibold text-bg"><T k="lite.turnOn" /></button>
        <button type="button" onClick={closeHint} className="min-h-tap px-2 font-semibold underline"><T k="common.dismiss" /></button>
      </div>
    );
  }
  return null;
}

/** Shown where the map would be while Lite mode is on (FR-38). */
export function LiteOffPanel() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-map-land p-6 text-center" data-lite-off>
      <div className="max-w-sm space-y-3 rounded-lg bg-surface p-5 shadow-2">
        <p className="font-serif text-h3"><T k="lite.offTitle" /></p>
        <p className="text-sm text-muted"><T k="lite.offBody" /></p>
        <button type="button" onClick={() => setLite(false)} className="min-h-tap rounded-md bg-primary px-4 font-semibold text-on-primary"><T k="lite.turnOff" /></button>
      </div>
    </div>
  );
}
