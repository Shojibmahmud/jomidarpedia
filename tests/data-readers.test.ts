import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { createReaders } from '@/lib/data';
import { fixtureDir, runBuilders, tempDir } from './helpers';

// Readers over the valid fixture's build output (data/build is not committed, so CI has none before build).
const { out } = runBuilders(fixtureDir());
const r = createReaders(join(out, 'build'), join(out, 'public', 'index.json'));

describe('lib/data.ts readers (task 3.10)', () => {
  it('each reader returns its record shape', () => {
    expect(r.getIndex()[0]).toMatchObject({ i: 'JB-DHK-001', s: 'test-house-one', e: expect.any(String), c: expect.any(String) });
    expect(r.getMeta()).toMatchObject({ lastVerified: expect.any(String), compiledAt: expect.any(String), counts: { sites: 2 } });
    expect(r.getDivisions()[0]).toMatchObject({ slug: 'dhaka', en: 'Dhaka', bn: expect.any(String), districts: expect.any(Array) });
    expect(r.getDistricts()[0]).toMatchObject({ slug: 'manikganj', divisionSlug: 'dhaka', siteIds: expect.any(Array) });
    expect(r.getSources()[0]).toMatchObject({ id: expect.stringMatching(/^SRC-/), title: expect.any(String), sites: expect.any(Array) });
    expect(r.getCredits()[0]).toMatchObject({ imageId: 'IMG-DHK-001-001', thumb: '/thumbs/IMG-DHK-001-001.webp' });
    const trip = r.getTrips()[0];
    expect(trip).toMatchObject({ id: expect.stringMatching(/^IT-/), title: expect.any(String), siteIds: expect.any(Array) });
    expect(r.getTrip(trip.id)).toMatchObject({ id: trip.id, stops: expect.any(Array) });
    expect(r.getSite('JB-DHK-001')).toMatchObject({ id: 'JB-DHK-001', name: { en: 'Test House One' }, location: { status: 'verified' } });
  });

  it('throws on an unknown ID instead of returning undefined', () => {
    expect(() => r.getSite('JB-DHK-999')).toThrow(/no site "JB-DHK-999"/);
    expect(() => r.getTrip('IT-DHK-999-1')).toThrow(/no trip "IT-DHK-999-1"/);
  });

  it('names a missing file and says how to make it', () => {
    const empty = createReaders(tempDir('nobuild'), join(tempDir('noindex'), 'index.json'));
    expect(() => empty.getMeta()).toThrow(/data\/build\/meta\.json not found .*Run `npm run data` first/);
    expect(() => empty.getIndex()).toThrow(/public\/data\/index\.json not found/);
  });
});
