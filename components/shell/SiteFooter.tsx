// Site footer (roadmap task 3.9): the contact address, when the data was last updated, the map credit, and links
// to Credits, Licences, Sources and Suggest a correction. Counts and dates come from meta.json, never from copy.

import Link from 'next/link';
import { LogoMark } from '@/components/brand/Logo';
import { T } from '@/components/T';
import { getMeta } from '@/lib/data';
import { both, formatCount, formatDate } from '@/lib/format';
import { CONTACT_EMAIL, CORRECTIONS_URL, FOOTER_LINKS } from '@/lib/nav';

export function SiteFooter() {
  const meta = getMeta();
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-page gap-6 px-4 py-10 lg:grid-cols-[1fr_auto] lg:px-8">
        <div className="max-w-xl space-y-3">
          <p className="flex items-center gap-2 font-semibold">
            <LogoMark size={24} />
            <span lang="en" className="font-wordmark uppercase tracking-[0.06em]">Jomidarpedia</span>
            <span className="text-muted">·</span>
            <span className="text-muted"><T k="footer.siteCount" vars={{ count: both(formatCount, meta.counts.sites) }} /></span>
          </p>
          <p className="text-sm text-muted"><T k="footer.tagline" /></p>
          <p className="text-sm">
            <T k="footer.contact" />{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} lang="en" className="font-semibold text-primary underline underline-offset-4" data-contact>{CONTACT_EMAIL}</a>
          </p>
          <p className="text-sm"><T k="footer.updated" vars={{ date: both(formatDate, meta.lastVerified) }} /></p>
          <p className="text-xs text-muted"><T k="footer.mapCredit" /></p>
        </div>
        <ul className="grid content-start gap-1 text-[15px] md:grid-cols-2 lg:grid-cols-1">
          {FOOTER_LINKS.map(l => (
            <li key={l.href}>
              {l.href === CORRECTIONS_URL
                ? <a href={l.href} className="inline-flex min-h-tap items-center font-semibold text-primary underline underline-offset-4"><T k={l.k} /></a>
                : <Link prefetch={false} href={l.href} className="inline-flex min-h-tap items-center font-semibold underline-offset-4 hover:underline"><T k={l.k} /></Link>}
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
