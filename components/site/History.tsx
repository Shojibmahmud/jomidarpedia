// "History and owners" (roadmap task 5.7) and "Stories told about this place" (5.8), spec 05 FR-22 to FR-24.
// Legends are a separate section after the timeline, never inside it (R3), each with its attribution.

import { Latin, Prose, T } from '@/components/T';
import type { SiteRecord } from '@/lib/types';
import { FactValue } from './AtAGlance';
import { Footnotes } from './Footnotes';
import { SuggestCorrection } from './SuggestCorrection';

// The build's wording for a legend with no named source (scripts/build-data.mjs): an interface string.
const NOT_ATTRIBUTED = 'Not attributed to a named source';
const STATUS = { as_reported: 'history.as_reported', needs_verification: 'history.needs_verification' } as const;

export function HistoryTimeline({ site, pageUrl }: { site: SiteRecord; pageUrl: string }) {
  const founder = site.founder.known ? (
    <p><span className="font-semibold"><T k="history.founder" />:</span> <FactValue fact={site.founder} /></p>
  ) : null;
  if (!site.history.length) {
    return (
      <div className="space-y-3" data-history-empty>
        <div className="rounded-lg border border-line bg-surface p-5">
          <p className="font-serif text-h3"><T k="history.empty" /></p>
          <p className="mt-1 text-sm"><T k="history.emptyBody" /></p>
          {founder ? <div className="mt-2 text-sm">{founder}</div> : null}
          <div className="mt-3"><SuggestCorrection siteId={site.id} pageUrl={pageUrl} field="history" k="history.share" /></div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {founder}
      <ol className="relative space-y-5 border-l-2 border-line pl-6" data-timeline>
        {site.history.map((e, k) => (
          <li key={k} className="relative">
            <span aria-hidden="true" className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-surface" />
            <p className="font-serif text-lg font-semibold">{e.year ? <Prose en={e.year} bn={e.yearBn} /> : <em className="text-muted"><T k="history.dateUnknown" /></em>}</p>
            <p><Prose en={e.text} bn={e.textBn} /><Footnotes refs={e.sources} /></p>
            {e.status in STATUS ? <p className="text-xs text-muted"><T k={STATUS[e.status as keyof typeof STATUS]} /></p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function LegendBox({ site, pageUrl }: { site: SiteRecord; pageUrl: string }) {
  if (!site.legends.length) {
    return (
      <p className="rounded-lg border border-line bg-surface p-4 text-sm" data-legends>
        <T k="legend.none" /> <SuggestCorrection siteId={site.id} pageUrl={pageUrl} field="stories" k="legend.tell" />
      </p>
    );
  }
  return (
    <div className="space-y-3 rounded-lg border border-indigo/30 bg-indigo-tint p-5" data-legends>
      <p className="text-sm font-semibold text-indigo"><T k="legend.notVerified" /></p>
      <ul className="space-y-3">
        {site.legends.map((l, k) => (
          <li key={k} className="rounded-md border border-line bg-surface p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted"><T k={`legend.${l.evidence}`} /></p>
            <p><Prose en={l.text} bn={l.textBn} /></p>
            <p className="mt-2 text-sm text-muted">
              {l.attribution === NOT_ATTRIBUTED ? <T k="legend.notAttributed" /> : <Latin>{l.attribution}</Latin>}
              {l.sources.length ? <> · <T k="legend.reportedBy" /> <Footnotes refs={l.sources} /></> : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
