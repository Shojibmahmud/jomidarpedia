// Phase 14 release (spec .claude/specs/16-Release.md): the zip writer (A-1), the data download (FR-11 to FR-15,
// AC-10 to AC-13), the fresh-clone comparison (FR-5, FR-6, AC-5), the production check (FR-2, FR-8, AC-2, AC-7)
// and the maintainer documents (FR-18 to FR-20, AC-15). The download tests build from the real data/build.

import { describe, expect, it } from 'vitest';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { dosDate, readZip, writeZip } from '../scripts/lib/zip.mjs';
import { buildExport, cell, EXPORT_URL, fieldProblems, FIELDS, toCsv } from '../scripts/build-export.mjs';
import { checkOut, hiddenCoordinatePatterns } from '../scripts/check-out.mjs';
import { checkBudgets } from '../scripts/check-budgets.mjs';
import { compareOut, normalise, sortHeadTags } from '../scripts/compare-out.mjs';
import { checkProd, originProblems, sitemapUrls } from '../scripts/check-prod.mjs';
import { parseCsv } from '../scripts/csv.mjs';
import { createReaders } from '@/lib/data';
import { formatMegabytes } from '@/lib/format';
import type { Meta, SiteRecord } from '@/lib/types';
import { tempDir } from './helpers';

const write = (path: string, data: string | Buffer) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
};
const meta: Meta = JSON.parse(readFileSync('data/build/meta.json', 'utf8'));
const sitesCsv = readFileSync('data/csv/sites.csv', 'utf8');
// A coordinate pair of a hidden site, as the leak checks look for it.
const hiddenPair = hiddenCoordinatePatterns(sitesCsv)[0];

describe('zip writer (A-1)', () => {
  const files = [{ name: 'b.csv', data: 'x,y\n1,2\n' }, { name: 'a.md', data: 'বাংলা '.repeat(200) }, { name: 'tiny', data: 'z' }];

  it('reads back what it wrote, sorted, with UTF-8 intact', () => {
    const entries = readZip(writeZip(files, { date: '2026-10-29' }));
    expect(entries.map(e => e.name)).toEqual(['a.md', 'b.csv', 'tiny']);
    expect(entries[0].data.toString('utf8')).toBe('বাংলা '.repeat(200));
    expect(entries[2].data.toString()).toBe('z');
  });

  it('gives the same bytes for the same files in any order', () => {
    expect(writeZip(files, { date: '2026-10-29' }).equals(writeZip([...files].reverse(), { date: '2026-10-29' }))).toBe(true);
    expect(writeZip(files, { date: '2026-10-29' }).equals(writeZip(files, { date: '2026-10-30' }))).toBe(false);
  });

  it('dates entries from YYYY-MM-DD and refuses anything else or a repeated name', () => {
    expect(dosDate('1980-01-01')).toBe(33);
    expect(() => dosDate('29 Oct')).toThrow();
    expect(() => writeZip([files[0], files[0]], { date: '2026-10-29' })).toThrow(/twice/);
  });

  it('rejects a corrupted entry', () => {
    const zip = writeZip([{ name: 'a.txt', data: 'hello hello hello hello' }], { date: '2026-10-29' });
    zip[40] ^= 0xff;
    expect(() => readZip(zip)).toThrow();
  });
});

describe('CSV cells', () => {
  it('quotes only when needed and writes LF line ends', () => {
    expect(cell('plain')).toBe('plain');
    expect(cell('a, b')).toBe('"a, b"');
    expect(cell('say "hi"')).toBe('"say ""hi"""');
    expect(cell('two\nlines')).toBe('"two\nlines"');
    expect(cell(undefined)).toBe('');
    expect(cell(0)).toBe('0');
    expect(toCsv([['a', (r: { a: number }) => r.a]], [{ a: 1 }, { a: 2 }])).toBe('a\n1\n2\n');
  });
});

describe('data download (FR-11 to FR-14)', () => {
  const dir = tempDir('export');
  const zipPath = join(dir, 'public/data/jomidarpedia-data.zip');
  const metaPath = join(dir, 'export.json');
  const result = buildExport('release', { zipPath, metaPath });
  const entries = existsSync(zipPath) ? readZip(readFileSync(zipPath)) : [];
  const csv = (name: string) => parseCsv(entries.find(e => e.name === name)!.data.toString('utf8'));
  const text = (name: string) => entries.find(e => e.name === name)!.data.toString('utf8');

  it('builds without a problem and records its URL and size', () => {
    expect(result.gates).toEqual([]);
    const info = JSON.parse(readFileSync(metaPath, 'utf8'));
    expect(info.url).toBe(EXPORT_URL);
    expect(info.megabytes).toBeGreaterThan(0);
  });

  it('holds exactly the agreed files, each CSV readable (AC-10)', () => {
    expect(entries.map(e => e.name)).toEqual([
      'LICENSE', 'README.md', 'disagreements.csv', 'features.csv', 'history_events.csv', 'image_credits.csv', 'legends.csv',
      'site_relationships.csv', 'site_sources.csv', 'sites.csv', 'sources.csv', 'travel_routes.csv', 'trip_costs.csv',
      'trip_legs.csv', 'trip_stops.csv', 'trips.csv', 'visitor_info.csv',
    ]);
    for (const e of entries.filter(e => e.name.endsWith('.csv'))) expect(() => parseCsv(e.data.toString('utf8')), e.name).not.toThrow();
  });

  it('has one row per published site and trip, matching meta.json', () => {
    expect(csv('sites.csv').rows).toHaveLength(meta.counts.sites);
    expect(csv('visitor_info.csv').rows).toHaveLength(meta.counts.sites);
    expect(csv('trips.csv').rows).toHaveLength(meta.counts.trips);
    expect(csv('image_credits.csv').rows).toHaveLength(meta.counts.images);
    // meta.json counts CSV rows; placeholder events never reach a page, so count what the site records hold.
    const records: SiteRecord[] = csv('sites.csv').rows.map(r => JSON.parse(readFileSync(`data/build/sites/${r.site_id}.json`, 'utf8')));
    expect(csv('history_events.csv').rows).toHaveLength(records.reduce((n, s) => n + s.history.length, 0));
    expect(csv('legends.csv').rows).toHaveLength(records.reduce((n, s) => n + s.legends.length, 0));
  });

  it('gives hidden sites no coordinates, anywhere (FR-12, R5)', () => {
    const rows = csv('sites.csv').rows;
    const hidden = rows.filter(r => !r.latitude);
    expect(hidden).toHaveLength(meta.counts.noPin);
    for (const r of hidden) expect(r.longitude, r.site_id).toBe('');
    const all = entries.map(e => e.data.toString('utf8')).join('\n');
    for (const c of hiddenCoordinatePatterns(sitesCsv)) expect(c.re.test(all), `${c.site} ${c.pair}`).toBe(false);
  });

  it('never carries a never-published column (I7)', () => {
    const headers = entries.filter(e => e.name.endsWith('.csv')).flatMap(e => e.data.toString('utf8').split('\n')[0].split(','));
    for (const banned of ['citation_note', 'local_path', 'identity_verification', 'license_evidence']) expect(headers).not.toContain(banned);
    const all = entries.map(e => e.data.toString('utf8')).join('\n');
    expect(all).not.toMatch(/\/Users\/|[A-Z]:\\\\/);
  });

  it('puts the published Bangla beside the English (Baliati)', () => {
    const baliati: SiteRecord = JSON.parse(readFileSync('data/build/sites/JB-DHK-064.json', 'utf8'));
    const row = csv('sites.csv').rows.find(r => r.site_id === 'JB-DHK-064')!;
    expect(row.name_bn).toBe(baliati.name.bn);
    expect(row.summary).toBe(baliati.summary);
    expect(row.summary_bn).toBe(baliati.summaryBn);
    expect(row.page_path).toBe('/site/JB-DHK-064/baliati-palace/');
  });

  it('names CC BY-SA 4.0 and the photo exception, in an English and a Bangla README (NFR-6)', () => {
    expect(text('LICENSE')).toMatch(/CC BY-SA 4\.0/);
    expect(text('LICENSE')).toMatch(/Photos are not covered/);
    const readme = text('README.md');
    expect(readme).toMatch(/^# Jomidarpedia data/);
    expect(readme).toContain('# জমিদারপিডিয়ার তথ্যভান্ডার');
    expect(readme).toContain(`Compiled ${meta.compiledAt}`);
    expect(readme).toMatch(/An empty cell means "not recorded"/);
  });

  it('is byte-identical when built twice (NFR-1)', () => {
    const again = join(dir, 'again.zip');
    buildExport('release', { zipPath: again, metaPath: join(dir, 'again.json') });
    expect(readFileSync(again).equals(readFileSync(zipPath))).toBe(true);
  });

  it('is written only by a release build, and other modes remove an old copy (FR-14, AC-12)', () => {
    for (const mode of ['local', 'preview']) {
      const z = join(dir, `${mode}.zip`);
      const m = join(dir, `${mode}.json`);
      write(z, 'old');
      write(m, '{}');
      const r = buildExport(mode, { zipPath: z, metaPath: m });
      expect(existsSync(z), mode).toBe(false);
      expect(existsSync(m), mode).toBe(false);
      expect(r.outputs).toEqual([]);
    }
  });
});

describe('export field lists (FR-13, AC-11)', () => {
  const site = (extra: Record<string, unknown> = {}) => ({
    ...Object.fromEntries(FIELDS.site.exported.map(k => [k, 'x'])), ...extra,
  });

  it('passes records with only listed fields', () => {
    expect(fieldProblems('site', [site({ images: [] })])).toEqual([]);
  });

  it('fails on a field that is neither exported nor skipped', () => {
    expect(fieldProblems('site', [site({ secretNote: 'x' })])).toEqual([expect.stringMatching(/"secretNote" is neither exported nor skipped/)]);
  });

  it('fails when a listed field is gone from every record', () => {
    const s = site();
    delete (s as Record<string, unknown>).founder;
    expect(fieldProblems('site', [s])).toEqual([expect.stringMatching(/"founder" is listed for export but no record has it/)]);
  });

  it('fails the build, and writes nothing, on an unlisted field', () => {
    const dir = tempDir('export-bad');
    cpSync('data/build', join(dir, 'build'), { recursive: true });
    const p = join(dir, 'build/sites/JB-DHK-064.json');
    write(p, JSON.stringify({ ...JSON.parse(readFileSync(p, 'utf8')), internalFlag: true }));
    const r = buildExport('release', { buildDir: join(dir, 'build'), zipPath: join(dir, 'x.zip'), metaPath: join(dir, 'x.json') });
    expect(r.gates).toEqual([expect.stringMatching(/"internalFlag"/)]);
    expect(existsSync(join(dir, 'x.zip'))).toBe(false);
  });
});

describe('the download in the release checks (FR-15, AC-13)', () => {
  const fakeOut = (zipText: string) => {
    const dir = tempDir('out-zip');
    write(join(dir, 'index.html'), '<!DOCTYPE html><html><head><title>Home</title></head><body></body></html>');
    write(join(dir, 'data/index.json'), '[]');
    write(join(dir, 'data/jomidarpedia-data.zip'), writeZip([{ name: 'sites.csv', data: zipText }], { date: '2026-10-29' }));
    return dir;
  };

  it('check:out opens the zip and finds a hidden coordinate in it', () => {
    expect(hiddenPair).toBeDefined();
    const { problems } = checkOut({ dir: fakeOut(`site_id,note\nJB-X,"near ${hiddenPair.pair}"\n`) });
    expect(problems).toEqual([expect.stringContaining(`data/jomidarpedia-data.zip/sites.csv: coordinates of hidden site ${hiddenPair.site}`)]);
  });

  it('check:out passes a clean zip', () => {
    expect(checkOut({ dir: fakeOut('site_id,name\nJB-DHK-064,Baliati\n') }).problems).toEqual([]);
  });

  it('check:budgets reports the zip against its budget', () => {
    const dir = fakeOut('a\n'.repeat(1000));
    expect(checkBudgets({ dir }).lines).toContainEqual(expect.stringMatching(/^data download: .* KB \(budget 1600\.0 KB\)$/));
    expect(checkBudgets({ dir, budgets: { export: 10 } }).problems).toContainEqual(expect.stringMatching(/^data download is/));
  });
});

describe('the download link reader (FR-14, FR-16)', () => {
  it('returns null without export.json and the record with it', () => {
    const dir = tempDir('readers');
    expect(createReaders(dir, join(dir, 'index.json')).getExport()).toBeNull();
    write(join(dir, 'export.json'), JSON.stringify({ url: EXPORT_URL, megabytes: 1.1 }));
    expect(createReaders(dir, join(dir, 'index.json')).getExport()).toEqual({ url: EXPORT_URL, megabytes: 1.1 });
  });

  it('formats the size with Bengali digits in Bangla', () => {
    expect(formatMegabytes(1.1, 'en')).toBe('1.1 MB');
    expect(formatMegabytes(1.1, 'bn')).toBe('১.১ মেগাবাইট');
    expect(() => formatMegabytes(0, 'en')).toThrow();
  });
});

describe('compare:out (FR-5, FR-6, AC-5)', () => {
  // A build tree: data/build, index.json and out/ with a build ID and hashed chunks.
  function tree(id: string, hash: string, overrides: Record<string, string | Buffer> = {}) {
    const dir = tempDir('tree');
    const files: Record<string, string | Buffer> = {
      'data/build/meta.json': '{"compiledAt":"2026-10-29"}',
      'data/build/sites/JB-DHK-064.json': '{"id":"JB-DHK-064"}',
      'public/data/index.json': '[]',
      [`out/_next/static/${id}/_buildManifest.js`]: 'x',
      [`out/_next/static/chunks/${hash}.js`]: `code ${hash}`,
      [`out/_next/static/media/08ae2c4e3062689e.${hash}.woff2`]: 'font',
      'out/index.html': `<html><script src="/_next/static/chunks/${hash}.js"></script><p>Home</p>"b":"${id}"</html>`,
      'out/index.txt': `0:{"b":"${id}","c":["static/chunks/${hash}.js"]}`,
      'out/thumbs/a.webp': Buffer.from([1, 2, 3]),
      'out/data/jomidarpedia-data.zip': writeZip([{ name: 'a.csv', data: 'a\n1\n' }], { date: '2026-10-29' }),
      ...overrides,
    };
    for (const [f, d] of Object.entries(files)) write(join(dir, f), d);
    return dir;
  }
  const ref = tree('vTwLYBvuYnOhPM95UrhlG', '0cz1d0mv5g_q7');

  it('normalises the build ID and hashed names', () => {
    expect(normalise('/_next/static/chunks/0cz1d0mv5g_q7.js and /_next/static/chunks/1-nqmp1rl8kqt.js', undefined)).toBe('/_next/static/chunks/#.js and /_next/static/chunks/#.js');
    expect(normalise('_next/static/media/167cd0713aa75522-s.1nzccunaoxsdm.woff2', undefined)).toBe('_next/static/media/167cd0713aa75522-s.#.woff2');
    expect(normalise('"b":"abc123XYZ"', 'abc123XYZ')).toBe('"b":"BUILD_ID"');
  });

  it('ignores the order of <meta> and <link> tags in <head>, but not a changed or missing tag', () => {
    const page = (head: string) => `<html><head><title>T</title>${head}<script src="a.js"></script></head><body><link rel="x"/><meta name="b"/></body></html>`;
    const canon = '<link rel="canonical" href="/a/"/>';
    const theme = '<meta name="theme-color" content="#fff"/>';
    expect(sortHeadTags(page(canon + theme))).toBe(sortHeadTags(page(theme + canon)));
    expect(sortHeadTags(page(canon + theme))).not.toBe(sortHeadTags(page('<link rel="canonical" href="/b/"/>' + theme)));
    expect(sortHeadTags(page(canon + theme))).not.toBe(sortHeadTags(page(theme)));
    expect(sortHeadTags(page(theme))).toContain('<body><link rel="x"/><meta name="b"/></body>');
  });

  it('passes trees that differ only in build ID and chunk hashes', () => {
    expect(compareOut(ref, tree('Qq8pK2mZ0aB3cD4eF5gH6', '2jncy4l_bcu88')).problems).toEqual([]);
  });

  it('fails on one changed byte in data/build', () => {
    const { problems } = compareOut(ref, tree('x1', '0cz1d0mv5g_q7', { 'data/build/sites/JB-DHK-064.json': '{"id":"JB-DHK-065"}' }));
    expect(problems).toEqual([expect.stringMatching(/^data\/build\/sites\/JB-DHK-064\.json: not byte-identical/)]);
  });

  it('fails on a missing out/ file, naming it', () => {
    const cand = tree('x1', '0cz1d0mv5g_q7', { 'out/explore/index.html': '<p>Explore</p>' });
    expect(compareOut(cand, ref).problems).toEqual(['missing in candidate: out/explore/index.html']);
    expect(compareOut(ref, cand).problems).toEqual(['extra in candidate: out/explore/index.html']);
  });

  it('fails on a page text difference, with the first differing line', () => {
    const cand = tree('x1', '0cz1d0mv5g_q7', { 'out/index.html': '<html><script src="/_next/static/chunks/0cz1d0mv5g_q7.js"></script><p>Hone</p>"b":"x1"</html>' });
    expect(compareOut(ref, cand).problems).toEqual([expect.stringMatching(/^out\/index\.html: line 1: reference ".*Home.*" vs candidate ".*Hone.*"/)]);
  });

  it('fails on a differing image, and on a zip with different contents', () => {
    expect(compareOut(ref, tree('x1', '0cz1d0mv5g_q7', { 'out/thumbs/a.webp': Buffer.from([1, 2, 4]) })).problems).toEqual(['out/thumbs/a.webp: not byte-identical']);
    const zip = writeZip([{ name: 'a.csv', data: 'a\n2\n' }], { date: '2026-10-29' });
    expect(compareOut(ref, tree('x1', '0cz1d0mv5g_q7', { 'out/data/jomidarpedia-data.zip': zip })).problems).toEqual([expect.stringMatching(/^out\/data\/jomidarpedia-data\.zip: a\.csv: line 2/)]);
  });

  it('refuses to compare when the reference is missing', () => {
    expect(compareOut(join(tempDir('none'), 'nothing'), ref).problems[0]).toMatch(/reference .* has no data\/build\/meta\.json/);
  });
});

describe('check:prod (FR-2, FR-8, AC-2, AC-7)', () => {
  const ORIGIN = 'https://jomidarpedia.vercel.app';
  const good = (path: string, body = '<p>ok</p>') =>
    `<html><head><link rel="canonical" href="${ORIGIN}${path}"/><meta property="og:url" content="${ORIGIN}${path}"/><meta property="og:image" content="${ORIGIN}/og-default.png"/></head><body>${body}</body></html>`;
  const zip = writeZip([{ name: 'README.md', data: `# Jomidarpedia data\nCompiled ${meta.compiledAt}.\n` }, { name: 'sites.csv', data: 'site_id\nJB-DHK-064\n' }], { date: '2026-10-29' });

  function site(pages: Record<string, string | number | Error> = {}) {
    let inFlight = 0;
    let most = 0;
    const calls: string[] = [];
    const paths = ['/', '/about/', '/site/JB-DHK-064/baliati-palace/', ...Array.from({ length: 20 }, (_, i) => `/trips/IT-${i}/`)];
    const routes: Record<string, string | number | Error | Buffer> = {
      '/robots.txt': `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`,
      '/sitemap.xml': `<?xml version="1.0"?><urlset>${paths.map(p => `<url><loc>${ORIGIN}${p}</loc></url>`).join('')}</urlset>`,
      '/no-such-page-release-check/': 404,
      '/data/jomidarpedia-data.zip': zip,
      ...Object.fromEntries(paths.map(p => [p, good(p)])),
      ...pages,
    };
    const fetchFn = (async (url: string) => {
      const path = url.slice(ORIGIN.length);
      calls.push(path);
      inFlight++;
      most = Math.max(most, inFlight);
      await new Promise(r => setTimeout(r, 2));
      inFlight--;
      const r = routes[path];
      if (r instanceof Error) throw r;
      if (typeof r === 'number') return new Response(r === 404 ? '<html><body>Not found</body></html>' : '', { status: r });
      if (r === undefined) return new Response('', { status: 404 });
      return new Response(typeof r === 'string' ? r : new Uint8Array(r), { status: 200 });
    }) as unknown as typeof fetch;
    return { fetchFn, calls, most: () => most };
  }
  const run = (s: ReturnType<typeof site>) => checkProd({ base: ORIGIN, fetchFn: s.fetchFn, retryDelay: 1 });

  it('passes clean pages, reads the deployed compile date and keeps at most 4 requests in flight', async () => {
    const s = site();
    const r = await run(s);
    expect(r.problems).toEqual([]);
    expect(r.compiledAt).toBe(meta.compiledAt);
    expect(r.checked).toBe(25);
    expect(s.most()).toBeLessThanOrEqual(4);
  });

  it('fails on a hidden-site coordinate, an internal term and a new-tab link without rel', async () => {
    const r = await run(site({
      '/about/': good('/about/', `<p>${hiddenPair.pair}</p>`),
      '/trips/IT-1/': good('/trips/IT-1/', '<p>from the Project upload</p>'),
      '/trips/IT-2/': good('/trips/IT-2/', '<a href="https://x.org" target="_blank">x</a>'),
    }));
    expect(r.problems).toContainEqual(expect.stringContaining(`/about/: coordinates of hidden site ${hiddenPair.site}`));
    expect(r.problems).toContainEqual(expect.stringMatching(/^\/trips\/IT-2\/: new-tab link without rel/));
    expect(r.problems.some(p => p.startsWith('/trips/IT-1/: "'))).toBe(true);
  });

  it('fails on a sitemap URL that answers 404, and on a fetch error after one retry', async () => {
    const s = site({ '/trips/IT-3/': 404, '/trips/IT-4/': new Error('ECONNRESET') });
    const r = await run(s);
    expect(r.problems).toContain('/trips/IT-3/: HTTP 404, expected 200');
    expect(r.problems).toContain('/trips/IT-4/: ECONNRESET');
    expect(s.calls.filter(c => c === '/trips/IT-4/')).toHaveLength(2);
  });

  it('fails when a canonical, og:url or sitemap entry is on another host (FR-2)', async () => {
    const r = await run(site({ '/about/': good('/about/').replace(`${ORIGIN}/about/"/><meta property="og:url"`, 'http://localhost:4174/about/"/><meta property="og:url"') }));
    expect(r.problems).toEqual(['/about/: canonical "http://localhost:4174/about/" is not on https://jomidarpedia.vercel.app']);
    expect(originProblems('/x/', '<html><head></head></html>', ORIGIN)).toEqual(['/x/: no canonical link']);
    expect(sitemapUrls('<loc>a</loc><loc> b </loc>')).toEqual(['a', 'b']);
  });

  it('stops at once when the sitemap is missing', async () => {
    const r = await run(site({ '/sitemap.xml': 404 }));
    expect(r.problems).toEqual(['/sitemap.xml: HTTP 404']);
    expect(r.checked).toBe(0);
  });
});

describe('maintainer documents (FR-18 to FR-20, AC-15)', () => {
  const scripts = Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts);
  const docs = ['CONTRIBUTING.md', 'docs/RUNBOOK.md', 'CHANGELOG.md', 'docs/release-checks.md'];

  it.each(docs)('%s exists and names only npm scripts that exist', doc => {
    const text = readFileSync(doc, 'utf8');
    for (const [, name] of text.matchAll(/npm run ([a-z][a-z0-9:-]*)/g)) expect(scripts, `${doc}: npm run ${name}`).toContain(name);
  });

  it('CONTRIBUTING.md covers the points FR-18 lists', () => {
    const text = readFileSync('CONTRIBUTING.md', 'utf8');
    for (const s of ['data/csv/', 'npm run dev', 'data/reports/release-problems.md', 'npm run thumbs', 'JP_IMAGES_DIR', 'Web3Forms', 'data/translations/bn/', 'docs/DATA_CONTRACT.md', 'docs/TRANSLATION_BN.md'])
      expect(text, s).toContain(s);
  });

  it('the runbook covers Promote, revert and a data fix', () => {
    const text = readFileSync('docs/RUNBOOK.md', 'utf8');
    for (const s of ['Promote', 'git revert', 'data/csv/', 'npm run check:prod']) expect(text, s).toContain(s);
  });

  it('the changelog has a 1.0.0 entry', () => {
    expect(readFileSync('CHANGELOG.md', 'utf8')).toMatch(/^## \[?1\.0\.0\]?/m);
  });
});
