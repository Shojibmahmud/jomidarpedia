// Dual-language rendering (roadmap task 3.1, I3). Server components with no client JavaScript and no
// React context: both languages are in the HTML, and app/tokens.css hides the one not named by
// <html data-lang>. A hidden span is display:none, so screen readers skip it too.

import { dual, type Dual, type StringKey, type Vars } from '@/lib/i18n';

/** Two strings, one per language. Use for values from lib/format.ts and bilingual data. */
export function Both({ value }: { value: Dual }) {
  return (
    <>
      <span lang="en" data-l="en">{value.en}</span>
      <span lang="bn" data-l="bn">{value.bn}</span>
    </>
  );
}

/** An interface string from lib/i18n.ts, in both languages. */
export function T({ k, vars }: { k: StringKey; vars?: Vars }) {
  return <Both value={dual(k, vars)} />;
}

/** Text that keeps Latin script in Bangla mode: IDs, coordinates, English-only prose (O6). */
export function Latin({ children }: { children: React.ReactNode }) {
  return <span lang="en">{children}</span>;
}

/** An accessible name for an icon-only control, in both languages (visually hidden). */
export function SrT({ k }: { k: StringKey }) {
  return <span className="sr-only"><T k={k} /></span>;
}
