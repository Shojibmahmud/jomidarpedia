'use client';
// Active filters above the list (roadmap task 6.6, spec 06 FR-23): one removable chip per active value
// and Clear all. Each removal is one change, so one history entry. Hidden when nothing is on.

import { Both, T } from '@/components/T';
import { valueLabel } from '@/lib/explore-labels';
import { activeValues, removeValue, type FilterState, type Places } from '@/lib/filters';

export function ActiveFilters({ state, places, onChange, onClear }: {
  state: FilterState; places: Places; onChange: (next: FilterState) => void; onClear: () => void;
}) {
  const values = activeValues(state);
  if (!values.length) return null;
  return (
    <section aria-labelledby="jp-active" className="flex flex-wrap items-center gap-2">
      <h3 id="jp-active" className="sr-only"><T k="active.label" /></h3>
      <ul className="contents">
        {values.map(v => (
          <li key={`${v.group}:${'value' in v ? v.value : ''}`}>
            <button type="button" onClick={() => onChange(removeValue(state, v, places))} data-active={`${v.group}${'value' in v ? `:${v.value}` : ''}`}
              className="chip min-h-10 border-ink px-3 text-sm">
              <span className="sr-only"><T k="active.remove" /> </span>
              <Both value={valueLabel(v, places)} />
              <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onClear} className="min-h-10 px-2 text-sm font-semibold underline"><T k="filter.clearAll" /></button>
    </section>
  );
}
