// Phase 10 units (spec .claude/specs/10-Areas-sources-about-and-system-states.md AC-2, AC-6, AC-10, AC-11, AC-14,
// AC-15, AC-20): area helpers, the /sources/ URL state, filters and sorts, the About text and its gate, the
// licences block, site-ID search and the skeleton. Expected sets come from the data, never typed (I6).
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Fuse from 'fuse.js';
import { Licences } from '@/components/about/Licences';
import { NoPinList } from '@/components/areas/AreaParts';
import { Skeleton } from '@/components/shell/Skeleton';
import { areaExploreHref, chipCounts, chipMatches, inOrder, locationTiles, pickTrips } from '@/lib/areas';
import { districtPage, divisionPage } from '@/lib/area-data';
import { getDistricts, getDivisions, getIndex, getMeta, getSources } from '@/lib/data';
import { Blocks, parseMarkdown } from '@/lib/markdown';
import { FONTS, tileCredits } from '@/lib/licences';
import { CONTACT_EMAIL } from '@/lib/nav';
import { createMatcher, searchAll, siteIdQuery } from '@/lib/search';
import {
  filterSources, pageCount, pageLinks, parseSources, serializeSources, sortSources, sourceDate, sourceRow, SOURCES_PAGE, typeCounts, typeToken,
  TYPE_TOKENS, type SourceRow,
} from '@/lib/sources';
import type { TripCard } from '@/lib/trips';
import type { IndexSite } from '@/lib/types';
import { aboutValues, checkAbout, fillTokens, parseAbout } from '@/scripts/lib/about.mjs';
import { combine } from '@/scripts/lib/report.mjs';

const index = getIndex();
const sources = getSources();
const rows = sources.map(sourceRow);

describe('areas (spec 10 FR-1 to FR-18)', () => {
  it('every division and district page joins without error, with sites in siteIds order', () => {
    for (const d of getDivisions()) expect(divisionPage(d.slug).districts.length, d.slug).toBe(d.districts.length);
    for (const d of getDistricts()) {
      const p = districtPage(d.slug);
      expect(p.sites.map(s => s.i), d.slug).toEqual(d.siteIds);
      expect(p.noPin.map(s => s.id).sort(), d.slug).toEqual([...d.noPin].sort());
      expect(p.trips.length, d.slug).toBe(d.tripCount);
    }
  });

  it('location tiles: non-zero counts, and "no pin yet" always', () => {
    expect(locationTiles({ verified: 2, singleSource: 0, approximate: 1, unverified: 0, noPin: 0 })).toEqual(['verified', 'approximate', 'noPin']);
  });

  it('district chips: All always, the others only with a count, and the right sites', () => {
    const sites = districtPage('manikganj').sites;
    const counts = chipCounts(sites);
    expect(counts[0]).toEqual({ chip: 'all', count: sites.length });
    for (const c of counts) expect(c.count, c.chip).toBe(sites.filter(s => chipMatches(c.chip, s)).length);
    for (const c of counts.slice(1)) expect(c.count, c.chip).toBeGreaterThan(0);
    const open = sites.filter(s => chipMatches('open', s));
    for (const s of open) expect(['ticketed', 'open_no_ticket_reported']).toContain(s.ac);
  });

  it('inOrder refuses an ID that is not in the index', () => {
    expect(() => inOrder(['JB-XXX-999'], index)).toThrow(/no site "JB-XXX-999"/);
  });

  it('the trips row puts timed plans first, then travel time, at most four (FR-7)', () => {
    const card = (id: string, over: Partial<TripCard>): TripCard => ({
      id, title: id, duration: 'One day', anchorSlug: 'a', anchorEn: 'A', division: 'Dhaka', district: 'Dhaka', stopCount: 2, bucket: '1-2', divSlug: 'dhaka', ...over,
    });
    const picked = pickTrips([card('a', { bucket: '0-1' }), card('b', { bucket: '3-4', planStatus: 'timed' }), card('c', { bucket: 'unknown' }), card('d', { bucket: '1-2' }), card('e', { bucket: '2-3' })]);
    expect(picked.map(t => t.id)).toEqual(['b', 'a', 'd', 'e']);
  });

  it('Explore links carry the area and, for the map, view=map', () => {
    expect(areaExploreHref('dhaka')).toBe('/explore/?div=dhaka');
    expect(areaExploreHref('dhaka', 'manikganj', true)).toBe('/explore/?div=dhaka&dist=manikganj&view=map');
  });

  it('the no-pin list names sites only: no coordinates (NFR-5, AC-20)', () => {
    const { noPin } = divisionPage('dhaka');
    const html = renderToStaticMarkup(<NoPinList sites={noPin} correctionHref="https://example.invalid/" />);
    expect(html).not.toMatch(/\b2[0-6]\.\d{3,}|\b(8[8-9]|9[0-2])\.\d{3,}/);
    expect(html.match(/<li/g)?.length).toBe(noPin.length);
  });

  it('area map SVGs pin only mappable sites (NFR-5)', () => {
    const hidden = new Set(index.filter(s => !s.ll).map(s => s.i));
    for (const kind of ['division', 'district']) for (const f of readdirSync(join('public/maps', kind))) {
      const svg = readFileSync(join('public/maps', kind, f), 'utf8');
      for (const m of svg.matchAll(/data-site-id="([^"]+)"/g)) expect(hidden.has(m[1]), `${kind}/${f}: ${m[1]}`).toBe(false);
    }
  });
});

describe('/sources/ (spec 10 FR-19 to FR-24, AC-6)', () => {
  it('every source type belongs to a chip (FR-21)', () => {
    const types = [...new Set(sources.map(s => s.type))];
    for (const t of types) expect(typeToken(t), t).toBeDefined();
    expect(rows.length).toBe(getMeta().counts.sources);
  });

  it('chip counts add up to all sources', () => {
    const c = typeCounts(rows);
    expect(TYPE_TOKENS.reduce((n, t) => n + c[t], 0)).toBe(c.all);
    expect(c.all).toBe(rows.length);
  });

  it('round-trips the URL, leaves defaults out and drops unknown values', () => {
    const v = parseSources('q=banglapedia&type=encyclopedia&sort=title&page=2');
    expect(v).toMatchObject({ q: 'banglapedia', type: 'encyclopedia', sort: 'title', page: 2, dropped: false });
    expect(serializeSources(v)).toBe('q=banglapedia&type=encyclopedia&sort=title&page=2');
    expect(serializeSources(parseSources('sort=cited&page=1'))).toBe('');
    expect(parseSources('page=1').dropped).toBe(true);
    for (const bad of ['type=zine', 'sort=random', 'page=0', 'page=x', 'zz=1', 'q=a&q=b']) expect(parseSources(bad).dropped, bad).toBe(true);
    expect(parseSources(`q=${'x'.repeat(150)}`).q).toHaveLength(100);
    expect(serializeSources(parseSources('page=3&sort=date&q=a b'))).toBe('q=a%20b&sort=date&page=3');
  });

  it('q matches title, publisher and ID, folded as in Search', () => {
    expect(filterSources(rows, { q: 'src-0001' }).map(r => r.id)).toEqual(['SRC-0001']);
    const byPublisher = filterSources(rows, { q: 'banglapedia' });
    expect(byPublisher.length).toBeGreaterThan(0);
    for (const r of byPublisher) expect(`${r.title} ${r.publisher}`.toLowerCase()).toContain('banglapedia');
    expect(filterSources(rows, { type: 'book' }).map(r => r.id)).toEqual(['SRC-0001']);
  });

  it('sorts: most cited, title, newest with undated last; ties by ID', () => {
    const cited = sortSources(rows, 'cited');
    for (let k = 1; k < cited.length; k++) expect(cited[k - 1].cited).toBeGreaterThanOrEqual(cited[k].cited);
    const dated = sortSources(rows, 'date');
    const firstUndated = dated.findIndex(r => !r.date);
    expect(dated.slice(firstUndated).every(r => !r.date)).toBe(true);
    for (let k = 1; k < firstUndated; k++) expect(dated[k - 1].date! >= dated[k].date!).toBe(true);
    const t: SourceRow[] = [{ id: 'SRC-2', title: 'b', publisher: '', type: 'news', cited: 1 }, { id: 'SRC-1', title: 'a', publisher: '', type: 'news', cited: 1 }];
    expect(sortSources(t, 'title').map(r => r.id)).toEqual(['SRC-1', 'SRC-2']);
    expect(sortSources(t, 'cited').map(r => r.id)).toEqual(['SRC-1', 'SRC-2']);
  });

  it('pages of 25, with first, last and neighbours as links', () => {
    expect(SOURCES_PAGE).toBe(25);
    expect(pageCount(rows.length)).toBe(Math.ceil(rows.length / 25));
    expect(pageCount(0)).toBe(1);
    expect(pageLinks(1, 46)).toEqual([1, 2, 3, null, 46]);
    expect(pageLinks(10, 46)).toEqual([1, null, 8, 9, 10, 11, 12, null, 46]);
    expect(pageLinks(1, 1)).toEqual([1]);
  });

  it('formats every source date, including a written range', () => {
    for (const s of sources) if (s.date) expect(() => sourceDate(s.date!, 'en'), s.id).not.toThrow();
    expect(sourceDate('2026-10-13 to 2026-10-16', 'en')).toBe('13 October 2026–16 October 2026');
  });
});

describe('About (spec 10 FR-35 to FR-44, AC-10, AC-11)', () => {
  const text = readFileSync('content/about.en.md', 'utf8');
  const links = { 'url.corrections': 'https://example.invalid/c', 'url.photoOffer': 'https://example.invalid/p' };
  const values = aboutValues(getMeta(), sources, links);

  it('every token in the text resolves from meta.json', () => {
    const { body } = parseAbout(text);
    expect(() => fillTokens(body, values)).not.toThrow();
  });

  it('an unknown token fails, naming it', () => {
    expect(() => fillTokens('{{counts.sites}} and {{counts.nope}}', values)).toThrow(/unknown token \{\{counts\.nope\}\}/);
  });

  it('front matter must say reviewed true or false', () => {
    expect(parseAbout('---\nreviewed: true\n---\nx')).toEqual({ reviewed: true, body: 'x' });
    expect(() => parseAbout('no front matter')).toThrow(/front matter/);
    expect(() => parseAbout('---\nreviewed: maybe\n---\n')).toThrow(/true or false/);
    expect(() => parseAbout('---\nreviewed: true\nauthor: x\n---\n')).toThrow(/unknown front matter/);
  });

  it('a draft fails release builds only (D10)', () => {
    const r = checkAbout();
    expect(r.structural).toEqual([]);
    if (parseAbout(text).reviewed) return;
    expect((r.editorial as Record<string, unknown[]>).about).toHaveLength(1);
    expect(combine([r], 'release').fatal).toBe(true);
    expect(combine([r], 'local').fatal).toBe(false);
  });

  it('has every section anchor, shows disagreements and open questions apart, and never the combined figure', () => {
    const doc = parseMarkdown(fillTokens(parseAbout(text).body, values));
    expect(doc.sections.map(s => s.id)).toEqual(['core-book', 'grading', 'locations', 'disagreements', 'costs', 'photos', 'not-done', 'contribute', 'licences']);
    const html = renderToStaticMarkup(<>{doc.sections.map(s => <Blocks key={s.id} blocks={s.blocks} directives={{ licences: <Licences /> }} />)}</>);
    const c = getMeta().counts;
    expect(html).toContain(`${c.disagreements} disagreements`);
    expect(html).toContain(`${c.openQuestions} open questions`);
    expect(html).not.toContain(String(c.disagreements + c.openQuestions));
    expect(html).not.toMatch(/download|CSV files/i);
    expect(html).toContain(links['url.corrections']);
    expect(html).toContain(links['url.photoOffer']);
    // O2 settled 2026-10-27: the project address is the only email the page may show.
    expect(html.replaceAll(CONTACT_EMAIL, '')).not.toMatch(/@[a-z0-9-]+\.[a-z]/i);
    expect(html).toContain(`mailto:${CONTACT_EMAIL}`);
  });

  it('says "no tracking" only while no analytics script ships (FR-44)', () => {
    if (!/no tracking/i.test(text)) return;
    const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
    const files = ['app', 'components', 'lib'].flatMap(walk);
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/googletagmanager|gtag\(|plausible\.io|umami|@vercel\/analytics|speed-insights|segment\.com/);
    expect(readFileSync('package.json', 'utf8')).not.toMatch(/analytics/);
  });

  it('markdown: sections need an anchor; inline bold, links and directives render', () => {
    expect(() => parseMarkdown('## No anchor')).toThrow(/anchor/);
    const doc = parseMarkdown('Lead **bold**.\n\n## A {#a}\n\n- one\n- [two](/x/)\n\n::thing');
    const html = renderToStaticMarkup(<><Blocks blocks={doc.lead} /><Blocks blocks={doc.sections[0].blocks} directives={{ thing: <i>T</i> }} /></>);
    // next/link keeps the trailing slash only with the app's trailingSlash config, which unit tests don't load.
    expect(html.replace('href="/x"', 'href="/x/"')).toBe('<p>Lead <strong>bold</strong>.</p><ul class="space-y-2"><li class="rounded-lg border border-line bg-surface p-3">one</li><li class="rounded-lg border border-line bg-surface p-3"><a class="font-semibold text-primary underline" href="/x/">two</a></li></ul><div><i>T</i></div>');
    expect(() => renderToStaticMarkup(<Blocks blocks={[{ kind: 'directive', name: 'nope' }]} />)).toThrow(/unknown directive/);
  });
});

describe('licences (spec 10 FR-43)', () => {
  it('names the text licence, the change notice, OSM, both boundary licences and every font', () => {
    const html = renderToStaticMarkup(<Licences />);
    for (const s of ['CC BY-SA 4.0', 'converted to WebP', 'OpenStreetMap', 'Open Database License', 'CC0 1.0', 'CC BY 3.0 IGO', 'Leaflet', 'SIL Open Font License']) expect(html, s).toContain(s);
    for (const f of FONTS) expect(html, f).toContain(f);
    expect(html).not.toMatch(/download/i);
  });

  it('lists the fonts app/fonts.ts loads, and only offered tile providers', () => {
    const imported = /import \{([^}]+)\} from 'next\/font\/google'/.exec(readFileSync('app/fonts.ts', 'utf8'))![1].split(',').map(s => s.trim().replace(/_/g, ' ')).sort();
    expect([...FONTS].sort()).toEqual(imported);
    expect(tileCredits()).toEqual(['© OpenStreetMap contributors']); // CARTO stays off until O4 (lib/map-config.ts)
  });
});

describe('site-ID search (spec 10 FR-53, AC-14)', () => {
  const m = createMatcher(index, Fuse);
  const baliati = index.find(s => /^Baliati Palace/.test(s.e)) as IndexSite;

  it('recognises an ID in any case, trimmed', () => {
    expect(siteIdQuery(' jb-dhk-064 ')).toBe('JB-DHK-064');
    expect(siteIdQuery('JB-DHK-64')).toBeUndefined();
    expect(siteIdQuery('baliati')).toBeUndefined();
  });

  it('finds that site alone, marked by ID, with no correction and no districts', () => {
    const r = searchAll(m, [], baliati.i.toLowerCase());
    expect(r.sites.map(h => [h.site.i, h.field])).toEqual([[baliati.i, 'id']]);
    expect(r.corrected).toBeUndefined();
    expect(r.districts).toEqual([]);
    expect([...m.match(baliati.i).keys()]).toEqual([baliati.i]);
  });

  it('an ID that names no site finds nothing', () => {
    const r = searchAll(m, [], 'JB-DHK-999');
    expect([r.sites, r.families, r.corrected]).toEqual([[], [], undefined]);
  });
});

describe('Skeleton (spec 10 FR-54, FR-57, AC-15)', () => {
  it('renders a busy region with one status text, shapes hidden, shimmer only when motion is allowed', () => {
    for (const variant of ['row', 'card', 'map'] as const) {
      const html = renderToStaticMarkup(<Skeleton variant={variant} count={3} />);
      expect(html, variant).toContain('aria-busy="true"');
      expect(html.match(/role="status"/g), variant).toHaveLength(1);
      expect(html, variant).not.toMatch(/(?<!motion-safe:)animate-pulse/);
    }
    const card = renderToStaticMarkup(<Skeleton variant="card" count={3} />);
    expect(card.match(/aria-hidden="true"/g)).toHaveLength(3);
  });
});
