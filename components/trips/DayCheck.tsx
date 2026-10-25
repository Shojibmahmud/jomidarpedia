'use client';
// "Which day are you going?" (roadmap task 9.7, spec 09 FR-39 to FR-41, D2). It reads only the reviewed
// closing days (closedDays); the unreviewed text is never parsed. The page renders the picker only when some
// site stop has known closing days, and the one-line note otherwise (DayNote).

import { useState } from 'react';
import { T } from '@/components/T';
import { dual } from '@/lib/i18n';
import { dayCheck, DAYS, type DayStop } from '@/lib/trips';
import type { Day } from '@/lib/types';

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
    <rect x={4} y={5} width={16} height={15} rx={2} /><path d="M4 10h16M9 3v4M15 3v4" />
  </svg>
);

const names = (stops: DayStop[]) => <span lang="en">{stops.map(s => s.name).join(' · ')}</span>;

export function DayCheck({ stops }: { stops: DayStop[] }) {
  const [day, setDay] = useState<Day | null>(null);
  const result = day ? dayCheck(stops, day) : null;
  return (
    <section aria-labelledby="jp-daycheck" className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface p-4" data-daycheck data-no-print>
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-indigo-tint text-indigo"><CalendarIcon /></span>
      <div>
        <h2 id="jp-daycheck" className="font-semibold"><T k="daycheck.title" /></h2>
        <p className="text-sm text-muted"><T k="daycheck.sub" /></p>
      </div>
      <div role="group" aria-labelledby="jp-daycheck" className="inline-flex flex-wrap rounded-lg border border-line bg-surface-2 p-1">
        {DAYS.map(d => {
          const closes = stops.some(s => s.closedDays.known && s.closedDays.days.includes(d));
          return (
            <button key={d} type="button" aria-pressed={day === d} onClick={() => setDay(day === d ? null : d)} data-day={d}
              className="inline-flex min-h-tap min-w-12 flex-col items-center justify-center rounded-md px-2 text-sm font-semibold aria-pressed:bg-surface aria-pressed:ring-2 aria-pressed:ring-ink">
              <span aria-hidden="true"><T k={`dayShort.${d}`} /></span>
              <span className="sr-only"><T k={`day.${d}`} /></span>
              {closes ? <span className="text-[11px] font-semibold text-gold"><T k="visit.closed" /></span> : null}
            </button>
          );
        })}
      </div>
      <div role="status" aria-live="polite" className="min-w-[16rem] flex-1 text-sm" data-daycheck-result>
        {result ? (
          <div className="space-y-1 rounded-md bg-gold-tint p-3">
            {result.closed.length
              ? <p><strong><T k="daycheck.closed" vars={{ day: dual(`day.${day!}`) }} /></strong> {names(result.closed)}</p>
              : <p><T k="daycheck.allOpen" vars={{ day: dual(`day.${day!}`) }} /></p>}
            {result.unknown.length ? <p><T k="daycheck.unknown" /> {names(result.unknown)}</p> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/** No site stop has reviewed closing days: one line, no picker (FR-41). */
export function DayNote() {
  return (
    <p className="flex items-center gap-3 rounded-lg border border-line bg-surface p-4 text-sm" data-daycheck-none>
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-indigo-tint text-indigo"><CalendarIcon /></span>
      <T k="daycheck.none" />
    </p>
  );
}
