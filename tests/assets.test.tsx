import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { iconSvg } from '../scripts/build-icons.mjs';
import { Lockup, LogoMark } from '@/components/brand/Logo';
import { ConditionGlyph, CONDITIONS } from '@/components/art/ConditionGlyph';
import { PlaceholderArt } from '@/components/art/PlaceholderArt';
import { NoPhotoIcon, NoResultsArt, NotFoundArt, OfflineIcon } from '@/components/art/EmptyStates';

describe('static assets (task 3.8)', () => {
  it('every public asset layout.tsx refers to exists', () => {
    const layout = readFileSync('app/layout.tsx', 'utf8');
    const refs = [...layout.matchAll(/'(\/[\w.-]+\.(?:svg|png))'/g)].map(m => m[1]);
    expect(refs.sort()).toEqual(['/apple-touch-icon.png', '/icon.svg']);
    for (const r of refs) expect(existsSync(`public${r}`), r).toBe(true);
  });

  it('public/icon.svg is the current logo geometry (run npm run icons after changing it)', () => {
    expect(readFileSync('public/icon.svg', 'utf8')).toBe(iconSvg());
  });

  it('apple-touch-icon.png is 180×180', async () => {
    const m = await sharp('public/apple-touch-icon.png').metadata();
    expect([m.format, m.width, m.height]).toEqual(['png', 180, 180]);
  });

  it('the mark drops its ruin details below 33 px, as the board does', () => {
    const big = renderToStaticMarkup(<LogoMark size={56} />), small = renderToStaticMarkup(<LogoMark size={32} />);
    expect(big).toContain('C42.5 32');         // the sprig
    expect(small).not.toContain('C42.5 32');
    expect(renderToStaticMarkup(<Lockup compact />)).toMatch(/Jomidarpedia.*জমিদারপিডিয়া/);
  });

  it('art is decorative and drawn in tokens only', () => {
    const all = [
      ...CONDITIONS.map(c => renderToStaticMarkup(<ConditionGlyph condition={c} />)),
      ...CONDITIONS.map(c => renderToStaticMarkup(<PlaceholderArt tint={c} />)),
      ...['card', 'thumb', 'band'].map(s => renderToStaticMarkup(<PlaceholderArt size={s as 'card'} />)),
      renderToStaticMarkup(<NotFoundArt />), renderToStaticMarkup(<NoResultsArt />), renderToStaticMarkup(<OfflineIcon />), renderToStaticMarkup(<NoPhotoIcon />),
      renderToStaticMarkup(<LogoMark />),
    ];
    for (const svg of all) {
      expect(svg).toMatch(/^<svg[^>]* aria-hidden="true"/);
      expect(svg).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(\d/i);
    }
    expect(new Set(CONDITIONS.map(c => renderToStaticMarkup(<PlaceholderArt tint={c} />))).size).toBe(5);
  });
});
