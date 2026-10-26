// A Maybe value (roadmap task 5.2, spec 05 FR-16): the value when known, otherwise the contract's text in a
// muted italic. Never an empty string, a 0 or "Free". Data text follows the language where it has a valid
// Bangla translation (spec 14); the bare "Not documented" is an interface string and always does.

import { Prose, T } from '@/components/T';
import type { Maybe } from '@/lib/types';

const UI_TEXT = { 'Not documented': 'common.notDocumented', 'No ticket reported': 'visit.noTicket' } as const;

export function UnknownText({ text, bn }: { text: string; bn?: string }) {
  const k = UI_TEXT[text as keyof typeof UI_TEXT];
  return <em className="text-muted">{k ? <T k={k} /> : <Prose en={text} bn={bn} />}</em>;
}

export function Unknown<V extends string | number>({ value, render }: { value: Maybe<V>; render?: (v: V) => React.ReactNode }) {
  if (!value.known) return <UnknownText text={value.text} bn={value.textBn} />;
  return (
    <>
      {render ? render(value.value) : <Prose en={String(value.value)} bn={value.bn} />}
      {value.note ? <span className="block text-sm text-muted"><Prose en={value.note} /></span> : null}
    </>
  );
}
