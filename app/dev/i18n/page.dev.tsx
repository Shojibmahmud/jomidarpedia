// /dev/i18n/: the language test page (roadmap task 3.1, spec FR-35). Built in local and preview mode
// only (page.dev.tsx, next.config.mjs), never in release; noindex either way. It shows interface strings,
// every formatter in both languages and the toggles, so the no-flash rule can be checked by hand.

import type { Metadata } from 'next';
import { Both, Latin, T } from '@/components/T';
import { ConditionGlyph, CONDITIONS } from '@/components/art/ConditionGlyph';
import { NoPhotoIcon, NoResultsArt, NotFoundArt, OfflineIcon } from '@/components/art/EmptyStates';
import { PlaceholderArt } from '@/components/art/PlaceholderArt';
import { LanguageToggle, ThemeToggle } from '@/components/shell/Toggles';
import { getMeta, getSite } from '@/lib/data';
import { both, formatCoords, formatCount, formatDate, formatHours, formatId, formatMoney } from '@/lib/format';
import { needsReview, STRINGS, type StringKey } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Language test', robots: { index: false, follow: false } };

const SAMPLE: StringKey[] = ['nav.explore', 'nav.dayTrips', 'nav.divisions', 'nav.about', 'footer.correction', 'common.notDocumented', 'common.bnNameMissing'];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-b border-line">
      <th scope="row" className="py-2 pr-4 text-left font-mono text-sm font-normal text-muted"><Latin>{label}</Latin></th>
      <td className="py-2">{children}</td>
    </tr>
  );
}

export default function I18nTestPage() {
  const meta = getMeta();
  const site = getSite('JB-DHK-064');
  const ll = site.location.latlon;
  return (
    <main id="main" className="mx-auto max-w-page space-y-10 px-4 py-10 lg:px-8">
      <header className="space-y-3">
        <h1 className="font-serif text-h2"><Latin>Language test page</Latin></h1>
        <p className="text-muted"><Latin>Local and preview builds only. Switch the language and theme, then reload: the first paint must already be right.</Latin></p>
        <div className="flex flex-wrap gap-3"><LanguageToggle /><ThemeToggle /></div>
      </header>

      <section className="space-y-2">
        <h2 className="font-serif text-h3"><Latin>Interface strings</Latin></h2>
        <table className="w-full"><tbody>
          {SAMPLE.map(k => <Row key={k} label={k}><T k={k} /></Row>)}
          <Row label="footer.updated"><T k="footer.updated" vars={{ date: both(formatDate, meta.lastVerified) }} /></Row>
        </tbody></table>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-h3"><Latin>Numbers and dates</Latin></h2>
        <table className="w-full"><tbody>
          <Row label="formatCount(sites)"><Both value={both(formatCount, meta.counts.sites)} /></Row>
          <Row label="formatCount(1136)"><Both value={both(formatCount, 1136)} /></Row>
          <Row label="formatMoney(30)"><Both value={both(formatMoney, 30)} /></Row>
          <Row label="formatHours(2.5)"><Both value={both(formatHours, 2.5)} /></Row>
          <Row label="formatDate(lastVerified)"><Both value={both(formatDate, meta.lastVerified)} /></Row>
          <Row label="formatDate('2024-02')"><Both value={both(formatDate, '2024-02')} /></Row>
          <Row label="formatDate('1890')"><Both value={both(formatDate, '1890')} /></Row>
          <Row label="formatId"><Latin>{formatId(site.id)}</Latin></Row>
          {ll && <Row label="formatCoords"><Latin>{formatCoords(ll[0], ll[1])}</Latin></Row>}
          <Row label="name (R10)"><span lang="en">{site.name.en}</span> · <span lang="bn">{site.name.bn}</span></Row>
        </tbody></table>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-h3"><Latin>Art</Latin></h2>
        <div className="flex flex-wrap gap-4 text-ink">
          {CONDITIONS.map(c => <ConditionGlyph key={c} condition={c} size={24} />)}
          <OfflineIcon /><NoPhotoIcon />
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {CONDITIONS.map(c => <PlaceholderArt key={c} tint={c} className="rounded-lg" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2"><NotFoundArt className="w-full" /><NoResultsArt className="w-full" /></div>
      </section>

      <section className="space-y-2">
        <h2 className="font-serif text-h3"><Latin>{`Bangla drafts awaiting review (${needsReview().length} of ${Object.keys(STRINGS).length})`}</Latin></h2>
        <ul className="grid gap-1 text-sm md:grid-cols-2">
          {needsReview().map(k => <li key={k}><Latin>{k}</Latin>: <span lang="bn">{STRINGS[k].bn}</span></li>)}
        </ul>
      </section>
    </main>
  );
}
