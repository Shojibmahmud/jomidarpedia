// The developer guides must point at things that exist. Every file path, folder and `npm run` command that
// a guide names is checked against the repository, so a rename that leaves a guide behind fails here.
// Records (tiles.md, a11y-checks.md, release-checks.md, CHANGELOG.md, the roadmap and specs) are dated
// and may name files as they were, so they are not checked.

import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const GUIDES = [
  'README.md',
  'CONTRIBUTING.md',
  'docs/README.md',
  'docs/ARCHITECTURE.md',
  'docs/DEVELOPMENT.md',
  'docs/CODE_MAP.md',
  'docs/DATA_GUIDE.md',
  'docs/DESIGN_SYSTEM.md',
  'docs/RUNBOOK.md',
  'docs/DATA_CONTRACT.md',
  'docs/URLS.md',
  'docs/security.md',
  'docs/TRANSLATION_BN.md',
];

// Files the repository holds or would commit: tracked, plus new files not yet added (not ignored ones).
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(f => f && existsSync(f));
const dirs = new Set<string>();
for (const f of files) for (let d = dirname(f); d !== '.'; d = dirname(d)) dirs.add(d);
const known = [...files, ...dirs];
const knownSet = new Set(known);
// Only what git holds counts, so the test answers the same on a working copy as on a fresh clone in CI.
const inRepo = (p: string) => knownSet.has(normalize(p).replace(/\/$/, ''));

// Places the guides name on purpose that are not in the repository: the original photos, kept beside it,
// and Claude Code's local hook folder.
const OUTSIDE = new Set(['../images', '.claude/hooks']);

// Outputs of the build, which are ignored by git and so absent from a fresh clone. A guide may name them.
const GENERATED_DIRS = /^(out|\.next|node_modules|data\/build|public\/data|public\/maps|data\/reports|data\/translations\/todo|test-results|playwright-report|\.lighthouse|screenshots|\.vercel)(\/|$)/;
const GENERATED_FILES = new Set([
  // public/data/
  'index.json',
  // data/build/
  'meta.json', 'credits.json', 'districts.json', 'divisions.json', 'export.json', 'sources.json',
  'translations.json', 'trips.json',
  // data/reports/ and the site root
  'release-problems.md', 'sitemap.xml', 'robots.txt', 'tsconfig.tsbuildinfo', 'jomidarpedia-data.zip', '.env.local',
]);
// Top-level names a repository path can start with; anything else with a slash is a package
// (`next/font`), a class (`bg-primary/20`) or a value, not a path.
const ROOTS = new Set([...files.map(f => f.split('/')[0]), '.', '..']);

const EXT = /\.(ts|tsx|mjs|js|cjs|json|md|css|csv|yml|yaml|sh|py|svg|png|jpg|webp|pdf|txt|xml|zip)$/;
// A backtick span is a path when it has a folder or a file extension, and no placeholder or URL syntax.
const isPathLike = (s: string) =>
  (s.includes('/') || EXT.test(s)) &&
  !/[\s*<>{}…$~@#|=()[\]'"`,]|:\/\/|\.\.\.|NN/.test(s) &&
  !s.startsWith('/') &&
  !/^[a-z]+:/.test(s) &&
  !/^-/.test(s) &&
  // A bare extension such as `.webp` names a kind of file, not a file.
  !/^\.[a-z]+$/.test(s) &&
  // A folder path without an extension must start at a real top-level name, or be relative.
  (EXT.test(s) || ROOTS.has(s.split('/')[0]));

const exists = (doc: string, raw: string) => {
  const p = raw.replace(/\/$/, '').replace(/:\d+(-\d+)?$/, '');
  if (OUTSIDE.has(p) || GENERATED_DIRS.test(p) || GENERATED_FILES.has(p.split('/').pop()!)) return true;
  if (inRepo(p) || inRepo(join(dirname(doc), p))) return true;
  // A short path inside a table that names its folder elsewhere (`correction/CorrectionForm.tsx`),
  // or an import specifier without its extension, relative to where it is used (`./fixtures` in e2e/).
  const bare = p.replace(/^\.\//, '');
  return known.some(k => k === bare || k.endsWith('/' + bare) || k.replace(/\.(ts|tsx|mjs)$/, '').endsWith('/' + bare));
};

const scripts = Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts);

describe.each(GUIDES)('%s', doc => {
  const text = readFileSync(doc, 'utf8');
  const prose = text.replace(/```[\s\S]*?```/g, block => block.replace(/`/g, ''));

  it('names only paths that exist', () => {
    const spans = [...prose.matchAll(/`([^`\n]+)`/g)].map(m => m[1].trim());
    const missing = [...new Set(spans.filter(isPathLike).filter(s => !exists(doc, s)))];
    expect(missing).toEqual([]);
  });

  it('links only to files that exist', () => {
    const links = [...text.matchAll(/\]\(([^)\s]+)\)/g)]
      .map(m => m[1].split('#')[0])
      .filter(l => l && !/^[a-z]+:/i.test(l));
    const missing = links.filter(l => !inRepo(join(dirname(doc), l)));
    expect(missing).toEqual([]);
  });

  it('names only npm scripts that exist', () => {
    const named = [...text.matchAll(/npm run ([a-z][\w:-]*)/g)].map(m => m[1]);
    const missing = [...new Set(named.filter(s => !scripts.includes(s)))];
    expect(missing).toEqual([]);
  });
});

it('checks every guide that exists', () => {
  for (const doc of GUIDES) expect(existsSync(doc), doc).toBe(true);
});
