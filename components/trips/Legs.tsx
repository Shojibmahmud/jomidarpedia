// The leg legend under the trip map (spec 09 FR-29; spec 12 FR-17): one line per leg from itinerary_legs.csv,
// with its mode's icon and label and the stops it joins. Shown only when the trip has legs; a leg is listed even
// when a stop has no pin and so no line is drawn.

import { Both, Latin, T } from '@/components/T';
import { ModeIcon } from '@/components/site/Routes';
import { both, formatCount } from '@/lib/format';
import type { Itinerary } from '@/lib/types';

export function Legs({ trip }: { trip: Itinerary }) {
  if (!trip.legs.length) return null;
  const name = (order: number) => trip.stops.find(s => s.order === order)?.name ?? '';
  return (
    <div className="space-y-1" data-legs>
      <h3 className="text-sm font-semibold"><T k="trip.legs" /></h3>
      <ul className="space-y-1 text-sm">
        {trip.legs.map(l => (
          <li key={`${l.from}-${l.to}`} className="flex items-center gap-2" data-leg={l.mode}>
            <ModeIcon mode={l.mode} />
            <span className="font-semibold"><T k={`mode.${l.mode}`} /></span>
            <span className="text-muted">
              <Both value={both(formatCount, l.from)} /> <Latin>{name(l.from)}</Latin> → <Both value={both(formatCount, l.to)} /> <Latin>{name(l.to)}</Latin>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
