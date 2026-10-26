// The rough budget (roadmap task 9.6, spec 09 FR-34 to FR-38, D16). Rows come from costs.csv columns via the
// build (docs/DATA_CONTRACT.md): an amount only when above 0 ("~" for an estimate), "No ticket reported" for an
// entry fee of 0, "Not estimated yet" otherwise. The closing line gives what is known per person and names what
// it leaves out; there is never a total, and no fare the data has no row for (no return fare, no fare between stops).

import { Both, Prose, T } from '@/components/T';
import { both, formatDate, formatMoney } from '@/lib/format';
import type { Dual } from '@/lib/i18n';
import { budgetLine, rowValue } from '@/lib/trips';
import type { BudgetRow, Itinerary } from '@/lib/types';

const money = (amount: number, approx: boolean): Dual => {
  const m = both(formatMoney, amount);
  return approx ? { en: `~${m.en}`, bn: `~${m.bn}` } : m;
};

function Value({ row }: { row: BudgetRow }) {
  const v = rowValue(row);
  if (v.kind === 'amount') {
    return (
      <span className="font-semibold" data-amount={v.amount}>
        <Both value={money(v.amount, v.estimate)} />
        {row.unit && row.unit !== 'per_person' ? <span className="font-normal text-muted"> <T k={`unit.${row.unit}`} /></span> : null}
        {row.basis ? <span className="font-normal text-muted"> · <T k={`basis.${row.basis as 'shared' | 'reserved'}`} /></span> : null}
      </span>
    );
  }
  if (v.kind === 'noTicket') return <span data-no-ticket><T k="visit.noTicket" /></span>;
  if (v.kind === 'notApplicable') return <span className="text-muted"><T k="budget.notApplicable" /></span>;
  return <em className="text-muted" data-not-estimated><T k="budget.notYet" /></em>;
}

/** "13 October 2026" or "13 October 2026 to 15 October 2026". */
export function DateSpan({ span, one, range }: { span: { from: string; to: string }; one: 'budget.estimates' | 'trip.costsChecked'; range: 'budget.estimatesRange' | 'trip.costsRange' }) {
  return span.from === span.to
    ? <T k={one} vars={{ date: both(formatDate, span.from) }} />
    : <T k={range} vars={{ from: both(formatDate, span.from), to: both(formatDate, span.to) }} />;
}

export function Budget({ trip, correctionHref }: { trip: Itinerary; correctionHref: string }) {
  const line = budgetLine(trip.budget);
  return (
    <div className="space-y-3" data-budget>
      <table className="w-full border-collapse text-left">
        <thead className="sr-only">
          <tr><th scope="col"><T k="budget.item" /></th><th scope="col"><T k="budget.amount" /></th></tr>
        </thead>
        <tbody>
          {trip.budget.rows.map((r, k) => (
            <tr key={k} className="border-b border-line align-top print:break-inside-avoid" data-budget-row={r.category}>
              <th scope="row" className="py-2 pr-4 font-normal">
                <Prose en={r.item} bn={r.itemBn} />
                {r.note ? (
                  <details className="text-sm text-muted print:hidden">
                    <summary className="min-h-[24px] cursor-pointer underline"><T k="budget.details" /></summary>
                    <Prose en={r.note} bn={r.noteBn} />
                  </details>
                ) : null}
              </th>
              <td className="py-2 text-right"><Value row={r} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-ink align-top" data-budget-line>
            <th scope="row" className="py-2 pr-4 text-left font-semibold">{line.known !== undefined ? <T k="budget.known" /> : <T k="budget.noneKnown" />}</th>
            <td className="py-2 text-right">
              {line.known !== undefined ? <strong data-known={line.known}><T k="budget.knownValue" vars={{ amount: both(formatMoney, line.known) }} /></strong> : null}
              {line.omitted.length ? (
                <span className="block text-sm text-muted" data-omitted={line.omitted.length}>
                  <T k="budget.notCounted" /> {line.omitted.map((o, k) => <span key={k}>{k ? ' · ' : ''}<Prose en={o} bn={trip.budget.omittedBn?.[k]} /></span>)}
                </span>
              ) : null}
            </td>
          </tr>
        </tfoot>
      </table>
      {trip.costsEstimated ? <p className="text-sm text-muted"><DateSpan span={trip.costsEstimated} one="budget.estimates" range="budget.estimatesRange" /></p> : null}
      <p data-no-print><a href={correctionHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline"><T k="budget.tellUs" /><span className="sr-only"> <T k="common.newTab" /></span></a></p>
    </div>
  );
}
