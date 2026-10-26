// Visitor preferences: language, theme and Lite mode (roadmap tasks 3.3, 3.9, 7.9). Stored in localStorage as
// jp-lang ("bn", or absent for English), jp-theme ("light" or "dark", or absent to follow the OS) and
// jp-lite ("1" on, "0" off, or absent for automatic: on when the browser's data saver is on, O7).
// The boot script applies them before first paint; the toggles change them without a reload.
// Storage can throw (private mode, blocked site data): a change then applies to the open page only.

import type { Lang } from './i18n';

export type Theme = 'system' | 'light' | 'dark';
export const THEMES: readonly Theme[] = ['system', 'light', 'dark'];
export const LANG_KEY = 'jp-lang';
export const THEME_KEY = 'jp-theme';
export const LITE_KEY = 'jp-lite';

type Root = { lang: string; dataset: DOMStringMap };
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

// Inlined in <head> by app/layout.tsx. <html> always ends with data-lang: "bn" only when stored, else "en".
// A stored theme other than light or dark is ignored, and so is a storage exception.
// Lite mode sets data-lite="1" when stored on, or when nothing is stored and Save-Data is on; the automatic
// case also sets data-lite-auto="1" for the "We switched to Lite mode" note (spec 07 FR-35, FR-36).
// When storage throws, Lite mode follows Save-Data only.
/** The drawing shown in place of a local photo that fails to load (public/placeholder.svg). */
export const PHOTO_FALLBACK = '/placeholder.svg';

export const BOOT_SCRIPT =
  `(function(d){d.dataset.lang='en';try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')d.dataset.theme=t;` +
  `if(localStorage.getItem('${LANG_KEY}')==='bn'){d.lang='bn';d.dataset.lang='bn'}}catch(e){}` +
  `var l=null;try{l=localStorage.getItem('${LITE_KEY}')}catch(e){}` +
  `var c=typeof navigator!=='undefined'&&navigator.connection;` +
  `if(l==='1'||(l!=='0'&&c&&c.saveData)){d.dataset.lite='1';if(l!=='1')d.dataset.liteAuto='1'}` +
  // A local photo that fails to load shows the placeholder drawing instead (spec 13 FR-16). Registered here, before
  // any image loads, so a failure before hydration is caught too; Wikimedia files (the lightbox) handle their own.
  `if(d.addEventListener)d.addEventListener('error',function(e){var i=e.target;if(!i||i.tagName!=='IMG'||i.dataset.failed)return;` +
  `try{if(new URL(i.currentSrc||i.src).origin!==location.origin)return}catch(x){return}` +
  `i.dataset.failed='1';i.removeAttribute('srcset');i.src='${PHOTO_FALLBACK}'},true)` +
  `})(document.documentElement)`;

export const currentLite = (root: Root): boolean => root.dataset.lite === '1';
export const currentLang = (root: Root): Lang => (root.dataset.lang === 'bn' ? 'bn' : 'en');
export const currentTheme = (root: Root): Theme => (root.dataset.theme === 'light' || root.dataset.theme === 'dark' ? root.dataset.theme : 'system');

function save(storage: Store | undefined, key: string, value: string | null) {
  try {
    if (value === null) storage?.removeItem(key);
    else storage?.setItem(key, value);
  } catch { /* the change still applies to this page */ }
}

export function applyLang(lang: Lang, root: Root, storage?: Store) {
  root.dataset.lang = lang;
  root.lang = lang;
  save(storage, LANG_KEY, lang === 'bn' ? 'bn' : null);
}

/** "system" removes the stored choice, so the prefers-color-scheme block in app/tokens.css applies. */
export function applyTheme(theme: Theme, root: Root, storage?: Store) {
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
  save(storage, THEME_KEY, theme === 'system' ? null : theme);
}

/** A manual choice always wins over Save-Data (O7): it is stored as "1" or "0" and clears the automatic note. */
export function applyLite(on: boolean, root: Root, storage?: Store) {
  if (on) root.dataset.lite = '1';
  else delete root.dataset.lite;
  delete root.dataset.liteAuto;
  save(storage, LITE_KEY, on ? '1' : '0');
}

/** localStorage, or undefined when even reading the property throws. */
export function browserStorage(): Store | undefined {
  try { return window.localStorage; } catch { return undefined; }
}
