// The Bangla-mode note on pages whose prose is English only (decision O6). Hidden in English mode by the
// data-l rule in app/tokens.css, so it costs nothing there.

import { dual, type StringKey } from '@/lib/i18n';

export function ProseNote({ k }: { k: StringKey }) {
  return <p lang="bn" data-l="bn" role="note" className="text-sm text-muted" data-prose-note>{dual(k).bn}</p>;
}
