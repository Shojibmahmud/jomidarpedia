// Disagreements and open questions (roadmap task 5.9, spec 05 FR-34 to FR-36). A version shows only its own
// sources; sources not matched to any version are listed apart (R3). A one-version conflict is an open
// question, never counted as a disagreement.

import { Prose, T } from '@/components/T';
import type { Conflict } from '@/lib/types';
import { Footnotes } from './Footnotes';

/** The field a conflict is about. A claim that names none is a "Record" one (scripts/build-data.mjs). */
export function ConflictField({ conflict }: { conflict: Conflict }) {
  return <Prose en={conflict.field} bn={conflict.fieldBn ?? (conflict.field === 'Record' ? 'তথ্য' : undefined)} />;
}

export function ConflictNote({ conflict, id }: { conflict: Conflict; id: string }) {
  const none = !conflict.unattributedSources?.length && conflict.versions.every(v => !v.sources.length);
  return (
    <div id={id} className="rounded-lg border border-gold/40 bg-gold-tint p-4 text-sm" data-conflict>
      <p className="font-semibold text-gold"><T k="conflict.title" />: <ConflictField conflict={conflict} /></p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {conflict.versions.map((v, k) => <li key={k}><Prose en={v.text} bn={v.textBn} /><Footnotes refs={v.sources} /></li>)}
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
      <p className="font-semibold text-gold"><T k="question.title" />: <ConflictField conflict={conflict} /></p>
      <p className="mt-1"><Prose en={v.text} bn={v.textBn} /><Footnotes refs={v.sources} /></p>
      {conflict.unattributedSources?.length ? <p className="mt-1 text-muted"><T k="sources.list" />: <Footnotes refs={conflict.unattributedSources} /></p> : null}
    </div>
  );
}
