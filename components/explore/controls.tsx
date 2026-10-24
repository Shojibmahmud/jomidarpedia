'use client';
// Explore's filter controls (roadmap task 6.6, spec 06 FR-17 to FR-22, FR-24). Each states its value to
// assistive technology (role="switch" with aria-checked, toggle buttons with aria-pressed, checkboxes),
// shows its facet count, and never relies on colour alone: a selected chip carries a check glyph.
// Zero-count options stay operable, in a muted dashed style (A-3).

import { useId } from 'react';
import { Both, T } from '@/components/T';
import { bucketLabel } from '@/lib/explore-labels';
import { BUCKET_ORDER, type Counts, type FilterState, type Places } from '@/lib/filters';
import { both, formatCount } from '@/lib/format';
import type { Dual, StringKey, Vars } from '@/lib/i18n';
import type { Condition, TravelBucket } from '@/lib/types';

const n = (v: number) => both(formatCount, v);
const Count = ({ value }: { value: number }) => <span className="font-normal text-muted"><Both value={n(value)} /></span>;

function Check() {
  return <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>;
}

export function Switch({ checked, onChange, label, sub, subVars }: {
  checked: boolean; onChange: (next: boolean) => void; label: StringKey; sub: StringKey; subVars: Vars;
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="flex min-h-[52px] w-full items-center gap-3 rounded-md text-left font-semibold">
      <span className="flex flex-col">
        <span><T k={label} /></span>
        <span className="text-sm font-normal text-muted"><T k={sub} vars={subVars} /></span>
      </span>
      <span aria-hidden="true" className={`relative ml-auto h-7 w-[46px] shrink-0 rounded-full ${checked ? 'bg-indigo' : 'bg-line-strong'}`}>
        <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full ${checked ? 'left-[21px] bg-on-indigo' : 'left-[3px] bg-surface'}`} />
      </span>
    </button>
  );
}

export function DayTripSwitch({ checked, count, onChange }: { checked: boolean; count: number; onChange: (next: boolean) => void }) {
  return (
    <div className="rounded-lg bg-indigo-tint px-3 text-indigo">
      <Switch checked={checked} onChange={onChange} label="filter.day" sub="filter.daySub" subVars={{ count: n(count) }} />
    </div>
  );
}

export function TravelTimeSegmented({ value, counts, onChange, labelledBy }: {
  value: TravelBucket | 'any'; counts: Counts['tt']; onChange: (next: TravelBucket | 'any') => void; labelledBy: string;
}) {
  const options: (TravelBucket | 'any')[] = ['any', ...BUCKET_ORDER];
  return (
    <div role="group" aria-labelledby={labelledBy} className="grid grid-cols-4 gap-1 rounded-lg border border-line bg-surface-2 p-1">
      {options.map(o => (
        <button key={o} type="button" aria-pressed={value === o} onClick={() => { if (value !== o) onChange(o); }} data-tt={o}
          className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-md text-sm font-semibold ${o === 'unknown' ? 'col-span-2' : ''} ${value === o ? 'bg-surface shadow-1 ring-2 ring-inset ring-ink' : ''} ${counts[o] === 0 && value !== o ? 'text-muted' : ''}`}>
          <span><Both value={bucketLabel(o)} /></span>
          <span className="text-xs"><Count value={counts[o]} /></span>
        </button>
      ))}
    </div>
  );
}

const DOT: Record<Condition, string> = {
  preserved: 'bg-moss', preserved_adaptive_reuse: 'bg-teal', in_ruins: 'bg-primary', lost: 'bg-lost', unknown: 'border-[1.5px] border-unknown',
};

export interface ChipOption<T extends string> { value: T; label: Dual; count: number; dot?: Condition }

export function ChipGroup<T extends string>({ options, selected, onToggle, labelledBy, name }: {
  options: ChipOption<T>[]; selected: readonly T[]; onToggle: (value: T) => void; labelledBy: string; name: string;
}) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-wrap gap-2">
      {options.map(o => {
        const on = selected.includes(o.value);
        return (
          <button key={o.value} type="button" aria-pressed={on} onClick={() => onToggle(o.value)} data-chip={`${name}:${o.value}`}
            className={`chip ${!on && o.count === 0 ? 'border-dashed text-muted' : ''}`}>
            {on ? <Check /> : o.dot ? <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[o.dot]}`} /> : null}
            <Both value={o.label} /> <span className={on ? 'font-normal opacity-80' : ''}>{on ? <Both value={n(o.count)} /> : <Count value={o.count} />}</span>
          </button>
        );
      })}
    </div>
  );
}

export function DivisionDistrictPicker({ state, counts, places, onDivision, onDistrict, labelledBy }: {
  state: FilterState; counts: Counts; places: Places; onDivision: (slug: string) => void; onDistrict: (slug: string) => void; labelledBy: string;
}) {
  const base = useId();
  return (
    <div role="group" aria-labelledby={labelledBy} className="divide-y divide-line border-y border-line">
      {places.list.divisions.map(d => {
        const on = state.div.includes(d.slug);
        const districts = places.list.districts.filter(x => x.divisionSlug === d.slug);
        const listId = `${base}-${d.slug}`;
        return (
          <div key={d.slug}>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 py-1">
              <input type="checkbox" checked={on} onChange={() => onDivision(d.slug)} data-div={d.slug}
                className="h-5 w-5 shrink-0 accent-ink" aria-controls={on ? listId : undefined} />
              <span className="font-semibold"><Both value={{ en: d.en, bn: d.bn }} /></span>
              <span lang="bn" data-l="en" className="font-bn text-sm text-muted">{d.bn}</span>
              <span className="ml-auto text-sm"><Count value={counts.div[d.slug] ?? 0} /></span>
            </label>
            {on ? (
              <div id={listId} role="group" aria-label={`${d.en} · ${d.bn}`} className="flex flex-wrap gap-1.5 pb-3 pl-8">
                {districts.map(x => {
                  const picked = state.dist.includes(x.slug);
                  return (
                    <button key={x.slug} type="button" aria-pressed={picked} onClick={() => onDistrict(x.slug)} data-dist={x.slug}
                      className={`chip min-h-10 px-3 text-sm ${!picked && !counts.dist[x.slug] ? 'border-dashed text-muted' : ''}`}>
                      {picked ? <Check /> : null}
                      <Both value={{ en: x.en, bn: x.bn }} /> {picked ? <Both value={n(counts.dist[x.slug] ?? 0)} /> : <Count value={counts.dist[x.slug] ?? 0} />}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function QualitySwitches({ state, counts, onChange }: { state: FilterState; counts: Counts; onChange: (next: FilterState) => void }) {
  return (
    <div className="space-y-1">
      <Switch checked={state.doc} onChange={v => onChange({ ...state, doc: v })} label="filter.doc" sub="filter.docSub"
        subVars={{ confirmed: n(counts.confirmed), partial: n(counts.partial), count: n(counts.doc) }} />
      <Switch checked={state.vloc} onChange={v => onChange({ ...state, vloc: v })} label="filter.vloc" sub="filter.vlocSub" subVars={{ count: n(counts.vloc) }} />
    </div>
  );
}
