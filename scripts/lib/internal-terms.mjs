// Words and paths that show a string is an internal research note, not public text.
// Editorial: they fail only release builds (scripts/data-mode.mjs), and are listed by CSV cell in the report.

export const INTERNAL_TERMS = [
  /\bOrca\b/i, /this thread/i, /\bClaude\b/i, /ChatGPT/i, /\bGemini\b/i,
  /Brave browser/i, /Project upload/i
];
// Local paths. These are also looked for inside URLs.
export const LOCAL_PATHS = [/\/Users\//, /file:\/\//i, /\bC:\\/i];
// Working-file names, such as a master list or an audit.
export const WORKING_FILES = [/[\w-]+\.(xlsx|md)\b/i];

const isUrl = v => /^https?:\/\//i.test(v);

// The first internal term in a public string, or null. URLs are checked only for local paths and file: links.
export function internalTerm(value) {
  if (typeof value !== 'string' || !value) return null;
  if (/^file:/i.test(value)) return { term: 'file:', index: 0 };
  const rules = isUrl(value) ? LOCAL_PATHS : [...INTERNAL_TERMS, ...LOCAL_PATHS, ...WORKING_FILES];
  for (const re of rules) {
    const m = value.match(re);
    if (m) return { term: m[0], index: m.index };
  }
  return null;
}
