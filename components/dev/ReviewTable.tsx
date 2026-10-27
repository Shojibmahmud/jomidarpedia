'use client';
// The rows of one table on /dev/bn-review/ (spec 14 FR-22): English and Bangla side by side, filtered by column
// and state. Read-only: approvals are made in data/translations/bn/<table>.csv (A-7).

import { useMemo, useState } from 'react';
import type { TranslationState } from '@/lib/types';

export interface ReviewRow { key: string; column: string; en: string; bn?: string; state: TranslationState; reason?: string; href?: string }

const STATES: TranslationState[] = ['draft', 'reviewed', 'outdated', 'invalid', 'missing', 'orphan'];
const TONE: Record<TranslationState, string> = {
  draft: 'bg-gold-tint text-gold', reviewed: 'bg-moss-tint text-moss', outdated: 'bg-surface-2 text-primary',
  invalid: 'bg-surface-2 text-primary', missing: 'bg-surface-2 text-muted', orphan: 'bg-surface-2 text-muted',
};
/** The first page of rows; "Show more" adds the rest a page at a time, so a 2,000-row table stays usable. */
const PAGE = 200;

export function ReviewTable({ rows, columns }: { rows: ReviewRow[]; columns: string[] }) {
  const [column, setColumn] = useState('');
  const [state, setState] = useState<TranslationState | ''>('draft');
  const [shown, setShown] = useState(PAGE);
  const visible = useMemo(() => rows.filter(r => (!column || r.column === column) && (!state || r.state === state)), [rows, column, state]);
  const select = 'min-h-tap rounded-md border border-line-strong bg-surface px-3';
  return (
    <div className="space-y-4" lang="en">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm font-semibold">Column
          <select className={select} value={column} onChange={e => { setColumn(e.target.value); setShown(PAGE); }}>
            <option value="">All columns</option>
            {columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">State
          <select className={select} value={state} onChange={e => { setState(e.target.value as TranslationState | ''); setShown(PAGE); }}>
            <option value="">All states</option>
            {STATES.map(s => <option key={s} value={s}>{s} ({rows.filter(r => r.state === s && (!column || r.column === column)).length})</option>)}
          </select>
        </label>
        <p className="text-sm text-muted" aria-live="polite">{visible.length} rows</p>
      </div>
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <thead><tr className="border-b-2 border-ink">
          <th scope="col" className="w-48 py-2 pr-3">Row</th>
          <th scope="col" className="py-2 pr-3">English</th>
          <th scope="col" className="py-2">Bangla</th>
        </tr></thead>
        <tbody>
          {visible.slice(0, shown).map(r => (
            <tr key={`${r.key}/${r.column}`} className="border-b border-line align-top" data-review-row={r.state}>
              <td className="py-2 pr-3 [overflow-wrap:anywhere]">
                <span className="block font-mono text-xs">{r.key}</span>
                <span className="block text-xs text-muted">{r.column}</span>
                <span className={`badge mt-1 ${TONE[r.state]}`}>{r.state}</span>
                {r.reason ? <span className="block text-xs text-muted">{r.reason}</span> : null}
                {r.href ? <a href={r.href} className="block text-xs text-primary underline">Open page</a> : null}
              </td>
              <td className="py-2 pr-3">{r.en}</td>
              <td className="py-2" lang="bn">{r.bn ?? <em className="text-muted" lang="en">none</em>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {visible.length > shown ? (
        <button type="button" onClick={() => setShown(n => n + PAGE)} className="min-h-tap rounded-md border border-line-strong px-4 font-semibold">
          Show {Math.min(PAGE, visible.length - shown)} more
        </button>
      ) : null}
    </div>
  );
}
