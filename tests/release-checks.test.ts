// Phase 13 release checks (spec .claude/specs/13-Quality-accessibility-and-security.md): the out/ link and leak
// check (FR-29 to FR-32, AC-15), sitemap and robots (FR-36, FR-37, AC-18), share metadata (FR-34, FR-35, FR-38)
// and the headers that the e2e server must mirror from vercel.json (FR-23, FR-27, FR-28).

import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { checkOut, unsafeLinks } from '../scripts/check-out.mjs';
import { buildSeo, indexablePages } from '../scripts/build-seo.mjs';
import { checkBudgets, pageImages, pageScripts } from '../scripts/check-budgets.mjs';
import { pageMeta, shortDescription, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { tempDir, writeTable } from './helpers';

const page = (title: string, body = '', robots = '') =>
  `<!DOCTYPE html><html><head><title>${title}</title>${robots ? `<meta name="robots" content="${robots}"/>` : ''}</head><body>${body}</body></html>`;

function fakeOut(extra: Record<string, string> = {}) {
  const dir = tempDir('out');
  const files: Record<string, string> = {
    'index.html': page('Home', '<a href="https://example.org/" target="_blank" rel="noopener noreferrer">ok</a>'),
    'explore/index.html': page('Explore'),
    'site/JB-DHK-064/index.html': page('Redirect', '', 'noindex'),
    'site/JB-DHK-064/baliati-palace/index.html': page('Baliati'),
    '404/index.html': page('Not found', '', 'noindex'),
    '404.html': page('Not found', '', 'noindex'),
    'dev/i18n/index.html': page('Dev', '', 'noindex, nofollow'),
    '_not-found/index.html': page('Not found'),
    'data/index.json': '[]',
    ...extra,
  };
  for (const [f, body] of Object.entries(files)) {
    mkdirSync(join(dir, f, '..'), { recursive: true });
    writeFileSync(join(dir, f), body);
  }
  const csv = tempDir('csv');
  writeTable(csv, 'sites', [
    { site_id: 'JB-DHK-001', map_display: 'show', latitude: '23.7500000', longitude: '90.3500000', coordinates_note: '' },
    { site_id: 'JB-DHK-002', map_display: 'hide', latitude: '', longitude: '', coordinates_note: 'A village pin at 23.12626, 91.32444; not used. Near JB-DHK-001 (23.75001, 90.35002).' },
  ]);
  return { dir, sitesCsv: join(csv, 'sites.csv') };
}

describe('out/ link and leak check', () => {
  it('passes a clean export', () => {
    expect(checkOut(fakeOut()).problems).toEqual([]);
  });

  it('flags a new-tab link without noopener and noreferrer', () => {
    expect(unsafeLinks('<a href="https://x.org" target="_blank" rel="noopener">x</a>')).toHaveLength(1);
    expect(unsafeLinks('<a href="https://x.org" target="_blank">x</a>')).toHaveLength(1);
    expect(unsafeLinks('<a href="https://x.org" rel="noreferrer noopener" target="_blank">x</a>')).toEqual([]);
    expect(unsafeLinks('<a href="/explore/">x</a>')).toEqual([]);
    const { problems } = checkOut(fakeOut({ 'about/index.html': page('About', '<a href="https://x.org" target="_blank">x</a>') }));
    expect(problems.join('\n')).toMatch(/about\/index\.html: new-tab link/);
  });

  it('flags internal terms, working files and local paths', () => {
    const { problems } = checkOut(fakeOut({
      'a/index.html': page('A', '<p>Pin supplied by Orca</p>'),
      'b/index.html': page('B', '<p>see master-list.xlsx</p>'),
      'data/sites/x.json': '{"note":"/Users/someone/Desktop"}',
    }));
    const text = problems.join('\n');
    expect(text).toMatch(/a\/index\.html: "Orca"/);
    expect(text).toMatch(/b\/index\.html: "master-list\.xlsx"/);
    expect(text).toMatch(/data\/sites\/x\.json: "\/Users\/"/);
  });

  it('does not search JavaScript chunks for terms', () => {
    const { problems } = checkOut(fakeOut({ '_next/static/chunks/a.js': 'see README.md' }));
    expect(problems).toEqual([]);
  });

  it("finds a hidden site's coordinates at any recorded precision, plain or URL-encoded", () => {
    for (const leak of ['23.12626, 91.32444', '23.1263,91.3244', 'q=23.12626%2C91.32444', '23.126260,91.324440']) {
      const { problems } = checkOut(fakeOut({ 'x/index.html': page('X', `<a href="https://maps.example/?${leak}">map</a>`) }));
      expect(problems.join('\n'), leak).toMatch(/hidden site JB-DHK-002/);
    }
  });

  it("skips a pair that is a shown site's own pin", () => {
    const { problems } = checkOut(fakeOut({ 'x/index.html': page('X', '<p>23.75001, 90.35002</p>') }));
    expect(problems).toEqual([]);
  });
});

describe('sitemap and robots', () => {
  it('lists indexable pages only, home first', () => {
    const { dir } = fakeOut();
    expect(indexablePages(dir)).toEqual(['/', '/explore/', '/site/JB-DHK-064/baliati-palace/']);
  });

  it('writes an absolute sitemap and an allowing robots.txt in release mode with SITE_URL', () => {
    const { dir } = fakeOut();
    buildSeo({ dir, env: { JP_DATA_MODE: 'release', SITE_URL: 'https://example.vercel.app/' } });
    const sitemap = readFileSync(join(dir, 'sitemap.xml'), 'utf8');
    expect(sitemap).toContain('<loc>https://example.vercel.app/</loc>');
    expect(sitemap).toContain('<loc>https://example.vercel.app/site/JB-DHK-064/baliati-palace/</loc>');
    expect(sitemap).not.toMatch(/JB-DHK-064\/<\/loc>|404|\/dev\/|_not-found/);
    expect(readFileSync(join(dir, 'robots.txt'), 'utf8')).toBe('User-agent: *\nAllow: /\n\nSitemap: https://example.vercel.app/sitemap.xml\n');
  });

  it('writes no sitemap without SITE_URL, and still allows crawling in release', () => {
    const { dir } = fakeOut();
    const lines = buildSeo({ dir, env: { JP_DATA_MODE: 'release' } });
    expect(existsSync(join(dir, 'sitemap.xml'))).toBe(false);
    expect(lines.join('\n')).toMatch(/SITE_URL is not set/);
    expect(readFileSync(join(dir, 'robots.txt'), 'utf8')).toBe('User-agent: *\nAllow: /\n');
  });

  it('disallows everything in local and preview mode', () => {
    for (const env of [{ JP_DATA_MODE: 'local', SITE_URL: 'https://x.org' }, { VERCEL_ENV: 'preview' }]) {
      const { dir } = fakeOut();
      buildSeo({ dir, env });
      expect(existsSync(join(dir, 'sitemap.xml'))).toBe(false);
      expect(readFileSync(join(dir, 'robots.txt'), 'utf8')).toBe('User-agent: *\nDisallow: /\n');
    }
  });
});

describe('share metadata', () => {
  it('cuts long descriptions at a word boundary', () => {
    const long = 'word '.repeat(80);
    const d = shortDescription(long);
    expect(d.length).toBeLessThanOrEqual(200);
    expect(d.endsWith('word…')).toBe(true);
    expect(shortDescription('  A short   one. ')).toBe('A short one.');
  });

  it('gives every page title, description, canonical and the default image', () => {
    const m = pageMeta({ title: 'Explore', description: 'Browse.', path: '/explore/' });
    expect(m.description).toBe('Browse.');
    expect(m.alternates).toEqual({ canonical: '/explore/' });
    expect(m.openGraph).toMatchObject({ title: 'Explore', url: '/explore/', images: [DEFAULT_OG_IMAGE] });
    expect(m.twitter).toMatchObject({ card: 'summary_large_image' });
    expect(pageMeta({ title: 'A', description: 'B', path: '/a/', canonical: false }).alternates).toBeUndefined();
  });

  it('ships the default share image', () => {
    expect(existsSync(join('public', DEFAULT_OG_IMAGE.url))).toBe(true);
  });
});

describe('security headers', () => {
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const serve = JSON.parse(readFileSync('serve.json', 'utf8'));
  const all = vercel.headers.find((h: { source: string }) => h.source === '/(.*)').headers as { key: string; value: string }[];
  const header = (k: string) => all.find(h => h.key.toLowerCase() === k.toLowerCase())?.value;
  const csp = header('Content-Security-Policy') ?? header('Content-Security-Policy-Report-Only') ?? '';
  const directive = (name: string) => csp.split(';').map(d => d.trim()).find(d => d.startsWith(`${name} `));

  it('the e2e server sends exactly the headers of vercel.json', () => {
    expect(serve.headers).toEqual(vercel.headers.map((h: { headers: unknown }) => ({ source: '**', headers: h.headers })));
  });

  it('sets the CSP directives of spec 13 FR-23', () => {
    expect(directive('default-src')).toBe("default-src 'self'");
    expect(directive('script-src')).toBe("script-src 'self' 'unsafe-inline'");
    expect(directive('style-src')).toBe("style-src 'self' 'unsafe-inline'");
    expect(directive('img-src')).toMatch(/^img-src 'self' data: https:\/\/thumb\.wikimedia\.org https:\/\/upload\.wikimedia\.org /);
    for (const d of ["connect-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", "font-src 'self'"]) {
      expect(csp.split(';').map(s => s.trim())).toContain(d);
    }
  });

  it('allows every tile host the map can use', async () => {
    const { BASE_MAPS } = await import('@/lib/map-config');
    for (const b of BASE_MAPS) {
      const host = new URL(b.url.replace('{s}', 'a')).origin;
      expect(directive('img-src'), b.id).toContain(b.subdomains ? host.replace(/\/\/a\./, '//*.') : host);
    }
  });

  it('sets the other headers of spec 13 FR-27', () => {
    expect(header('X-Content-Type-Options')).toBe('nosniff');
    expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(header('Permissions-Policy')).toBe('geolocation=(self), camera=(), microphone=()');
  });
});

describe('size budgets', () => {
  function budgetOut(scripts: Record<string, string>, imgs = '<img src="/home/a.webp" srcset="/home/a.webp 480w, /home/b.webp 960w"/>') {
    const dir = tempDir('budget');
    const tags = Object.keys(scripts).map(s => `<script src="${s}" async=""></script>`).join('');
    const files: Record<string, string | Buffer> = {
      'index.html': `<html><head>${tags}<script src="/_next/static/chunks/polyfills.js" noModule=""></script></head><body>${imgs}</body></html>`,
      'data/index.json': '[]', '_next/static/chunks/polyfills.js': 'x'.repeat(10), ...scripts,
      'home/a.webp': Buffer.alloc(1000), 'home/b.webp': Buffer.alloc(2000),
    };
    for (const [f, body] of Object.entries(files)) {
      mkdirSync(join(dir, f, '..'), { recursive: true });
      writeFileSync(join(dir, f), body);
    }
    return dir;
  }

  it('counts module scripts only and every srcset candidate', () => {
    const html = '<script src="/a.js" async=""></script><script src="/p.js" noModule=""></script><img src="/x.webp" srcset="/x.webp 1x, /y.webp 2x"/>';
    expect(pageScripts(html)).toEqual(['/a.js']);
    expect(pageImages(html)).toEqual(['/x.webp', '/y.webp']);
  });

  it('passes within budget and fails over it', () => {
    const dir = budgetOut({ '_next/static/chunks/app.js': 'console.log(1)' });
    expect(checkBudgets({ dir }).problems).toEqual([]);
    const over = checkBudgets({ dir, budgets: { homeJs: 10, homeImage: 1500 } }).problems.join('\n');
    expect(over).toMatch(/home JavaScript is .* over/);
    expect(over).toMatch(/home image \/home\/b\.webp is .* over/);
  });

  it('fails when the home page loads Leaflet, markercluster or Fuse.js', () => {
    const dir = budgetOut({
      '_next/static/chunks/1.js': 'e.className="leaflet-container"', '_next/static/chunks/2.js': 'L.MarkerClusterGroup=x',
      '_next/static/chunks/3.js': 'useExtendedSearch:!1',
    });
    const text = checkBudgets({ dir }).problems.join('\n');
    for (const name of ['Leaflet', 'leaflet.markercluster', 'Fuse.js']) expect(text).toContain(`home page loads ${name}`);
  });
});
