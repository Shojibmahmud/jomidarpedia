// "Suggest a correction" (roadmap task 5.13, spec 05 FR-39): a link to the public corrections repository's
// issue form (O1), prefilled with the site ID, the field and the page URL. The "Share a photo" variant opens
// the photo-offer form; nothing is uploaded. The email fallback stays hidden until O2 gives an address.

import { T } from '@/components/T';
import type { StringKey } from '@/lib/i18n';
import { correctionUrl, type CorrectionField } from '@/lib/site-page';

const STYLE = {
  button: 'inline-flex min-h-tap items-center gap-2 rounded-md bg-primary px-4 font-semibold text-on-primary hover:bg-primary-hover',
  outline: 'inline-flex min-h-tap items-center gap-2 rounded-md border border-line-strong bg-surface px-4 font-semibold',
  link: 'inline-flex min-h-[24px] items-center font-semibold text-primary underline',
} as const;

export function SuggestCorrection({ siteId, pageUrl, field, k = 'correct.suggest', look = 'link' }: {
  siteId: string; pageUrl: string; field: CorrectionField | 'photo'; k?: StringKey; look?: keyof typeof STYLE;
}) {
  return (
    <a href={correctionUrl(siteId, pageUrl, field)} target="_blank" rel="noopener noreferrer" className={STYLE[look]} data-correction={field}>
      <T k={k} /><span className="sr-only"> <T k="common.newTab" /></span>
    </a>
  );
}
