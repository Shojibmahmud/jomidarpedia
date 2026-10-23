// Footnote markers: each claim points only to its own sources (R3), as links to the numbered list.

import { T } from '@/components/T';
import { both, formatCount } from '@/lib/format';
import type { SourceRef } from '@/lib/types';

export const sourceAnchor = (n: number) => `source-${n}`;

export function Footnotes({ refs }: { refs?: SourceRef[] }) {
  if (!refs?.length) return null;
  return (
    <sup className="ml-0.5 space-x-0.5" lang="en">
      {refs.map(r => (
        <a key={r.n} href={`#${sourceAnchor(r.n)}`} className="text-primary underline">
          <span aria-hidden="true">{r.n}</span><span className="sr-only"><T k="footnote.label" vars={{ n: both(formatCount, r.n) }} /></span>
        </a>
      ))}
    </sup>
  );
}
