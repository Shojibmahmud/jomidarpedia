'use client';
// No results (roadmap task 6.9, spec 06 FR-27, D6): names the one group or switch whose removal brings
// back the most sites, with a button that removes it, and offers Clear all.

import { Both, T } from '@/components/T';
import { groupPhrase } from '@/lib/explore-labels';
import { bestRemoval, without, type FilterState, type Places } from '@/lib/filters';
import { both, formatCount } from '@/lib/format';
import { dual } from '@/lib/i18n';
import type { IndexSite } from '@/lib/types';

export function EmptyResults({ sites, state, places, onChange, onClear }: {
  sites: IndexSite[]; state: FilterState; places: Places; onChange: (next: FilterState) => void; onClear: () => void;
}) {
  const best = bestRemoval(sites, state, places);
  return (
    <div className="space-y-3 rounded-lg border border-line bg-surface p-5" data-empty>
      <p className="font-serif text-h3"><T k="empty.title" /></p>
      <div className="flex flex-wrap gap-2">
        {best && best.count > 0 ? (
          <button type="button" onClick={() => onChange(without(state, best.group))} data-suggest={best.group}
            className="min-h-tap rounded-md bg-primary px-4 text-left font-semibold text-on-primary">
            <Both value={dual(best.count === 1 ? 'empty.suggest.one' : 'empty.suggest', { filter: groupPhrase(best.group, state, places), count: both(formatCount, best.count) })} />
          </button>
        ) : null}
        <button type="button" onClick={onClear} className="min-h-tap rounded-md border border-line-strong px-4 font-semibold"><T k="empty.clear" /></button>
      </div>
    </div>
  );
}
