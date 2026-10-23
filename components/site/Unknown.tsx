// A Maybe value (roadmap task 5.2, spec 05 FR-16): the value when known, otherwise the contract's text in a
// muted italic. Never an empty string, a 0 or "Free". Data text is English prose (O6); the bare
// "Not documented" is an interface string and follows the language.

import { Latin, T } from '@/components/T';
import type { Maybe } from '@/lib/types';

const UI_TEXT = { 'Not documented': 'common.notDocumented', 'No ticket reported': 'visit.noTicket' } as const;

export function UnknownText({ text }: { text: string }) {
  const k = UI_TEXT[text as keyof typeof UI_TEXT];
  return <em className="text-muted">{k ? <T k={k} /> : <Latin>{text}</Latin>}</em>;
}

export function Unknown<V extends string | number>({ value, render }: { value: Maybe<V>; render?: (v: V) => React.ReactNode }) {
  if (!value.known) return <UnknownText text={value.text} />;
  return (
    <>
      {render ? render(value.value) : <Latin>{String(value.value)}</Latin>}
      {value.note ? <span className="block text-sm text-muted"><Latin>{value.note}</Latin></span> : null}
    </>
  );
}
