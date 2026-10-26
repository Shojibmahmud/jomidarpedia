// The Bangla-mode note under a page header (spec 14 FR-16): one line saying the page shows unchecked
// translations, English where Bangla is missing, or both; nothing when every text is reviewed Bangla.
// Hidden in English mode by the data-l rule in app/tokens.css.

import { dual, type StringKey } from '@/lib/i18n';
import type { BnState } from '@/lib/types';

export function bnNoteKey(state: BnState): StringKey | null {
  if (state.draft && state.english) return 'bnNote.both';
  if (state.draft) return 'bnNote.draft';
  if (state.english) return 'bnNote.english';
  return null;
}

/** Pass the page's translation state, or a fixed key for a page with its own rule (About). */
export function ProseNote({ state, k }: { state?: BnState; k?: StringKey }) {
  const key = k ?? (state ? bnNoteKey(state) : null);
  if (!key) return null;
  return <p lang="bn" data-l="bn" role="note" className="text-sm text-muted" data-prose-note={key}>{dual(key).bn}</p>;
}
