// Explore units (roadmap tasks 6.1 to 6.4, 6.9; spec 06 AC-1 to AC-4, AC-13). Fixtures for the rules,
// plus invariants on the real index.json. Expected numbers on real data are computed, never typed (I6).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { SiteCard, type CardVariant } from '@/components/cards/SiteCard';
import { getDistricts, getDivisions } from '@/lib/data';
import {
  ACCESS_ORDER, activeGroups, activeValues, bestRemoval, BUCKET_ORDER, CONDITION_ORDER, counts, EMPTY, filter, makePlaces, removeValue,
  toggle, toggleDivision, TYPE_ORDER, without, type FilterState, type PlaceList,
} from '@/lib/filters';
import { sortSites } from '@/lib/sort';
import { parse, Q_MAX, serialize } from '@/lib/urlState';
import { STRINGS } from '@/lib/i18n';
import type { IndexSite } from '@/lib/types';

const lang = (html: string, l: 'en' | 'bn') => [...html.matchAll(new RegExp(`data-l="${l}">([^<]*)<`, 'g'))].map(m => m[1]).join(' ');

// --- Fixtures -------------------------------------------------------------------------------------
const LIST: PlaceList = {
  divisions: [{ slug: 'dhaka', en: 'Dhaka', bn: 'ঢাকা' }, { slug: 'rajshahi', en: 'Rajshahi', bn: 'রাজশাহী' }],
  districts: [
    { slug: 'dhaka', en: 'Dhaka', bn: 'ঢাকা', divisionSlug: 'dhaka' },
    { slug: 'manikganj', en: 'Manikganj', bn: 'মানিকগঞ্জ', divisionSlug: 'dhaka' },
    { slug: 'bogura', en: 'Bogura', bn: 'বগুড়া', divisionSlug: 'rajshahi' },
  ],
};
const P = makePlaces(LIST);
const site = (i: string, o: Partial<IndexSite> = {}): IndexSite => ({
  i, s: i.toLowerCase(), e: `Site ${i}`, b: `সাইট ${i}`, dv: 'Dhaka', d: 'Dhaka', db: 'ঢাকা', lc: 'single_source', c: 'in_ruins',
  ac: 'unknown', tb: 'unknown', rc: 'unconfirmed', t: 'house', ty: 'zamindar_house', ll: [23.8, 90.4], ...o,
});
const A = site('JB-DHK-001', { dt: 1, tb: '1-2', h: 1.5, c: 'preserved', ac: 'ticketed', fe: 30, rc: 'confirmed', lc: 'verified', p: 1, hv: 1, img: { id: 'IMG-DHK-001-001', credit: 'Photo: A / Wikimedia Commons, CC BY-SA 4.0' } });
const B = site('JB-DHK-002', { d: 'Manikganj', db: 'মানিকগঞ্জ', u: 'Saturia', dt: 1, tb: '2-3', h: 2.5, c: 'in_ruins', rc: 'partially_confirmed', t: 'kachari' });
const C = site('JB-DHK-003', { d: 'Manikganj', db: 'মানিকগঞ্জ', dt: 0, tb: '4+', h: 5, c: 'lost', ac: 'not_applicable_lost', ll: undefined });
const D = site('JB-RAJ-001', { dv: 'Rajshahi', d: 'Bogura', db: 'বগুড়া', tb: 'unknown', c: 'unknown', ac: 'restricted_or_permission', t: 'unclassified', b: undefined });
const E = site('JB-DHK-004', { dt: 1, tb: '2-3', c: 'preserved_adaptive_reuse', ac: 'open_no_ticket_reported' }); // a bucket, no exact time
const SITES = [A, B, C, D, E];
const st = (o: Partial<FilterState>): FilterState => ({ ...EMPTY, ...o });
const ids = (list: IndexSite[]) => list.map(s => s.i);

describe('filters: matching (6.2, FR-7)', () => {
  it('no filters match everything', () => expect(filter(SITES, EMPTY, P)).toHaveLength(SITES.length));
  it('each group matches its field', () => {
    expect(ids(filter(SITES, st({ day: true }), P))).toEqual(['JB-DHK-001', 'JB-DHK-002', 'JB-DHK-004']);
    expect(ids(filter(SITES, st({ tt: 'unknown' }), P))).toEqual(['JB-RAJ-001']);
    expect(ids(filter(SITES, st({ tt: '4+' }), P))).toEqual(['JB-DHK-003']); // unknown never folds into 4+
    expect(ids(filter(SITES, st({ cond: ['lost', 'preserved'] }), P))).toEqual(['JB-DHK-001', 'JB-DHK-003']);
    expect(ids(filter(SITES, st({ acc: ['ticketed'] }), P))).toEqual(['JB-DHK-001']);
    expect(ids(filter(SITES, st({ type: ['kachari', 'unclassified'] }), P))).toEqual(['JB-DHK-002', 'JB-RAJ-001']);
    expect(ids(filter(SITES, st({ doc: true }), P))).toEqual(['JB-DHK-001', 'JB-DHK-002']);
    expect(ids(filter(SITES, st({ vloc: true }), P))).toEqual(['JB-DHK-001']);
    expect(ids(filter(SITES, st({ photo: true }), P))).toEqual(['JB-DHK-001']);
    expect(ids(filter(SITES, st({ hours: true }), P))).toEqual(['JB-DHK-001']);
  });
  it('an absent day-trip value never matches the switch', () => {
    expect(filter([site('JB-DHK-009')], st({ day: true }), P)).toHaveLength(0);
  });
  it('groups combine with AND, options with OR', () => {
    expect(ids(filter(SITES, st({ day: true, cond: ['preserved', 'in_ruins'] }), P))).toEqual(['JB-DHK-001', 'JB-DHK-002']);
    expect(ids(filter(SITES, st({ day: true, cond: ['lost'] }), P))).toEqual([]);
  });
  it('districts narrow their own division only (D7)', () => {
    expect(ids(filter(SITES, st({ div: ['dhaka'] }), P))).toEqual(['JB-DHK-001', 'JB-DHK-002', 'JB-DHK-003', 'JB-DHK-004']);
    expect(ids(filter(SITES, st({ div: ['dhaka'], dist: ['manikganj'] }), P))).toEqual(['JB-DHK-002', 'JB-DHK-003']);
    expect(ids(filter(SITES, st({ div: ['dhaka', 'rajshahi'], dist: ['manikganj'] }), P))).toEqual(['JB-DHK-002', 'JB-DHK-003', 'JB-RAJ-001']);
  });
  it('unticking a division clears its districts', () => {
    const f = toggleDivision(st({ div: ['dhaka', 'rajshahi'], dist: ['manikganj', 'bogura'] }), 'dhaka', P);
    expect(f).toMatchObject({ div: ['rajshahi'], dist: ['bogura'] });
  });
  it('toggle keeps the canonical order', () => {
    expect(toggle(['lost'], 'preserved', CONDITION_ORDER)).toEqual(['preserved', 'lost']);
    expect(toggle(['lost', 'preserved'], 'lost', CONDITION_ORDER)).toEqual(['preserved']);
  });
});

describe('filters: facet counts (6.2, FR-8, D2)', () => {
  it('counts each option under the other groups only', () => {
    const f = st({ day: true, cond: ['preserved', 'in_ruins'] });
    const c = counts(SITES, f, P);
    expect(c.total).toBe(2);
    // Condition counts ignore the condition group itself: the day-trip sites by condition.
    expect(c.cond).toEqual({ preserved: 1, preserved_adaptive_reuse: 1, in_ruins: 1, lost: 0, unknown: 0 });
    // The day-trip count ignores the day switch: sites that are preserved or in ruins and are day trips.
    expect(c.day).toBe(2);
    // A selected and an unselected chip read the same way; the selected ones add up to the result.
    expect(c.cond.preserved + c.cond.in_ruins).toBe(c.total);
    expect(c.tt).toMatchObject({ any: 2, '1-2': 1, '2-3': 1, unknown: 0 });
    expect(c.confirmed + c.partial).toBe(c.doc);
  });
  it('where counts divisions and districts under the non-where groups', () => {
    const c = counts(SITES, st({ div: ['dhaka'], dist: ['manikganj'], cond: ['lost', 'unknown'] }), P);
    expect(c.div).toEqual({ dhaka: 1, rajshahi: 1 });
    expect(c.dist).toEqual({ dhaka: 0, manikganj: 1, bogura: 1 });
    expect(c.total).toBe(1);
  });
});

describe('filters: empty-state suggestion and active values (6.9, FR-23, FR-27, D6)', () => {
  it('names the group or switch whose removal brings back the most sites; ties go to rail order', () => {
    const f = st({ day: true, cond: ['lost'], photo: true });
    expect(filter(SITES, f, P)).toHaveLength(0);
    expect(activeGroups(f)).toEqual(['day', 'cond', 'photo']);
    expect(bestRemoval(SITES, f, P)).toEqual({ group: 'cond', count: 1 });
    expect(bestRemoval(SITES, st({ tt: 'unknown', day: true }), P)).toEqual({ group: 'tt', count: 3 });
    expect(bestRemoval(SITES, st({ cond: ['lost'], vloc: true }), P)).toEqual({ group: 'cond', count: 1 }); // a tie: rail order
    expect(bestRemoval(SITES, EMPTY, P)).toBeNull();
  });
  it('removing a whole group or one value', () => {
    expect(without(st({ div: ['dhaka'], dist: ['dhaka'] }), 'where')).toMatchObject({ div: [], dist: [] });
    const f = st({ day: true, tt: '2-3', cond: ['preserved', 'lost'], div: ['dhaka'], dist: ['manikganj'], hours: true });
    expect(activeValues(f).map(v => v.group)).toEqual(['day', 'tt', 'cond', 'cond', 'div', 'dist', 'hours']);
    expect(removeValue(f, { group: 'div', value: 'dhaka' }, P)).toMatchObject({ div: [], dist: [] });
    expect(removeValue(f, { group: 'cond', value: 'lost' }, P).cond).toEqual(['preserved']);
    expect(removeValue(f, { group: 'tt', value: '2-3' }, P).tt).toBe('any');
  });
});

describe('filters on the real index (6.2 invariants, AC-1)', () => {
  const index: IndexSite[] = JSON.parse(readFileSync('public/data/index.json', 'utf8'));
  const real = makePlaces({
    divisions: getDivisions().map(d => ({ slug: d.slug, en: d.en, bn: d.bn })),
    districts: getDistricts().map(d => ({ slug: d.slug, en: d.en, bn: d.bn, divisionSlug: d.divisionSlug })),
  });
  const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);
  const single = (c: ReturnType<typeof counts>) => ({ cond: sum(c.cond), acc: sum(c.acc), type: sum(c.type), div: sum(c.div), dist: sum(c.dist), tt: sum(c.tt) - c.tt.any });

  it('every site resolves to a division and district slug', () => {
    for (const s of index) {
      expect(real.div(s), s.i).not.toBe('');
      expect(real.divisionOf(real.dist(s)), s.i).toBe(real.div(s));
    }
  });
  it('with no filters, each single-value group sums to the total', () => {
    const c = counts(index, EMPTY, real);
    expect(c.total).toBe(index.length);
    for (const [g, v] of Object.entries(single(c))) expect(v, g).toBe(index.length);
    expect(c.tt.any).toBe(index.length);
  });
  it('with any one filter on, every count is ≤ the total and the other groups sum to the result', () => {
    const cases: FilterState[] = [
      st({ day: true }), st({ tt: '2-3' }), st({ cond: ['in_ruins'] }), st({ acc: ['ticketed', 'unknown'] }), st({ div: ['rajshahi'] }),
      st({ type: ['house'] }), st({ doc: true }), st({ vloc: true }), st({ photo: true }), st({ hours: true }),
    ];
    for (const f of cases) {
      const c = counts(index, f, real);
      const all = [c.day, c.doc, c.vloc, c.photo, c.hours, ...Object.values(c.tt), ...Object.values(c.cond), ...Object.values(c.acc),
        ...Object.values(c.type), ...Object.values(c.div), ...Object.values(c.dist)];
      for (const v of all) expect(v).toBeLessThanOrEqual(index.length);
      const own = activeGroups(f)[0];
      for (const [g, v] of Object.entries(single(c))) {
        if (g === own || (own === 'where' && (g === 'div' || g === 'dist'))) continue;
        expect(v, `${JSON.stringify(f)} ${g}`).toBe(c.total);
      }
    }
  });
  it('counts follow the data, not typed numbers (AC-13)', () => {
    const c1 = counts(index, EMPTY, real);
    const c2 = counts(index.slice(1), EMPTY, real);
    expect(c2.total).toBe(c1.total - 1);
    expect(c2.cond[index[0].c]).toBe(c1.cond[index[0].c] - 1);
  });
});

describe('URL state (6.3, AC-2)', () => {
  const view = (search: string) => { const p = parse(search, P); return { ...p, qs: serialize(p) }; };
  it('round-trips canonical URLs', () => {
    for (const qs of ['', 'day=1', 'tt=unknown&cond=preserved,lost&div=dhaka,rajshahi&dist=manikganj&type=house,unclassified&doc=1&vloc=1&photo=1&hours=1&sort=name',
      'acc=ticketed,not_applicable_lost&sort=district&q=baliati%20palace&view=map&sel=JB-DHK-064&ids=JB-DHK-064,JB-DHK-001']) {
      const p = view(qs);
      expect(p.dropped, qs).toBe(false);
      expect(p.qs).toBe(qs);
    }
  });
  it('canonicalises order, duplicates and defaults', () => {
    const p = view('photo=1&cond=lost,preserved,lost&div=rajshahi,dhaka&sort=time&tt=2-3');
    expect(p.dropped).toBe(false);
    expect(p.qs).toBe('tt=2-3&cond=preserved,lost&div=dhaka,rajshahi&photo=1');
    expect(view(p.qs).qs).toBe(p.qs);
  });
  it('drops unknown keys and values, and reports it', () => {
    const p = view('cond=ruins,lost&tt=5h&day=yes&type=zamindar_house&color=red&sort=age&view=globe&sel=nope&ids=JB-DHK-001,x');
    expect(p.dropped).toBe(true);
    expect(p.qs).toBe('cond=lost&ids=JB-DHK-001');
    expect(view('day=1&day=1').dropped).toBe(true);
  });
  it('drops a district outside the selected divisions (6.3)', () => {
    const p = view('div=rajshahi&dist=manikganj,bogura');
    expect(p.dropped).toBe(true);
    expect(p.qs).toBe('div=rajshahi&dist=bogura');
    expect(view('dist=bogura')).toMatchObject({ dropped: true, qs: '' });
  });
  it('drops IDs that name no site once the index is known', () => {
    const p = parse('sel=JB-DHK-999', P, new Set(['JB-DHK-001']));
    expect(p).toMatchObject({ dropped: true, extras: {} });
  });
  it('trims and caps q, and keeps it encoded', () => {
    const p = view(`q=${encodeURIComponent(`  ${'x'.repeat(150)}  `)}`);
    expect(p.extras.q).toHaveLength(Q_MAX);
    expect(view('q=%20%20').qs).toBe('');
    expect(view('q=a%2Cb').qs).toBe('q=a%2Cb');
  });
  it('keeps every key in URLS.md table order', () => {
    const urls = readFileSync('docs/URLS.md', 'utf8');
    const table = urls.slice(urls.indexOf('### Explore'), urls.indexOf('### Search'));
    const keys = [...table.matchAll(/^\| `([a-z]+)` \|/gm)].map(m => m[1]);
    expect(keys).toEqual(['day', 'tt', 'cond', 'acc', 'div', 'dist', 'type', 'doc', 'vloc', 'photo', 'hours', 'sort', 'q', 'view', 'sel', 'ids']);
    expect(table).toContain(TYPE_ORDER.map(t => `\`${t}\``).join(', '));
    expect(table).toContain(ACCESS_ORDER.map(t => `\`${t}\``).join(', '));
    expect(table).toContain(CONDITION_ORDER.map(t => `\`${t}\``).join(', '));
    expect(table).toContain(BUCKET_ORDER.map(t => `\`${t}\``).join(', '));
  });
});

describe('sort (6.4, AC-3)', () => {
  it('travel time: bucket, exact hours, bucket without hours, unknown last', () => {
    expect(ids(sortSites(SITES, 'time', 'en'))).toEqual(['JB-DHK-001', 'JB-DHK-002', 'JB-DHK-004', 'JB-DHK-003', 'JB-RAJ-001']);
  });
  it('is stable: the same sites in any order give the same list, with ties broken by name then ID', () => {
    const twins = [site('JB-DHK-020', { e: 'Same', tb: '1-2', h: 1 }), site('JB-DHK-010', { e: 'Same', tb: '1-2', h: 1 }), site('JB-DHK-015', { e: 'Alpha', tb: '1-2', h: 1 })];
    const want = ['JB-DHK-015', 'JB-DHK-010', 'JB-DHK-020'];
    expect(ids(sortSites(twins, 'time', 'en'))).toEqual(want);
    expect(ids(sortSites([...twins].reverse(), 'time', 'en'))).toEqual(want);
    for (const s of ['name', 'district'] as const) expect(ids(sortSites(SITES, s, 'bn'))).toEqual(ids(sortSites([...SITES].reverse(), s, 'bn')));
  });
  it('name and district follow the interface language, with the English name when Bangla is missing (D8)', () => {
    const x = [site('JB-DHK-030', { e: 'Beta', b: 'ক' }), site('JB-DHK-031', { e: 'Alpha', b: 'খ' }), site('JB-DHK-032', { e: 'Gamma', b: undefined })];
    expect(ids(sortSites(x, 'name', 'en'))).toEqual(['JB-DHK-031', 'JB-DHK-030', 'JB-DHK-032']);
    expect(ids(sortSites(x, 'name', 'bn'))).toEqual(['JB-DHK-030', 'JB-DHK-031', 'JB-DHK-032']); // the Bangla collator puts Latin last
    expect(ids(sortSites(SITES, 'district', 'en'))).toEqual(['JB-RAJ-001', 'JB-DHK-001', 'JB-DHK-004', 'JB-DHK-002', 'JB-DHK-003']);
  });
});

describe('SiteCard (6.1, AC-4)', () => {
  const VARIANTS: CardVariant[] = ['full', 'compact', 'row'];
  it('shows the photo with its credit, or placeholder art', () => {
    for (const v of VARIANTS) {
      const withPhoto = renderToStaticMarkup(<SiteCard site={A} variant={v} />);
      expect(withPhoto).toContain('src="/thumbs/IMG-DHK-001-001.webp"');
      expect(withPhoto).toContain(A.img!.credit);
      const without = renderToStaticMarkup(<SiteCard site={B} variant={v} />);
      expect(without).not.toContain('<img');
      expect(without).toContain('data-placeholder="in_ruins"');
    }
  });
  it('says "No map location yet" only for a hidden pin', () => {
    for (const v of VARIANTS) {
      expect(lang(renderToStaticMarkup(<SiteCard site={C} variant={v} />), 'en')).toContain(STRINGS['location.noPin'].en);
      expect(renderToStaticMarkup(<SiteCard site={A} variant={v} />)).not.toContain('data-nopin');
    }
  });
  it('never shows a blank time, "Free" or Tk 0', () => {
    const a = lang(renderToStaticMarkup(<SiteCard site={A} variant="row" />), 'en');
    expect(a).toContain('1.5 h');
    expect(a).toContain('Ticketed · Tk 30');
    expect(lang(renderToStaticMarkup(<SiteCard site={E} variant="row" />), 'en')).toContain('2–3 h');
    const d = renderToStaticMarkup(<SiteCard site={{ ...D, fe: 0 }} variant="row" />);
    expect(lang(d, 'en')).toContain(STRINGS['card.timeUnknown'].en);
    for (const v of VARIANTS) {
      const html = lang(renderToStaticMarkup(<SiteCard site={{ ...C, fe: 0 }} variant={v} />), 'en');
      expect(html).not.toMatch(/Free|Tk 0/);
    }
  });
  it('shows the Bangla name, or the English name with the missing-name note (O13)', () => {
    expect(renderToStaticMarkup(<SiteCard site={A} variant="row" />)).toContain(A.b!);
    expect(lang(renderToStaticMarkup(<SiteCard site={D} variant="row" />), 'en')).toContain(STRINGS['common.bnNameMissing'].en);
  });
  it('has one link, to the site page', () => {
    const html = renderToStaticMarkup(<SiteCard site={B} variant="full" />);
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toMatch(/href="\/site\/JB-DHK-002\/jb-dhk-002\/?"/); // next.config adds the trailing slash in the build
  });
});
