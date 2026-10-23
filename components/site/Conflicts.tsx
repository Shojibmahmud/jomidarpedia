// Disagreements and open questions (roadmap task 5.9, spec 05 FR-34 to FR-36). A version shows only its own
// sources; sources not matched to any version are listed apart (R3). A one-version conflict is an open
// question, never counted as a disagreement.

import { Latin, T } from '@/components/T';
import type { Conflict } from '@/lib/types';
import { Footnotes } from './Footnotes';

export function ConflictNote({ conflict, id }: { conflict: Conflict; id: string }) {
  const none = !conflict.unattributedSources?.length && conflict.versions.every(v => !v.sources.length);
  return (
    <div id={id} className="rounded-lg border border-gold/40 bg-gold-tint p-4 text-sm" data-conflict>
      <p className="font-semibold text-gold"><T k="conflict.title" />: <Latin>{conflict.field}</Latin></p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {conflict.versions.map((v, k) => <li key={k}><Latin>{v.text}</Latin><Footnotes refs={v.sources} /></li>)}
      </ul>
      {conflict.unattributedSources?.length ? (
        <p className="mt-2 text-muted"><T k="conflict.unmatched" />: <Footnotes refs={conflict.unattributedSources} /></p>
      ) : null}
      {none ? <p className="mt-2 text-muted"><T k="conflict.noSource" /></p> : null}
    </div>
  );
}

export function OpenQuestion({ conflict }: { conflict: Conflict }) {
  const v = conflict.versions[0];
  return (
    <div className="rounded-lg border border-gold/40 bg-gold-tint p-4 text-sm" data-open-question>
      <p className="font-semibold text-gold"><T k="question.title" />: <Latin>{conflict.field}</Latin></p>
      <p className="mt-1"><Latin>{v.text}</Latin><Footnotes refs={v.sources} /></p>
      {conflict.unattributedSources?.length ? <p className="mt-1 text-muted"><T k="sources.list" />: <Footnotes refs={conflict.unattributedSources} /></p> : null}
    </div>
  );
}
