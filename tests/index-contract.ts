// A hand-written runtime check of public/data/index.json against IndexSite (lib/types.ts, docs/DATA_CONTRACT.md).
// No dependency: each key has a type check; unknown keys and missing required keys are errors.
type Check = (v: unknown) => boolean;
const str: Check = v => typeof v === 'string' && v !== '';
const num: Check = v => typeof v === 'number' && Number.isFinite(v);
const pos: Check = v => num(v) && (v as number) > 0;
const one: Check = v => v === 1;
const oneOf = (...xs: unknown[]): Check => v => xs.includes(v);

const REQUIRED: Record<string, Check> = {
  i: v => typeof v === 'string' && /^JB-[A-Z]{3}-\d{3}$/.test(v),
  s: str, e: str, dv: str, d: str, db: str,
  lc: oneOf('verified', 'single_source', 'approximate', 'unverified', 'not_found'),
  c: oneOf('preserved', 'preserved_adaptive_reuse', 'in_ruins', 'lost', 'unknown'),
  ac: oneOf('ticketed', 'open_no_ticket_reported', 'restricted_or_permission', 'unknown', 'not_applicable_lost'),
  tb: oneOf('0-1', '1-2', '2-3', '3-4', '4+', 'unknown'),
  rc: oneOf('confirmed', 'partially_confirmed', 'unconfirmed', 'not_graded'),
  t: oneOf('house', 'rajbari', 'kachari', 'kuthi', 'chief', 'religious', 'fort', 'other', 'unclassified'),
  ty: str
};
const OPTIONAL: Record<string, Check> = {
  b: str, a: str, fm: str, u: str,
  ll: v => Array.isArray(v) && v.length === 2 && v.every(num),
  f: one, fe: pos, h: num, dt: oneOf(0, 1), hv: one, oc: pos, p: one,
  img: v => !!v && typeof v === 'object' && Object.keys(v).sort().join() === 'credit,id' && str((v as { id: unknown }).id) && typeof (v as { credit: unknown }).credit === 'string'
};

/** Returns the first problem, naming the site ID and key, or null when every row is valid. */
export function checkIndex(rows: unknown): string | null {
  if (!Array.isArray(rows)) return 'index.json is not an array';
  for (const row of rows as Record<string, unknown>[]) {
    const id = typeof row?.i === 'string' ? row.i : '(no id)';
    for (const [k, ok] of Object.entries(REQUIRED)) if (!(k in row)) return `${id}: missing ${k}`; else if (!ok(row[k])) return `${id}: bad ${k}: ${JSON.stringify(row[k])}`;
    for (const [k, v] of Object.entries(row)) {
      if (k in REQUIRED) continue;
      if (!(k in OPTIONAL)) return `${id}: unknown key ${k}`;
      if (!OPTIONAL[k](v)) return `${id}: bad ${k}: ${JSON.stringify(v)}`;
    }
    if (row.p !== undefined && row.img === undefined) return `${id}: p without img`;
  }
  return null;
}
