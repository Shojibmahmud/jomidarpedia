'use client';
// "Print or save as PDF" (roadmap task 9.10, spec 09 FR-46, R9): the browser's own print, no PDF library.
// The layout is the page's print CSS (app/tokens.css and the print: classes on the trip page).

import { T } from '@/components/T';

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} data-print-button
      className="inline-flex min-h-tap items-center gap-2 rounded-md bg-primary px-4 font-semibold text-on-primary hover:bg-primary-hover">
      <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
        <path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z" />
      </svg>
      <T k="print.button" />
    </button>
  );
}
