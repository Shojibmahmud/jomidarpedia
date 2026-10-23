// Both names of a site (R10). The Bangla name is shown in Bangla script whatever the interface
// language; when it is missing (O13) the English name stands alone and the caller may add the
// "not yet recorded" note. The site page uses BilingualName (components/site/Header.tsx); this stays for the home samples until Phase 11.

export function SiteNames({ en, bn, bnClassName = '' }: { en: string; bn?: string; bnClassName?: string }) {
  return (
    <>
      <span lang="en">{en}</span>
      {bn ? <span lang="bn" className={`block font-bn ${bnClassName}`}>{bn}</span> : null}
    </>
  );
}
