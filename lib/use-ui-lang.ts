'use client';
// Client hooks that follow attributes on <html> (roadmap task 3.4). useUiLang is only for strings built
// at runtime (Leaflet labels, live regions, toasts): everything rendered on the server uses <T>, which
// needs no hook. On the server, and during hydration, the language is "en".

import { useSyncExternalStore } from 'react';
import type { Lang } from './i18n';
import { currentLang, currentTheme, type Theme } from './prefs';

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

export function useUiLang(): Lang {
  return useSyncExternalStore(subscribeLang, () => currentLang(document.documentElement), () => 'en');
}

/** The theme choice on <html>; "system" on the server. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, () => currentTheme(document.documentElement), () => 'system');
}
