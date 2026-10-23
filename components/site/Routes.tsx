// "Getting there from Dhaka" (roadmap task 5.12, spec 05 FR-28 to FR-31): the primary route's steps, the
// alternatives as disclosures, and every cost with its basis and date. Unknown and mixed modes get neutral
// icons; an unknown mode is never drawn as a bus.

import { Both, Latin, T } from '@/components/T';
import { both, formatDate, formatHours, formatMoney } from '@/lib/format';
import type { Mode, Route, SiteRecord } from '@/lib/types';
import { SuggestCorrection } from './SuggestCorrection';

const GLYPH: Record<Mode, React.ReactNode> = {
  bus: <><rect x={5} y={4} width={14} height={13} rx={2} /><path d="M5 11h14M8 20v-3M16 20v-3" /></>,
  train: <><rect x={6} y={3} width={12} height={14} rx={3} /><path d="M6 10h12M8 21l2-4M16 21l-2-4" /></>,
  launch: <><path d="M3 15h18l-3 5H6zM7 15V9h8l3 6M10 9V5" /></>,
  ferry: <><path d="M3 14h18l-2 5H5zM6 14v-4h12v4M9 10V7h6v3" /></>,
  car: <><path d="M4 16v-4l2-5h12l2 5v4zM4 16v3M20 16v3" /><circle cx={8} cy={13} r={1} /><circle cx={16} cy={13} r={1} /></>,
  air: <><path d="M3 13l18-6-6 13-3-6z" /></>,
  boat: <><path d="M3 15c3 4 15 4 18 0zM12 15V4l6 8h-6" /></>,
  unknown: <><circle cx={12} cy={12} r={8} /><path d="M10 10a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2M12 16v.5" /></>,
  mixed: <><circle cx={7} cy={12} r={2.5} /><circle cx={17} cy={12} r={2.5} /><path d="M9.5 12h5" /></>,
};

export function ModeIcon({ mode }: { mode: Mode }) {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false" data-mode={mode}
      fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{GLYPH[mode]}</svg>
  );
}

function ModeLabel({ route }: { route: Route }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold">
      <ModeIcon mode={route.mode} /><T k={`mode.${route.mode}`} />
      {route.inferred ? <span className="text-xs font-normal text-muted">(<T k="route.inferred" />)</span> : null}
    </span>
  );
}

function Summary({ route }: { route: Route }) {
  return (
    <p className="text-sm">
      {route.hours !== undefined ? <T k="route.about" vars={{ hours: both(formatHours, route.hours) }} /> : <em className="text-muted"><T k="route.timeUnknown" /></em>}
      {' · '}
      {route.cost ? <T k="route.cost" vars={{ amount: both(formatMoney, route.cost) }} /> : <em className="text-muted"><T k="route.costUnknown" /></em>}
    </p>
  );
}

export function RouteSteps({ route }: { route: Route }) {
  return (
    <ol className="space-y-3" data-route-steps>
      {route.steps.map((s, k) => (
        <li key={k} className="flex gap-3">
          <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface text-sm font-semibold">{k + 1}</span>
          <span>
            <Latin>{s.label}</Latin>
            {s.note ? <span className="block text-sm text-muted"><Latin>{s.note}</Latin></span> : null}
            {s.costText ? <span className="block text-sm text-muted"><Latin>{s.costText}</Latin></span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function RouteAccordion({ routes }: { routes: Route[] }) {
  if (!routes.length) return null;
  return (
    <div className="space-y-2">
      <h3 className="font-semibold"><T k="route.others" /></h3>
      {routes.map((r, k) => (
        <details key={k} className="rounded-md border border-line bg-surface">
          <summary className="flex min-h-tap cursor-pointer items-center px-4"><ModeLabel route={r} /></summary>
          <div className="space-y-2 border-t border-line px-4 py-3">
            <p><Latin>{r.description}</Latin></p>
            <Summary route={r} />
          </div>
        </details>
      ))}
    </div>
  );
}

/** Every route cost with its unit (per person, one way), basis and date, or "undated". */
export function CostTable({ routes }: { routes: Route[] }) {
  const priced = routes.filter(r => r.cost);
  if (!priced.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" data-cost-table>
        <caption className="mb-2 text-left font-semibold"><T k="cost.title" /></caption>
        <thead><tr className="border-b border-line">
          <th scope="col" className="py-2 pr-3"><T k="cost.route" /></th>
          <th scope="col" className="py-2 pr-3"><T k="cost.amount" /></th>
          <th scope="col" className="py-2 pr-3"><T k="cost.basis" /></th>
          <th scope="col" className="py-2"><T k="cost.date" /></th>
        </tr></thead>
        <tbody>
          {priced.map((r, k) => (
            <tr key={k} className="border-b border-line align-top">
              <td className="py-2 pr-3"><T k={`mode.${r.mode}`} /></td>
              <td className="py-2 pr-3"><Both value={both(formatMoney, r.cost!)} /></td>
              <td className="py-2 pr-3">{r.costBasis ? <Latin>{r.costBasis}</Latin> : <em className="text-muted"><T k="cost.basisUnknown" /></em>}</td>
              <td className="py-2" data-cost-date>{r.estimateDate ? <Both value={both(formatDate, r.estimateDate)} /> : <T k="route.undated" />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GettingThere({ site, pageUrl }: { site: SiteRecord; pageUrl: string }) {
  const routes = site.travel.routes;
  if (!routes.length) {
    return (
      <p className="rounded-lg border border-line bg-surface p-4">
        <em className="text-muted"><T k="route.none" /></em> <SuggestCorrection siteId={site.id} pageUrl={pageUrl} field="getting-there" k="route.suggest" />
      </p>
    );
  }
  const [primary, ...others] = routes;
  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-lg border border-line bg-surface p-5">
        <ModeLabel route={primary} />
        <RouteSteps route={primary} />
        <Summary route={primary} />
        <p className="text-xs text-muted">
          {primary.estimateDate ? <T k="route.made" vars={{ date: both(formatDate, primary.estimateDate) }} /> : <T k="route.undated" />}
        </p>
      </div>
      <RouteAccordion routes={others} />
      <CostTable routes={routes} />
    </div>
  );
}
