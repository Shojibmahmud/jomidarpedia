// Trips listing (roadmap tasks 9.1, 9.2; spec .claude/specs/09-Trips-and-itineraries.md FR-1 to FR-11).
// The first 12 cards in the default order are static HTML (D10): the Suspense fallback, shown until TripsApp
// runs and with JavaScript off. TripsApp reads the filters from the URL and pages through every trip, which
// it gets as props, so the listing loads no extra data file and no map code (NFR-2).

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { T } from '@/components/T';
import { TripsApp, TripsFirstPage } from '@/components/trips/TripsApp';
import { getDivisions } from '@/lib/data';
import { both, formatCount } from '@/lib/format';
import { dual } from '@/lib/i18n';
import { tripCards } from '@/lib/trip-data';
import { hasTimed, PAGE, sortTrips } from '@/lib/trips';

export const metadata: Metadata = { title: 'Day trips and itineraries' };

export default function TripsPage() {
  const trips = tripCards();
  const divisions = getDivisions().map(d => ({ slug: d.slug, en: d.en, bn: d.bn }));
  const first = sortTrips(trips, 'time', 'en').slice(0, PAGE);
  return (
    <main id="main" className="mx-auto max-w-page space-y-8 px-4 py-8 lg:px-8 lg:py-10">
      <header className="max-w-3xl space-y-3">
        <p className="text-sm font-bold uppercase tracking-wide text-primary" data-trip-total={trips.length}>
          <T k="trips.eyebrow" vars={{ count: both(formatCount, trips.length) }} />
        </p>
        <h1 className="font-serif text-h1"><T k="trips.title" /></h1>
        <p lang="bn" data-l="en" aria-hidden="true" className="font-bn text-lg text-muted">{dual('trips.title').bn}</p>
        <p className="text-lg"><T k="trips.intro" /></p>
      </header>
      <noscript>
        <p className="rounded-lg border border-line bg-surface p-4"><T k="trips.noscript" vars={{ count: both(formatCount, PAGE) }} /></p>
      </noscript>
      <Suspense fallback={<TripsFirstPage trips={first} />}>
        <TripsApp trips={trips} divisions={divisions} timed={hasTimed(trips)} />
      </Suspense>
    </main>
  );
}
