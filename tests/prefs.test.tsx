import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { applyLang, applyTheme, BOOT_SCRIPT, currentTheme } from '@/lib/prefs';
import { useTheme, useUiLang, watchHtml } from '@/lib/use-ui-lang';
import { LanguageToggle, ThemeToggle } from '@/components/shell/Toggles';

function fakeRoot() {
  return { lang: 'en', dataset: {} as Record<string, string> };
}
function fakeStorage(init: Record<string, string> = {}, broken = false) {
  const data = { ...init };
  const guard = () => { if (broken) throw new Error('SecurityError'); };
  return {
    data,
    getItem: (k: string) => { guard(); return k in data ? data[k] : null; },
    setItem: (k: string, v: string) => { guard(); data[k] = v; },
    removeItem: (k: string) => { guard(); delete data[k]; },
  };
}
// Runs the boot script the way the browser would, against a fake <html> and localStorage.
function boot(storage: ReturnType<typeof fakeStorage>) {
  const root = fakeRoot();
  new Function('document', 'localStorage', BOOT_SCRIPT)({ documentElement: root }, storage);
  return root;
}

describe('boot script (task 3.3)', () => {
  it('always sets data-lang: English by default', () => {
    const root = boot(fakeStorage());
    expect(root.dataset.lang).toBe('en');
    expect(root.lang).toBe('en');
    expect(root.dataset.theme).toBeUndefined();
  });

  it('applies a stored Bangla and theme choice', () => {
    const root = boot(fakeStorage({ 'jp-lang': 'bn', 'jp-theme': 'dark' }));
    expect([root.dataset.lang, root.lang, root.dataset.theme]).toEqual(['bn', 'bn', 'dark']);
  });

  it('ignores stored garbage and a storage that throws', () => {
    const root = boot(fakeStorage({ 'jp-lang': 'fr', 'jp-theme': 'purple' }));
    expect([root.dataset.lang, root.lang, root.dataset.theme]).toEqual(['en', 'en', undefined]);
    const broken = boot(fakeStorage({}, true));
    expect(broken.dataset.lang).toBe('en');
  });
});

describe('toggles (task 3.9)', () => {
  it('language: switches <html> and stores only Bangla', () => {
    const root = fakeRoot(), store = fakeStorage();
    applyLang('bn', root, store);
    expect([root.lang, root.dataset.lang, store.data['jp-lang']]).toEqual(['bn', 'bn', 'bn']);
    applyLang('en', root, store);
    expect([root.lang, root.dataset.lang, store.data['jp-lang']]).toEqual(['en', 'en', undefined]);
  });

  it('theme: System clears the stored choice and data-theme', () => {
    const root = fakeRoot(), store = fakeStorage();
    applyTheme('dark', root, store);
    expect([root.dataset.theme, store.data['jp-theme'], currentTheme(root)]).toEqual(['dark', 'dark', 'dark']);
    applyTheme('system', root, store);
    expect([root.dataset.theme, store.data['jp-theme'], currentTheme(root)]).toEqual([undefined, undefined, 'system']);
  });

  it('still switches the page when storage throws', () => {
    const root = fakeRoot();
    applyLang('bn', root, fakeStorage({}, true));
    applyTheme('light', root, fakeStorage({}, true));
    expect([root.dataset.lang, root.dataset.theme]).toEqual(['bn', 'light']);
  });

  it('render on the server with English and System pressed, labels in both languages', () => {
    const lang = renderToStaticMarkup(<LanguageToggle />);
    expect(lang).toMatch(/aria-pressed="true"[^>]*><span lang="en">EN/);
    expect(lang).toContain('data-l="bn">ভাষা');
    const theme = renderToStaticMarkup(<ThemeToggle />);
    expect(theme.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(theme).toMatch(/aria-pressed="true"[^]*?System/);
  });
});

describe('useUiLang (task 3.4)', () => {
  it('reads "en" on the server', () => {
    function Probe() { return <>{useUiLang()}/{useTheme()}</>; }
    expect(renderToStaticMarkup(<Probe />)).toBe('en/system');
  });

  it('watches data-lang on <html> and stops when unsubscribed', () => {
    const calls: string[] = [];
    let fire = () => {};
    class FakeObserver {
      constructor(cb: () => void) { fire = cb; }
      observe(_t: Element, o: MutationObserverInit) { calls.push(`observe ${o.attributeFilter}`); }
      disconnect() { calls.push('disconnect'); }
    }
    let changed = 0;
    const stop = watchHtml(['data-lang'], () => changed++, {} as Element, FakeObserver);
    fire();
    stop();
    expect(changed).toBe(1);
    expect(calls).toEqual(['observe data-lang', 'disconnect']);
  });
});
