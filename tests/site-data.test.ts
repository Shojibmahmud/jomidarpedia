// Phase 5 build changes on fixtures (spec .claude/specs/05-Site-page.md FR-50 to FR-54).
import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { fixtureDir, readJson, readTable, reportText, runBuilders, writeTable } from './helpers';
import { isPlaceholderEvent, eventYear, BD_COORD_TEXT } from '../scripts/lib/rules.mjs';

const built = (dir = fixtureDir()) => {
  const { out, results } = runBuilders(dir);
  return { results, site: (id: string) => readJson(join(out, 'build', 'sites', `${id}.json`)) };
};

describe('history placeholders and years (FR-51, FR-52)', () => {
  it('recognises events that only say nothing is known', () => {
    for (const d of ['Not documented.', 'Not documented', 'Unknown.', 'Not documented in the sources checked.',
      'Founding / building period: Not documented in the sources checked.. Founder or family: Durga Ghosh (name only).',
      'Founding / building period: Unknown. Founder or family: Unknown.'])
      expect(isPlaceholderEvent(d), d).toBe(true);
    for (const d of ['The house was built.', 'Not documented. Google Maps lists it as a heritage or historical place.',
      'Founding / building period: Not documented; the zamindar left around 1948. Founder or family: X',
      'Standing, privately held; condition not documented.'])
      expect(isPlaceholderEvent(d), d).toBe(false);
  });
  it('shows a reversed range as its start year', () => {
    expect(eventYear({ year_start: '2026', year_end: '2010' }, false)).toBe('2026');
    expect(eventYear({ year_start: '1884', year_end: '1890' }, false)).toBe('1884–1890');
    expect(eventYear({ year_start: '1850', year_end: '' }, true)).toBe('c. 1850');
    expect(eventYear({ year_start: '1850', year_end: '1850' }, false)).toBe('1850');
  });
  it('the build drops placeholders, fixes years and reports both', () => {
    const dir = fixtureDir();
    const base = readTable(dir, 'history_events')[0];
    writeTable(dir, 'history_events', [
      base,
      { ...base, event_id: 'HE-DHK-001-002', event_type: 'present_condition', year_start: '2026', year_end: '2010', date_approximate: 'FALSE', description: 'Preserved.' },
      { ...base, event_id: 'HE-DHK-001-003', description: 'Not documented.' }
    ]);
    const b = built(dir);
    expect(b.site('JB-DHK-001').history.map((h: { year: string; text: string }) => [h.year, h.text])).toEqual([['c. 1850', 'The house was built.'], ['2026', 'Preserved.']]);
    const text = reportText(b.results, 'local');
    expect(text).toContain('- 1: HE-DHK-001-003');
    expect(text).toContain('- 1: HE-DHK-001-002');
  });
});

describe('related sites (FR-50)', () => {
  it('carry their relation and note', () => {
    expect(built().site('JB-DHK-001').related).toEqual([expect.objectContaining({ id: 'JB-DHK-002', relation: 'combine_on_trip', note: 'Nearby; pairs well on one trip.' })]);
  });
  it('a pair listed twice keeps the identity relation', () => {
    const dir = fixtureDir();
    const [row] = readTable(dir, 'site_relationships');
    writeTable(dir, 'site_relationships', [row, { ...row, relation_id: 'RL-0002', site_id: 'JB-DHK-002', related_site_id: 'JB-DHK-001', relation_type: 'same_name_different_site', note: 'Different places.' }]);
    const b = built(dir);
    expect(b.site('JB-DHK-001').related).toEqual([expect.objectContaining({ id: 'JB-DHK-002', relation: 'same_name_different_site', note: 'Different places.' })]);
    expect(b.site('JB-DHK-002').related).toHaveLength(1);
  });
  it('an unknown relation type is a structural error', () => {
    const dir = fixtureDir();
    writeTable(dir, 'site_relationships', readTable(dir, 'site_relationships').map(r => ({ ...r, relation_type: 'neighbour' })));
    expect(JSON.stringify(runBuilders(dir).data.structural)).toMatch(/relation_type.*not one of/);
  });
});

describe('hidden pins carry no coordinates in text (FR-53, FR-54)', () => {
  it('the note of a hidden pin is left out; a mappable one keeps it', () => {
    const b = built();
    expect(b.site('JB-DHK-002').location.note).toBeUndefined();
    expect(b.site('JB-DHK-001').location.note).toBe('Pin matched to a published map.');
  });
  it('finds coordinate pairs inside Bangladesh in prose', () => {
    for (const s of ['Elangi bazar (about 24.6988, 89.5135)', '132 reviews, 24.6751489, 88.3677796', '23.95678 90.15678', '24.123°N 90.456°E'])
      expect(BD_COORD_TEXT.test(s), s).toBe(true);
    for (const s of ['about 24.6 km away', 'Tk 1,250.50 and 90.25', '51.5074, -0.1278', 'built 1884.1890'])
      expect(BD_COORD_TEXT.test(s), s).toBe(false);
  });
});
