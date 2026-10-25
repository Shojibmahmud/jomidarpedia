// The licences block (roadmap task 10.8; spec 10 FR-43): on /about/#licences and beside the credits on /credits/.
// The text and data licence (O5) with no download promise (D8), photo licences with the one change notice (D11),
// and only the map, boundary, library and font licences of what actually ships (D13). Server component.

import Link from 'next/link';
import { Latin, T } from '@/components/T';
import { text, type Lang, type StringKey } from '@/lib/i18n';
import { BOUNDARIES, FONT_LICENCE, FONTS, LIBRARIES, ODBL, TEXT_LICENCE, tileCredits, type Licence } from '@/lib/licences';

const MARK = '\u0001';

function Item({ k, children }: { k: StringKey; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="font-semibold"><T k={k} /></dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/** An interface sentence in both languages whose {placeholders} are licence links or Latin names. */
function Sentence({ k, parts }: { k: StringKey; parts: Record<string, Licence | string> }) {
  const vars = Object.fromEntries(Object.keys(parts).map(name => [name, { en: `${MARK}${name}${MARK}`, bn: `${MARK}${name}${MARK}` }]));
  const piece = (name: string, key: number) => {
    const p = parts[name];
    return typeof p === 'string'
      ? <span key={key} lang="en">{p}</span>
      : <a key={key} href={p.url} rel="noopener noreferrer" target="_blank" lang="en" className="text-primary underline">{p.name}</a>;
  };
  const one = (lang: Lang) => (
    <span lang={lang} data-l={lang}>
      {text(k, lang, vars).split(MARK).map((s, i) => (i % 2 ? piece(s, i) : s))}
    </span>
  );
  return <>{one('en')}{one('bn')}</>;
}

export function Licences({ compact = false }: { compact?: boolean }) {
  return (
    <dl className={`grid gap-4 ${compact ? '' : 'md:grid-cols-2'}`} data-licences>
      <Item k="lic.text"><Sentence k="lic.textBody" parts={{ licence: TEXT_LICENCE }} /></Item>
      <Item k="lic.photos">
        <T k="lic.photosBody" /> <Link prefetch={false} href="/credits/" className="text-primary underline"><T k="footer.credits" /></Link>{' '}
        <span data-changes><T k="lic.changes" /></span>
      </Item>
      <Item k="lic.mapData"><Sentence k="lic.mapDataBody" parts={{ licence: ODBL }} /></Item>
      <Item k="lic.tiles">{tileCredits().map(c => <span key={c} className="block"><Latin>{c}</Latin></span>)}</Item>
      <Item k="lic.boundaries"><Sentence k="lic.boundariesBody" parts={BOUNDARIES} /></Item>
      <Item k="lic.library"><Sentence k="lic.libraryBody" parts={LIBRARIES} /></Item>
      <Item k="lic.fonts"><Sentence k="lic.fontsBody" parts={{ fonts: FONTS.join(', '), licence: FONT_LICENCE }} /></Item>
    </dl>
  );
}
