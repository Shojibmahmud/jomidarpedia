// "At a glance" (roadmap task 5.5, spec 05 FR-13 to FR-15) and, for sparse records, "What we know so far".
// Each fact shows only its own sources (R3); unknowns are words (Unknown).

import { Both, T } from '@/components/T';
import type { StringKey } from '@/lib/i18n';
import { both, formatHours, formatMoney } from '@/lib/format';
import { KNOWN_ITEMS, knownItems } from '@/lib/site-page';
import type { Fact, SiteRecord } from '@/lib/types';
import { Footnotes } from './Footnotes';
import { LastChecked } from './LastChecked';
import { SuggestCorrection } from './SuggestCorrection';
import { Unknown, UnknownText } from './Unknown';

function Row({ k, children, wide = false }: { k: StringKey; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted"><T k={k} /></dt>
      <dd>{children}</dd>
    </div>
  );
}

export function FactValue({ fact }: { fact: Fact }) {
  return <><Unknown value={fact} /><Footnotes refs={fact.sources} /></>;
}

export function AtAGlance({ site }: { site: SiteRecord }) {
  const { visiting: v, travel: tr } = site;
  return (
    <section aria-labelledby="glance-title" className="rounded-lg border border-line bg-surface p-5 shadow-1">
      <h2 id="glance-title" className="mb-3 font-serif text-h3"><T k="site.atAGlance" /></h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <Row k="glance.era" wide><FactValue fact={site.era} /></Row>
        <Row k="glance.founder" wide><FactValue fact={site.founder} /></Row>
        <Row k="glance.style" wide><FactValue fact={site.style} /></Row>
        <Row k="condition.label" wide>
            <T k={`condition.${site.condition}`} />
            {site.preservation.known ? <span className="block text-muted"><FactValue fact={site.preservation} /></span> : null}
        </Row>
        <Row k="glance.entry">
          {v.fee.known ? <Both value={both(formatMoney, v.fee.value)} /> : <UnknownText text={v.fee.text} bn={v.fee.textBn} />}
        </Row>
        <Row k="glance.access"><T k={`access.${site.access}`} /></Row>
        <Row k="glance.fromDhaka">
          {tr.hours !== undefined ? <Both value={both(formatHours, tr.hours)} /> : <em className="text-muted"><T k="glance.timeUnknown" /></em>}
        </Row>
        <Row k="glance.oneWay">
          {tr.oneWayCost ? <>~<Both value={both(formatMoney, tr.oneWayCost)} /></> : <em className="text-muted"><T k="common.notDocumented" /></em>}
        </Row>
        <Row k="glance.hours" wide><Unknown value={v.hours} /></Row>
        <Row k="glance.bestTime" wide><Unknown value={v.bestTime} /></Row>
      </dl>
      <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
        <LastChecked date={site.lastVerified} /> · <T k={`confidence.${site.confidence}`} />
      </p>
      {site.itineraries.length ? (
        <a href="#itineraries" className="mt-3 flex min-h-tap items-center justify-center rounded-md bg-primary px-4 font-semibold text-on-primary hover:bg-primary-hover">
          <T k={site.travel.dayTrip ? 'glance.planTrip' : 'glance.seeTrips'} />
        </a>
      ) : null}
    </section>
  );
}

const ITEM_KEY = { union: 'known.union', founder: 'known.founder', route: 'known.route', location: 'known.location', history: 'known.history', style: 'known.style', photo: 'known.photo' } as const;

/** Sparse records only: the seven basic facts, as text and icon (never colour alone). */
export function KnownChecklist({ site, pageUrl }: { site: SiteRecord; pageUrl: string }) {
  const known = knownItems(site);
  const items: [StringKey, boolean][] = [['known.exists', true], ...KNOWN_ITEMS.map(i => [ITEM_KEY[i], known[i]] as [StringKey, boolean])];
  return (
    <section id="what-we-know" aria-labelledby="known-title" className="rounded-lg border border-line bg-surface p-5 shadow-1">
      <h2 id="known-title" className="mb-3 font-serif text-h3"><T k="known.title" /></h2>
      <ul className="space-y-2 text-sm">
        {items.map(([k, yes]) => (
          <li key={k} className="flex items-center gap-2" data-known={yes}>
            <svg viewBox="0 0 20 20" width={18} height={18} aria-hidden="true" className={yes ? 'text-moss' : 'text-muted'} fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx={10} cy={10} r={8} />{yes ? <path d="M6 10.5l2.5 2.5L14 7.5" strokeLinecap="round" /> : null}
            </svg>
            <span><T k={k} /><span className="sr-only">: <T k={yes ? 'known.yes' : 'known.no'} /></span></span>
          </li>
        ))}
      </ul>
      <div className="mt-4"><SuggestCorrection siteId={site.id} pageUrl={pageUrl} field="general" k="known.help" look="button" /></div>
    </section>
  );
}
