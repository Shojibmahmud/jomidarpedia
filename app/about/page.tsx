// About and methodology (roadmap tasks 10.5, 10.6, 10.8, 10.9; spec .claude/specs/10-Areas-sources-about-and-system-states.md
// FR-35 to FR-44). The prose is content/about.en.md, English (O6), with its numbers filled from meta.json at build
// time (scripts/lib/about.mjs), so they always match the rest of the site. A draft (`reviewed: false`) builds in
// local and preview modes with a notice; `npm run data` fails a release build until the owner has reviewed it (D10).

import type { Metadata } from 'next';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { T } from '@/components/T';
import { Licences } from '@/components/about/Licences';
import { ProseNote } from '@/components/shell/ProseNote';
import { getMeta, getSources } from '@/lib/data';
import { dual } from '@/lib/i18n';
import { Blocks, inline, parseMarkdown } from '@/lib/markdown';
import { CORRECTIONS_URL } from '@/lib/nav';
import { canonicalUrl } from '@/lib/site-url';
import { ABOUT_PATH, aboutValues, fillTokens, parseAbout } from '@/scripts/lib/about.mjs';
import { pageMeta } from '@/lib/seo';

export function generateMetadata(): Metadata {
  return pageMeta({ title: 'About and methodology', path: '/about/', canonical: false, description: 'How Jomidarpedia records the zamindar palaces of Bangladesh: sources, how sure each fact is, what is not done yet, and how to suggest a correction.' });
}

function aboutDoc() {
  const { reviewed, body } = parseAbout(readFileSync(join(process.cwd(), ABOUT_PATH), 'utf8'));
  const photoOffer = new URL(CORRECTIONS_URL);
  photoOffer.searchParams.set('template', 'photo-offer.yml');
  const values = aboutValues(getMeta(), getSources(), { 'url.corrections': CORRECTIONS_URL, 'url.photoOffer': photoOffer.href });
  return { reviewed, doc: parseMarkdown(fillTokens(body, values)) };
}

export default function AboutPage() {
  const { reviewed, doc } = aboutDoc();
  const directives = { licences: <Licences /> };
  return (
    <main id="main" className="mx-auto max-w-page px-4 py-8 lg:px-8 lg:py-12" data-about>
      <link rel="canonical" href={canonicalUrl('/about/')} />
      <header className="max-w-3xl space-y-4 border-b border-line pb-10">
        <p className="text-xs font-bold uppercase tracking-wider text-primary"><T k="about.eyebrow" /></p>
        <h1 className="font-serif text-display"><T k="about.title" /></h1>
        <p lang="bn" data-l="en" aria-hidden="true" className="font-bn-serif text-bn-h3 text-muted">{dual('about.title').bn}</p>
        <ProseNote k="common.proseInEnglish" />
        {reviewed ? null : <p role="note" className="rounded-lg border border-gold bg-gold-tint p-3 text-sm" data-about-draft><T k="about.draft" /></p>}
        <div lang="en" className="space-y-3 text-lg"><Blocks blocks={doc.lead} /></div>
      </header>

      <div className="mt-10 grid gap-10 xl:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-labelledby="jp-toc" className="xl:sticky xl:top-24 xl:self-start" data-toc>
          <p id="jp-toc" className="mb-2 text-sm font-semibold text-muted"><T k="site.onThisPage" /></p>
          <ol lang="en" className="flex flex-wrap gap-2 text-sm xl:flex-col xl:gap-0 xl:border-l xl:border-line">
            {doc.sections.map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="inline-flex min-h-10 items-center rounded-full border border-line px-3 hover:bg-surface-2 xl:rounded-none xl:border-0 xl:px-4">{inline(s.title)}</a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="max-w-3xl space-y-12">
          {doc.sections.map(s => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-24 space-y-4 border-b border-line pb-10 last:border-0">
              <h2 id={`${s.id}-title`} lang="en" className="font-serif text-h2">{inline(s.title)}</h2>
              <div lang="en" className="space-y-4"><Blocks blocks={s.blocks} directives={directives} /></div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
