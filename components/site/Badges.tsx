// The site page's badges (roadmap task 5.1, spec 05 FR-8 to FR-11). Each one says its state in words in
// both languages; colour and glyph only repeat it. Unknowns stay words: no fee is a price unless known (R6),
// and an unstated day trip is never shown as "no".

import { Both, T } from '@/components/T';
import { ConditionGlyph } from '@/components/art/ConditionGlyph';
import { dual, type StringKey } from '@/lib/i18n';
import { both, formatHours, formatMoney } from '@/lib/format';
import type { Access, Condition, LocationStatus } from '@/lib/types';

const TONE = {
  moss: 'bg-moss-tint text-moss-ink',
  teal: 'bg-teal-tint text-teal-ink',
  indigo: 'bg-indigo-tint text-indigo',
  gold: 'bg-gold-tint text-gold',
  lost: 'bg-lost-tint text-lost',
  plain: 'bg-surface-2 text-ink',
} as const;
type Tone = keyof typeof TONE;

export function Badge({ tone = 'plain', children, outlined = false }: { tone?: Tone; children: React.ReactNode; outlined?: boolean }) {
  return <span className={`badge ${TONE[tone]} ${outlined ? 'border border-dashed border-current' : ''}`}>{children}</span>;
}

const CONDITION_TONE: Record<Condition, Tone> = { preserved: 'moss', preserved_adaptive_reuse: 'teal', in_ruins: 'gold', lost: 'lost', unknown: 'plain' };

export function ConditionBadge({ condition }: { condition: Condition }) {
  return (
    <Badge tone={CONDITION_TONE[condition]}>
      <ConditionGlyph condition={condition} size={14} />
      <T k={`condition.${condition}`} />
    </Badge>
  );
}

/** Access, with the fee only when it is a known price above 0. */
export function AccessBadge({ access, fee }: { access: Access; fee?: number }) {
  const label = dual(`access.${access}`);
  const value = fee && fee > 0 ? { en: `${label.en} · ${formatMoney(fee, 'en')}`, bn: `${label.bn} · ${formatMoney(fee, 'bn')}` } : label;
  return <Badge tone={access === 'ticketed' ? 'indigo' : access === 'restricted_or_permission' ? 'gold' : 'plain'}><Both value={value} /></Badge>;
}

export function DayTripBadge({ dayTrip, hours }: { dayTrip?: boolean; hours?: number }) {
  const k: StringKey = dayTrip === true ? 'daytrip.yes' : dayTrip === false ? 'daytrip.no' : 'daytrip.unknown';
  return (
    <Badge tone={dayTrip ? 'indigo' : 'plain'}>
      {hours !== undefined ? <T k="daytrip.withHours" vars={{ label: dual(k), hours: both(formatHours, hours) }} /> : <T k={k} />}
    </Badge>
  );
}

/** Verified, single source, approximate, unverified (O9: outlined with "?") and no pin. */
export function LocationBadge({ status, mappable, flagged }: { status: LocationStatus; mappable: boolean; flagged: boolean }) {
  if (!mappable) return <Badge tone="plain"><PinOffIcon /><T k="location.noPin" /></Badge>;
  const k = status === 'not_found' ? 'location.unverified' : (`location.${status}` as const);
  const unverified = status === 'unverified' || status === 'not_found';
  return (
    <Badge tone={status === 'verified' ? 'moss' : unverified ? 'gold' : 'plain'} outlined={unverified}>
      {flagged || unverified ? <span aria-hidden="true" className="font-bold">?</span> : <PinIcon />}
      <T k={k} />
    </Badge>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2.2}>
      <path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11Z" /><circle cx={12} cy={10} r={2.2} />
    </svg>
  );
}
function PinOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M8.5 5.5A6 6 0 0 1 18 10c0 1.6-.5 3.2-1.3 4.6M14.5 17.8C13.2 19.6 12 21 12 21s-6-5.6-6-11c0-.7.1-1.4.3-2" /><path d="M3 3l18 18" />
    </svg>
  );
}
