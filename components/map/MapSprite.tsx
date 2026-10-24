// The hatch patterns of approximate pins (board 19), defined once per map so pins can share them by id
// (lib/pins.ts hatchId). Hidden and decorative.

import { CONDITION_COLOR, hatchId } from '@/lib/pins';
import type { Condition } from '@/lib/types';

export function MapSprite() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
      <defs>
        {(Object.keys(CONDITION_COLOR) as Condition[]).map(c => (
          <pattern key={c} id={hatchId(c)} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="rgb(var(--surface))" />
            <rect width="2.2" height="5" fill={`rgb(var(--${CONDITION_COLOR[c]}))`} />
          </pattern>
        ))}
      </defs>
    </svg>
  );
}
