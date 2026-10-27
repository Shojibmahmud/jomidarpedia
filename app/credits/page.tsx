// Image credits (roadmap task 10.7; spec .claude/specs/10-Areas-sources-about-and-system-states.md FR-45 to FR-50).
// Every Ready image in credits.json, grouped by site: divisions in divisions.json order, sites A to Z within each.
// Each credit line is printed exactly as images.csv gives it, never split or reworded (NFR-7). A group shows 8
// rows, then "Show N more" (<details>, so it works without JavaScript). CreditsFilter adds the search box and `?site=`.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Both, Latin, T } from '@/components/T';
import { Licences } from '@/components/about/Licences';
import { CreditsFilter } from '@/components/credits/CreditsFilter';
import { getCredits, getDivisions, getIndex } from '@/lib/data';
import { fold } from '@/lib/fold';
import { both, formatCount } from '@/lib/format';
import { dual } from '@/lib/i18n';
import { CORRECTIONS_URL } from '@/lib/nav';
import { canonicalUrl, siteHref } from '@/lib/site-url';
import type { Credit } from '@/lib/types';
import { pageMeta } from '@/lib/seo';

export function generateMetadata(): Metadata {
  const n = getCredits().length;
  return pageMeta({ title: 'Image credits', path: '/credits/', canonical: false, description: `Credits and licences for the ${n} photos of zamindar sites shown on Jomidarpedia.` });
}

const n = (v: number) => both(formatCount, v);
const SHOWN = 8;

// The 938 rows are written as one escaped HTML string per list, not as React elements: the page then carries each
// row once in the HTML and once as a string in the RSC payload, instead of a much larger element tree (NFR-3).
// Same markup as before; styles are the .credit-row rules in app/tokens.css.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const filePage = dual('credits.filePage');

function rowsHtml(cs: Credit[]): string {
  return cs.map(c => `<li class="credit-row" data-credit-row="${esc(c.imageId)}">`
    + `<img src="${esc(c.thumb)}" alt="" width="96" height="72" loading="lazy" decoding="async">`
    + `<div><p lang="en" data-credit>${esc(c.credit)}</p><p lang="en">${esc(c.view)} · <span class="font-mono">${esc(c.imageId)}</span></p></div>`
    + (c.sourcePage
      ? `<a href="${esc(c.sourcePage)}" target="_blank" rel="noopener noreferrer" data-file-page><span lang="en" data-l="en">${esc(filePage.en)}</span><span lang="bn" data-l="bn">${esc(filePage.bn)}</span><span aria-hidden="true"> ↗</span></a>`
      : '')
    + '</li>').join('');
}

export default function CreditsPage() {
  const credits = getCredits();
  const index = new Map(getIndex().map(s => [s.i, s]));
  const bySite = new Map<string, Credit[]>();
  for (const c of credits) bySite.set(c.siteId, [...(bySite.get(c.siteId) ?? []), c]);
  const groups = getDivisions().flatMap(d => [...bySite.entries()]
    .filter(([id]) => index.get(id)?.dv === d.en)
    .sort(([, a], [, b]) => a[0].siteEn.localeCompare(b[0].siteEn, 'en') || a[0].siteId.localeCompare(b[0].siteId)));
  if (groups.reduce((k, [, cs]) => k + cs.length, 0) !== credits.length) throw new Error('credits: a credit is not in any division');
  const licences = [...credits.reduce((m, c) => m.set(c.license, (m.get(c.license) ?? 0) + 1), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'en'));

  return (
    <main id="main" className="mx-auto max-w-page px-4 py-8 lg:px-8 lg:py-10" data-credits-page>
      <link rel="canonical" href={canonicalUrl('/credits/')} />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <header className="space-y-3">
            <p className="text-sm"><Link prefetch={false} href="/about/" className="text-primary underline"><T k="nav.about" /></Link></p>
            <h1 className="font-serif text-h1"><T k="credits.title" /></h1>
            <p lang="bn" data-l="en" aria-hidden="true" className="font-bn text-lg text-muted">{dual('credits.title').bn}</p>
            <p className="text-lg"><T k="credits.intro" vars={{ count: n(credits.length), sites: n(bySite.size) }} /></p>
          </header>
          <Suspense fallback={null}><CreditsFilter /></Suspense>
          <div className="space-y-8">
            {groups.map(([id, cs]) => {
              const site = cs[0];
              return (
                <section key={id} aria-labelledby={`c-${id}`} data-credit-group data-site={id} data-search={fold(`${site.siteEn} ${site.siteBn ?? ''}`)}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-line-strong pb-2">
                    <h2 id={`c-${id}`} className="font-serif text-h3">
                      <Link prefetch={false} href={siteHref(id, site.siteSlug)} className="hover:underline">
                        <span lang="en" data-l={site.siteBn ? 'en' : undefined}>{site.siteEn}</span>
                        {site.siteBn ? <span lang="bn" data-l="bn">{site.siteBn}</span> : null}
                      </Link>{' '}
                      <span className="font-mono text-sm font-normal text-muted"><Latin>{id}</Latin></span>
                    </h2>
                    <span className="text-sm text-muted"><T k={cs.length === 1 ? 'credits.photos.one' : 'credits.photos'} vars={{ count: n(cs.length) }} /></span>
                  </div>
                  <ul dangerouslySetInnerHTML={{ __html: rowsHtml(cs.slice(0, SHOWN)) }} />
                  {cs.length > SHOWN ? (
                    <details className="group">
                      <summary className="mt-3 inline-flex min-h-tap cursor-pointer list-none items-center rounded-md border border-line-strong bg-surface px-4 font-semibold group-open:hidden [&::-webkit-details-marker]:hidden" data-more>
                        <T k="credits.more" vars={{ count: n(cs.length - SHOWN) }} />
                      </summary>
                      <ul dangerouslySetInnerHTML={{ __html: rowsHtml(cs.slice(SHOWN)) }} />
                    </details>
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section aria-labelledby="jp-photo-licences" className="space-y-3 rounded-lg border border-line bg-surface p-5" data-photo-licences>
            <h2 id="jp-photo-licences" className="font-serif text-h3"><T k="credits.licences" /></h2>
            <ul>
              {licences.map(([name, count]) => (
                <li key={name} className="flex justify-between gap-3 border-b border-line py-2 text-sm"><Latin>{name}</Latin><strong><Both value={n(count)} /></strong></li>
              ))}
            </ul>
            <p className="text-sm text-muted"><T k="credits.reuse" /></p>
          </section>
          <section aria-labelledby="jp-licences" className="space-y-3 rounded-lg border border-line bg-surface p-5">
            <h2 id="jp-licences" className="font-serif text-h3"><T k="lic.mapAndData" /></h2>
            <Licences compact />
          </section>
          <p className="rounded-lg bg-gold-tint p-4 text-sm">
            <strong><T k="credits.mistake" /></strong>{' '}
            <a href={CORRECTIONS_URL} className="underline"><T k="credits.mistakeBody" /></a>
          </p>
        </aside>
      </div>
    </main>
  );
}
