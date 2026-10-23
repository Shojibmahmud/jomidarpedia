// Resolves the data build mode (roadmap/DEVELOPMENT_ROADMAP.md §2.4). It fails closed: anything
// unexpected is `release`, and Vercel production is always `release`, whatever JP_DATA_MODE says.
// CI variables are never read; GitHub Actions selects a mode only through JP_DATA_MODE.

export const MODES = ['local', 'preview', 'release'];

/** @param {Record<string, string | undefined>} [env] */
export function resolveMode(env = process.env) {
  if (env.VERCEL_ENV === 'production') return { mode: 'release' };
  if (env.VERCEL_ENV === 'preview') return { mode: 'preview' };
  const asked = env.JP_DATA_MODE;
  if (asked === undefined || asked === '') return { mode: 'release' };
  if (MODES.includes(asked)) return { mode: asked };
  return { mode: 'release', notice: `JP_DATA_MODE="${asked}" is not one of ${MODES.join(', ')}; using release` };
}

// Editorial problems fail only release builds; structural and safety rules fail every mode.
export const editorialIsFatal = mode => mode === 'release';
