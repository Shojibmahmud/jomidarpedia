import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { Both, Latin, SrT, T } from '@/components/T';
import { dual, needsReview, STRINGS, text, type StringKey } from '@/lib/i18n';

const keys = Object.keys(STRINGS) as StringKey[];
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

describe('dictionary (task 3.1)', () => {
  it('has both languages for every key, with the same placeholders', () => {
    for (const k of keys) {
      const { en, bn } = STRINGS[k];
      expect(en.trim(), k).not.toBe('');
      expect(bn.trim(), k).not.toBe('');
      expect(placeholders(bn), k).toEqual(placeholders(en));
    }
  });

  it('keeps data values out of strings: no digits typed into the text', () => {
    for (const k of keys) expect(STRINGS[k].en.replace(/BY 3\.0/g, ''), k).not.toMatch(/\d/);
  });

  it('fills placeholders and refuses missing or unused values', () => {
    const date = { en: '21 October 2026', bn: '২১ অক্টোবর ২০২৬' };
    expect(text('footer.updated', 'en', { date })).toBe('Data last updated 21 October 2026');
    expect(text('footer.updated', 'bn', { date })).toContain('২১ অক্টোবর ২০২৬');
    expect(() => text('footer.updated', 'en')).toThrow(/needs a value for \{date\}/);
    expect(() => text('nav.explore', 'en', { date })).toThrow(/has no \{date\}/);
  });

  it('rejects an unknown key at compile time', () => {
    // @ts-expect-error: not a key of STRINGS. If this line stops being an error, typecheck fails.
    expect(() => dual('nav.nope')).toThrow(/unknown key/);
  });

  it('lists the Bangla drafts awaiting review', () => {
    const drafts = needsReview();
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts).toEqual([...drafts].sort());
    console.log(`Bangla drafts awaiting review (${drafts.length} of ${keys.length}): ${drafts.join(', ')}`);
  });
});

describe('<T> and friends (task 3.1, I3)', () => {
  it('renders both languages as sibling spans and nothing else', () => {
    expect(renderToStaticMarkup(<T k="nav.explore" />)).toBe('<span lang="en" data-l="en">Explore</span><span lang="bn" data-l="bn">মানচিত্র</span>');
    expect(renderToStaticMarkup(<Both value={{ en: '413', bn: '৪১৩' }} />)).toBe('<span lang="en" data-l="en">413</span><span lang="bn" data-l="bn">৪১৩</span>');
  });

  it('keeps Latin text marked English, and control names visually hidden', () => {
    expect(renderToStaticMarkup(<Latin>JB-DHK-064</Latin>)).toBe('<span lang="en">JB-DHK-064</span>');
    expect(renderToStaticMarkup(<SrT k="nav.search" />)).toMatch(/^<span class="sr-only"><span lang="en" data-l="en">Search<\/span><span lang="bn" data-l="bn">খুঁজুন<\/span><\/span>$/);
  });

  it('hides the inactive language with CSS keyed on <html data-lang>', () => {
    const css = readFileSync('app/tokens.css', 'utf8');
    expect(css).toContain('html:not([data-lang="bn"]) [data-l="bn"] { display: none !important; }');
    expect(css).toContain('html[data-lang="bn"] [data-l="en"] { display: none !important; }');
  });
});
