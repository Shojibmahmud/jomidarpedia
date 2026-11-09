#!/usr/bin/env node
// `npm run check:prod`: the 13.9 link and leak checks against the deployed site (roadmap task 14.5; spec 16 FR-8,
// FR-2, NFR-3). On demand, never in CI. Base: https://jomidarpedia.vercel.app, or PROD_URL.
//   1. fetches /robots.txt and /sitemap.xml;
//   2. fetches every sitemap URL, an unknown path (answered 404 with the 404 page) and the data download;
//   3. applies check-out.mjs's rules to every body: new-tab links, internal terms, local paths, hidden coordinates;
//   4. checks that canonical, og:url, og:image, every sitemap <loc> and the robots Sitemap line use the base origin;
//   5. fails on a rule, a wrong status, or a fetch error that persists after one retry.
// At most CONCURRENCY requests at a time, with a generic User-Agent.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { hiddenCoordinatePatterns, textProblems } from './check-out.mjs';
import { EXPORT_URL } from './build-export.mjs';
import { readZip } from './lib/zip.mjs';

export const PROD_URL = 'https://jomidarpedia.vercel.app';
export const CONCURRENCY = 4;
const UA = 'jomidarpedia-release-check/1.0';

const attr = (html, re) => [...html.matchAll(re)].map(m => m[1]);

/** Origin problems in one HTML page: canonical, og:url and og:image must start with the base origin. */
export function originProblems(path, html, origin) {
  const problems = [];
  const urls = [
    ...attr(html, /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/gi).map(u => ['canonical', u]),
    ...attr(html, /<meta[^>]+property="og:url"[^>]+content="([^"]+)"/gi).map(u => ['og:url', u]),
    ...attr(html, /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/gi).map(u => ['og:image', u]),
  ];
  if (!urls.some(([k]) => k === 'canonical') && !/name="robots"[^>]+noindex/i.test(html)) problems.push(`${path}: no canonical link`);
  for (const [k, u] of urls) if (!u.startsWith(`${origin}/`)) problems.push(`${path}: ${k} "${u}" is not on ${origin}`);
  return problems;
}

/** The <loc> URLs of a sitemap. */
export const sitemapUrls = xml => attr(xml, /<loc>\s*([^<\s]+)\s*<\/loc>/g);

/** fetch with one retry on a network error, 429 or 5xx. */
async function get(fetchFn, url, { retryDelay }) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetchFn(url, { headers: { 'User-Agent': UA }, redirect: 'manual' });
      if ((res.status === 429 || res.status >= 500) && attempt === 0) { await new Promise(r => setTimeout(r, retryDelay)); continue; }
      return { status: res.status, body: Buffer.from(await res.arrayBuffer()) };
    } catch (e) {
      if (attempt === 0) { await new Promise(r => setTimeout(r, retryDelay)); continue; }
      return { error: String(e?.message ?? e) };
    }
  }
}

/** Runs fn over items, CONCURRENCY at a time. */
async function pool(items, fn, n = CONCURRENCY) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) await fn(items[next++]);
  }));
}

/**
 * @param {{ base?: string, fetchFn?: typeof fetch, sitesCsv?: string, retryDelay?: number, log?: (s: string) => void }} [options]
 */
export async function checkProd({ base = process.env.PROD_URL || PROD_URL, fetchFn = fetch, sitesCsv = 'data/csv/sites.csv', retryDelay = 2000, log = () => {} } = {}) {
  const origin = new URL(base).origin;
  const problems = [];
  const coords = hiddenCoordinatePatterns(readFileSync(sitesCsv, 'utf8'));
  const anyCoord = coords.length ? new RegExp(coords.map(c => c.re.source).join('|'), 'i') : null;
  const opts = { retryDelay };

  const robots = await get(fetchFn, `${origin}/robots.txt`, opts);
  if (robots.status !== 200) problems.push(`/robots.txt: ${robots.error ?? `HTTP ${robots.status}`}`);
  else if (!robots.body.toString('utf8').includes(`Sitemap: ${origin}/sitemap.xml`)) problems.push(`/robots.txt: no "Sitemap: ${origin}/sitemap.xml" line`);

  const sitemap = await get(fetchFn, `${origin}/sitemap.xml`, opts);
  const xml = sitemap.body?.toString('utf8') ?? '';
  if (sitemap.status !== 200 || !xml.includes('<urlset')) {
    problems.push(`/sitemap.xml: ${sitemap.error ?? (sitemap.status !== 200 ? `HTTP ${sitemap.status}` : 'not a sitemap')}`);
    return { problems, checked: 0, compiledAt: undefined };
  }
  const locs = sitemapUrls(xml);
  for (const u of locs) if (!u.startsWith(`${origin}/`)) problems.push(`/sitemap.xml: <loc> ${u} is not on ${origin}`);
  log(`sitemap: ${locs.length} URLs`);

  const targets = [
    ...locs.filter(u => u.startsWith(`${origin}/`)).map(u => ({ url: u, status: 200 })),
    { url: `${origin}/no-such-page-release-check/`, status: 404 },
    { url: `${origin}${EXPORT_URL}`, status: 200, zip: true },
  ];
  let checked = 0;
  let compiledAt;
  await pool(targets, async t => {
    const path = t.url.slice(origin.length) || '/';
    const r = await get(fetchFn, t.url, opts);
    checked++;
    if (checked % 200 === 0) log(`  ${checked} of ${targets.length}`);
    if (r.error) { problems.push(`${path}: ${r.error}`); return; }
    if (r.status !== t.status) { problems.push(`${path}: HTTP ${r.status}, expected ${t.status}`); return; }
    if (t.zip) {
      try {
        for (const e of readZip(r.body)) {
          const text = e.data.toString('utf8');
          if (e.name === 'README.md') compiledAt = /Compiled (\d{4}-\d{2}-\d{2})/.exec(text)?.[1];
          problems.push(...textProblems(`${path}/${e.name}`, '.txt', text, coords, anyCoord));
        }
      } catch (e) { problems.push(`${path}: not a readable zip (${e.message})`); }
      return;
    }
    const html = r.body.toString('utf8');
    problems.push(...textProblems(path, '.html', html, coords, anyCoord));
    if (t.status === 200) problems.push(...originProblems(path, html, origin));
  });
  return { problems: [...new Set(problems)], checked, compiledAt };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const base = process.env.PROD_URL || PROD_URL;
  console.log(`checking ${base}`);
  const { problems, checked, compiledAt } = await checkProd({ base, log: s => console.log(s) });
  console.log(`checked ${checked} URLs; the deployed data was compiled ${compiledAt ?? '(unknown: no download)'}`);
  for (const p of problems.slice(0, 200)) console.log(`  ${p}`);
  if (problems.length > 200) console.log(`  … and ${problems.length - 200} more`);
  if (problems.length) {
    console.log(`${problems.length} problem(s)`);
    process.exitCode = 1;
  } else console.log('no problems');
}
