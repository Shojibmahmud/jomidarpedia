// Search (roadmap Phase 8, spec .claude/specs/08-Search.md): grouped results for a query in the URL.
// Static page; the results are client-side (<SearchApp>), reading q, field, in and exact from the URL, so it
// sits in <Suspense> for the static export. District names and counts and the example searches are read
// here at build time and passed down, so the browser fetches only index.json.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { T } from '@/components/T';
import { ListSkeleton } from '@/components/explore/ResultsList';
import { SearchApp } from '@/components/search/SearchApp';
import { getDistricts, getIndex } from '@/lib/data';
import { exampleSearches } from '@/lib/search';

export const metadata: Metadata = { title: 'Search' };

export default function SearchPage() {
  const index = getIndex();
  const districts = getDistricts().map(d => ({ slug: d.slug, en: d.en, bn: d.bn, divisionSlug: d.divisionSlug, count: d.count }));
  return (
    <main id="main" className="mx-auto max-w-page space-y-6 px-4 py-8 lg:px-8">
      <h1 className="sr-only"><T k="search.title" /></h1>
      <noscript>
        <p className="rounded-lg border border-line bg-surface p-4" data-search-noscript>
          <T k="search.noscript" /> <Link prefetch={false} href="/explore/" className="underline"><T k="search.noscriptLink" /></Link>
        </p>
      </noscript>
      <Suspense fallback={<ListSkeleton />}>
        <SearchApp districts={districts} examples={exampleSearches(index)} total={index.length} />
      </Suspense>
    </main>
  );
}
