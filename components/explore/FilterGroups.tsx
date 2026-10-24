'use client';
// Every filter group, as the rail and the drawer show them (roadmap tasks 6.6 to 6.8, spec 06 FR-21,
// FR-25, FR-26, A-2). The rail keeps day trip, travel time, condition, visiting and where open and puts
// the rest in a "More" disclosure, open whenever one of them is on. In the drawer every group collapses
// and starts open.

import { useId, useState } from 'react';
import { T } from '@/components/T';
import { dual, type StringKey } from '@/lib/i18n';
import { both, formatCount } from '@/lib/format';
import { ACCESS_ORDER, CONDITION_ORDER, TYPE_ORDER, toggle, toggleDistrict, toggleDivision, type Counts, type FilterState, type Places } from '@/lib/filters';
import { ChipGroup, DayTripSwitch, DivisionDistrictPicker, QualitySwitches, Switch, TravelTimeSegmented } from './controls';

export type GroupsMode = 'rail' | 'drawer';

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.75}
      strokeLinecap="round" strokeLinejoin="round" className="ml-auto shrink-0"><path d={open ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6'} /></svg>
  );
}

/** One group: a heading (a disclosure button in the drawer) and its controls, labelled by the heading. */
function Group({ title, mode, children }: { title: StringKey; mode: GroupsMode; children: (labelledBy: string) => React.ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(true);
  return (
    <section aria-labelledby={`${id}-h`} className="space-y-3 border-t border-line py-4" data-group={title}>
      <h3 id={`${id}-h`} className="text-base font-bold">
        {mode === 'drawer'
          ? <button type="button" aria-expanded={open} aria-controls={`${id}-p`} onClick={() => setOpen(o => !o)}
              className="flex min-h-tap w-full items-center gap-2 text-left"><T k={title} /><Chevron open={open} /></button>
          : <T k={title} />}
      </h3>
      <div id={`${id}-p`} hidden={!open} className="space-y-3">{children(`${id}-h`)}</div>
    </section>
  );
}

export function TypeChips({ state, counts, unclassified, onChange, labelledBy }: {
  state: FilterState; counts: Counts; unclassified: number; onChange: (next: FilterState) => void; labelledBy: string;
}) {
  return (
    <>
      <ChipGroup name="type" labelledBy={labelledBy} selected={state.type}
        options={TYPE_ORDER.map(t => ({ value: t, label: dual(`filter.type.${t}`), count: counts.type[t] }))}
        onToggle={v => onChange({ ...state, type: toggle(state.type, v, TYPE_ORDER) })} />
      {unclassified ? <p className="text-sm text-muted"><T k="filter.typeNote" vars={{ count: both(formatCount, unclassified) }} /></p> : null}
    </>
  );
}

export function FilterGroups({ state, counts, places, unclassified, onChange, mode }: {
  state: FilterState; counts: Counts; places: Places; unclassified: number; onChange: (next: FilterState) => void; mode: GroupsMode;
}) {
  const moreActive = state.type.length > 0 || state.doc || state.vloc || state.photo || state.hours;
  const [moreOpen, setMoreOpen] = useState(moreActive);
  const [wasActive, setWasActive] = useState(moreActive);
  if (moreActive !== wasActive) { // a filter inside "More" came on (a link, Back): show it
    setWasActive(moreActive);
    if (moreActive) setMoreOpen(true);
  }
  const moreId = useId();
  const n = (v: number) => ({ count: both(formatCount, v) });

  const later = (
    <>
      <Group title="filter.type" mode={mode}>
        {id => <TypeChips state={state} counts={counts} unclassified={unclassified} onChange={onChange} labelledBy={id} />}
      </Group>
      <Group title="filter.quality" mode={mode}>
        {() => <QualitySwitches state={state} counts={counts} onChange={onChange} />}
      </Group>
      <Group title="filter.extras" mode={mode}>
        {() => (
          <div className="space-y-1">
            <Switch checked={state.photo} onChange={v => onChange({ ...state, photo: v })} label="filter.photo" sub="filter.photoSub" subVars={n(counts.photo)} />
            <Switch checked={state.hours} onChange={v => onChange({ ...state, hours: v })} label="filter.hours" sub="filter.hoursSub" subVars={n(counts.hours)} />
          </div>
        )}
      </Group>
    </>
  );

  return (
    <div>
      <div className="pb-4">
        <DayTripSwitch checked={state.day} count={counts.day} onChange={v => onChange({ ...state, day: v })} />
      </div>
      <Group title="filter.tt" mode={mode}>
        {id => (
          <>
            <TravelTimeSegmented labelledBy={id} value={state.tt} counts={counts.tt} onChange={tt => onChange({ ...state, tt })} />
            <p className="text-sm text-muted"><T k="filter.ttNote" vars={{ over: dual('tt.over', { hours: both(formatCount, 4) }) }} /></p>
          </>
        )}
      </Group>
      <Group title="filter.cond" mode={mode}>
        {id => (
          <ChipGroup name="cond" labelledBy={id} selected={state.cond}
            options={CONDITION_ORDER.map(c => ({ value: c, label: dual(`filter.cond.${c}`), count: counts.cond[c], dot: c }))}
            onToggle={v => onChange({ ...state, cond: toggle(state.cond, v, CONDITION_ORDER) })} />
        )}
      </Group>
      <Group title="filter.acc" mode={mode}>
        {id => (
          <ChipGroup name="acc" labelledBy={id} selected={state.acc}
            options={ACCESS_ORDER.map(a => ({ value: a, label: dual(`filter.acc.${a}`), count: counts.acc[a] }))}
            onToggle={v => onChange({ ...state, acc: toggle(state.acc, v, ACCESS_ORDER) })} />
        )}
      </Group>
      <Group title="filter.where" mode={mode}>
        {id => (
          <DivisionDistrictPicker labelledBy={id} state={state} counts={counts} places={places}
            onDivision={slug => onChange(toggleDivision(state, slug, places))} onDistrict={slug => onChange(toggleDistrict(state, slug, places))} />
        )}
      </Group>
      {mode === 'drawer' ? later : (
        <div className="border-t border-line pt-2">
          <button type="button" aria-expanded={moreOpen} aria-controls={moreId} onClick={() => setMoreOpen(o => !o)}
            className="flex min-h-tap w-full items-center gap-2 text-left text-sm font-semibold text-muted">
            <T k="filter.more" /><Chevron open={moreOpen} />
          </button>
          <div id={moreId} hidden={!moreOpen}>{later}</div>
        </div>
      )}
    </div>
  );
}

