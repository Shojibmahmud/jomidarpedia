// /dev/bn-review/: Bangla translation coverage (spec 14 FR-22). Built in local and preview mode only (page.dev.tsx,
// next.config.mjs), never in release; noindex either way. One row per translatable column, linking to its table's page.

import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from '@/lib/data';
import type { TranslationState } from '@/lib/types';

export const metadata: Metadata = { title: 'Bangla review', robots: { index: false, follow: false } };

const STATES: TranslationState[] = ['reviewed', 'draft', 'missing', 'outdated', 'invalid'];

export default function BnReviewPage() {
  const { cells, orphans } = getTranslations();
  const byColumn = new Map<string, Record<TranslationState, number>>();
  for (const c of cells) {
    const id = `${c.table}.${c.column}`;
    if (!byColumn.has(id)) byColumn.set(id, { reviewed: 0, draft: 0, missing: 0, outdated: 0, invalid: 0, orphan: 0 });
    byColumn.get(id)![c.state]++;
  }
  const done = cells.filter(c => c.state === 'reviewed' || c.state === 'draft').length;
  return (
    <main id="main" lang="en" className="mx-auto max-w-page space-y-8 px-4 py-10 lg:px-8">
      <header className="space-y-2">
        <h1 className="font-serif text-h2">Bangla review</h1>
        <p className="text-muted">Local and preview builds only. {done} of {cells.length} cells translated; {orphans.length} orphan rows.
          To approve rows, set <code>status</code> to <code>reviewed</code> in <code>data/translations/bn/&lt;table&gt;.csv</code>, or run <code>npm run bn -- approve &lt;table&gt;</code>.</p>
      </header>
      <table className="w-full border-collapse text-left text-sm" data-coverage>
        <thead><tr className="border-b-2 border-ink">
          <th scope="col" className="py-2 pr-3">Column</th>
          {STATES.map(s => <th key={s} scope="col" className="py-2 pr-3 text-right">{s}</th>)}
          <th scope="col" className="py-2 text-right">translated</th>
        </tr></thead>
        <tbody>
          {[...byColumn].sort(([a], [b]) => a.localeCompare(b)).map(([id, t]) => {
            const total = STATES.reduce((n, s) => n + t[s], 0);
            return (
              <tr key={id} className="border-b border-line" data-coverage-row={id}>
                <th scope="row" className="py-2 pr-3 font-normal">
                  <Link prefetch={false} href={`/dev/bn-review/${id.split('.')[0]}/`} className="font-mono text-primary underline">{id}</Link>
                </th>
                {STATES.map(s => <td key={s} className="py-2 pr-3 text-right tabular-nums">{t[s]}</td>)}
                <td className="py-2 text-right tabular-nums">{Math.round(((t.reviewed + t.draft) / total) * 100)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
