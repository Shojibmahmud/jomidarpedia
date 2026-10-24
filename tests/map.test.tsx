// Map units (roadmap Phase 7, spec 07 AC-3, AC-9, AC-13, AC-14): pin and cluster rules, the card summary
// built into index.json, the Lite mode preference and the selected-site card. Real-data expectations are
// computed from public/data/index.json, never typed (I6).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { SummaryCard } from '@/components/map/SummaryCard';
import { CONDITION_ORDER } from '@/lib/filters';
import { STRINGS } from '@/lib/i18n';
import { BASE_MAPS, defaultBaseMap } from '@/lib/map-config';
import { clusterHtml, clusterSize, mappable, pinHtml, pinLabel, pinStyle, pinSvg } from '@/lib/pins';
import { applyLite, BOOT_SCRIPT, currentLite } from '@/lib/prefs';
import type { IndexSite, LocationStatus } from '@/lib/types';
import { cardSummary, CARD_MAX } from '../scripts/lib/rules.mjs';

const index: IndexSite[] = JSON.parse(readFileSync('public/data/index.json', 'utf8'));
const STATUSES: LocationStatus[] = ['verified', 'single_source', 'approximate', 'unverified', 'not_found'];
const site = (o: Partial<IndexSite> = {}): IndexSite => ({
  i: 'JB-DHK-900', s: 'test-bari', e: 'Test Bari', dv: 'Dhaka', d: 'Manikganj', db: 'মানিকগঞ্জ', lc: 'verified', c: 'preserved',
  ac: 'unknown', tb: 'unknown', rc: 'unconfirmed', t: 'house', ty: 'zamindar_bari', ll: [23.9, 90.0], ...o,
});

describe('pins (FR-13 to FR-15, O9)', () => {
  it('fill follows the location status; the "?" badge follows the flag', () => {
    const fill = Object.fromEntries(STATUSES.map(lc => [lc, pinStyle(site({ lc })).fill]));
    expect(fill).toEqual({ verified: 'solid', single_source: 'outlined', approximate: 'hatched', unverified: 'outlined', not_found: 'outlined' });
    for (const c of CONDITION_ORDER) for (const lc of STATUSES) for (const f of [undefined, 1] as const) {
      const svg = pinSvg(pinStyle(site({ c, lc, f })));
      expect(svg.includes('>?</text>'), `${c} ${lc} ${f}`).toBe(f === 1);
      expect(svg.includes('url(#jp-hatch-'), `${c} ${lc}`).toBe(lc === 'approximate');
    }
  });

  it('JB-DHK-008, the one unverified mapped site, is outlined with the badge and says so', () => {
    const unverified = index.filter(s => s.ll && (s.lc === 'unverified' || s.lc === 'not_found'));
    expect(unverified.map(s => s.i)).toEqual(['JB-DHK-008']);
    const s = unverified[0];
    expect(pinStyle(s)).toMatchObject({ fill: 'outlined', flagged: true });
    expect(pinLabel(s, 'en')).toContain(STRINGS['location.unverified'].en);
    expect(pinLabel(s, 'en')).not.toMatch(/confirmed|one source/);
  });

  it('names a pin by name, condition and location status in both languages', () => {
    expect(pinLabel(site(), 'en')).toBe(`Test Bari, ${STRINGS['condition.preserved'].en}, ${STRINGS['location.verified'].en}`);
    expect(pinLabel(site({ f: 1 }), 'bn')).toBe(`Test Bari, ${STRINGS['condition.preserved'].bn}, ${STRINGS['location.verified'].bn}, ${STRINGS['map.flagged'].bn}`);
  });

  it('escapes names in the marker HTML and keeps the label out of the accessible tree', () => {
    const html = pinHtml(site({ e: 'A & B <x>' }));
    expect(html).toContain('A &#38; B &#60;x&#62;');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('<button');
  });

  it('cluster sizes: 36 px up to 9, 44 px up to 99, 52 px from 100 (FR-18)', () => {
    expect([1, 9, 10, 99, 100, 299].map(clusterSize)).toEqual([36, 36, 44, 44, 52, 52]);
    expect(clusterHtml(17, '১৭')).toContain('data-count="17">১৭<');
  });

  it('maps exactly the sites with coordinates', () => {
    expect(mappable(index).length).toBe(index.filter(s => Array.isArray(s.ll)).length);
    expect(mappable(index).every(s => s.ll)).toBe(true);
  });
});

describe('base maps (D5, amended)', () => {
  it('offers only providers that need no key, and defaults to one of them in both themes', () => {
    expect(BASE_MAPS.every(b => !b.needsKey)).toBe(true);
    expect(BASE_MAPS.map(b => b.id)).toContain(defaultBaseMap(false));
    expect(BASE_MAPS.map(b => b.id)).toContain(defaultBaseMap(true));
    for (const b of BASE_MAPS) expect(b.attribution).toMatch(/OpenStreetMap/);
  });
});

describe('card summary sm (FR-34, AC-13)', () => {
  it('takes the first sentence, skipping initials and titles', () => {
    expect(cardSummary('A palace. It has a pond.')).toBe('A palace. It has a pond.'); // first under 60: two sentences
    const long = 'A complex of seven palace buildings with about 200 rooms, built by salt merchants. The rest.';
    expect(cardSummary(long)).toBe('A complex of seven palace buildings with about 200 rooms, built by salt merchants.');
    expect(cardSummary('Recorded in Md. Mahmud Ali\'s book about the zamindar houses of the east. More.'))
      .toBe('Recorded in Md. Mahmud Ali\'s book about the zamindar houses of the east.');
    expect(cardSummary('The S.B.K. Union portal of Maheshpur carries a banner page for the house today. More.'))
      .toBe('The S.B.K. Union portal of Maheshpur carries a banner page for the house today.');
  });

  it('cuts at a word boundary to 160 characters with an ellipsis', () => {
    const s = cardSummary(`${'word '.repeat(60)}end.`);
    expect(s.length).toBeLessThanOrEqual(CARD_MAX);
    expect(s.endsWith('…')).toBe(true);
    expect(s).not.toMatch(/\s…$/);
  });

  it('every index row has a non-empty sm of at most 160 characters', () => {
    for (const s of index) {
      expect(s.sm, s.i).toBeTruthy();
      expect(s.sm!.length, s.i).toBeLessThanOrEqual(CARD_MAX);
    }
  });
});

describe('Lite mode preference (FR-35, AC-14)', () => {
  const root = () => ({ lang: 'en', dataset: {} as Record<string, string> });
  const storage = (init: Record<string, string> = {}, broken = false) => {
    const data = { ...init };
    const guard = () => { if (broken) throw new Error('SecurityError'); };
    return { data, getItem: (k: string) => { guard(); return k in data ? data[k] : null; }, setItem: (k: string, v: string) => { guard(); data[k] = v; }, removeItem: (k: string) => { guard(); delete data[k]; } };
  };
  const boot = (st: ReturnType<typeof storage>, connection?: object) => {
    const r = root();
    new Function('document', 'localStorage', 'navigator', BOOT_SCRIPT)({ documentElement: r }, st, connection ? { connection } : {});
    return r;
  };

  it('is off by default, on when stored, and follows Save-Data only when nothing is stored', () => {
    expect(boot(storage()).dataset.lite).toBeUndefined();
    expect(boot(storage({ 'jp-lite': '1' })).dataset).toMatchObject({ lite: '1' });
    expect(boot(storage({ 'jp-lite': '1' })).dataset.liteAuto).toBeUndefined();
    expect(boot(storage(), { saveData: true }).dataset).toMatchObject({ lite: '1', liteAuto: '1' });
    expect(boot(storage({ 'jp-lite': '0' }), { saveData: true }).dataset.lite).toBeUndefined();
  });

  it('follows Save-Data when storage throws', () => {
    expect(boot(storage({}, true), { saveData: true }).dataset.lite).toBe('1');
    expect(boot(storage({}, true)).dataset.lite).toBeUndefined();
  });

  it('a manual choice is stored and clears the automatic note', () => {
    const r = root(); r.dataset.lite = '1'; r.dataset.liteAuto = '1';
    const st = storage();
    applyLite(false, r, st);
    expect(currentLite(r)).toBe(false);
    expect(r.dataset.liteAuto).toBeUndefined();
    expect(st.data['jp-lite']).toBe('0');
    applyLite(true, r, st);
    expect(currentLite(r)).toBe(true);
    expect(st.data['jp-lite']).toBe('1');
    expect(() => applyLite(false, r, storage({}, true))).not.toThrow();
  });
});

describe('SummaryCard (FR-28, AC-9)', () => {
  const render = (s: IndexSite) => renderToStaticMarkup(<SummaryCard site={s} variant="popover" onClose={() => {}} />);

  it('Baliati: photo and credit, summary, location label, Read more and Directions', () => {
    const b = index.find(s => s.i === 'JB-DHK-064')!;
    const html = render(b);
    expect(html).toContain(`/thumbs/${b.img!.id}.webp`);
    expect(html).toContain('data-credit');
    expect(html).toContain(b.sm!.replace(/'/g, '&#x27;'));
    expect(html).toContain(STRINGS['location.verified'].en);
    expect(html).toContain(`href="/site/${b.i}/${b.s}`); // next/link drops the trailing slash outside the app
    expect(html).toContain('/maps/dir/');
    expect(html).toContain('role="dialog"');
  });

  it('no photo: placeholder art and no credit; unknown fee: no price and no "Free"', () => {
    const html = render(site({ ac: 'unknown' }));
    expect(html).toContain('data-placeholder');
    expect(html).not.toContain('data-credit');
    expect(html).not.toMatch(/Tk 0|Free/);
    expect(html).toContain(STRINGS['card.timeUnknown'].en);
    expect(html).toContain(STRINGS['summary.dayTrip.unknown'].en);
  });

  it('JB-DHK-008 says "Location unverified"', () => {
    expect(render(index.find(s => s.i === 'JB-DHK-008')!)).toContain(STRINGS['location.unverified'].en);
  });
});
