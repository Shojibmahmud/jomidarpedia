// About and methodology (roadmap tasks 10.5, 10.6, 10.8, 10.9; spec .claude/specs/10-Areas-sources-about-and-system-states.md
// FR-35 to FR-44). The prose is content/about.en.md, with its numbers filled from meta.json at build time
// (scripts/lib/about.mjs), so they always match the rest of the site. A draft (`reviewed: false`) builds in
// local and preview modes with a notice; `npm run data` fails a release build until the owner has reviewed it (D10).
// content/about.bn.md, when present, is the Bangla (spec 14 FR-20): same sections and ids, shown in Bangla mode,
// with the "not yet checked" note while it is a draft. Without it, Bangla mode shows the English with a note.

import type { Metadata } from 'next';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { T } from '@/components/T';
import { Licences } from '@/components/about/Licences';
import { ProseNote } from '@/components/shell/ProseNote';
import { getMeta, getSources } from '@/lib/data';
import { dual } from '@/lib/i18n';
import { Blocks, inline, parseMarkdown } from '@/lib/markdown';
import { CORRECTIONS_URL } from '@/lib/nav';
import { canonicalUrl } from '@/lib/site-url';
import { ABOUT_BN_PATH, ABOUT_PATH, aboutValues, fillTokens, parseAbout, sameSections } from '@/scripts/lib/about.mjs';
import { pageMeta } from '@/lib/seo';

export function generateMetadata(): Metadata {
  return pageMeta({ title: 'About and methodology', path: '/about/', canonical: false, description: 'How Jomidarpedia records the zamindar palaces of Bangladesh: sources, how sure each fact is, what is not done yet, and how to suggest a correction.' });
}

function aboutDoc(path: string) {
  const { reviewed, body } = parseAbout(readFileSync(join(process.cwd(), path), 'utf8'), path);
  const photoOffer = new URL(CORRECTIONS_URL);
  photoOffer.searchParams.set('template', 'photo-offer.yml');
  const values = aboutValues(getMeta(), getSources(), { 'url.corrections': CORRECTIONS_URL, 'url.photoOffer': photoOffer.href });
  return { reviewed, doc: parseMarkdown(fillTokens(body, values, path)) };
}

/** One block in both languages when there is a Bangla text, otherwise the English for both (spec 14 FR-15). */
function Dual({ en, bn, className, as: Tag = 'div' }: { en: React.ReactNode; bn?: React.ReactNode; className?: string; as?: 'div' | 'span' }) {
  if (bn === undefined) return <Tag lang="en" className={className}>{en}</Tag>;
  return <><Tag lang="en" data-l="en" className={className}>{en}</Tag><Tag lang="bn" data-l="bn" className={className}>{bn}</Tag></>;
}

export default function AboutPage() {
  const { reviewed, doc } = aboutDoc(ABOUT_PATH);
  const bnFile = existsSync(join(process.cwd(), ABOUT_BN_PATH)) ? aboutDoc(ABOUT_BN_PATH) : null;
  if (bnFile) sameSections(doc.sections, bnFile.doc.sections);
  const bn = bnFile?.doc;
  const bnSection = (id: string) => bn?.sections.find(s => s.id === id);
  const directives = { licences: <Licences /> };
  return (
    <main id="main" className="mx-auto max-w-page px-4 py-8 lg:px-8 lg:py-12" data-about>
      <link rel="canonical" href={canonicalUrl('/about/')} />
      <header className="max-w-3xl space-y-4 border-b border-line pb-10">
        <p className="text-xs font-bold uppercase tracking-wider text-primary"><T k="about.eyebrow" /></p>
        <h1 className="font-serif text-display"><T k="about.title" /></h1>
        <p lang="bn" data-l="en" aria-hidden="true" className="font-bn-serif text-bn-h3 text-muted">{dual('about.title').bn}</p>
        <ProseNote k={!bnFile ? 'common.proseInEnglish' : bnFile.reviewed ? undefined : 'bnNote.draft'} />
        {reviewed ? null : <p role="note" className="rounded-lg border border-gold bg-gold-tint p-3 text-sm" data-about-draft><T k="about.draft" /></p>}
        <Dual className="space-y-3 text-lg" en={<Blocks blocks={doc.lead} />} bn={bn && <Blocks blocks={bn.lead} />} />
      </header>

      <div className="mt-10 grid gap-10 xl:grid-cols-[14rem_minmax(0,1fr)]">
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
          {doc.sections.map(s => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-24 space-y-4 border-b border-line pb-10 last:border-0">
              <h2 id={`${s.id}-title`} className="font-serif text-h2"><Dual as="span" en={inline(s.title)} bn={bnSection(s.id) && inline(bnSection(s.id)!.title)} /></h2>
              <Dual className="space-y-4" en={<Blocks blocks={s.blocks} directives={directives} />}
                bn={bnSection(s.id) && <Blocks blocks={bnSection(s.id)!.blocks} directives={directives} />} />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
