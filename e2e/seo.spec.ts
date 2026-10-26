// Page metadata in the built pages (roadmap task 13.11; spec 13 FR-34, FR-38, FR-39, AC-17, AC-19, AC-20).
// Reads out/ directly: no browser is needed to check what a crawler or a share preview reads.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { expect, test } from './fixtures';
import type { SiteRecord } from '../lib/types';

const OUT = 'out';
const site = (id: string): SiteRecord => JSON.parse(readFileSync(`data/build/sites/${id}.json`, 'utf8'));

function pages(dir = OUT): { path: string; html: string }[] {
  const found: { path: string; html: string }[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (e.name !== '_next') walk(p); } else if (e.name === 'index.html') {
        const rel = relative(dir, p).split(sep).slice(0, -1).join('/');
        found.push({ path: rel ? `/${rel}/` : '/', html: readFileSync(p, 'utf8') });
      }
    }
  };
  walk(dir);
  return found;
}

const head = (html: string) => html.slice(0, html.indexOf('</head>'));
const meta = (html: string, attr: 'name' | 'property', key: string) =>
  head(html).match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1];
const title = (html: string) => head(html).match(/<title>([^<]*)<\/title>/)?.[1];

// Pages a release build lets search engines index: everything but the ID redirects, the 404 page and /dev/.
const isRedirect = (p: string) => /^\/site\/[^/]+\/$/.test(p);
const indexable = () => pages().filter(p => !isRedirect(p.path) && !/^\/(404|_not-found|dev)\//.test(p.path));

test('every indexable page has a title and a description, and no two share a title (AC-17)', () => {
  const all = indexable();
  expect(all.length).toBeGreaterThan(2000);
  const seen = new Map<string, string>();
  const problems: string[] = [];
  for (const p of all) {
    const t = title(p.html);
    const d = meta(p.html, 'name', 'description');
    if (!t) problems.push(`${p.path}: no title`);
    if (!d) problems.push(`${p.path}: no description`);
    if (t && seen.has(t)) problems.push(`${p.path}: same title as ${seen.get(t)}: ${t}`);
    if (t) seen.set(t, p.path);
  }
  expect(problems).toEqual([]);
});

/** The file an og:image URL names, inside out/ (the origin is SITE_URL, or Next's fallback without it). */
const ogFile = (url: string) => join(OUT, new URL(url, 'http://x').pathname);

test('share images: the hero on Home, the first photo on a site page, the default card otherwise (AC-19)', () => {
  const read = (path: string) => readFileSync(join(OUT, path, 'index.html'), 'utf8');
  const withPhoto = site('JB-DHK-064');
  const noPhoto = site('JB-RAJ-002');
  expect(noPhoto.images).toEqual([]);
  const cases = [
    { path: '/', image: '/home/IMG-DHK-101-001-1600.webp' },
    { path: `/site/${withPhoto.id}/${withPhoto.slug}/`, image: withPhoto.images[0].thumb },
    { path: `/site/${noPhoto.id}/${noPhoto.slug}/`, image: '/og-default.png' },
    { path: '/explore/', image: '/og-default.png' },
  ];
  for (const c of cases) {
    const html = read(c.path);
    for (const key of ['og:title', 'og:description', 'og:url', 'og:type', 'og:image', 'og:image:width', 'og:image:height']) {
      expect(meta(html, 'property', key), `${c.path} ${key}`).toBeTruthy();
    }
    expect(meta(html, 'name', 'twitter:card'), c.path).toBe('summary_large_image');
    const image = meta(html, 'property', 'og:image')!;
    expect(new URL(image, 'http://x').pathname, c.path).toBe(c.image);
    expect(existsSync(ogFile(image)), `${c.path}: ${image} is in out/`).toBe(true);
  }
});

test('ID redirects and the 404 page are noindex in every mode (AC-20)', () => {
  const redirect = pages().find(p => isRedirect(p.path))!;
  expect(meta(redirect.html, 'name', 'robots')).toMatch(/noindex/);
  expect(meta(readFileSync(join(OUT, '404.html'), 'utf8'), 'name', 'robots')).toMatch(/noindex/);
});

test('robots.txt matches the build mode (FR-37)', () => {
  const robots = readFileSync(join(OUT, 'robots.txt'), 'utf8');
  const release = !meta(readFileSync(join(OUT, 'index.html'), 'utf8'), 'name', 'robots');
  if (release) expect(robots).toMatch(/^User-agent: \*\nAllow: \/\n/);
  else expect(robots).toBe('User-agent: *\nDisallow: /\n');
});
