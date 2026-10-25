'use client';
// The district page's site list (roadmap task 10.2; spec 10 FR-15, FR-17, D4, D5). Every site as a card, in
// the order of districts.json siteIds, numbered to match the pins on the district map. The chips filter the
// cards in the browser and are not kept in the URL. They appear only once the page runs: with JavaScript off,
// every card shows and there are no chips.

import { useState, useSyncExternalStore } from 'react';
import { Both, T } from '@/components/T';
import { SiteCard } from '@/components/cards/SiteCard';
import { chipCounts, chipMatches, type Chip } from '@/lib/areas';
import { both, formatCount } from '@/lib/format';
import type { StringKey } from '@/lib/i18n';
import type { IndexSite } from '@/lib/types';

const n = (v: number) => both(formatCount, v);
const noop = () => () => {};
const CHIP_KEY: Record<Chip, StringKey> = {
  all: 'area.chip.all', open: 'area.chip.open', preserved: 'area.chip.preserved', in_ruins: 'condition.in_ruins', lost: 'condition.lost',
};

export function DistrictSites({ sites }: { sites: IndexSite[] }) {
  const running = useSyncExternalStore(noop, () => true, () => false);
  const [chip, setChip] = useState<Chip>('all');
  const chips = chipCounts(sites);
  return (
    <div className="space-y-4">
      {running && chips.length > 1 ? (
        <div role="group" aria-labelledby="jp-chips" className="flex flex-wrap items-center gap-2" data-district-chips>
          <span id="jp-chips" className="sr-only"><T k="area.chips" /></span>
          {chips.map(c => (
            <button key={c.chip} type="button" aria-pressed={chip === c.chip} onClick={() => setChip(c.chip)} data-chip={c.chip}
              className="chip min-h-tap gap-1.5 px-4">
              <T k={CHIP_KEY[c.chip]} /> <span className="font-normal"><Both value={n(c.count)} /></span>
            </button>
          ))}
        </div>
      ) : null}
      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-district-sites>
        {sites.map((s, k) => (
          <li key={s.i} hidden={!chipMatches(chip, s)} className="relative" data-site-n={k + 1}>
            <span aria-hidden="true" className="absolute left-4 top-4 z-10 inline-flex h-7 min-w-7 items-center justify-center rounded-full border-2 border-white bg-primary px-1 text-sm font-bold text-white shadow-1">
              <Both value={n(k + 1)} />
            </span>
            <SiteCard site={s} variant="full" />
          </li>
        ))}
      </ol>
    </div>
  );
}
