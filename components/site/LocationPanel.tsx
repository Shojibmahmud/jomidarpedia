// "Location" (roadmap tasks 5.6, 5.16, 5.18, 7.10; spec 05 FR-18 to FR-21, spec 07 FR-40, FR-41). Five states:
// verified, single source, approximate, unverified (O9) and no pin. A mappable site gets the mini map and
// "Open in Explore" (D13). A hidden pin gets no map, no coordinates, no copy button and no outbound map link
// (R5); its note is left out by the build because it may name coordinates.

import Link from 'next/link';
import { Latin, T } from '@/components/T';
import { MiniMap } from '@/components/map/MiniMap';
import { formatCoords } from '@/lib/format';
import { coordsText, directionsUrl } from '@/lib/site-page';
import type { SiteRecord } from '@/lib/types';
import { LocationBadge } from './Badges';
import { CopyButton } from './CopyButton';
import { SuggestCorrection } from './SuggestCorrection';

const OUT = 'inline-flex min-h-tap items-center gap-2 rounded-md px-4 font-semibold';

export function LocationPanel({ site, pageUrl }: { site: SiteRecord; pageUrl: string }) {
  const { place: p, location: loc } = site;
  const ll = loc.latlon;
  const en = [p.locality, p.union, p.upazila, p.district].filter(Boolean).filter((x, k, a) => a.indexOf(x) === k).join(', ');
  const bn = [p.localityBn, p.unionBn, p.upazilaBn, p.districtBn].filter(Boolean).filter((x, k, a) => a.indexOf(x) === k).join(', ');
  const status = !ll ? 'noPin' : loc.status === 'not_found' ? 'unverified' : loc.status;
  return (
    <div className={`gap-5 rounded-lg border border-line bg-surface p-5 ${ll ? 'md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : ''}`} data-location-state={status}>
      {ll ? (
        <div className="mb-4 space-y-2 md:mb-0">
          <MiniMap site={{ e: site.name.en, ll, lc: loc.status, f: loc.flagged ? 1 : undefined, c: site.condition }} />
          <Link prefetch={false} href={`/explore/?view=map&sel=${site.id}`} data-open-explore
            className="inline-flex min-h-tap items-center gap-2 rounded-md border border-line-strong px-4 font-semibold hover:bg-surface-2">
            <T k="mini.openExplore" />
          </Link>
        </div>
      ) : null}
      <div className="space-y-4">
      <div>
        <p className="font-semibold" lang="en">{en}</p>
        {bn ? <p lang="bn" className="font-bn text-muted">{bn}</p> : null}
        <p className="text-sm text-muted"><Latin>{p.division} Division</Latin></p>
      </div>
      <div className="space-y-1">
        <LocationBadge status={loc.status} mappable={!!ll} flagged={loc.flagged} />
        <p className="text-sm"><T k={`location.${status}.body`} /></p>
        {ll && loc.note ? <p className="text-sm text-muted"><Latin>{loc.note}</Latin></p> : null}
        {ll && loc.status === 'approximate' ? <p className="text-sm italic text-muted"><T k="location.radius" /></p> : null}
      </div>
      {ll ? (
        <>
          <p className="text-sm"><span className="font-semibold"><T k="location.coords" />:</span> <Latin><span className="font-mono">{formatCoords(ll[0], ll[1])}</span></Latin></p>
          <div className="flex flex-wrap gap-2">
            <CopyButton value={coordsText(ll)} label="location.copy" ok="coords.copied" failed="coords.failed" />
            <a href={directionsUrl(ll)} target="_blank" rel="noopener noreferrer" className={`${OUT} bg-primary text-on-primary hover:bg-primary-hover`} data-directions>
              <T k="location.directions" /><span className="sr-only"> <T k="common.newTab" /></span>
            </a>
            {loc.googleMapsUrl ? (
              <a href={loc.googleMapsUrl} target="_blank" rel="noopener noreferrer" className={`${OUT} border border-line-strong`}>
                <T k="location.openGoogle" /><span className="sr-only"> <T k="common.newTab" /></span>
              </a>
            ) : null}
          </div>
        </>
      ) : (
        <SuggestCorrection siteId={site.id} pageUrl={pageUrl} field="location" k="location.suggest" look="button" />
      )}
      </div>
    </div>
  );
}
