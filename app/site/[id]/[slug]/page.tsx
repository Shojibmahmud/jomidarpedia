// Site page, walking skeleton (roadmap task 4.1, spec 04 FR-1 to FR-6): names, summary and condition
// as text, from the real data. No location field is rendered, so no coordinate can leak here (R5).
// Phase 5 replaces the body with the full components.

import type { Metadata } from 'next';
import { Latin, T } from '@/components/T';
import { SiteNames } from '@/components/site/SiteNames';
import { getIndex, getSite } from '@/lib/data';
import { canonicalUrl, siteHref } from '@/lib/site-url';

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

export default async function SitePage({ params }: { params: Promise<Params> }) {
  const site = await load(params);
  return (
    <main id="main" className="mx-auto max-w-page space-y-6 px-4 py-10 lg:px-8">
      <link rel="canonical" href={canonicalUrl(siteHref(site.id, site.slug))} />
      <header className="space-y-2">
        <h1 className="font-serif text-h1">
          <SiteNames en={site.name.en} bn={site.name.bn} bnClassName="text-bn-lg" />
        </h1>
        {site.name.bn ? null : <p className="text-sm text-muted"><T k="common.bnNameMissing" /></p>}
        <p className="font-mono text-sm text-muted"><Latin>{site.id}</Latin></p>
      </header>
      <p className="max-w-prose"><Latin>{site.summary}</Latin></p>
      <dl className="flex gap-2">
        <dt className="font-semibold"><T k="condition.label" />:</dt>
        <dd><T k={`condition.${site.condition}`} /></dd>
      </dl>
    </main>
  );
}
