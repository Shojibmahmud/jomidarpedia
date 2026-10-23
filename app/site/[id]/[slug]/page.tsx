// Site page (roadmap Phase 5, spec .claude/specs/05-Site-page.md). Every section of the boards is rendered
// for every site, with its empty state when there is no data (R2). Location never exposes a hidden pin (R5);
// fees are prices only when known (R6); legends stay outside the timeline and each claim shows only its own
// sources (R3). Routing and metadata are Phase 4's (spec 04 FR-1, FR-6).

import type { Metadata } from 'next';
import { Latin, T } from '@/components/T';
import { AtAGlance, FactValue, KnownChecklist } from '@/components/site/AtAGlance';
import { ShareButton } from '@/components/site/CopyButton';
import { ConflictNote } from '@/components/site/Conflicts';
import { FeatureList } from '@/components/site/FeatureList';
import { Gallery } from '@/components/site/Gallery';
import { BadgeRow, BilingualName, Breadcrumb, RecordBanner } from '@/components/site/Header';
import { HistoryTimeline, LegendBox } from '@/components/site/History';
import { LocationPanel } from '@/components/site/LocationPanel';
import { NoPhotoPanel } from '@/components/site/NoPhotoPanel';
import { CombineWith, IdentityNotes, Itineraries } from '@/components/site/Related';
import { GettingThere } from '@/components/site/Routes';
import { SectionNav, type NavItem } from '@/components/site/SectionNav';
import { DisagreementIndex, OpenQuestions, SourceList, StillToConfirm } from '@/components/site/Sources';
import { SuggestCorrection } from '@/components/site/SuggestCorrection';
import { VisitingInfo } from '@/components/site/VisitingInfo';
import { getIndex, getSite } from '@/lib/data';
import { dual, type StringKey } from '@/lib/i18n';
import { conflictAnchor, conflictSection, disagreements, isSparse, openQuestions, SECTIONS, sectionHint, sectionId, type ConflictSection, type Section } from '@/lib/site-page';
import { canonicalUrl, siteHref } from '@/lib/site-url';
import type { SiteRecord } from '@/lib/types';

type Params = { id: string; slug: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getIndex().map(s => ({ id: s.i, slug: s.s }));
}

async function load(params: Promise<Params>) {
  const { id, slug } = await params;
  const site = getSite(id);
  if (site.slug !== slug) throw new Error(`${id}: index slug "${slug}" differs from the site record's "${site.slug}"`);
  return site;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const site = await load(params);
  return { title: site.name.en };
}

const TITLE: Record<Section, StringKey> = {
  summary: 'section.summary', location: 'section.location', history: 'section.history', architecture: 'section.architecture',
  stories: 'section.stories', visiting: 'section.visiting', gettingThere: 'section.gettingThere', itineraries: 'section.itineraries',
  combine: 'section.combine', sources: 'section.sources',
};

/** A page section: the heading in the interface language, with the Bangla title beneath it in English mode. */
function Block({ section, children }: { section: Section; children: React.ReactNode }) {
  const id = sectionId(section);
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 space-y-4 border-t border-line pt-8 first:border-t-0 first:pt-0" data-section={id}>
      <div>
        <h2 id={`${id}-title`} className="font-serif text-h2"><T k={TITLE[section]} /></h2>
        <p lang="bn" data-l="en" aria-hidden="true" className="font-bn text-muted">{dual(TITLE[section]).bn}</p>
      </div>
      {children}
    </section>
  );
}

export default async function SitePage({ params }: { params: Promise<Params> }) {
  const site: SiteRecord = await load(params);
  const path = siteHref(site.id, site.slug);
  const pageUrl = canonicalUrl(path);
  const sparse = isSparse(site);
  const multi = disagreements(site).map((conflict, k) => ({ conflict, anchor: conflictAnchor(k), section: conflictSection(conflict) }));
  const questions = openQuestions(site);
  const conflictsIn = (s: ConflictSection) => multi.filter(m => m.section === s).map(m => <ConflictNote key={m.anchor} conflict={m.conflict} id={m.anchor} />);
  const nav: NavItem[] = SECTIONS.map(s => {
    const hint = sectionHint(site, s);
    return { id: sectionId(s), label: dual(TITLE[s]), ...(hint && { hint: dual(`hint.${hint}`) }) };
  });

  return (
    <main id="main" className="mx-auto max-w-page space-y-6 px-4 [overflow-wrap:break-word] py-6 lg:px-8 lg:py-10">
      <link rel="canonical" href={pageUrl} />
      <header className="space-y-3">
        <Breadcrumb site={site} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <BilingualName site={site} />
            <p className="text-sm text-muted">
              {site.name.alt.length ? <><T k="site.alsoCalled" /> <Latin>{site.name.alt.join(' · ')}</Latin> · </> : null}
              <Latin><span className="font-mono">{site.id}</span></Latin>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ShareButton url={path} title={site.name.en} />
            <SuggestCorrection siteId={site.id} pageUrl={pageUrl} field="general" look="button" />
          </div>
        </div>
        <BadgeRow site={site} disagree={multi.length} questions={questions.length} />
        {sparse ? <RecordBanner /> : null}
      </header>

      {site.images.length ? <Gallery images={site.images} /> : <NoPhotoPanel site={site} pageUrl={pageUrl} />}

      <div className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)_300px]">
        <div className="lg:col-start-1 lg:row-start-1"><SectionNav items={nav} /></div>
        <aside className="space-y-4 lg:col-start-3 lg:row-start-1">
          <AtAGlance site={site} />
          {sparse ? <KnownChecklist site={site} pageUrl={pageUrl} /> : null}
        </aside>
        <div className="min-w-0 space-y-10 lg:col-start-2 lg:row-start-1">
          <Block section="summary">
            <p className="max-w-prose text-lg"><Latin>{site.summary}</Latin></p>
            <IdentityNotes site={site} />
          </Block>
          <Block section="location">
            <LocationPanel site={site} pageUrl={pageUrl} />
            {conflictsIn('location')}
          </Block>
          <Block section="history">
            <HistoryTimeline site={site} pageUrl={pageUrl} />
            {conflictsIn('history')}
          </Block>
          <Block section="architecture">
            <p><span className="font-semibold"><T k="glance.style" />:</span> <FactValue fact={site.style} /></p>
            <FeatureList features={site.features} />
            {conflictsIn('architecture')}
          </Block>
          <Block section="stories"><LegendBox site={site} pageUrl={pageUrl} /></Block>
          <Block section="visiting"><VisitingInfo site={site} /></Block>
          <Block section="gettingThere"><GettingThere site={site} pageUrl={pageUrl} /></Block>
          <Block section="itineraries"><Itineraries site={site} /></Block>
          <Block section="combine"><CombineWith site={site} /></Block>
          <Block section="sources">
            <SourceList site={site} />
            <DisagreementIndex items={multi} />
            {conflictsIn('sources')}
            <OpenQuestions questions={questions} />
            <StillToConfirm site={site} pageUrl={pageUrl} />
          </Block>
        </div>
      </div>
    </main>
  );
}
