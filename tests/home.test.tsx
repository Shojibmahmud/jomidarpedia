// Phase 11 units (spec .claude/specs/11-Home-page.md AC-1, AC-6 to AC-8, AC-10, AC-11, AC-13, AC-16, AC-17): the
// rendered home page against meta.json, the quick links against Explore's own filter, the featured-trip rule, the
// curated photo check and the home variants. Expected values come from the data, never typed (I6).
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import Home from '@/app/page';
import { filter, makePlaces } from '@/lib/filters';
import { getCredits, getDistricts, getDivisions, getIndex, getMeta } from '@/lib/data';
import { both, formatCount } from '@/lib/format';
import { CATEGORY_HREF, CHIP_HREF, featuredTrips, HOME_IMAGES } from '@/lib/home';
import { tripCards } from '@/lib/trip-data';
import type { TripCard } from '@/lib/trips';
import { parse } from '@/lib/urlState';
import { buildHomeImages, homeVariants, variantFile } from '@/scripts/build-thumbs.mjs';
import { checkHome } from '@/scripts/lib/home-check.mjs';
import { combine } from '@/scripts/lib/report.mjs';
import { MODES, tempDir, writeTable } from './helpers';

const { counts } = getMeta();
const index = getIndex();
const places = makePlaces({
  divisions: getDivisions().map(d => ({ slug: d.slug, en: d.en, bn: d.bn })),
  districts: getDistricts().map(d => ({ slug: d.slug, en: d.en, bn: d.bn, divisionSlug: d.divisionSlug })),
});
/** How many sites Explore shows for one of its URLs. */
const exploreCount = (href: string) => filter(index, parse(href.split('?')[1] ?? '', places).state, places).length;
const html = renderToStaticMarkup(<Home />);
const en = (v: number) => both(formatCount, v).en;
const bn = (v: number) => both(formatCount, v).bn;

describe('home counts (spec 11 FR-1, FR-10, AC-1, AC-8)', () => {
  it('meta has the day-trip sites and open-to-visitors counts, equal to the index and the division sums', () => {
    expect(counts.dayTripSites).toBe(index.filter(s => s.dt === 1).length);
    expect(counts.dayTripSites).toBe(getDivisions().reduce((n, d) => n + d.dayTrip, 0));
    expect(counts.openToVisitors).toBe(index.filter(s => s.ac === 'ticketed' || s.ac === 'open_no_ticket_reported').length);
    expect(counts.dayTripSites).not.toBe(counts.dayTrips); // sites, not one-day plans
  });

  it('the page shows every number from the data, in both languages', () => {
    const shown = [counts.sites, counts.dayTripSites, counts.openToVisitors, counts.images, counts.sources, counts.legends, counts.onMap,
      counts.trips, counts.disagreements, counts.divisions, counts.conditions.preserved, counts.conditions.in_ruins, counts.conditions.preserved_adaptive_reuse];
    for (const v of shown) {
      expect(html, `en ${v}`).toContain(en(v));
      expect(html, `bn ${v}`).toContain(bn(v));
    }
    for (const d of getDivisions()) expect(html, d.slug).toContain(`>${en(d.count)}</span>`);
  });

  it('has data-true labels: sources cited, not checked; no 982; no sample links (D5, D6, D10)', () => {
    expect(html).toContain('sources cited');
    expect(html).not.toContain('sources checked');
    expect(html).not.toContain(en(counts.disagreements + counts.openQuestions));
    expect(html).toContain(`${en(counts.disagreements)} recorded disagreements`);
    expect(html).not.toContain('Five sites to start with');
    expect(html).toContain(`${en(counts.conditions.preserved_adaptive_reuse)} in new use`);
    expect(html).not.toMatch(/museums, offices, schools/);
  });
});

describe('quick chips and category tiles (FR-7, FR-8, AC-6)', () => {
  it('link to canonical Explore URLs', () => {
    expect(CHIP_HREF).toEqual({ dayTrips: '/explore/?day=1', open: '/explore/?acc=ticketed,open_no_ticket_reported', map: '/explore/?view=map' });
    expect(CATEGORY_HREF).toEqual({
      dayTrips: '/explore/?day=1', preserved: '/explore/?cond=preserved', ruins: '/explore/?cond=in_ruins', newUse: '/explore/?cond=preserved_adaptive_reuse',
    });
  });

  it('each count equals what Explore shows for its link', () => {
    expect(exploreCount(CHIP_HREF.dayTrips)).toBe(counts.dayTripSites);
    expect(exploreCount(CHIP_HREF.open)).toBe(counts.openToVisitors);
    expect(exploreCount(CATEGORY_HREF.preserved)).toBe(counts.conditions.preserved);
    expect(exploreCount(CATEGORY_HREF.ruins)).toBe(counts.conditions.in_ruins);
    expect(exploreCount(CATEGORY_HREF.newUse)).toBe(counts.conditions.preserved_adaptive_reuse);
  });

  it('has no "Within 2 hours" chip (D3)', () => {
    expect(html).not.toMatch(/Within 2 hours/);
    expect(html.match(/data-home-chip=/g)).toHaveLength(3);
  });
});

describe('photos and credits (FR-4, FR-9, FR-13, AC-4, AC-19)', () => {
  const credits = new Map(getCredits().map(c => [c.imageId, c.credit]));
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  it('every curated photo prints its exact credit, and the page shows one credit per curated image', () => {
    const ids = [HOME_IMAGES.hero, ...Object.values(HOME_IMAGES.categories), ...Object.values(HOME_IMAGES.divisions)];
    for (const id of ids) expect(html, id).toContain(esc(credits.get(id)!));
    expect(html.match(/data-credit=/g)).toHaveLength(ids.length);
  });

  it('the hero image is eager and high priority, every other home image lazy (A-4)', () => {
    const imgs = html.match(/<img [^>]*>/g)!;
    const hero = imgs.filter(i => i.includes(`/home/${HOME_IMAGES.hero}-`));
    expect(hero).toHaveLength(1);
    expect(hero[0]).toMatch(/loading="eager"/);
    expect(hero[0]).toMatch(/fetchPriority="high"/i);
    for (const i of imgs.filter(x => !hero.includes(x))) expect(i).toMatch(/loading="lazy"/);
    for (const i of imgs) expect(i).toMatch(/width="\d+" height="\d+"/);
  });

  it('division tiles are in count order, each linking to its division page (FR-12, AC-10)', () => {
    const order = [...html.matchAll(/data-home-division="([a-z]+)"/g)].map(m => m[1]);
    expect(order).toEqual([...getDivisions()].sort((a, b) => b.count - a.count || a.en.localeCompare(b.en)).map(d => d.slug));
    for (const s of order) expect(html).toMatch(new RegExp(`href="/division/${s}/?"`)); // next/link drops the slash outside a Next build
  });
});

describe('featured trips (FR-14, D4, AC-11)', () => {
  const card = (id: string, over: Partial<TripCard>): TripCard => ({
    id, title: id, duration: 'One day', anchorSlug: 'a', anchorEn: 'A', division: 'Dhaka', district: 'Dhaka', stopCount: 2, bucket: '1-2', divSlug: 'dhaka',
    photos: [{ n: 1, thumb: '/thumbs/x.webp', credit: 'c' }], ...over,
  });

  it('today: Old Dhaka palaces, Gazipur and Narayanganj river heritage, in three districts', () => {
    const picked = featuredTrips(tripCards());
    expect(picked.map(t => t.title)).toEqual(['Old Dhaka palaces', 'Gazipur', 'Narayanganj river heritage']);
    expect(new Set(picked.map(t => t.district)).size).toBe(3);
    for (const t of picked) expect(html, t.id).toContain(`data-trip="${t.id}"`);
  });

  it('puts a timed plan first and never picks two trips in one district', () => {
    const picked = featuredTrips([
      card('a', { bucket: '0-1', district: 'Dhaka' }), card('b', { bucket: '0-1', district: 'Dhaka', title: 'b2' }),
      card('c', { bucket: '4+', district: 'Sylhet', planStatus: 'timed' }), card('d', { bucket: '1-2', district: 'Gazipur' }),
    ]);
    expect(picked.map(t => t.id)).toEqual(['c', 'a', 'd']);
  });

  it('breaks travel-time ties by title', () => {
    const picked = featuredTrips([card('z', { title: 'Zeta', hours: 1.5, district: 'X' }), card('y', { title: 'Alpha', hours: 1.5, district: 'Y' })]);
    expect(picked.map(t => t.id)).toEqual(['y', 'z']);
  });

  it('fills with photo-less trips only when fewer than three have a photo', () => {
    const none = { photos: undefined };
    const picked = featuredTrips([card('a', { district: 'A' }), card('b', { district: 'B', bucket: '0-1', ...none }), card('c', { district: 'C', ...none }), card('d', { district: 'D', bucket: '4+' })]);
    expect(picked.map(t => t.id)).toEqual(['a', 'd', 'b']);
    expect(featuredTrips([card('a', {}), card('b', {})]).map(t => t.id)).toEqual(['a']);
    expect(featuredTrips([])).toEqual([]);
  });
});

describe('language (FR-5, FR-22, AC-4, AC-16)', () => {
  it('the h1 is the title in the interface language, with the other language below it', () => {
    expect(html).toMatch(/<h1[^>]*><span lang="en" data-l="en">The zamindar palaces of Bangladesh<\/span><span lang="bn" data-l="bn">বাংলাদেশের জমিদার বাড়ি<\/span><\/h1>/);
    expect(html).toContain('<span lang="en" data-l="bn" class="italic ">The zamindar palaces of Bangladesh</span>');
  });

  it('Bangla-mode text has no Latin digits outside credits and English-only text', () => {
    const bnSpans = [...html.matchAll(/<span lang="bn" data-l="bn"[^>]*>([^<]*)<\/span>/g)].map(m => m[1]);
    expect(bnSpans.length).toBeGreaterThan(20);
    for (const t of bnSpans) expect(t, t).not.toMatch(/[0-9]/);
  });
});

describe('home photo check (FR-24, AC-7)', () => {
  function project(edit?: (list: typeof HOME_IMAGES) => void) {
    const dir = tempDir('home');
    const list = structuredClone(HOME_IMAGES);
    edit?.(list);
    const listPath = join(dir, 'home-images.json');
    writeFileSync(listPath, JSON.stringify(list));
    const homeDir = join(dir, 'home');
    cpSync('public/home', homeDir, { recursive: true });
    return { homeDir, check: () => checkHome({ listPath, homeDir }) };
  }
  const fatal = (r: ReturnType<typeof checkHome>) => MODES.every(m => combine([r], m).fatal);

  it('passes with the committed list and variants', () => {
    const r = checkHome();
    expect(r.gates).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('fails in every mode, naming the ID, for a photo that is not Ready', () => {
    const r = project(l => { l.categories.ruins = 'IMG-DHK-030-005'; }).check();
    expect(r.gates.join('\n')).toMatch(/IMG-DHK-030-005 is not a Ready image/);
    expect(fatal(r)).toBe(true);
  });

  it('fails for a photo in the wrong division or of the wrong condition', () => {
    const wrongDiv = project(l => { l.divisions.sylhet = HOME_IMAGES.divisions.dhaka; }).check();
    expect(wrongDiv.gates.join('\n')).toMatch(new RegExp(`${HOME_IMAGES.divisions.dhaka} \\(JB-[A-Z]+-\\d+\\) is in Dhaka, not Sylhet`));
    const wrongTile = project(l => { l.categories.ruins = HOME_IMAGES.categories.preserved; }).check();
    expect(wrongTile.gates.join('\n')).toMatch(/does not match the "ruins" tile/);
    expect(fatal(wrongTile)).toBe(true);
  });

  it('fails for a missing variant and for a stray file in public/home', () => {
    const p = project();
    rmSync(join(p.homeDir, variantFile(HOME_IMAGES.hero, 1600)));
    writeFileSync(join(p.homeDir, 'IMG-DHK-030-005-800.webp'), '');
    const r = p.check();
    expect(r.gates.join('\n')).toMatch(/has no 1600 px variant/);
    expect(r.gates.join('\n')).toMatch(/IMG-DHK-030-005-800\.webp is not a listed home variant/);
  });
});

describe('home variants (FR-23, AC-17)', () => {
  it('the committed hero is at most 300 KB, and every listed width exists', () => {
    for (const [id, widths] of homeVariants(HOME_IMAGES)) {
      for (const w of widths) expect(existsSync(join('public/home', variantFile(id, w))), `${id} ${w}`).toBe(true);
    }
    const manifest = JSON.parse(readFileSync('public/home/manifest.json', 'utf8')).images;
    for (const [k, v] of Object.entries<{ bytes: number }>(manifest)) expect(v.bytes, k).toBeLessThanOrEqual(300 * 1024);
  });

  it('makes the listed widths only, never enlarged, strips metadata, and changes nothing on a second run', async () => {
    const dir = tempDir('homevar');
    mkdirSync(join(dir, 'images', 'dhaka'), { recursive: true });
    await sharp({ create: { width: 2000, height: 1000, channels: 3, background: '#a3422a' } })
      .withExif({ IFD0: { Copyright: 'someone' } }).jpeg().toFile(join(dir, 'images', 'dhaka', 'a.jpg'));
    await sharp({ create: { width: 700, height: 500, channels: 3, background: '#466636' } }).jpeg().toFile(join(dir, 'images', 'dhaka', 'b.jpg'));
    writeTable(dir, 'images', [
      { image_id: 'IMG-DHK-001-001', relative_file_path: 'dhaka/a.jpg', publication_readiness: 'Ready' },
      { image_id: 'IMG-DHK-001-002', relative_file_path: 'dhaka/b.jpg', publication_readiness: 'Ready' },
    ]);
    const listPath = join(dir, 'list.json');
    writeFileSync(listPath, JSON.stringify({ hero: 'IMG-DHK-001-001', categories: { dayTrips: 'IMG-DHK-001-002' }, divisions: {} }));
    const opts = { csvPath: join(dir, 'images.csv'), imagesDir: join(dir, 'images'), outDir: join(dir, 'home'), listPath };
    mkdirSync(opts.outDir);
    writeFileSync(join(opts.outDir, 'IMG-DHK-009-001-800.webp'), 'stray');

    const r = await buildHomeImages(opts);
    expect(r.problems).toEqual([]);
    expect(r.removed).toEqual(['IMG-DHK-009-001-800.webp']);
    expect(r.made.sort()).toEqual(['IMG-DHK-001-001-1600', 'IMG-DHK-001-001-960', 'IMG-DHK-001-002-800']);
    const meta = async (f: string) => sharp(join(opts.outDir, f)).metadata();
    expect([(await meta('IMG-DHK-001-001-1600.webp')).width, (await meta('IMG-DHK-001-001-1600.webp')).height]).toEqual([1600, 800]);
    expect((await meta('IMG-DHK-001-002-800.webp')).width).toBe(700); // never enlarged
    expect((await meta('IMG-DHK-001-001-960.webp')).exif).toBeUndefined();

    const again = await buildHomeImages(opts);
    expect([again.made, again.kept]).toEqual([[], 3]);
  });
});
