// Interface strings in English and Bangla (roadmap task 3.1, decision O6, recommendation I3).
// Pages render both languages; CSS in app/tokens.css shows the one named by <html data-lang>.
// Only interface wording lives here: names come from the data, and prose stays English (O6).
//
// Bangla wording is taken from the বাংলা boards where they show it. Every other `bn` is a draft
// marked needsReview: true until the owner or a native reviewer signs it off (tests list them).
// Placeholders such as {date} are filled with values from lib/format.ts, never typed into a string.

export type Lang = 'en' | 'bn';
export const LANGS: readonly Lang[] = ['en', 'bn'];

/** A value already formatted in both languages. */
export type Dual = { en: string; bn: string };
type Entry = Dual & { needsReview?: true };

export const STRINGS = {
  // Header (wording from the বাংলা · Home board)
  'nav.home': { en: 'Jomidarpedia home', bn: 'জমিদারপিডিয়া প্রথম পাতা', needsReview: true },
  'nav.explore': { en: 'Explore', bn: 'মানচিত্র' },
  'nav.dayTrips': { en: 'Day trips', bn: 'দিনে দিনে ভ্রমণ' },
  'nav.divisions': { en: 'Divisions', bn: 'বিভাগ' },
  'nav.about': { en: 'About', bn: 'পরিচিতি' },
  'nav.sources': { en: 'Sources', bn: 'তথ্যসূত্র' },
  'nav.search': { en: 'Search', bn: 'খুঁজুন' },
  'nav.menu': { en: 'Menu', bn: 'মেনু', needsReview: true },
  'nav.main': { en: 'Main', bn: 'প্রধান', needsReview: true },
  'nav.allDivisions': { en: 'All eight divisions', bn: 'আটটি বিভাগ' },
  'nav.skip': { en: 'Skip to content', bn: 'মূল লেখায় যান', needsReview: true },

  // Language and theme
  'lang.label': { en: 'Language', bn: 'ভাষা', needsReview: true },
  'lang.en': { en: 'English', bn: 'English' },
  'lang.bn': { en: 'বাংলা', bn: 'বাংলা' },
  'theme.label': { en: 'Theme', bn: 'রং', needsReview: true },
  'theme.system': { en: 'System', bn: 'ডিভাইসের মতো', needsReview: true },
  'theme.light': { en: 'Light', bn: 'হালকা', needsReview: true },
  'theme.dark': { en: 'Dark', bn: 'গাঢ়', needsReview: true },

  // Footer
  'footer.updated': { en: 'Data last updated {date}', bn: 'তথ্য সর্বশেষ হালনাগাদ {date}', needsReview: true },
  'footer.mapCredit': { en: 'Maps: © OpenStreetMap contributors. Boundaries: geoBoundaries; districts BBS/OCHA, CC BY 3.0 IGO.', bn: 'মানচিত্র: © OpenStreetMap অবদানকারীরা। সীমানা: geoBoundaries; জেলা BBS/OCHA, CC BY 3.0 IGO।', needsReview: true },
  'footer.credits': { en: 'Image credits', bn: 'ছবির কৃতজ্ঞতা', needsReview: true },
  'footer.licences': { en: 'Licences', bn: 'লাইসেন্স', needsReview: true },
  'footer.correction': { en: 'Suggest a correction', bn: 'সংশোধনের প্রস্তাব দিন' },
  'footer.tagline': { en: 'The zamindar houses, palaces and kacharis of Bangladesh, with their sources.', bn: 'বাংলাদেশের জমিদার বাড়ি, প্রাসাদ ও কাছারি, তথ্যসূত্রসহ।', needsReview: true },
  'footer.siteCount': { en: '{count} sites', bn: '{count}টি জমিদার বাড়ি', needsReview: true },

  // Shared states used across pages
  'common.notDocumented': { en: 'Not documented', bn: 'নথিভুক্ত নয়', needsReview: true },
  'common.bnNameMissing': { en: 'Bangla name not yet recorded', bn: 'বাংলা নাম এখনও লেখা হয়নি', needsReview: true },
  'common.proseInEnglish': { en: 'This text is in English.', bn: 'এই লেখাটি ইংরেজিতে।', needsReview: true },
  'common.dismiss': { en: 'Dismiss', bn: 'বন্ধ করুন', needsReview: true },
  'url.droppedFilters': { en: 'Some filters in this link were not recognised and have been removed.', bn: 'এই লিংকের কিছু ফিল্টার চেনা যায়নি, তাই সরিয়ে দেওয়া হয়েছে।', needsReview: true },
  'common.sitesOnMap': { en: '{count} on the map', bn: 'মানচিত্রে {count}টি' },

  // Condition (Condition in lib/types.ts); Phase 5's ConditionBadge reuses these
  'condition.label': { en: 'Condition', bn: 'অবস্থা', needsReview: true },
  'condition.preserved': { en: 'Preserved', bn: 'সংরক্ষিত', needsReview: true },
  'condition.preserved_adaptive_reuse': { en: 'Preserved, in new use', bn: 'সংরক্ষিত, নতুন ব্যবহারে', needsReview: true },
  'condition.in_ruins': { en: 'In ruins', bn: 'ধ্বংসাবশেষ', needsReview: true },
  'condition.lost': { en: 'Lost', bn: 'বিলুপ্ত', needsReview: true },
  'condition.unknown': { en: 'Condition unknown', bn: 'অবস্থা অজানা', needsReview: true },

  // Home and the ID redirect pages (Phase 4 skeleton)
  'home.sourceCount': { en: '{count} sources', bn: '{count}টি তথ্যসূত্র', needsReview: true },
  'home.samples': { en: 'Five sites to start with', bn: 'শুরু করার জন্য পাঁচটি জমিদার বাড়ি', needsReview: true },
  'redirect.moved': { en: 'This page has moved to:', bn: 'এই পাতাটি সরানো হয়েছে:', needsReview: true },
} as const satisfies Record<string, Entry>;

export type StringKey = keyof typeof STRINGS;
export type Vars = Record<string, Dual>;

/** One string in one language, with its {placeholders} filled. Throws on a missing or unused value. */
export function text(key: StringKey, lang: Lang, vars: Vars = {}): string {
  const entry: Entry = STRINGS[key];
  if (!entry) throw new Error(`i18n: unknown key "${key}"`);
  const used = new Set<string>();
  const out = entry[lang].replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name];
    if (!v) throw new Error(`i18n: "${key}" needs a value for {${name}}`);
    used.add(name);
    return v[lang];
  });
  for (const name of Object.keys(vars)) if (!used.has(name)) throw new Error(`i18n: "${key}" has no {${name}}`);
  return out;
}

/** Both languages of one string. */
export const dual = (key: StringKey, vars?: Vars): Dual => ({ en: text(key, 'en', vars), bn: text(key, 'bn', vars) });

/** Keys whose Bangla is still a draft. */
export const needsReview = (): StringKey[] =>
  (Object.keys(STRINGS) as StringKey[]).filter(k => (STRINGS[k] as Entry).needsReview).sort();
