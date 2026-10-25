// Sources list (roadmap task 10.3; spec .claude/specs/10-Areas-sources-about-and-system-states.md FR-19 to FR-24).
// Every entry in sources.json, with search, type chips, sort and paging in the URL. The first 25 rows in the
// default order are static HTML (the Suspense fallback), so the list works with JavaScript off. The copy never
// claims that every fact has a supporting link; it points to how disagreements are shown instead.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { T } from '@/components/T';
import { SourcesApp, SourcesFirstPage } from '@/components/sources/SourcesTable';
import { getSources } from '@/lib/data';
import { both, formatCount } from '@/lib/format';
import { dual } from '@/lib/i18n';
import { sortSources, sourceRow, SOURCES_PAGE } from '@/lib/sources';

export const metadata: Metadata = { title: 'Sources' };

export default function SourcesPage() {
  const rows = getSources().map(sourceRow);
  const first = sortSources(rows, 'cited').slice(0, SOURCES_PAGE);
  return (
    <main id="main" className="mx-auto max-w-page space-y-8 px-4 py-8 lg:px-8 lg:py-10" data-sources-page>
      <header className="max-w-3xl space-y-3">
        <h1 className="font-serif text-h1"><T k="nav.sources" /></h1>
        <p lang="bn" data-l="en" aria-hidden="true" className="font-bn text-lg text-muted">{dual('nav.sources').bn}</p>
        <p className="text-lg"><T k="sources.intro" vars={{ count: both(formatCount, rows.length) }} /></p>
        <p><Link prefetch={false} href="/about/#disagreements" className="font-semibold text-primary underline"><T k="sources.introLink" /> →</Link></p>
      </header>
      <Suspense fallback={<SourcesFirstPage rows={first} total={rows.length} />}>
        <SourcesApp rows={rows} />
      </Suspense>
    </main>
  );
}
