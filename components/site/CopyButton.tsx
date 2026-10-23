'use client';
// Share and copy buttons (roadmap task 5.16, spec 05 FR-45, FR-46). The result is announced in a polite
// live region in the interface language (lib/use-ui-lang.ts). A cancelled share sheet is not a failure.

import { useState } from 'react';
import { T } from '@/components/T';
import { text, type StringKey } from '@/lib/i18n';
import { useUiLang } from '@/lib/use-ui-lang';

const BUTTON = 'inline-flex min-h-tap items-center gap-2 rounded-md border border-line-strong bg-surface px-4 font-semibold';

async function copy(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function useAnnounce() {
  const lang = useUiLang();
  const [message, setMessage] = useState<StringKey | null>(null);
  const region = <span role="status" aria-live="polite" className="text-sm text-muted">{message ? text(message, lang) : ''}</span>;
  return { region, announce: setMessage };
}

/** Copies a value; announces "copied" or "couldn't copy". On failure the value is shown so it can be selected. */
export function CopyButton({ value, label, ok, failed }: { value: string; label: StringKey; ok: StringKey; failed: StringKey }) {
  const { region, announce } = useAnnounce();
  const [shown, setShown] = useState(false);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" className={BUTTON} onClick={async () => { const done = await copy(value); setShown(!done); announce(done ? ok : failed); }}>
        <T k={label} />
      </button>
      {region}
      {shown ? <output lang="en" className="select-all font-mono text-sm">{value}</output> : null}
    </span>
  );
}

/** navigator.share when available, otherwise copy the link. */
export function ShareButton({ url, title }: { url: string; title: string }) {
  const { region, announce } = useAnnounce();
  const [shown, setShown] = useState(false);
  async function share() {
    const absolute = new URL(url, window.location.href).href;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url: absolute });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return; // the visitor closed the sheet
      }
    }
    const done = await copy(absolute);
    setShown(!done);
    announce(done ? 'share.copied' : 'share.failed');
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" className={BUTTON} onClick={share}>
        <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
        </svg>
        <T k="share.button" />
      </button>
      {region}
      {shown ? <output lang="en" className="select-all break-all font-mono text-sm">{new URL(url, window.location.href).href}</output> : null}
    </span>
  );
}
