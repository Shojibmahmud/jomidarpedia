'use client';
// Client hooks that follow attributes on <html> (roadmap task 3.4). useUiLang is only for strings built
// at runtime (Leaflet labels, live regions, toasts): everything rendered on the server uses <T>, which
// needs no hook. On the server, and during hydration, the language is "en".

import { useSyncExternalStore } from 'react';
import type { Lang } from './i18n';
import { currentLang, currentLite, currentTheme, type Theme } from './prefs';

type Observer = { observe(target: Element, options: MutationObserverInit): void; disconnect(): void };
type ObserverClass = new (callback: () => void) => Observer;

/** Calls back whenever one of <html>'s attributes changes. Returns the unsubscribe function. */
export function watchHtml(attributes: string[], callback: () => void, root: Element = document.documentElement,
  Observer: ObserverClass = MutationObserver): () => void {
  const observer = new Observer(callback);
  observer.observe(root, { attributes: true, attributeFilter: attributes });
  return () => observer.disconnect();
}

const subscribeLang = (cb: () => void) => watchHtml(['data-lang'], cb);
const subscribeTheme = (cb: () => void) => watchHtml(['data-theme'], cb);
const subscribeLite = (cb: () => void) => watchHtml(['data-lite', 'data-lite-auto'], cb);

export function useUiLang(): Lang {
  return useSyncExternalStore(subscribeLang, () => currentLang(document.documentElement), () => 'en');
}

/** The theme choice on <html>; "system" on the server. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, () => currentTheme(document.documentElement), () => 'system');
}

/** Lite mode (spec 07 FR-35): true when <html data-lite="1">; false on the server and during hydration. */
export function useLite(): boolean {
  return useSyncExternalStore(subscribeLite, () => currentLite(document.documentElement), () => false);
}

/** True when Lite mode was switched on by Save-Data rather than by the visitor (FR-36). */
export function useLiteAuto(): boolean {
  return useSyncExternalStore(subscribeLite, () => document.documentElement.dataset.liteAuto === '1', () => false);
}

/** Whether a media query matches; false on the server and during hydration. */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    cb => { const m = window.matchMedia(query); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** The theme actually shown: a stored choice, or the OS preference for "system". */
export function useDark(): boolean {
  const theme = useTheme();
  const osDark = useMedia('(prefers-color-scheme: dark)');
  return theme === 'dark' || (theme === 'system' && osDark);
}
