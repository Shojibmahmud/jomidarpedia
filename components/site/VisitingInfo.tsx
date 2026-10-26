// "Visiting" (roadmap task 5.11, spec 05 FR-26, FR-27): per-field values through Unknown, closing days from
// the reviewed column only, the fee only as a real price (R6), and a notice for private houses (A-1).

import { Prose, T } from '@/components/T';
import type { StringKey } from '@/lib/i18n';
import { both, formatMoney } from '@/lib/format';
import type { SiteRecord } from '@/lib/types';
import { LastChecked } from './LastChecked';
import { Unknown, UnknownText } from './Unknown';

function Row({ k, children }: { k: StringKey; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-line py-3 sm:grid-cols-[10rem_1fr]">
      <dt className="font-semibold"><T k={k} /></dt>
      <dd>{children}</dd>
    </div>
  );
}

export function VisitingInfo({ site }: { site: SiteRecord }) {
  const v = site.visiting;
  const cd = v.closedDays;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted"><LastChecked date={v.date} /></p>
      {site.access === 'restricted_or_permission' ? (
        <div className="rounded-lg border border-line-strong bg-surface-2 p-4" data-private-notice>
          <p className="font-semibold"><T k="visit.privateTitle" /></p>
          <p className="text-sm"><T k="visit.privateBody" /></p>
        </div>
      ) : null}
      <dl>
        <Row k="visit.hours">
          <Unknown value={v.hours} />
          {v.hoursNote ? <span className="block text-sm text-muted"><Prose en={v.hoursNote} bn={v.hoursNoteBn} /></span> : null}
        </Row>
        <Row k="visit.closed">
          {cd.known
            ? cd.days.length ? <span>{cd.days.map((d, k) => <span key={d}>{k ? ', ' : ''}<T k={`day.${d}`} /></span>)}</span> : <T k="closed.none" />
            : <em className="text-muted"><T k="closed.unknown" /></em>}
          {v.closed.known ? <span className="block text-sm text-muted"><T k="closed.asWritten" /> <Prose en={v.closed.value} bn={v.closed.bn} /></span> : null}
        </Row>
        <Row k="visit.entry">
          <span data-fee>
            {v.fee.known
              ? <T k="visit.perPerson" vars={{ amount: both(formatMoney, v.fee.value) }} />
              : site.access === 'open_no_ticket_reported' ? <em className="text-muted"><T k="visit.noTicket" /></em> : <UnknownText text={v.fee.text} bn={v.fee.textBn} />}
          </span>
          {v.fee.known && v.feeNote ? <span className="block text-sm text-muted"><Prose en={v.feeNote} bn={v.feeNoteBn} /></span> : null}
        </Row>
        <Row k="visit.restrictions"><Unknown value={v.restrictions} /></Row>
        <Row k="visit.photography"><Unknown value={v.photography} /></Row>
        <Row k="visit.facilities"><Unknown value={v.facilities} /></Row>
        <Row k="visit.accessibility"><Unknown value={v.accessibility} /></Row>
        <Row k="visit.bestTime"><Unknown value={v.bestTime} /></Row>
      </dl>
    </div>
  );
}

