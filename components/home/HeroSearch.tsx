'use client';
// The hero search box (roadmap task 11.1, spec 11 FR-6, NFR-1). The HTML is a plain form to /search/, so it works
// without JavaScript and the page loads no search code. On first focus it loads SearchBox, which takes over with the
// text typed so far; SearchBox then loads Fuse.js and index.json (spec 08 FR-37: none of it on page load).
// The hand-over renders synchronously (flushSync), so no keystroke falls between the two inputs.

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { T } from '@/components/T';
import { SearchIcon } from '@/components/search/SearchIcon';
import type { Dual } from '@/lib/i18n';
import { SEARCH_HREF } from '@/lib/nav';
import type { SearchDistrict } from '@/lib/search';
import { useUiLang } from '@/lib/use-ui-lang';

type Box = typeof import('@/components/search/SearchBox').SearchBox;

export function HeroSearch({ districts, placeholder }: { districts: readonly SearchDistrict[]; placeholder: Dual }) {
  const lang = useUiLang();
  const input = useRef<HTMLInputElement>(null);
  const [box, setBox] = useState<{ Box: Box; value: string } | null>(null);
  const code = useRef<Promise<Box> | null>(null);

  // A pointer over the box only fetches the code; focus hands over to SearchBox.
  const preload = () => code.current ??= import('@/components/search/SearchBox').then(m => m.SearchBox)
    .catch(e => { code.current = null; throw e; });
  const activate = () => {
    preload().then(Box => flushSync(() => setBox({ Box, value: input.current?.value ?? '' })), () => {}); // on failure the form still works
  };
  // SearchBox focuses its input on mount; the caret goes after the text carried over.
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrap.current?.querySelector<HTMLInputElement>('[role="combobox"]');
    if (el) el.setSelectionRange(el.value.length, el.value.length);
  }, [box]);

  // text-ink: the hero's text is white, and SearchBox's input inherits its colour.
  if (box) return <div ref={wrap} className="text-ink"><box.Box districts={districts} autoFocus initialValue={box.value} placeholder={placeholder} submit /></div>;
  return (
    <form action={SEARCH_HREF} method="get" role="search" data-hero-search
      className="flex items-center gap-2 rounded-lg border-2 border-ink bg-surface px-3 py-1 text-ink">
      <SearchIcon />
      <label className="min-w-0 flex-1">
        <span className="sr-only"><T k="search.inputLabel" /></span>
        <input ref={input} type="search" name="q" required maxLength={100} autoComplete="off" placeholder={placeholder[lang]}
          onFocus={activate} onPointerEnter={() => { preload().catch(() => {}); }}
          className="min-h-[52px] w-full bg-transparent text-lg outline-none placeholder:text-muted" />
      </label>
      <button type="submit" className="min-h-tap rounded-md bg-primary px-4 font-semibold text-on-primary hover:bg-primary-hover"><T k="nav.search" /></button>
    </form>
  );
}
