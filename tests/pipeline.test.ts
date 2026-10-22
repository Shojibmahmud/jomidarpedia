import { describe, expect, it } from 'vitest';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatStructural } from '../scripts/lib/structure.mjs';
import { caseNames, expected, fixtureDir, hashDir, MODES, readJson, report, reportText, runBuilders, tempDir, FIXTURES } from './helpers';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

describe('valid fixture', () => {
  it('passes in every mode, with no problems at all', () => {
    const { results } = runBuilders(fixtureDir());
    for (const mode of MODES) {
      const r = report(results, mode);
      expect(r.fatal).toBe(false);
      expect([r.structural, r.gates, r.warnings, r.editorialCount]).toEqual([[], [], [], 0]);
    }
  });

  it('keeps hidden coordinates out of every output', () => {
    const { out } = runBuilders(fixtureDir());
    const hidden = readJson(join(out, 'build', 'sites', 'JB-DHK-002.json'));
    expect(hidden.location.latlon).toBeUndefined();
    expect(hidden.location.googleMapsUrl).not.toMatch(/23\.95678/);
    const trip = readJson(join(out, 'build', 'trips', 'IT-DHK-001-1.json'));
    expect(trip.stops.find((s: { siteId: string }) => s.siteId === 'JB-DHK-002').latlon).toBeUndefined();
    const row = readJson(join(out, 'public', 'index.json')).find((r: { i: string }) => r.i === 'JB-DHK-002');
    expect(row.ll).toBeUndefined();
    for (const f of Object.keys(hashDir(out))) expect(readFileSync(join(out, f), 'utf8')).not.toContain('23.95678');
  });
});

describe('structural errors (tasks 1.5, 1.6)', () => {
  for (const name of caseNames('invalid')) {
    it(`${name}: fails in every mode, naming file, line and column`, () => {
      const exp = expected('invalid', name);
      const { results } = runBuilders(fixtureDir('invalid', name));
      for (const mode of MODES) expect(report(results, mode).fatal).toBe(true);
      const messages = report(results, 'local').structural;
      const match = messages.find((m: string) => m.startsWith(`${exp.file}, line ${exp.line}`) && (!exp.column || m.includes(`column ${exp.column}`)));
      expect(match, `expected an error at ${JSON.stringify(exp)}; got:\n${messages.join('\n')}`).toBeDefined();
    });
  }

  it('reports a missing CSV file', () => {
    const dir = fixtureDir();
    rmSync(join(dir, 'legends.csv'));
    const { data } = runBuilders(dir);
    expect(data.structural.map(formatStructural)).toContain('legends.csv: file is missing');
  });

  it('collects every error instead of stopping at the first', () => {
    const dir = fixtureDir('invalid', 'bad-enum');
    cpSync(join(FIXTURES, 'invalid', 'fk-site', 'costs.csv'), join(dir, 'costs.csv'));
    expect(runBuilders(dir).data.structural.length).toBeGreaterThanOrEqual(2);
  });

  it('writes no output and removes old output (FR-26)', () => {
    const out = tempDir('out');
    runBuilders(fixtureDir(), out);
    expect(existsSync(join(out, 'build', 'sites', 'JB-DHK-001.json'))).toBe(true);
    runBuilders(fixtureDir('invalid', 'fk-site'), out);
    expect(hashDir(join(out, 'build'))).toEqual({});
    expect(existsSync(join(out, 'public', 'index.json'))).toBe(false);
  });
});

describe('safety rules (task 1.8)', () => {
  for (const name of caseNames('hostile')) {
    it(`${name}: fails in every mode and still writes output for inspection`, () => {
      const { out, results } = runBuilders(fixtureDir('hostile', name));
      for (const mode of MODES) expect(report(results, mode).fatal).toBe(true);
      const gates = report(results, 'local').gates;
      expect(gates.some((g: string) => g.includes(expected('hostile', name).gate)), gates.join('\n')).toBe(true);
      expect(existsSync(join(out, 'build', 'meta.json'))).toBe(true);
    });
  }

  it('fails an index over its budget in every mode', () => {
    const { results } = runBuilders(fixtureDir(), tempDir('out'), {}, 100);
    for (const mode of MODES) expect(report(results, mode).fatal).toBe(true);
    expect(report(results, 'local').gates[0]).toMatch(/over the 0 KB budget|budget/);
  });
});

describe('editorial problems (tasks 1.8, 1.10)', () => {
  for (const name of caseNames('editorial')) {
    it(`${name}: reported in local and preview, fatal only in release`, () => {
      const { out, results } = runBuilders(fixtureDir('editorial', name));
      expect(report(results, 'local').fatal).toBe(false);
      expect(report(results, 'preview').fatal).toBe(false);
      expect(report(results, 'release').fatal).toBe(true);
      expect(existsSync(join(out, 'build', 'meta.json'))).toBe(true);
      const text = reportText(results, 'release');
      expect(text).toContain(`#### ${expected('editorial', name).cell}`);
      expect(text).toMatch(/Summary: [1-9]\d* cells to edit, \d+ output occurrences/);
    });
  }

  it('lists the affected outputs under each cell', () => {
    const text = reportText(runBuilders(fixtureDir('editorial', 'internal-note')).results, 'local');
    const section = text.split('#### sites / JB-DHK-001 / short_description')[1].split('####')[0];
    expect(section).toContain('- sites/JB-DHK-001.json summary');
  });
});

describe('determinism (task 1.7)', () => {
  it('two runs give byte-identical output and reports', () => {
    const dir = fixtureDir('editorial', 'internal-note');
    const a = runBuilders(dir), b = runBuilders(dir);
    expect(hashDir(a.out)).toEqual(hashDir(b.out));
    expect(reportText(a.results, 'release')).toBe(reportText(b.results, 'release'));
  });

  it('compiledAt comes from the data, or from SOURCE_DATE_EPOCH, and nothing else changes', () => {
    const dir = fixtureDir();
    const a = runBuilders(dir), b = runBuilders(dir, tempDir('out'), { SOURCE_DATE_EPOCH: '1767225600' });
    const ma = readJson(join(a.out, 'build', 'meta.json')), mb = readJson(join(b.out, 'build', 'meta.json'));
    expect(ma.compiledAt).toBe(ma.lastVerified);
    expect(mb.compiledAt).toBe('2026-01-01T00:00:00.000Z');
    expect({ ...ma, compiledAt: 0 }).toEqual({ ...mb, compiledAt: 0 });
    const ha = hashDir(a.out), hb = hashDir(b.out);
    delete ha['build/meta.json']; delete hb['build/meta.json'];
    expect(ha).toEqual(hb);
  });

  it('ignores an invalid SOURCE_DATE_EPOCH with a notice', () => {
    const { data, out } = runBuilders(fixtureDir(), tempDir('out'), { SOURCE_DATE_EPOCH: 'yesterday' });
    const meta = readJson(join(out, 'build', 'meta.json'));
    expect(meta.compiledAt).toBe(meta.lastVerified);
    expect(data.info.join('\n')).toContain('SOURCE_DATE_EPOCH');
  });
});

describe('command line (tasks 1.2, 1.8)', () => {
  // Runs a script in a scratch project whose data/csv is the valid fixture.
  function project() {
    const dir = tempDir('project');
    mkdirSync(join(dir, 'data'), { recursive: true });
    cpSync(join(FIXTURES, 'valid'), join(dir, 'data', 'csv'), { recursive: true });
    return dir;
  }
  const run = (cwd: string, script: string, env: Record<string, string>) =>
    spawnSync(process.execPath, [join(ROOT, 'scripts', script)], { cwd, env: { PATH: process.env.PATH ?? '', ...env } as unknown as NodeJS.ProcessEnv, encoding: 'utf8' });

  it('build-index.mjs with no arguments writes public/data/index.json', () => {
    const dir = project();
    const r = run(dir, 'build-index.mjs', { JP_DATA_MODE: 'local' });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(readJson(join(dir, 'public', 'data', 'index.json'))).toHaveLength(2);
    expect(readFileSync(join(dir, 'data', 'reports', 'release-problems.md'), 'utf8')).toContain('Mode: **local**');
  });

  it('data.mjs defaults to release, and exits non-zero on editorial problems only there', () => {
    const dir = project();
    cpSync(join(FIXTURES, 'editorial', 'internal-note', 'sites.csv'), join(dir, 'data', 'csv', 'sites.csv'));
    expect(run(dir, 'data.mjs', { JP_DATA_MODE: 'local' }).status).toBe(0);
    const release = run(dir, 'data.mjs', {});
    expect(release.status).toBe(1);
    expect(release.stdout).toContain('data mode: release');
    expect(run(dir, 'data.mjs', { VERCEL_ENV: 'production', JP_DATA_MODE: 'local' }).status).toBe(1);
    expect(existsSync(join(dir, 'data', 'build', 'meta.json'))).toBe(true);
  });

  it('data.mjs exits non-zero on a structural error in local mode', () => {
    const dir = project();
    cpSync(join(FIXTURES, 'invalid', 'fk-site', 'costs.csv'), join(dir, 'data', 'csv', 'costs.csv'));
    const r = run(dir, 'data.mjs', { JP_DATA_MODE: 'local' });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('costs.csv, line 3, column site_id');
  });
});
