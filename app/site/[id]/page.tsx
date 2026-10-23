// ID redirect page (roadmap task 4.2, spec 04 FR-7): /site/<id>/ leads to the current slug URL with a
// meta refresh, a canonical link and a visible link, and is noindex in every mode. Static HTML only, so it
// works on any host; host-level redirects are optional (14.3).

import type { Metadata } from 'next';
import Link from 'next/link';
import { T } from '@/components/T';
import { SiteNames } from '@/components/site/SiteNames';
import { getIndex, getSite } from '@/lib/data';
import { canonicalUrl, siteHref } from '@/lib/site-url';

type Params = { id: string };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getIndex().map(s => ({ id: s.i }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const site = getSite((await params).id);
  return { title: site.name.en, robots: { index: false, follow: true } };
}

export default async function SiteIdRedirect({ params }: { params: Promise<Params> }) {
  const site = getSite((await params).id);
  const href = siteHref(site.id, site.slug);
  return (
    <main id="main" className="mx-auto max-w-page space-y-3 px-4 py-10 lg:px-8">
      <meta httpEquiv="refresh" content={`0;url=${href}`} />
      <link rel="canonical" href={canonicalUrl(href)} />
      <p><T k="redirect.moved" /></p>
      <p className="text-lg font-semibold">
        <Link prefetch={false} href={href} className="underline">
          <SiteNames en={site.name.en} bn={site.name.bn} />
        </Link>
      </p>
    </main>
  );
}
