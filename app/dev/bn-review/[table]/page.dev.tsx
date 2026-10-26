// /dev/bn-review/<table>/: one table's translations, English and Bangla side by side (spec 14 FR-22, UJ-6).
// Local and preview builds only; noindex. Each row links to the public page that shows it.

import type { Metadata } from 'next';
import Link from 'next/link';
import { ReviewTable, type ReviewRow } from '@/components/dev/ReviewTable';
import { getIndex, getTranslations } from '@/lib/data';
import { siteHref } from '@/lib/site-url';
import { ALLOW } from '@/scripts/lib/translations.mjs';

type Params = { table: string };

export const dynamicParams = false;
export const metadata: Metadata = { title: 'Bangla review', robots: { index: false, follow: false } };

export function generateStaticParams(): Params[] {
  return Object.keys(ALLOW).map(table => ({ table }));
}

export default async function BnReviewTablePage({ params }: { params: Promise<Params> }) {
  const { table } = await params;
  const { cells, orphans } = getTranslations();
  const slugs = new Map(getIndex().map(s => [s.i, s.s]));
  const href = (c: { site?: string; trip?: string }) =>
    c.site && slugs.has(c.site) ? siteHref(c.site, slugs.get(c.site)!) : c.trip ? `/trips/${c.trip}/` : undefined;
  const rows: ReviewRow[] = [...cells, ...orphans].filter(c => c.table === table).map(c => ({
    key: c.key, column: c.column, en: c.en ?? '', state: c.state,
    ...(c.bn && { bn: c.bn }), ...(c.reason && { reason: c.reason }), ...(href(c) && { href: href(c) }),
  }));
  return (
    <main id="main" lang="en" className="mx-auto max-w-page space-y-6 px-4 py-10 lg:px-8">
      <p><Link prefetch={false} href="/dev/bn-review/" className="font-semibold text-primary underline">← All columns</Link></p>
      <h1 className="font-serif text-h2"><span className="font-mono">{table}</span>: Bangla review</h1>
      <ReviewTable rows={rows} columns={(ALLOW as Record<string, string[]>)[table]} />
    </main>
  );
}
