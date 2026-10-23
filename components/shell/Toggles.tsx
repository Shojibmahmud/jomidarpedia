'use client';
// LanguageToggle and ThemeToggle (roadmap task 3.9). Each is a group of buttons with aria-pressed.
// They change <html> without a reload and store the choice (lib/prefs.ts); the boot script in
// app/layout.tsx re-applies it before first paint on the next page. Labels use <T>, so they are in the
// HTML in both languages like every other interface string. Until hydration the state reads as the
// server default (English, System); the page itself is already correct because the boot script set it.

import { useId } from 'react';
import { T, SrT } from '@/components/T';
import { applyLang, applyTheme, browserStorage, THEMES, type Theme } from '@/lib/prefs';
import { useTheme, useUiLang } from '@/lib/use-ui-lang';
import type { Lang } from '@/lib/i18n';

const group = 'inline-flex items-center rounded-full border border-line-strong bg-surface p-0.5';
const item = 'inline-flex min-h-tap min-w-tap items-center justify-center rounded-full px-3 text-sm font-semibold text-muted aria-pressed:bg-ink aria-pressed:text-bg';

export function LanguageToggle() {
  const lang = useUiLang();
  const label = useId();
  const choose = (l: Lang) => applyLang(l, document.documentElement, browserStorage());
  return (
    <div role="group" aria-labelledby={label} className={group}>
      <span id={label} className="sr-only"><T k="lang.label" /></span>
      <button type="button" aria-pressed={lang === 'en'} onClick={() => choose('en')} className={item}>
        <span lang="en">EN</span><span className="sr-only"> <T k="lang.en" /></span>
      </button>
      <button type="button" aria-pressed={lang === 'bn'} onClick={() => choose('bn')} className={`${item} font-bn`}>
        <span lang="bn">বাং</span><span className="sr-only"> <T k="lang.bn" /></span>
      </button>
    </div>
  );
}

const ICON: Record<Theme, React.ReactNode> = {
  system: <><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M8 20h8M12 16v4" /></>,
  light: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  dark: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
};

export function ThemeToggle() {
  const theme = useTheme();
  const label = useId();
  return (
    <div role="group" aria-labelledby={label} className={group}>
      <span id={label} className="sr-only"><T k="theme.label" /></span>
      {THEMES.map(th => (
        <button key={th} type="button" aria-pressed={theme === th} onClick={() => applyTheme(th, document.documentElement, browserStorage())} className={item}>
          <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">{ICON[th]}</svg>
          <SrT k={`theme.${th}`} />
        </button>
      ))}
    </div>
  );
}
