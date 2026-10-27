// The correction form as a page (docs/URLS.md). Links normally open it as a popup (CorrectionDialog); this page
// is what a new tab, or a browser without JavaScript, gets. Not indexed: it is a form, not content.

import type { Metadata } from 'next';
import { CorrectionPageForm } from '@/components/correction/CorrectionPageForm';
import { pageMeta } from '@/lib/seo';

export function generateMetadata(): Metadata {
  return {
    ...pageMeta({ title: 'Suggest a correction', path: '/correction/', canonical: false, description: 'Tell the Jomidarpedia editor about a mistake, a missing detail or a photo you can share.' }),
    robots: { index: false, follow: true },
  };
}

export default function CorrectionPage() {
  return (
    <main id="main" className="mx-auto max-w-[640px] px-4 py-8 lg:py-12" data-correction-page>
      <CorrectionPageForm />
    </main>
  );
}
