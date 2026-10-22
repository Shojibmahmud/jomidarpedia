// Shared helpers: fixture folders, running both builders into a temp folder, hashing output.
import { cpSync, mkdtempSync, readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildData } from '../scripts/build-data.mjs';
import { buildIndex } from '../scripts/build-index.mjs';
import { combine, discardOutputs, formatReport } from '../scripts/lib/report.mjs';

export const FIXTURES = fileURLToPath(new URL('./fixtures/csv', import.meta.url));
export const MODES = ['local', 'preview', 'release'] as const;

export const tempDir = (prefix: string) => mkdtempSync(join(tmpdir(), `jp-${prefix}-`));

export const caseNames = (group: string) => readdirSync(join(FIXTURES, group)).sort();
export const expected = (group: string, name: string) => JSON.parse(readFileSync(join(FIXTURES, group, name, 'expected.json'), 'utf8'));

// The valid set with one case's tables laid over it.
export function fixtureDir(group?: string, name?: string) {
  const dir = tempDir('csv');
  cpSync(join(FIXTURES, 'valid'), dir, { recursive: true });
  if (group && name) {
    const caseDir = join(FIXTURES, group, name);
    for (const f of readdirSync(caseDir)) if (f.endsWith('.csv')) cpSync(join(caseDir, f), join(dir, f));
  }
  return dir;
}

// Runs both builders the way `npm run data` (scripts/lib/cli.mjs) does; output goes to <out>/build and <out>/public.
export function runBuilders(csvDir: string, out = tempDir('out'), env: Record<string, string> = {}, budget?: number) {
  const index = buildIndex({ sitesPath: join(csvDir, 'sites.csv'), imagesPath: join(csvDir, 'images.csv'), outDir: join(out, 'public'), budget });
  const data = buildData({ csvDir, outDir: join(out, 'build'), env });
  if (index.structural.length || data.structural.length) discardOutputs([index, data]);
  return { out, results: [index, data], index, data };
}

export const report = (results: unknown[], mode: string) => combine(results, mode);
export const reportText = (results: unknown[], mode: string) => formatReport(combine(results, mode));

// sha256 of every file under a folder, keyed by relative path.
export function hashDir(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string) => {
    for (const f of readdirSync(d).sort()) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else out[relative(dir, p)] = createHash('sha256').update(readFileSync(p)).digest('hex');
    }
  };
  if (existsSync(dir)) walk(dir);
  return out;
}

export const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
