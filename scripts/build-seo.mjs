#!/usr/bin/env node
// `npm run seo`, run after `next build` by `build` and `build:local` (roadmap task 13.11; spec 13 FR-36, FR-37, A-3).
// Writes out/robots.txt in every mode and out/sitemap.xml in release mode when SITE_URL is set.
// The sitemap lists every exported page that does not carry a noindex robots meta: the ID redirects
// (/site/<id>/), the 404 page and /dev/ are noindex, so they are left out without a separate list.
// Local and preview builds are never indexed, so their robots.txt disallows everything (§2.4).

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveMode } from './data-mode.mjs';

const NOINDEX = /<meta name="robots" content="[^"]*noindex/;

/** Every index.html under dir, as its page path ("/", "/explore/", …). */
export function pagePaths(dir) {
  const found = [];
  const walk = d => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (e.name !== '_next') walk(p); }
      else if (e.name === 'index.html') found.push(p);
    }
  };
  walk(dir);
  return found.map(f => {
    const rel = relative(dir, f).split(sep).slice(0, -1).join('/');
    return { file: f, path: rel ? `/${rel}/` : '/' };
  });
}

/** The pages a search engine may index: no noindex meta, and not a Next internal page. */
export function indexablePages(dir) {
  return pagePaths(dir)
    .filter(p => !p.path.startsWith('/_') && !p.path.startsWith('/dev/') && p.path !== '/404/')
    .filter(p => !NOINDEX.test(readFileSync(p.file, 'utf8')))
    .map(p => p.path)
    .sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));
}

const xmlEscape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function sitemapXml(paths, base) {
  const urls = paths.map(p => `  <url><loc>${xmlEscape(new URL(p, base).href)}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function robotsTxt({ indexable, sitemap }) {
  if (!indexable) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\n${sitemap ? `\nSitemap: ${sitemap}\n` : ''}`;
}

/** @param {{ dir?: string, env?: Record<string, string | undefined> }} [options] */
export function buildSeo({ dir = 'out', env = process.env } = {}) {
  if (!existsSync(dir)) throw new Error(`${dir}/ does not exist: run next build first`);
  const { mode } = resolveMode(env);
  const base = env.SITE_URL?.trim();
  const indexable = mode === 'release';
  const lines = [];
  let sitemap;
  if (indexable && base) {
    const paths = indexablePages(dir);
    writeFileSync(join(dir, 'sitemap.xml'), sitemapXml(paths, base));
    sitemap = new URL('/sitemap.xml', base).href;
    lines.push(`wrote ${dir}/sitemap.xml (${paths.length} pages)`);
  } else if (indexable) {
    lines.push('warning: SITE_URL is not set, so no sitemap.xml was written (spec 13 FR-36)');
  }
  writeFileSync(join(dir, 'robots.txt'), robotsTxt({ indexable, sitemap }));
  lines.push(`wrote ${dir}/robots.txt (${indexable ? 'allow' : 'disallow all'}, ${mode} mode)`);
  return lines;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  for (const line of buildSeo()) console.log(line);
}
