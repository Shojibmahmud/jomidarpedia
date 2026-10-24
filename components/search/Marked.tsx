// Text with the words a search matched wrapped in <mark> (spec 08 FR-17). No hooks: the server, SiteCard
// and the client lists all render it. Whole words only, so a Bangla letter never loses its vowel sign.

import { marks } from '@/lib/search';

export function Marked({ text, terms }: { text: string; terms?: ReadonlySet<string> }) {
  if (!terms?.size) return <>{text}</>;
  return (
    <>
      {marks(text, terms).map((part, k) => (part.mark
        ? <mark key={k} className="rounded-sm bg-gold-tint px-0.5 text-inherit">{part.text}</mark>
        : <span key={k}>{part.text}</span>))}
    </>
  );
}
