// Site header (roadmap task 3.9): logo, Explore, Day trips, Divisions (a menu of the 8 divisions),
// About, search, and the language, theme and Lite mode (task 7.9) toggles. On narrow screens the links
// and toggles move into a Menu disclosure. Server component; only the disclosures and toggles run in the browser.

import Link from 'next/link';
import { Lockup } from '@/components/brand/Logo';
import { SrT, T } from '@/components/T';
import { getDivisions } from '@/lib/data';
import { divisionHref, HEADER_LINKS, SEARCH_HREF } from '@/lib/nav';
import { Disclosure } from './Disclosure';
import { LanguageToggle, LiteToggle, ThemeToggle } from './Toggles';

const navItem = 'inline-flex min-h-tap items-center rounded-md px-3 text-[15px] font-semibold hover:bg-surface-2';
const iconButton = 'inline-flex min-h-tap min-w-tap items-center justify-center rounded-full hover:bg-surface-2';

function Chevron() {
  return <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 9l6 6 6-6" /></svg>;
}

function DivisionList() {
  return (
    <ul className="grid gap-0.5 py-1">
      {getDivisions().map(d => (
        <li key={d.slug}>
          <Link prefetch={false} href={divisionHref(d.slug)} className="flex min-h-tap flex-col justify-center rounded-md px-3 py-1 hover:bg-surface-2">
            <span lang="en" className="font-semibold">{d.en}</span>
            <span lang="bn" className="text-sm text-muted">{d.bn}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SiteHeader() {
  const [explore, ...rest] = HEADER_LINKS;
  return (
    <header className="sticky top-0 z-header border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-page items-center gap-2 px-4 py-2 lg:px-8">
        <Link prefetch={false} href="/" className="mr-2 inline-flex min-h-tap items-center rounded-md">
          <Lockup compact />
          <SrT k="nav.home" />
        </Link>

        <nav aria-labelledby="jp-nav-main" className="hidden items-center gap-1 lg:flex">
          <span id="jp-nav-main" className="sr-only"><T k="nav.main" /></span>
          <Link prefetch={false} href={explore.href} className={navItem}><T k={explore.k} /></Link>
          <Link prefetch={false} href={rest[0].href} className={navItem}><T k={rest[0].k} /></Link>
          <Disclosure button={<><T k="nav.divisions" /><Chevron /></>} buttonClassName={`${navItem} gap-1`}
            panelClassName="absolute left-0 top-full z-dropdown mt-1 w-64 rounded-lg border border-line bg-surface p-1 shadow-2">
            <DivisionList />
          </Disclosure>
          {rest.slice(1).map(l => <Link key={l.href} href={l.href} className={navItem}><T k={l.k} /></Link>)}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link prefetch={false} href={SEARCH_HREF} className={iconButton}>
            <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
            <SrT k="nav.search" />
          </Link>
          <div className="hidden items-center gap-2 lg:flex">
            <LiteToggle labelClassName="sr-only xl:not-sr-only" />
            <LanguageToggle />
            <ThemeToggle />
          </div>
          <Disclosure className="lg:hidden" buttonClassName={iconButton}
            button={<><svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg><SrT k="nav.menu" /></>}
            panelClassName="fixed inset-x-0 top-[61px] z-dropdown max-h-[calc(100vh-61px)] overflow-y-auto border-b border-line bg-surface px-4 pb-6 pt-2 shadow-3">
            <nav aria-labelledby="jp-nav-menu">
              <span id="jp-nav-menu" className="sr-only"><T k="nav.main" /></span>
              <ul className="grid gap-0.5">
                {HEADER_LINKS.map(l => <li key={l.href}><Link prefetch={false} href={l.href} className={`${navItem} w-full`}><T k={l.k} /></Link></li>)}
              </ul>
              <p className="mt-3 px-3 text-xs font-bold uppercase tracking-wider text-muted"><T k="nav.allDivisions" /></p>
              <DivisionList />
            </nav>
            <div className="mt-4 flex flex-wrap items-center gap-3 px-3">
              <LanguageToggle />
              <ThemeToggle />
              <LiteToggle />
            </div>
          </Disclosure>
        </div>
      </div>
    </header>
  );
}
