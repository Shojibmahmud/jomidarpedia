// Reviewed data rules for the Phase 2 contract (roadmap tasks 2.2, 2.5, 2.6, 2.9, 2.11, 2.16).
// Each table here is edited by hand; the build never guesses beyond it.

// ---------------------------------------------------------------- unknown values
// "Unknown", "Unknown (not researched)" and blanks are bare unknowns; "Unknown. The book says…" keeps its detail.
export const UNKNOWN = /^(unknown|not documented|not researched|n\/a)\b/i;
export const BARE_UNKNOWN = /^(unknown|not documented)\s*(\([^)]*\))?\.?$/i;
export const isKnownText = v => !!(v || '').trim() && !UNKNOWN.test((v || '').trim());

// ---------------------------------------------------------------- photos
// Only Ready images may leave the CSV. A site's photos show in CSV order, except that the one the editor
// marked `lead = yes` comes first: it is the card photo and opens the gallery. Unmarked, the first Ready one leads.
export const isReadyImage = im => (im.publication_readiness || '').startsWith('Ready');
export const leadFirst = images => [...images.filter(im => im.lead === 'yes'), ...images.filter(im => im.lead !== 'yes')];

// ---------------------------------------------------------------- opening hours (2.9)
// Hours are known only when the value gives a clock time: "10:00", "9 am", "10:30 AM".
// "Daylight hours" and permission phrases describe access, not a schedule.
export const CLOCK_TIME = /\b\d{1,2}:\d{2}\b|\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i;
// Phrases that only state a restriction; they never count, even if a number slips in.
export const RESTRICTION_ONLY = /^(by permission|with permission|closed to (the )?public|no public access|private property)\.?$/i;
export const hoursKnown = v => {
  const s = (v || '').trim();
  return !!s && !UNKNOWN.test(s) && !RESTRICTION_ONLY.test(s) && CLOCK_TIME.test(s);
};

// ---------------------------------------------------------------- card summary (spec 07 FR-34, D1)
// The map card's one-liner: the first sentence of short_description, or the first two when the first is
// under CARD_MIN characters ("Not a zamindar house."), cut at a word boundary to CARD_MAX with "…".
// A sentence ends at . ! or ? followed by a space and a capital letter, a digit or a quote, except after
// an initial ("M.", "S.B.K.") or a short title ("Md.", "Dr.", "c.").
export const CARD_MIN = 60;
export const CARD_MAX = 160;
const NOT_AN_END = /(?:^|[\s(])(?:[A-Z]|[A-Z]\.[A-Z]|Md|Mohd|Dr|Mr|Mrs|Sri|St|Mt|Lt|Col|Capt|Prof|Rev|Sk|c|ca|no|vs|e\.g|i\.e|approx)\.$/;
function sentences(text) {
  const out = [];
  let start = 0;
  for (const m of text.matchAll(/[.!?](?=\s+["'‘“(]?[A-Z0-9ঀ-৿])/g)) {
    const end = m.index + 1;
    if (m[0] === '.' && NOT_AN_END.test(text.slice(start, end))) continue;
    out.push(text.slice(start, end).trim());
    start = end;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}
export function cardSummary(text) {
  const all = sentences((text || '').replace(/\s+/g, ' ').trim());
  let s = all[0] ?? '';
  if (s.length < CARD_MIN && all[1]) s = `${s} ${all[1]}`;
  if (s.length <= CARD_MAX) return s;
  const cut = s.slice(0, CARD_MAX);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:–—-]+$/, '')}…`;
}

// ---------------------------------------------------------------- itinerary plans (O11)
// A stop time is a clock time ("7:30 AM"); labels such as "1", "Day 2" or "End" are not.
export const STOP_CLOCK = /^\d{1,2}:\d{2}\s*(?:am|pm)?$|^\d{1,2}\s*(?:am|pm)$/i;
export const PLAN_STATUS = ['timed', 'circuit', 'incomplete'];
// The build's suggestion for the editor; only the editor's plan_status is published.
export function suggestPlanStatus(stops) {
  if (stops.length < 2) return 'incomplete';
  return stops.every(st => STOP_CLOCK.test((st.time_or_day || '').trim())) ? 'timed' : 'circuit';
}

// ---------------------------------------------------------------- closing days (2.11)
export const DAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];
// Blank (not yet reviewed), "unknown", "none", or ;-separated day tokens. Returns null when invalid.
export function parseClosedDays(v) {
  if (v === '') return { blank: true };
  if (v === 'unknown') return { known: false };
  if (v === 'none') return { known: true, days: [] };
  const days = v.split(';');
  if (days.some(d => !DAYS.includes(d)) || new Set(days).size !== days.length) return null;
  return { known: true, days: DAYS.filter(d => days.includes(d)) };
}

// ---------------------------------------------------------------- transport modes (2.5)
// rickshaw and auto_rickshaw are leg modes (itinerary_legs.csv, spec 12 FR-17); MODE_LABEL never yields them.
export const MODES = ['bus', 'train', 'launch', 'ferry', 'car', 'air', 'boat', 'rickshaw', 'auto_rickshaw', 'unknown', 'mixed'];
// English names for budget items built from a mode.
export const MODE_NAME = {
  bus: 'Bus', train: 'Train', launch: 'Launch', ferry: 'Ferry', car: 'Car', air: 'Air', boat: 'Boat',
  rickshaw: 'Rickshaw', auto_rickshaw: 'Auto-rickshaw', unknown: 'Mode not stated', mixed: 'Mixed modes'
};
// A fare between stops: costs.category "leg_fare_<mode>", with the stops it covers in costs.legs.
export const LEG_FARE = new RegExp(`^leg_fare_(${MODES.join('|')})$`);
// Every transport_mode label in travel_routes.csv. A label naming two or more modes is "mixed".
// INFER means: look for exactly one mode keyword in the route description.
export const INFER = 'infer';
export const MODE_LABEL = {
  'Bus': 'bus',
  'Train': 'train',
  'Launch': 'launch',
  'Ferry': 'ferry',
  'Air': 'air',
  'Boat': 'boat',
  'Private car': 'car',
  'CNG': 'car',
  'CNG / easybike': 'car',
  'Rickshaw / CNG / ride-share (inside Dhaka city)': 'car',
  'Bus + CNG': 'mixed',
  'Bus + rickshaw/CNG': 'mixed',
  'Bus + road/boat': 'mixed',
  'Bus / Leguna': 'mixed',
  'Bus or train': 'mixed',
  'Bus or Train + CNG': 'mixed',
  'Train or bus': 'mixed',
  'Train or Bus': 'mixed',
  'Train + road/boat': 'mixed',
  'Unknown': 'unknown',
  'Other / mixed': INFER
};
// Whole-word keywords for inference from a description. Several keywords may name one mode.
const MODE_KEYWORDS = [
  ['bus', /\bbus(es)?\b/i], ['train', /\btrains?\b|\brail(way)?\b/i], ['launch', /\blaunch(es)?\b/i], ['ferry', /\bferry\b|\bferries\b/i],
  ['air', /\bflights?\b|\bfly\b|\bairport\b/i], ['boat', /\bboats?\b|\btrawlers?\b/i],
  ['car', /\bcars?\b|\bcng\b|\brickshaws?\b|\bmicrobus\b|\btaxi\b|\bride-share\b|\beasybike\b/i]
];
// Returns { mode, inferred? } or null when the label is not in the table.
export function routeMode(label, description) {
  if (!Object.hasOwn(MODE_LABEL, label)) return null;
  const m = MODE_LABEL[label];
  if (m !== INFER) return { mode: m };
  const found = MODE_KEYWORDS.filter(([, re]) => re.test(description)).map(([mode]) => mode);
  return found.length === 1 ? { mode: found[0], inferred: true } : { mode: 'mixed' };
}

// ---------------------------------------------------------------- cost units and basis (2.6)
// costs.unit text → unit. A row with an amount needs a unit in this table.
export const UNIT = {
  'per person, one way, public transport (assumed)': 'per_person',
  'per person (local adult rate unless stated)': 'per_person',
  'per person': 'per_person',
  'per vehicle': 'per_vehicle',
  'per group': 'per_group'
};
export const FARE_BASIS = ['shared', 'reserved'];
// costs.legs: stop-order pairs, e.g. "1-2;2-4".
export const LEGS = /^\d+-\d+(;\d+-\d+)*$/;
export const parseLegs = v => (v ? v.split(';').map(p => p.split('-').map(Number)) : []);

// ---------------------------------------------------------------- publisher matching (2.2)
// Extra names under which a publisher is cited in conflict text, keyed by the normalized publisher name.
// Add an entry only after checking that the alias means that publisher (report: "unattributed").
export const PUBLISHER_ALIASES = {};

const normalize = s => s.toLowerCase().replace(/\s+/g, ' ').trim().replace(/^the /, '');
// The publisher's own name: author_or_organization up to the first . ( ; or ,
export const publisherName = s => normalize((s || '').split(/[.(;,]/)[0]);
// Names shorter than this ("Md" from "Md. Mahmud Ali") are too ambiguous to match on.
export const MIN_NAME = 3;
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wholeWord = name => new RegExp(`(?<![\\p{L}\\p{N}])${escape(name)}(?![\\p{L}\\p{N}])`, 'iu');
export function namesFor(authorOrOrganization) {
  const name = publisherName(authorOrOrganization);
  return [name, ...(PUBLISHER_ALIASES[name] ?? []).map(normalize)].filter(n => n.length >= MIN_NAME);
}
// The indexes of the versions whose text names the publisher.
export function matchVersions(versionTexts, authorOrOrganization) {
  const res = namesFor(authorOrOrganization).map(wholeWord);
  return versionTexts.map((t, k) => (res.some(re => re.test(t.replace(/\s+/g, ' '))) ? k : -1)).filter(k => k >= 0);
}

// ---------------------------------------------------------------- itinerary titles (I5, 2.16)
// "Suggested circuit (Manikganj heritage loop) (Baliati Palace (Baliati Zamindar Bari))" → "Manikganj heritage loop".
// Only a title of the form "prefix (X) (Anchor)", with no parentheses in prefix or X, is shortened;
// the anchor group may contain nested parentheses. Any other title is returned unchanged, so this is idempotent.
const TWO_GROUP = /^[^()]*\(([^()]*)\)\s*\([^()]*(?:\([^()]*\)[^()]*)*\)\s*$/;
export function tripTitle(t) {
  const m = TWO_GROUP.exec(t);
  return m && m[1].trim() ? m[1].trim() : t;
}

// ---------------------------------------------------------------- history events (Phase 5, spec 05 FR-51, FR-52)
// An event that says only that nothing is documented ("Not documented.", or a founding event whose period is a
// bare unknown) is a placeholder: the build drops it, and the founder line on the page carries the founder.
const BARE_PERIOD = String.raw`(?:not documented|unknown)(?:\s+in (?:the|any) sources? (?:checked|read|found))?\.*`;
const PLACEHOLDER_EVENT = new RegExp(String.raw`^(?:${BARE_PERIOD}|founding / building period:\s*${BARE_PERIOD}\s*(?:founder or family:.*)?)$`, 'is');
export const isPlaceholderEvent = description => PLACEHOLDER_EVENT.test((description || '').trim());
// "1884", "1884–1890", "c. 1850". A year_end before year_start is a data slip: show year_start alone.
export function eventYear({ year_start: start, year_end: end }, approximate) {
  const prefix = approximate ? 'c. ' : '';
  if (!end || end === start || Number(end) < Number(start)) return prefix + start;
  return `${prefix}${start}–${end}`;
}

// ---------------------------------------------------------------- site relations (spec 05 FR-50)
export const RELATIONS = ['combine_on_trip', 'same_name_different_site', 'possible_duplicate', 'possibly_part_of', 'same_complex', 'same_family_separate_site'];

// ---------------------------------------------------------------- coordinates in text (spec 05 FR-54)
// A latitude and longitude inside Bangladesh with 3 or more decimals, in any wording: "24.6988, 89.5135",
// "24.6751489 88.3677796". Hidden pins may carry none of these in any field.
export const BD_COORD_TEXT = /(?<![\d.])2[0-6]\.\d{3,}[\s,°NnEe]*(?:%2C)?[\s,]*(?:8[89]|9[0-2])\.\d{3,}(?![\d.])/;
