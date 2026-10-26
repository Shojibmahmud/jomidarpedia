'use client';
// The selected site (roadmap task 7.6, spec 07 FR-28): a popover beside the pin from 1024 px, the
// selected-site sheet on phones. A non-modal dialog named by the site. Index fields only (D1, D2): photo
// and credit, both names, place, condition and access, the one-line summary, the location status label,
// travel time, one-way cost and day trip, then Read more and Directions (5.18). Unknowns stay words (R6).

import Link from 'next/link';
import { useEffect, useId, useRef } from 'react';
import { Both, Prose, SrT, T } from '@/components/T';
import { PlaceholderArt } from '@/components/art/PlaceholderArt';
import { AccessBadge, ConditionBadge, LocationBadge } from '@/components/site/Badges';
import { bucketLabel } from '@/lib/explore-labels';
import { both, formatHours, formatMoney } from '@/lib/format';
import { directionsUrl } from '@/lib/site-page';
import { siteHref } from '@/lib/site-url';
import type { IndexSite } from '@/lib/types';

function Tile({ value, label, tone = 'plain' }: { value: React.ReactNode; label: React.ReactNode; tone?: 'plain' | 'indigo' }) {
  return (
    <div className={`rounded-md px-3 py-2 ${tone === 'indigo' ? 'bg-indigo-tint text-indigo' : 'bg-surface-2'}`}>
      <p className="font-semibold">{value}</p>
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function SummaryCard({ site, variant, onClose, focusOnOpen = false }: {
  site: IndexSite; variant: 'popover' | 'sheet'; onClose: () => void; focusOnOpen?: boolean;
}) {
  const title = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (focusOnOpen) ref.current?.focus(); }, [focusOnOpen, site.i]);
  const place = { en: site.u ? `${site.u}, ${site.d}` : site.d, bn: site.u ? `${site.u}, ${site.db}` : site.db };
  const time = site.h !== undefined ? both(formatHours, site.h) : site.tb !== 'unknown' ? bucketLabel(site.tb) : null;
  const sheet = variant === 'sheet';
  return (
    <div ref={ref} role="dialog" aria-labelledby={title} tabIndex={-1} data-summary={site.i}
      className={`relative bg-surface text-ink outline-none ${sheet ? 'rounded-t-xl px-4 pb-4 pt-3 shadow-3' : 'w-[328px] overflow-hidden rounded-lg shadow-3'}`}>
      <button type="button" onClick={onClose} data-summary-close
        className={`absolute right-2 top-2 z-10 inline-flex min-h-tap min-w-tap items-center justify-center rounded-full ${sheet ? '' : 'bg-surface/90'} hover:bg-surface-2`}>
        <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
        <SrT k="summary.close" />
      </button>
      <div className={sheet ? 'flex gap-3 pr-10' : ''}>
        <figure className={sheet ? 'w-28 shrink-0' : ''}>
          {site.img ? (
            // eslint-disable-next-line @next/next/no-img-element -- static export: committed, pre-sized thumbnails
            <img src={`/thumbs/${site.img.id}.webp`} alt="" width={480} height={360} decoding="async"
              className={`aspect-[4/3] w-full bg-surface-2 object-cover ${sheet ? 'rounded-md' : ''}`} />
          ) : <PlaceholderArt size={sheet ? 'thumb' : 'card'} tint={site.c} className={sheet ? 'rounded-md' : ''} />}
          {site.img ? <figcaption lang="en" className={`text-xs text-muted [overflow-wrap:anywhere] ${sheet ? 'mt-1' : 'px-4 pt-2'}`} data-credit>{site.img.credit}</figcaption> : null}
        </figure>
        <div className={`min-w-0 space-y-1 ${sheet ? '' : 'px-4 pt-3'}`}>
          <h2 id={title} className="font-serif text-h3">
            <span lang="en" className="block">{site.e}</span>
            {site.b ? <span lang="bn" className="block font-bn text-bn-sm font-normal text-muted">{site.b}</span> : null}
          </h2>
          {site.b ? null : <p className="text-xs text-muted"><T k="common.bnNameMissing" /></p>}
          <p className="text-sm text-muted"><Both value={place} /></p>
          <p className="flex flex-wrap gap-1.5">
            <ConditionBadge condition={site.c} />
            <AccessBadge access={site.ac} fee={site.fe} />
          </p>
        </div>
      </div>
      <div className={`space-y-3 ${sheet ? 'pt-3' : 'px-4 pb-4 pt-2'}`}>
        {site.sm ? <p className="text-[15px] leading-6" data-summary-text><Prose en={site.sm} bn={site.smb} /></p> : null}
        <div data-summary-location><LocationBadge status={site.lc} mappable={!!site.ll} flagged={site.f === 1} /></div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <Tile tone="indigo" value={time ? <Both value={time} /> : <T k="card.timeUnknown" />} label={time ? <T k="summary.fromDhaka" /> : null} />
          {site.oc !== undefined
            ? <Tile value={<>~<Both value={both(formatMoney, site.oc)} /></>} label={<T k="summary.oneWay" />} />
            : null}
          <Tile value={<T k="summary.dayTrip" />} label={<T k={site.dt === 1 ? 'summary.dayTrip.yes' : site.dt === 0 ? 'summary.dayTrip.no' : 'summary.dayTrip.unknown'} />} />
        </div>
        <div className="flex gap-2">
          <Link prefetch={false} href={siteHref(site.i, site.s)} data-read-more
            className="inline-flex min-h-tap flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 font-semibold text-on-primary hover:bg-primary-hover">
            <T k="summary.readMore" />
            <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
          </Link>
          {site.ll ? (
            <a href={directionsUrl(site.ll)} target="_blank" rel="noopener noreferrer" data-directions
              className="inline-flex min-h-tap items-center justify-center gap-2 rounded-md border border-line-strong px-4 font-semibold hover:bg-surface-2">
              <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
              <T k="summary.directions" /><span className="sr-only"> <T k="common.newTab" /></span>
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
