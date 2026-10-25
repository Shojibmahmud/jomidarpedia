import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../scripts/csv.mjs';
import { CONDITIONS } from '@/components/art/ConditionGlyph';
import { HOME_SAMPLE_IDS } from './fixtures/sample-sites';
import { STRINGS } from '@/lib/i18n';
import { canonicalUrl, indexable, siteHref, siteIdHref } from '@/lib/site-url';

describe('site URLs (spec 04 FR-6, FR-7)', () => {
  it('builds the slug and ID routes with trailing slashes', () => {
    expect(siteHref('JB-DHK-064', 'baliati-palace')).toBe('/site/JB-DHK-064/baliati-palace/');
    expect(siteIdHref('JB-DHK-064')).toBe('/site/JB-DHK-064/');
  });

  it('keeps canonical links root-relative until SITE_URL is set', () => {
    expect(canonicalUrl('/site/x/y/', {})).toBe('/site/x/y/');
    expect(canonicalUrl('/site/x/y/', { SITE_URL: 'https://example.org' })).toBe('https://example.org/site/x/y/');
  });
});

describe('indexing (spec 04 FR-9)', () => {
  it('only release builds may be indexed', () => {
    expect(indexable({ JP_DATA_MODE: 'local' })).toBe(false);
    expect(indexable({ JP_DATA_MODE: 'preview' })).toBe(false);
    expect(indexable({ VERCEL_ENV: 'preview' })).toBe(false);
    expect(indexable({})).toBe(true);
    expect(indexable({ VERCEL_ENV: 'production', JP_DATA_MODE: 'local' })).toBe(true);
  });
});

describe('skeleton strings and samples (spec 04 FR-4, FR-8)', () => {
  it('has a condition label for every condition token', () => {
    for (const c of CONDITIONS) expect(STRINGS, c).toHaveProperty(`condition.${c}`);
  });

  it('every home sample is a site in the data', () => {
    const ids = new Set(parseCsv(readFileSync('data/csv/sites.csv', 'utf8')).rows.map((r: Record<string, string>) => r.site_id));
    expect(HOME_SAMPLE_IDS).toHaveLength(5);
    for (const id of HOME_SAMPLE_IDS) expect(ids.has(id), id).toBe(true);
  });
});
