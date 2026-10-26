// Source page (roadmap task 10.4; spec .claude/specs/10-Areas-sources-about-and-system-states.md FR-25 to FR-32).
// One page per entry in sources.json. Only the fields the source has are shown, each as written: the structured
// fields from 2.15 (author, edition, ISBN, how it was checked) exist for the core book only. A project working
// file is labelled as the project's own file and gets no outbound link (D6). Every citing site is listed at #sites.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Both, Latin, T } from '@/components/T';
import { ConditionBadge } from '@/components/site/Badges';
import { getDivisions, getIndex, getSources } from '@/lib/data';
import { both, formatCount, formatDate } from '@/lib/format';
import { divisionHref } from '@/lib/nav';
import { pageMeta } from '@/lib/seo';
import { canonicalUrl, siteHref } from '@/lib/site-url';
import { isProjectFile, sourceDate, typeKey, typeToken } from '@/lib/sources';
import type { IndexSite, RecordConfidence, SourceEntry } from '@/lib/types';

type Params = { id: string };
const n = (v: number) => both(formatCount, v);
const CONFIDENCE: readonly RecordConfidence[] = ['confirmed', 'partially_confirmed', 'unconfirmed', 'not_graded'];
const EXAMPLES = 3;

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return getSources().map(s => ({ id: s.id }));
}

function source(id: string): SourceEntry {
  const s = getSources().find(x => x.id === id);
  if (!s) throw new Error(`sources: no source "${id}" in sources.json`);
  return s;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const s = source(id);
  const by = s.publisher ? ` (${s.publisher})` : '';
  return pageMeta({
    title: `${s.title} (${id})`, path: `/sources/${id}/`, canonical: false,
    description: `${s.typeLabel}${by}: ${s.title}. Cited by ${s.sites.length} ${s.sites.length === 1 ? 'site' : 'sites'} on Jomidarpedia.`,
  });
}

function Field({ k, children }: { k: Parameters<typeof T>[0]['k']; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-line py-2 md:grid-cols-[10rem_1fr] md:gap-4">
      <dt className="text-sm text-muted"><T k={k} /></dt>
      <dd className="[overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

function SiteName({ s }: { s: { en: string; bn?: string } }) {
  return (
    <>
      <span lang="en" className="block font-semibold">{s.en}</span>
      {s.bn ? <span lang="bn" className="block font-bn text-bn-sm text-muted">{s.bn}</span> : null}
    </>
  );
}

export default async function SourcePage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const s = source(id);
  const token = typeToken(s.type);
  if (!token) throw new Error(`sources: type "${s.type}" of ${s.id} has no chip`);
  const project = isProjectFile(s);
  const index = new Map(getIndex().map(x => [x.i, x]));
  const divisions = getDivisions();
  const cited = s.sites.map(x => ({ ...x, idx: index.get(x.id) as IndexSite }));
  const examples = [...cited].sort((a, b) => CONFIDENCE.indexOf(a.idx.rc) - CONFIDENCE.indexOf(b.idx.rc) || a.en.localeCompare(b.en, 'en') || a.id.localeCompare(b.id)).slice(0, EXAMPLES);
  const byDivision = divisions.map(d => ({ d, count: s.citationsByDivision[d.en] ?? 0 })).filter(x => x.count).sort((a, b) => b.count - a.count);
  const most = Math.max(1, ...byDivision.map(x => x.count));
  const groups = divisions.map(d => ({ d, sites: cited.filter(x => x.idx.dv === d.en).sort((a, b) => a.en.localeCompare(b.en, 'en')) })).filter(g => g.sites.length);
  const publisher = s.bib?.publisher ?? s.publisher;
  const sitesLabel = (count: number) => <T k={count === 1 ? 'search.count.sites.one' : 'search.count.sites'} vars={{ count: n(count) }} />;

  return (
    <main id="main" className="mx-auto max-w-3xl space-y-8 px-4 py-6 lg:py-10" data-source-page={s.id}>
      <link rel="canonical" href={canonicalUrl(`/sources/${s.id}/`)} />
      <p><Link prefetch={false} href="/sources/" className="inline-flex min-h-tap items-center gap-2 font-semibold text-primary"><span aria-hidden="true">←</span><T k="source.back" /></Link></p>

      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted"><T k={typeKey(token)} /> · <Latin>{s.id}</Latin></p>
        <h1 className="font-serif text-h1 [overflow-wrap:anywhere]">{s.title}</h1>
        {s.bib?.author ? <p className="text-lg" data-author>{s.bib.author}</p> : null}
      </header>

      {project ? <p className="rounded-lg border border-gold bg-gold-tint p-4" data-project-file><T k="source.project" /></p> : null}

      <dl data-source-fields>
        {s.date ? <Field k="source.published"><Both value={both(sourceDate, s.date)} />{s.bib?.edition ? <span className="text-muted"> ({s.bib.edition})</span> : null}</Field> : null}
        {publisher ? <Field k="source.publisher">{publisher}</Field> : null}
        {s.bib?.isbn ? <Field k="source.isbn"><Latin>{s.bib.isbn}</Latin></Field> : null}
        {s.bib?.verificationMethod ? <Field k="source.checked"><span data-checked>{s.bib.verificationMethod}</span></Field> : null}
        <Field k="source.read">{s.readStatus}</Field>
        {s.accessed ? <Field k="source.accessed"><Both value={both(formatDate, s.accessed)} /></Field> : null}
        <Field k="source.citedBy"><strong data-cited-by={s.sites.length}>{sitesLabel(s.sites.length)}</strong></Field>
      </dl>

      {s.url && !project ? (
        <p><a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center rounded-md border border-line-strong bg-surface px-4 font-semibold" data-source-link>
          <T k="source.open" /> <span aria-hidden="true">&nbsp;↗</span>
        </a></p>
      ) : null}

      {s.notes ? (
        <p className="rounded-lg bg-surface-2 p-4" data-source-notes><strong><T k="source.used" /></strong> <span lang="en">{s.notes}</span></p>
      ) : null}

      {s.sites.length >= 2 && byDivision.length ? (
        <section aria-labelledby="jp-by-division" className="space-y-3" data-by-division>
          <h2 id="jp-by-division" className="font-serif text-h2"><T k="source.byDivision" /></h2>
          <ul>
            {byDivision.map(({ d, count }) => (
              <li key={d.slug} className="flex items-center gap-4 border-b border-line py-2" data-division-count={count}>
                <Link prefetch={false} href={divisionHref(d.slug)} className="min-w-0 flex-1 font-semibold text-primary">
                  <span lang="en">{d.en}</span> <span lang="bn" className="font-bn font-normal text-ink">{d.bn}</span>
                </Link>
                <span aria-hidden="true" className="h-2 w-28 shrink-0 overflow-hidden rounded-full bg-surface-2">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${(count / most) * 100}%` }} />
                </span>
                <span className="w-10 shrink-0 text-right font-semibold"><Both value={n(count)} /></span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="jp-examples" className="space-y-3" data-examples>
        <h2 id="jp-examples" className="font-serif text-h2"><T k="source.examples" /></h2>
        <ul>
          {examples.map(x => (
            <li key={x.id} className="flex items-center justify-between gap-3 border-b border-line py-3">
              <Link prefetch={false} href={siteHref(x.id, x.slug)} className="min-w-0 hover:underline"><SiteName s={x} /></Link>
              <ConditionBadge condition={x.idx.c} />
            </li>
          ))}
        </ul>
        {s.sites.length > EXAMPLES ? (
          <p><a href="#sites" className="flex min-h-tap items-center justify-center rounded-md border border-line-strong bg-surface px-4 font-semibold" data-see-all>
            <T k="source.seeAll" vars={{ count: n(s.sites.length) }} />
          </a></p>
        ) : null}
      </section>

      <section id="sites" aria-labelledby="jp-all-sites" className="scroll-mt-24 space-y-4" data-all-sites={s.sites.length}>
        <h2 id="jp-all-sites" className="font-serif text-h2"><T k="source.allSites" /> <span className="text-muted">(<Both value={n(s.sites.length)} />)</span></h2>
        {groups.map(({ d, sites }) => (
          <div key={d.slug} className="space-y-1">
            <h3 className="font-semibold"><Both value={{ en: d.en, bn: d.bn }} /> <span className="font-normal text-muted">· <Both value={n(sites.length)} /></span></h3>
            <ul className="grid gap-x-6 md:grid-cols-2">
              {sites.map(x => (
                <li key={x.id} className="border-b border-line py-1.5 text-sm">
                  <Link prefetch={false} href={siteHref(x.id, x.slug)} className="text-primary underline-offset-4 hover:underline">
                    <span lang="en" data-l={x.bn ? 'en' : undefined}>{x.en}</span>
                    {x.bn ? <span lang="bn" data-l="bn">{x.bn}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
