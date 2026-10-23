// Minimal home page (roadmap task 4.3, spec 04 FR-8): the title, counts from meta.json and links to
// five reviewed site pages (lib/home.ts). Phase 11 builds the full home page.

import Link from 'next/link';
import { T } from '@/components/T';
import { SiteNames } from '@/components/site/SiteNames';
import { getMeta, getSite } from '@/lib/data';
import { both, formatCount } from '@/lib/format';
import { HOME_SAMPLE_IDS } from '@/lib/home';
import { siteHref } from '@/lib/site-url';

export default function Home() {
  const { counts } = getMeta();
  const count = (n: number) => ({ count: both(formatCount, n) });
  const samples = HOME_SAMPLE_IDS.map(id => getSite(id));
  return (
    <main id="main" className="mx-auto max-w-page space-y-8 px-4 py-12 lg:px-8">
      <header className="space-y-2">
        <h1 className="font-serif text-h1">Jomidarpedia</h1>
        <p lang="bn" className="font-bn text-bn-lg">বাংলাদেশের জমিদার বাড়ি</p>
      </header>
      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-muted">
        <li><T k="footer.siteCount" vars={count(counts.sites)} /></li>
        <li><T k="common.sitesOnMap" vars={count(counts.onMap)} /></li>
        <li><T k="home.sourceCount" vars={count(counts.sources)} /></li>
      </ul>
      <section className="space-y-3">
        <h2 className="font-serif text-h3"><T k="home.samples" /></h2>
        <ul className="space-y-2">
          {samples.map(site => (
            <li key={site.id}>
              <Link prefetch={false} href={siteHref(site.id, site.slug)} className="inline-flex min-h-tap flex-col justify-center underline">
                <SiteNames en={site.name.en} bn={site.name.bn} bnClassName="text-sm" />
              </Link>
              {site.name.bn ? null : <span className="block text-sm text-muted"><T k="common.bnNameMissing" /></span>}
              <span className="block text-sm text-muted"><T k={`condition.${site.condition}`} /></span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
