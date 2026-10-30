// "Architecture and grounds" features (roadmap task 5.10, spec 05 FR-25): from features.csv only, or
// "Not documented in the sources checked".

import { Latin, T } from '@/components/T';
import { bnProseDigits } from '@/lib/format';
import type { Feature } from '@/lib/types';
import { Footnotes } from './Footnotes';

export function FeatureList({ features }: { features: Feature[] }) {
  if (!features.length) return <p className="text-sm italic text-muted" data-features-empty><T k="features.none" /></p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {features.map((f, k) => (
        <li key={k} className="rounded-md border border-line bg-surface p-4">
          <p className="font-semibold"><Latin>{f.text}</Latin>{f.textBn ? <span lang="bn" className="block font-bn font-normal text-muted">{bnProseDigits(f.textBn)}</span> : null}</p>
          {f.measurement ? <p className="text-sm"><Latin>{[f.measurement, f.unit].filter(Boolean).join(' ')}</Latin></p> : null}
          <p className="text-xs text-muted"><Latin>{f.status}</Latin><Footnotes refs={f.sources} /></p>
        </li>
      ))}
    </ul>
  );
}
