'use client';
// "Search within results" (spec 08 FR-28, D3): a plain search input bound to Explore's `q`. The list follows
// 300 ms after typing stops; a run of typing is one history entry (the first update pushes, the rest
// replace), ended by Enter or leaving the box. Focusing it starts loading Fuse.js (FR-19).

import { useEffect, useRef, useState } from 'react';
import { T } from '@/components/T';
import { SearchIcon } from '@/components/search/SearchIcon';
import { text } from '@/lib/i18n';
import { useUiLang } from '@/lib/use-ui-lang';

const DEBOUNCE = 300;

export function ExploreSearch({ q, id, onIntent, onChange, className = '' }: {
  q: string; id: string; onIntent: () => void; onChange: (q: string, push: boolean) => void; className?: string;
}) {
  const lang = useUiLang();
  // The box follows the URL when it changes from elsewhere (Back, a removed chip), not when it is the
  // query this box just sent, so keys typed meanwhile are kept.
  const [value, setValue] = useState(q);
  const [valueFor, setValueFor] = useState(q);
  const [sent, setSent] = useState<string | null>(null);
  if (valueFor !== q) {
    setValueFor(q);
    if (q !== sent) setValue(q);
    setSent(null);
  }
  const typing = useRef(false);
  const commit = (v: string) => {
    setSent(v.trim());
    onChange(v, !typing.current);
    typing.current = true;
  };
  // The timer restarts only when the text changes; it calls the latest commit, with the latest props.
  const latest = useRef(commit);
  useEffect(() => { latest.current = commit; });
  useEffect(() => {
    if (value.trim() === q) return;
    const timer = setTimeout(() => latest.current(value), DEBOUNCE);
    return () => clearTimeout(timer);
  }, [value, q]);

  return (
    <form role="search" className={className} data-explore-search
      onSubmit={e => { e.preventDefault(); if (value.trim() !== q) commit(value); typing.current = false; }}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold"><T k="explore.searchWithin" /></label>
      <div className="flex items-center gap-2 rounded-md border border-line-strong bg-surface px-3 focus-within:ring-2 focus-within:ring-ink">
        <SearchIcon size={18} />
        <input id={id} type="text" value={value} maxLength={100} autoComplete="off" spellCheck={false} enterKeyHint="search"
          onFocus={onIntent} onChange={e => { onIntent(); setValue(e.target.value); }} onBlur={() => { typing.current = false; }}
          className="min-h-tap min-w-0 flex-1 bg-transparent outline-none" />
        {value ? (
          <button type="button" aria-label={text('search.clear', lang)} onClick={() => { setValue(''); setSent(''); typing.current = false; onChange('', true); }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-2">
            <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        ) : null}
      </div>
    </form>
  );
}
