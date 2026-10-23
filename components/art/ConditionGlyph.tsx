// The five condition glyphs from the "Design system · components" board (roadmap task 3.8):
// preserved = check, now in other use = arch, in ruins = crack, lost = cross, unknown = question mark.
// Drawn in currentColor on a 24 px grid; decorative, because the badge or pin beside it names the condition.

import type { Condition } from '@/lib/types';

const PATHS: Record<Condition, React.ReactNode> = {
  preserved: <path d="M6.5 12.5 10.5 16.5 17.5 8" />,
  preserved_adaptive_reuse: <path d="M8 18V11a4 4 0 0 1 8 0v7" />,
  in_ruins: <path d="M6 16.5 10 12l2.5 2.5L18 8.5M14.5 8.5H18V12" />,
  lost: <path d="M7.5 7.5l9 9M16.5 7.5l-9 9" />,
  unknown: <><path d="M9.2 9.3a2.9 2.9 0 1 1 4.2 2.6c-.9.5-1.4 1.1-1.4 2.1v.5" /><circle cx="12" cy="17.6" r="0.6" fill="currentColor" /></>,
};

export const CONDITIONS = Object.keys(PATHS) as Condition[];

export function ConditionGlyph({ condition, size = 16, className = '' }: { condition: Condition; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" className={className}
      fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[condition]}
    </svg>
  );
}
