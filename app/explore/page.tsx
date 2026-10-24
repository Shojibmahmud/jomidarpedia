// Explore (roadmap Phase 6, spec .claude/specs/06-Explore-list.md): the filterable list of every site.
// Static page; the list itself is client-side (<ExploreApp>), reading its filters from the URL, so it sits
// in <Suspense> for the static export (FR-30). Division and district names are read here at build time
// and passed down, so the browser fetches only index.json (A-6). The map (Phase 7, spec 07) is loaded by
// ExploreApp only when it is shown; from 1280 px the page runs wider for rail | map | list (D7).

import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { T } from '@/components/T';
import { ExploreApp } from '@/components/explore/ExploreApp';
import { ListSkeleton } from '@/components/explore/ResultsList';
import { getDistricts, getDivisions } from '@/lib/data';
import type { PlaceList } from '@/lib/filters';

export const metadata: Metadata = { title: 'Explore' };

export default function ExplorePage() {
  const places: PlaceList = {
    divisions: getDivisions().map(d => ({ slug: d.slug, en: d.en, bn: d.bn })),
    districts: getDistricts().map(d => ({ slug: d.slug, en: d.en, bn: d.bn, divisionSlug: d.divisionSlug })),
  };
  return (
    <main id="main" className="mx-auto max-w-page space-y-6 px-4 py-8 lg:px-8 xl:max-w-[1600px]">
      <h1 className="font-serif text-h1"><T k="explore.title" /></h1>
      <noscript>
        <p className="rounded-lg border border-line bg-surface p-4">
          <T k="explore.noscript" /> <Link prefetch={false} href="/" className="underline"><T k="explore.home" /></Link>
        </p>
      </noscript>
      <Suspense fallback={<ListSkeleton />}>
        <ExploreApp places={places} />
      </Suspense>
    </main>
  );
}
