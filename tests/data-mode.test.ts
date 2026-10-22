import { describe, expect, it } from 'vitest';
import { resolveMode } from '../scripts/data-mode.mjs';

// Expected mode for every VERCEL_ENV × JP_DATA_MODE combination (DEVELOPMENT_ROADMAP.md §2.4).
const VERCEL = [undefined, 'preview', 'production', 'development'];
const ASKED = [undefined, 'local', 'preview', 'release', 'garbage'];

function expectedMode(vercel?: string, asked?: string) {
  if (vercel === 'production') return 'release';
  if (vercel === 'preview') return 'preview';
  return asked === 'local' || asked === 'preview' ? asked : 'release';
}

describe('resolveMode', () => {
  for (const vercel of VERCEL) for (const asked of ASKED) {
    it(`VERCEL_ENV=${vercel ?? '(unset)'} JP_DATA_MODE=${asked ?? '(unset)'}`, () => {
      const env: Record<string, string> = {};
      if (vercel) env.VERCEL_ENV = vercel;
      if (asked) env.JP_DATA_MODE = asked;
      expect(resolveMode(env).mode).toBe(expectedMode(vercel, asked));
    });
  }

  it('is release on Vercel production even when JP_DATA_MODE=local', () => {
    expect(resolveMode({ VERCEL_ENV: 'production', JP_DATA_MODE: 'local' })).toEqual({ mode: 'release' });
  });

  it('falls back to release with a notice for an unknown or wrongly cased value', () => {
    for (const v of ['LOCAL', 'dev', 'garbage']) {
      const r = resolveMode({ JP_DATA_MODE: v });
      expect(r.mode).toBe('release');
      expect(r.notice).toContain(v);
    }
  });

  it('ignores CI variables', () => {
    expect(resolveMode({ CI: 'true', GITHUB_ACTIONS: 'true', GITHUB_REF: 'refs/heads/feature' }).mode).toBe('release');
    expect(resolveMode({ CI: 'true', JP_DATA_MODE: 'local' }).mode).toBe('local');
  });
});
