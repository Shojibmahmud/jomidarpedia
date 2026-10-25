// The 404 page (roadmap task 10.10; spec .claude/specs/10-Areas-sources-about-and-system-states.md FR-51, FR-52).
// The static export serves it as /404.html for any unknown path. The search box is a plain form to /search/, so
// it works without JavaScript and loads no search index here; Search finds a site by its ID (FR-53), which is
// what the copy promises.

import Link from 'next/link';
import { T } from '@/components/T';
import { NotFoundArt } from '@/components/art/EmptyStates';
import { BrokenLinkReport } from '@/components/shell/BrokenLinkReport';
import { dual, text } from '@/lib/i18n';
import { SEARCH_HREF } from '@/lib/nav';

const button = 'inline-flex min-h-tap items-center rounded-md border border-line-strong bg-surface px-4 font-semibold hover:bg-surface-2';
const EXAMPLE_ID = { en: 'JB-DHK-064', bn: 'JB-DHK-064' };

export default function NotFound() {
  return (
    <main id="main" className="mx-auto grid max-w-page items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:px-8 lg:py-20" data-not-found>
      <div className="space-y-5">
        <p aria-hidden="true" className="font-serif text-[96px] font-bold leading-none text-primary">404</p>
        <h1 className="font-serif text-h1"><T k="nf.title" /></h1>
        <p lang="bn" data-l="en" aria-hidden="true" className="font-bn text-lg text-muted">{dual('nf.title').bn}</p>
        <p className="max-w-lg"><T k="nf.body" vars={{ id: EXAMPLE_ID }} /></p>
        <form action={SEARCH_HREF} method="get" role="search" className="flex max-w-lg items-center gap-2 rounded-lg border-2 border-ink bg-surface p-1.5" data-nf-search>
          <label className="min-w-0 flex-1">
            <span className="sr-only"><T k="nf.search" /></span>
            <input type="search" name="q" required maxLength={100} placeholder={text('nf.search', 'en')} className="min-h-tap w-full bg-transparent px-3 outline-none" />
          </label>
          <button type="submit" className="min-h-tap rounded-md bg-primary px-4 font-semibold text-on-primary"><T k="nav.search" /></button>
        </form>
        <p className="flex flex-wrap gap-3">
          <Link prefetch={false} href="/" className={button}><T k="nf.home" /></Link>
          <Link prefetch={false} href="/explore/?view=map" className={button}><T k="nf.explore" /></Link>
          <BrokenLinkReport className={button} />
        </p>
      </div>
      <NotFoundArt className="mx-auto w-full max-w-md text-muted" />
    </main>
  );
}
