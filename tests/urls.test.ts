import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { divisionHref, FOOTER_LINKS, HEADER_LINKS, SEARCH_HREF } from '@/lib/nav';

const urls = readFileSync('docs/URLS.md', 'utf8');
const roadmap = readFileSync('roadmap/DEVELOPMENT_ROADMAP.md', 'utf8');
const section = (title: string) => urls.slice(urls.indexOf(title), urls.indexOf('\n## ', urls.indexOf(title) + 1));

// Route patterns from the Routes table: `/site/<id>/<slug>/` → /^\/site\/[^/]+\/[^/]+\/$/
const routes = [...section('## Routes').matchAll(/^\| `([^`]+)` \|/gm)].map(m => m[1]);
const routeRe = routes.map(r => new RegExp(`^${r.replace(/[.]/g, '\\.').replace(/<[a-z]+>/g, '[^/]+')}$`));
const resolves = (href: string) => routeRe.some(re => re.test(href.split('#')[0].split('?')[0]));
const keys = new Set([...section('## Query keys').matchAll(/^\| `([a-z]+)` \|/gm)].map(m => m[1]));

describe('docs/URLS.md (task 3.7)', () => {
  it('lists every query key the roadmap names', () => {
    const task = roadmap.slice(roadmap.indexOf('**3.7**'), roadmap.indexOf('**3.8**'));
    const named = [...task.matchAll(/`([a-z]+)`/g)].map(m => m[1]).filter(k => !['view', 'map', 'list'].includes(k));
    named.push('view', 'q', 'site', 'ids', 'field');
    for (const k of named) expect(keys.has(k), k).toBe(true);
  });

  it('lists every route the roadmap names', () => {
    const named = new Set([...roadmap.matchAll(/`(\/(?:explore|search|site|division|district|trips|sources|about|credits)[^`?#]*)/g)]
      .map(m => m[1].replace(/\[(\w+)\]/g, '<$1>').replace(/\/?$/, '/')));
    for (const r of named) expect(resolves(r.replace(/<[a-z]+>/g, 'x')), r).toBe(true);
  });

  it('states the drop-with-notice, multi-value and canonical-order rules', () => {
    expect(urls).toMatch(/Unknown keys and values are dropped/);
    expect(urls).toMatch(/comma list of the full tokens/);
    expect(urls).toMatch(/canonical form/);
  });
});

describe('shell links (task 3.9)', () => {
  it('every header and footer link goes to a route in URLS.md', () => {
    const hrefs = [...HEADER_LINKS.map(l => l.href), SEARCH_HREF, '/', divisionHref('dhaka'), ...FOOTER_LINKS.map(l => l.href).filter(h => h.startsWith('/'))];
    for (const h of hrefs) expect(resolves(h), h).toBe(true);
  });

  it('the external correction link is the one URLS.md documents', () => {
    const external = FOOTER_LINKS.filter(l => !l.href.startsWith('/'));
    expect(external).toHaveLength(1);
    expect(urls).toContain(external[0].href);
  });

  it('no count is hard-coded in app/ or components/', () => {
    const walk = (d: string): string[] => readdirSync(d).flatMap(f => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
    for (const f of [...walk('app'), ...walk('components')].filter(f => /\.(tsx?|css)$/.test(f))) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/\b(399|413) sites\b/);
    }
  });
});
