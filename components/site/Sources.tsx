// "Sources and open questions" (roadmap task 5.15, spec 05 FR-36 to FR-38): the numbered sources that the
// footnotes link to, the list of disagreements, the open questions and "Still to confirm".

import { Latin, T } from '@/components/T';
import type { SiteRecord, Conflict } from '@/lib/types';
import { OpenQuestion } from './Conflicts';
import { sourceAnchor } from './Footnotes';
import { SuggestCorrection } from './SuggestCorrection';

export function SourceList({ site }: { site: SiteRecord }) {
  if (!site.sources.length) return <p className="italic text-muted"><T k="sources.none" /></p>;
  return (
    <ol className="space-y-2 text-sm [overflow-wrap:anywhere]">
      {site.sources.map(s => (
        <li key={s.n} id={sourceAnchor(s.n)} className="flex gap-2 scroll-mt-24" lang="en">
          <span className="w-6 shrink-0 text-right font-semibold">{s.n}.</span>
          <span>
            {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">“{s.title}”</a> : <>“{s.title}”</>}
            {s.publisher ? <>, <em>{s.publisher}</em></> : null}
            {s.date ? <>, {s.date}</> : null}
            <span className="ml-1 font-mono text-xs text-muted">{s.id}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function DisagreementIndex({ items }: { items: { conflict: Conflict; anchor: string }[] }) {
  if (!items.length) return null;
  return (
    <div id="where-sources-disagree" className="rounded-lg border border-gold/40 bg-gold-tint p-4 text-sm">
      <p className="font-semibold text-gold"><T k="conflict.summary" /></p>
      <ul className="mt-1 list-disc pl-5">
        {items.map(({ conflict, anchor }) => <li key={anchor}><a href={`#${anchor}`} className="underline"><Latin>{conflict.field}</Latin></a></li>)}
      </ul>
    </div>
  );
}

export function OpenQuestions({ questions }: { questions: Conflict[] }) {
  if (!questions.length) return null;
  return <div id="open-questions" className="space-y-3">{questions.map((q, k) => <OpenQuestion key={k} conflict={q} />)}</div>;
}

export function StillToConfirm({ site, pageUrl }: { site: SiteRecord; pageUrl: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 text-sm" data-still-to-confirm>
      <p className="font-semibold"><T k="stc.title" /></p>
      {site.stillToConfirm.length
        ? <p className="mt-1"><Latin>{site.stillToConfirm.join(' · ')}</Latin></p>
        : <p className="mt-1 italic text-muted"><T k="stc.none" /></p>}
      <div className="mt-2"><SuggestCorrection siteId={site.id} pageUrl={pageUrl} field="sources" /></div>
    </div>
  );
}
