'use client';
// "On this page" (roadmap task 5.15, spec 05 FR-43): a sticky list of anchors on desktop with the current
// section marked, and a <select> on mobile that moves to a section and focuses its heading. Every section
// is listed, with a status hint ("No pin", "Not yet", "None") where it is empty (A-7). Without JavaScript the
// mobile form is a plain list of links.

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Both, T } from '@/components/T';
import type { Dual } from '@/lib/i18n';
import { useUiLang } from '@/lib/use-ui-lang';

export type NavItem = { id: string; label: Dual; hint?: Dual };

const noop = () => () => {};

export function SectionNav({ items }: { items: NavItem[] }) {
  const [current, setCurrent] = useState(items[0]?.id);
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const lang = useUiLang();

  useEffect(() => {
    const seen = new Map<string, boolean>();
    const observer = new IntersectionObserver(entries => {
      for (const e of entries) seen.set(e.target.id, e.isIntersecting);
      const first = items.find(i => seen.get(i.id));
      if (first) setCurrent(first.id);
    }, { rootMargin: '-96px 0px -60% 0px' });
    for (const i of items) { const el = document.getElementById(i.id); if (el) observer.observe(el); }
    return () => observer.disconnect();
  }, [items]);

  const jump = (id: string) => {
    const section = document.getElementById(id);
    section?.scrollIntoView();
    const heading = section?.querySelector<HTMLElement>('h2');
    if (heading) { heading.tabIndex = -1; heading.focus(); }
  };

  return (
    <>
      <nav aria-labelledby="on-this-page" className="hidden lg:sticky lg:top-24 lg:block" data-section-nav>
        <p id="on-this-page" className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted"><T k="site.onThisPage" /></p>
        <ul className="space-y-0.5 text-sm">
          {items.map(i => (
            <li key={i.id}>
              <a href={`#${i.id}`} aria-current={current === i.id ? 'location' : undefined}
                className={`flex min-h-[32px] items-center justify-between gap-2 rounded-md px-2 ${current === i.id ? 'bg-primary-tint font-semibold text-primary-tint-ink' : 'hover:bg-surface-2'}`}>
                <Both value={i.label} />
                {i.hint ? <span className="text-[11px] uppercase tracking-wide text-muted"><Both value={i.hint} /></span> : null}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="lg:hidden">
        {hydrated ? (
          <label className="flex items-center gap-2 text-sm font-semibold">
            <T k="site.jumpTo" />
            <select className="min-h-tap flex-1 rounded-md border border-line-strong bg-surface px-3" data-section-select
              value={current} onChange={e => { setCurrent(e.target.value); jump(e.target.value); }}>
              {items.map(i => <option key={i.id} value={i.id}>{i.label[lang]}{i.hint ? ` · ${i.hint[lang]}` : ''}</option>)}
            </select>
          </label>
        ) : (
          <ul className="flex flex-wrap gap-x-4 text-sm">{items.map(i => <li key={i.id}><a href={`#${i.id}`} className="underline"><Both value={i.label} /></a></li>)}</ul>
        )}
      </div>
    </>
  );
}
