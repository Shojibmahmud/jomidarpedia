'use client';
// The desktop filter rail (roadmap task 6.7, spec 06 FR-25, A-1): shown from lg up, applies each change at once.
// "Search within results" sits at its top (spec 08 FR-28).

import { T } from '@/components/T';
import type { Counts, FilterState, Places } from '@/lib/filters';
import { FilterGroups } from './FilterGroups';

export function FilterRail({ state, counts, places, unclassified, disabled, onChange, onClear, search }: {
  state: FilterState; counts: Counts; places: Places; unclassified: number; disabled: boolean;
  onChange: (next: FilterState) => void; onClear: () => void; search?: React.ReactNode;
}) {
  return (
    <aside aria-labelledby="jp-rail-title" className="hidden lg:block">
      <div className="flex items-center justify-between pb-3">
        <h2 id="jp-rail-title" className="font-serif text-h3"><T k="filter.title" /></h2>
        <button type="button" onClick={onClear} disabled={disabled} className="min-h-tap px-2 text-sm font-semibold underline"><T k="filter.clearAll" /></button>
      </div>
      {search ? <div className="pb-4">{search}</div> : null}
      <fieldset disabled={disabled} className={`m-0 min-w-0 border-0 p-0 ${disabled ? 'opacity-60' : ''}`}>
        <FilterGroups mode="rail" state={state} counts={counts} places={places} unclassified={unclassified} onChange={onChange} />
      </fieldset>
    </aside>
  );
}
