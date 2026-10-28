// About and methodology (roadmap tasks 10.5, 10.6, 10.8, 10.9; spec .claude/specs/10-Areas-sources-about-and-system-states.md
// FR-35 to FR-44). The prose is content/about.en.md, with its numbers filled from meta.json at build time
// (scripts/lib/about.mjs), so they always match the rest of the site. A draft (`reviewed: false`) builds in
// local and preview modes with a notice; `npm run data` fails a release build until the owner has reviewed it (D10).
// content/about.bn.md, when present, is the Bangla (spec 14 FR-20): same sections and ids, shown in Bangla mode,
// with the "not yet checked" note while it is a draft. Without it, Bangla mode shows the English with a note.
// The pictures (components/about/AboutParts.tsx) come in through ::directives in the text, so both languages place
// them in the same spot; the header photo and the numbers strip are the page's own.

import type { Metadata } from 'next';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { T } from '@/components/T';
import { ABOUT_ICONS, AboutPhoto, DebateTiles, GRADE_FILL, LOCATION_FILL, PhotoStrip, SECTION_ICON, ShareBar } from '@/components/about/AboutParts';
import { Licences } from '@/components/about/Licences';
import { STAT_ICONS, StatStrip } from '@/components/home/HomeParts';
import { ProseNote } from '@/components/shell/ProseNote';
import { getMeta, getSources } from '@/lib/data';
import { bnDigits } from '@/lib/format';
import { HOME_IMAGES } from '@/lib/home';
import { homePhoto } from '@/lib/home-data';
import { dual } from '@/lib/i18n';
import { Blocks, inline, parseMarkdown } from '@/lib/markdown';
import { CORRECTIONS_URL } from '@/lib/nav';
import { canonicalUrl } from '@/lib/site-url';
import { ABOUT_BN_PATH, ABOUT_PATH, LINK_TOKENS, aboutValues, fillTokens, parseAbout, sameSections } from '@/scripts/lib/about.mjs';
import { pageMeta } from '@/lib/seo';

export function generateMetadata(): Metadata {
  return pageMeta({ title: 'About and methodology', path: '/about/', canonical: false, description: 'How Jomidarpedia records the zamindar palaces of Bangladesh: sources, how sure each fact is, what is not done yet, and how to suggest a correction.' });
}

function aboutDoc(path: string, lang: 'en' | 'bn' = 'en') {
  const { reviewed, body } = parseAbout(readFileSync(join(process.cwd(), path), 'utf8'), path);
  const raw = aboutValues(getMeta(), getSources(), { 'url.corrections': CORRECTIONS_URL, 'url.photoOffer': `${CORRECTIONS_URL}?field=photo` });
  // The Bangla text's counts in Bangla digits; the link tokens stay as they are.
  const values = lang === 'en' ? raw : Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, LINK_TOKENS.includes(k) ? v : bnDigits(String(v))]));
  return { reviewed, doc: parseMarkdown(fillTokens(body, values, path)) };
}

/** One block in both languages when there is a Bangla text, otherwise the English for both (spec 14 FR-15). */
function Dual({ en, bn, className, as: Tag = 'div' }: { en: React.ReactNode; bn?: React.ReactNode; className?: string; as?: 'div' | 'span' }) {
  if (bn === undefined) return <Tag lang="en" className={className}>{en}</Tag>;
  return <><Tag lang="en" data-l="en" className={className}>{en}</Tag><Tag lang="bn" data-l="bn" className={className}>{bn}</Tag></>;
}

export default function AboutPage() {
  const { reviewed, doc } = aboutDoc(ABOUT_PATH);
  const bnFile = existsSync(join(process.cwd(), ABOUT_BN_PATH)) ? aboutDoc(ABOUT_BN_PATH, 'bn') : null;
  if (bnFile) sameSections(doc.sections, bnFile.doc.sections);
  const bn = bnFile?.doc;
  const bnSection = (id: string) => bn?.sections.find(s => s.id === id);
  const { counts } = getMeta();
  const { confidence: c, locations: l } = counts;
  const directives = {
    licences: <Licences />,
    grades: <ShareBar total={counts.sites} parts={[
      { k: 'about.grade.confirmed', count: c.confirmed, fill: GRADE_FILL.confirmed },
      { k: 'about.grade.partly', count: c.partially_confirmed, fill: GRADE_FILL.partly },
      { k: 'about.grade.unconfirmed', count: c.unconfirmed, fill: GRADE_FILL.unconfirmed },
      { k: 'about.grade.notGraded', count: c.not_graded, fill: GRADE_FILL.notGraded },
    ]} />,
    locations: <ShareBar total={counts.sites} parts={[
      { k: 'about.loc.verified', count: l.verified, fill: LOCATION_FILL.verified },
      { k: 'about.loc.singleSource', count: l.singleSource, fill: LOCATION_FILL.singleSource },
      { k: 'about.loc.approximate', count: l.approximate, fill: LOCATION_FILL.approximate },
      { k: 'about.loc.unverified', count: l.unverified, fill: LOCATION_FILL.unverified },
      { k: 'about.loc.noPin', count: l.noPin, fill: LOCATION_FILL.noPin },
    ]} />,
    debate: <DebateTiles counts={counts} />,
    photos: <PhotoStrip photos={[HOME_IMAGES.categories.preserved, HOME_IMAGES.categories.ruins, HOME_IMAGES.categories.newUse].map(homePhoto)} />,
  };
  const listIcon = (id: string) => (id === 'not-done' ? ABOUT_ICONS.todo : undefined);
  return (
    <main id="main" className="mx-auto max-w-page px-4 py-8 lg:px-8 lg:py-12" data-about>
      <link rel="canonical" href={canonicalUrl('/about/')} />
      <header className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-12">
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-primary"><T k="about.eyebrow" /></p>
          <h1 className="font-serif text-display"><T k="about.title" /></h1>
          <p lang="bn" data-l="en" aria-hidden="true" className="font-bn-serif text-bn-h3 text-muted">{dual('about.title').bn}</p>
          <ProseNote k={!bnFile ? 'common.proseInEnglish' : bnFile.reviewed ? undefined : 'bnNote.draft'} />
          {reviewed ? null : <p role="note" className="rounded-lg border border-gold bg-gold-tint p-3 text-sm" data-about-draft><T k="about.draft" /></p>}
          <Dual className="space-y-4 text-lg leading-relaxed" en={<Blocks blocks={doc.lead} />} bn={bn && <Blocks blocks={bn.lead} />} />
        </div>
        <AboutPhoto photo={homePhoto(HOME_IMAGES.divisions.dhaka)} />
      </header>

      <div className="mt-10">
        <StatStrip stats={[
          { value: counts.sites, label: 'home.stat.sites', tone: 'bg-primary-tint text-primary-tint-ink', icon: STAT_ICONS.palace },
          { value: counts.sources, label: 'home.stat.sources', href: '/sources/', tone: 'bg-teal-tint text-teal-ink', icon: STAT_ICONS.book },
          { value: counts.historyEvents, label: 'about.stat.events', tone: 'bg-gold-tint text-gold', icon: ABOUT_ICONS.hourglass },
          { value: counts.images, label: 'home.stat.photos', href: '/credits/', tone: 'bg-moss-tint text-moss-ink', icon: STAT_ICONS.camera },
          { value: counts.dayTripSites, label: 'home.stat.dayTrips', tone: 'bg-indigo-tint text-indigo', icon: STAT_ICONS.sun },
        ]} />
      </div>

      <div className="mt-12 grid gap-10 xl:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-labelledby="jp-toc" className="xl:sticky xl:top-24 xl:self-start" data-toc>
          <p id="jp-toc" className="mb-2 text-sm font-semibold text-muted"><T k="site.onThisPage" /></p>
          <ol className="flex flex-wrap gap-2 text-sm xl:flex-col xl:gap-0 xl:border-l xl:border-line">
            {doc.sections.map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="inline-flex min-h-10 items-center rounded-full border border-line px-3 hover:bg-surface-2 xl:rounded-none xl:border-0 xl:px-4">
                  <Dual as="span" en={inline(s.title)} bn={bnSection(s.id) && inline(bnSection(s.id)!.title)} />
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="max-w-3xl space-y-12">
          {doc.sections.map(s => {
            const mark = SECTION_ICON[s.id];
            return (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-24 space-y-4 border-b border-line pb-10 last:border-0">
                <div className="flex items-center gap-3">
                  {mark ? <span aria-hidden="true" className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${mark.tone}`}>{mark.icon}</span> : null}
                  <h2 id={`${s.id}-title`} className="font-serif text-h2"><Dual as="span" en={inline(s.title)} bn={bnSection(s.id) && inline(bnSection(s.id)!.title)} /></h2>
                </div>
                <Dual className="space-y-4" en={<Blocks blocks={s.blocks} directives={directives} listIcon={listIcon(s.id)} />}
                  bn={bnSection(s.id) && <Blocks blocks={bnSection(s.id)!.blocks} directives={directives} listIcon={listIcon(s.id)} />} />
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
