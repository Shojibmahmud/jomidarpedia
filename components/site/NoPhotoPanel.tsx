// Shown instead of the gallery when a site has no Ready image (roadmap task 5.14, spec 05 FR-42): the
// placeholder art, the outbound photo link from the data (O10: a name-only search for hidden pins) and the
// photo-offer form (5.13). Nothing is uploaded or embedded.

import { T } from '@/components/T';
import { PlaceholderArt } from '@/components/art/PlaceholderArt';
import { NoPhotoIcon } from '@/components/art/EmptyStates';
import type { SiteRecord } from '@/lib/types';
import { SuggestCorrection } from './SuggestCorrection';

export function NoPhotoPanel({ site, pageUrl }: { site: SiteRecord; pageUrl: string }) {
  const ext = site.externalPhotos;
  return (
    <div className="grid overflow-hidden rounded-lg border border-line bg-surface md:grid-cols-[3fr_2fr]" data-no-photo>
      <PlaceholderArt size="band" tint={site.condition} className="md:h-full" />
      <div className="space-y-3 p-5">
        <p className="flex items-center gap-2 font-serif text-h3"><NoPhotoIcon /><T k="photo.none" /></p>
        <p className="text-sm"><T k="photo.noneBody" /></p>
        {ext ? (
          <>
            <p className="text-sm text-muted"><T k="photo.externalNote" /></p>
            <a href={ext.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center rounded-md border border-line-strong px-4 font-semibold" data-external-photos>
              <span lang="en">{ext.label}</span><span className="sr-only"> <T k="common.newTab" /></span>
            </a>
          </>
        ) : null}
        <div><SuggestCorrection siteId={site.id} pageUrl={pageUrl} field="photo" k="photo.offer" look="button" /></div>
        <p className="text-xs text-muted"><T k="photo.offerNote" /></p>
      </div>
    </div>
  );
}
