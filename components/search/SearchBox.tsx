'use client';
// SearchBox (roadmap task 8.3, spec 08 FR-14 to FR-17): an ARIA 1.2 combobox with a grouped listbox of
// suggestions: up to 5 sites, 3 families and 3 districts, then "See all results". ↓ and ↑ move through every
// option across the groups, Enter opens the active one (or /search/ when none is active), Esc clears the
// text, and Esc on an empty box asks the owner to close (the header overlay). Suggestions follow the text
// 150 ms after typing stops (A-4); the counts are announced politely. Fuse.js loads when the box mounts.
// Home's hero (spec 11 FR-6) mounts it on first focus with the text typed so far, its own placeholder and a
// Search button, which does what Enter does with no option active.

import { useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Both, T } from '@/components/T';
import { fold } from '@/lib/fold';
import { both, formatCount } from '@/lib/format';
import { text, type Dual, type StringKey } from '@/lib/i18n';
import { MIN_QUERY, searchAll, type SearchDistrict } from '@/lib/search';
import { useMatcher } from '@/lib/search-client';
import { searchHref } from '@/lib/searchUrl';
import { siteHref } from '@/lib/site-url';
import { useUiLang } from '@/lib/use-ui-lang';
import { announce, districtHref, familyHref } from './results';
import { Marked } from './Marked';
import { SearchIcon } from './SearchIcon';

export const LIMITS = { sites: 5, families: 3, districts: 3 };
const DEBOUNCE = 150;

type Option = { key: string; group: 'sites' | 'families' | 'districts' | 'all'; href: string; body: React.ReactNode };

export function SearchBox({ districts, onEscapeEmpty, onNavigate, autoFocus = false, initialValue = '', placeholder, submit = false }: {
  districts: readonly SearchDistrict[];
  onEscapeEmpty?: () => void;
  onNavigate?: () => void;
  autoFocus?: boolean;
  initialValue?: string;
  placeholder?: Dual;
  submit?: boolean;
}) {
  const lang = useUiLang();
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const optionId = (k: number) => `${id}-opt-${k}`;
  const [value, setValue] = useState(initialValue);
  const [query, setQuery] = useState(initialValue);
  const [active, setActive] = useState(-1);
  const { state, retry } = useMatcher(true);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(value), DEBOUNCE);
    return () => clearTimeout(timer);
  }, [value]);

  const long = fold(query).length >= MIN_QUERY;
  const result = useMemo(
    () => (state.status === 'ready' && long ? searchAll(state.value, districts, query) : null),
    [state, long, districts, query],
  );

  const options: Option[] = useMemo(() => {
    if (!result) return [];
    const out: Option[] = [];
    for (const h of result.sites.slice(0, LIMITS.sites)) {
      out.push({
        key: `site:${h.site.i}`, group: 'sites', href: siteHref(h.site.i, h.site.s),
        body: (
          <>
            <span lang="en" className="block font-semibold"><Marked text={h.site.e} terms={h.terms} /></span>
            {h.site.b ? <span lang="bn" className="block font-bn text-bn-sm text-muted"><Marked text={h.site.b} terms={h.terms} /></span> : null}
            <span className="block text-sm text-muted"><Both value={{ en: h.site.u ? `${h.site.u}, ${h.site.d}` : h.site.d, bn: h.site.u ? `${h.site.u}, ${h.site.db}` : h.site.db }} /></span>
          </>
        ),
      });
    }
    for (const f of result.families.slice(0, LIMITS.families)) {
      out.push({
        key: `family:${f.key}`, group: 'families', href: familyHref(f.phrase),
        body: (
          <>
            <span lang="en" className="block font-semibold"><Marked text={f.phrase} terms={new Set(result.words)} /></span>
            <span className="block text-sm text-muted"><T k={f.count === 1 ? 'search.family.count.one' : 'search.family.count'} vars={{ count: both(formatCount, f.count) }} /></span>
          </>
        ),
      });
    }
    for (const d of result.districts.slice(0, LIMITS.districts)) {
      out.push({
        key: `district:${d.district.slug}`, group: 'districts', href: districtHref(d.district),
        body: (
          <>
            <span className="block font-semibold"><Both value={{ en: d.district.en, bn: d.district.bn }} /></span>
            <span className="block text-sm text-muted"><T k={d.district.count === 1 ? 'search.count.sites.one' : 'search.count.sites'} vars={{ count: both(formatCount, d.district.count) }} /></span>
          </>
        ),
      });
    }
    out.push({
      key: 'all', group: 'all', href: searchHref({ q: query.trim() }),
      body: <span className="font-semibold text-primary-tint-ink"><T k="search.seeAll" vars={{ q: { en: query.trim(), bn: query.trim() } }} /></span>,
    });
    return out;
  }, [result, query]);

  const expanded = fold(value).length >= MIN_QUERY;
  const current = active >= 0 && active < options.length ? active : -1;

  useEffect(() => {
    if (current >= 0) document.getElementById(`${id}-opt-${current}`)?.scrollIntoView({ block: 'nearest' });
  }, [current, id]);

  function go(href: string) {
    onNavigate?.();
    router.push(href);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    const n = options.length;
    switch (e.key) {
      case 'ArrowDown':
        if (!expanded || !n) return;
        e.preventDefault();
        setActive(current < 0 ? 0 : (current + 1) % n);
        break;
      case 'ArrowUp':
        if (!expanded || !n) return;
        e.preventDefault();
        setActive(current <= 0 ? n - 1 : current - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (current >= 0) go(options[current].href);
        else if (expanded) go(searchHref({ q: value.trim() }));
        break;
      case 'Escape':
        e.preventDefault();
        if (value) { setValue(''); setQuery(''); setActive(-1); }
        else onEscapeEmpty?.();
        break;
    }
  }

  const groups: { group: Option['group']; label?: StringKey }[] = [
    { group: 'sites', label: 'search.group.sites' }, { group: 'families', label: 'search.group.families' },
    { group: 'districts', label: 'search.group.districts' }, { group: 'all' },
  ];

  return (
    <div className="space-y-2" data-search-box>
      <div className="flex items-center gap-2 rounded-lg border-2 border-ink bg-surface px-3 focus-within:ring-2 focus-within:ring-ink">
        <SearchIcon />
        <input id={`${id}-input`} type="text" role="combobox" aria-expanded={expanded} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={expanded && current >= 0 ? optionId(current) : undefined}
          aria-label={text('search.inputLabel', lang)} placeholder={placeholder ? placeholder[lang] : text('search.placeholder', lang)}
          autoFocus={autoFocus} autoComplete="off" autoCapitalize="off" spellCheck={false} enterKeyHint="search" maxLength={100}
          value={value} onChange={e => { setValue(e.target.value); setActive(-1); }} onKeyDown={onKey}
          className="min-h-[52px] min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted" />
        {value ? (
          <button type="button" onClick={() => { setValue(''); setQuery(''); setActive(-1); document.getElementById(`${id}-input`)?.focus(); }}
            aria-label={text('search.clear', lang)} className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface-2">
            <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        ) : null}
        {submit ? (
          <button type="button" onClick={() => { if (current >= 0) go(options[current].href); else if (expanded) go(searchHref({ q: value.trim() })); }}
            className="min-h-tap rounded-md bg-primary px-4 font-semibold text-on-primary hover:bg-primary-hover" data-search-submit>
            <T k="nav.search" />
          </button>
        ) : null}
      </div>
      <p role="status" aria-live="polite" className="sr-only" data-search-announce>{expanded && result ? announce(result, lang) : ''}</p>
      {expanded && state.status === 'loading' ? <p className="px-1 text-sm text-muted"><T k="search.loading" /></p> : null}
      {expanded && state.status === 'error' ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3" data-search-error>
          <p className="font-semibold"><T k="search.error" /></p>
          <button type="button" onClick={retry} className="min-h-tap rounded-md bg-primary px-4 font-semibold text-on-primary"><T k="results.retry" /></button>
        </div>
      ) : null}
      <ul id={listId} role="listbox" aria-label={text('search.suggestions', lang)} hidden={!expanded || !options.length}
        className="max-h-[60vh] overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-2">
        {groups.map(({ group, label }) => {
          const items = options.map((o, k) => ({ o, k })).filter(x => x.o.group === group);
          if (!items.length) return null;
          const labelId = `${id}-${group}`;
          const list = items.map(({ o, k }) => (
            <li key={o.key} id={optionId(k)} role="option" aria-selected={k === current} data-option={o.key}
              onMouseDown={e => e.preventDefault()} onClick={() => go(o.href)} onMouseMove={() => { if (k !== current) setActive(k); }}
              className="cursor-pointer rounded-md px-3 py-2 aria-selected:bg-surface-2 aria-selected:outline aria-selected:outline-2 aria-selected:outline-ink">
              {o.body}
            </li>
          ));
          if (!label) return list;
          return (
            <li key={group} role="presentation">
              <p id={labelId} role="presentation" className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-muted"><T k={label} /></p>
              <ul role="group" aria-labelledby={labelId}>{list}</ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
