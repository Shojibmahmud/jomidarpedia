// The About page's pictures: the header photo, the coloured share bars for grades and pin certainty, the number
// tiles for disagreements, the photo strip and the icon beside each section heading. Server components: the page
// passes the counts from meta.json, and every photo prints its exact credit line (as on the home page).

import { Both, T } from '@/components/T';
import { PhotoCredit } from '@/components/home/HomeParts';
import { both, formatCount } from '@/lib/format';
import type { HomePhoto } from '@/lib/home-data';
import type { StringKey } from '@/lib/i18n';

const n = (v: number) => both(formatCount, v);
const HATCH = 'bg-[repeating-linear-gradient(45deg,rgb(var(--unknown))_0_2px,rgb(var(--surface))_2px_5px)]';

/** A curated photo filling its box; decorative unless it is the only picture of its subject. */
function Photo({ photo, sizes, eager = false }: { photo: HomePhoto; sizes: string; eager?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export: committed, pre-sized variants
    <img src={photo.src} srcSet={photo.srcSet} sizes={sizes} width={photo.width} height={photo.height}
      alt={photo.alt} lang={photo.altLang} loading={eager ? 'eager' : 'lazy'} decoding="async"
      className="absolute inset-0 h-full w-full object-cover" />
  );
}

/** The header's photo, with its credit printed over the lower edge. */
export function AboutPhoto({ photo }: { photo: HomePhoto }) {
  return (
    <figure className="relative isolate flex aspect-[4/3] items-end overflow-hidden rounded-xl bg-ink p-3 shadow-3 lg:aspect-[4/5]" data-about-photo>
      <Photo photo={photo} sizes="(min-width: 1024px) 26rem, 100vw" eager />
      <figcaption><PhotoCredit credit={photo.credit} /></figcaption>
    </figure>
  );
}

export interface Share { k: StringKey; count: number; fill: string }

/** One bar split by share, with a legend in words and counts; colour never carries the meaning alone. */
export function ShareBar({ parts, total }: { parts: Share[]; total: number }) {
  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface p-4" data-share-bar>
      <div aria-hidden="true" className="flex h-3 overflow-hidden rounded-full bg-surface-2">
        {parts.filter(p => p.count > 0).map(p => <span key={p.k} className={p.fill} style={{ width: `${(p.count / total) * 100}%` }} />)}
      </div>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-3">
        {parts.map(p => (
          <li key={p.k} className="flex items-center gap-2">
            <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-sm ${p.fill}`} />
            <span className="min-w-0 flex-1"><T k={p.k} /></span>
            <span className="font-semibold"><Both value={n(p.count)} /></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const GRADE_FILL = { confirmed: 'bg-moss', partly: 'bg-teal', unconfirmed: 'bg-gold', notGraded: HATCH };
export const LOCATION_FILL = { verified: 'bg-moss', singleSource: 'bg-teal', approximate: 'bg-indigo', unverified: 'bg-gold', noPin: HATCH };

export interface Tile { k: StringKey; count: number; tone: string; icon: React.ReactNode }

/** Big numbers, one tile each. */
export function NumberTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <ul className="grid gap-3 md:grid-cols-3" data-number-tiles>
      {tiles.map(t => (
        <li key={t.k} className="rounded-xl border border-line bg-surface p-4">
          <span aria-hidden="true" className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md ${t.tone}`}>{t.icon}</span>
          <span className="block font-serif text-[36px] leading-none"><Both value={n(t.count)} /></span>
          <span className="mt-2 block text-sm text-muted"><T k={t.k} /></span>
        </li>
      ))}
    </ul>
  );
}

/** Disagreements, open questions and legends: three separate figures, never added together. */
export function DebateTiles({ counts }: { counts: { disagreements: number; openQuestions: number; legends: number } }) {
  return <NumberTiles tiles={[
    { k: 'about.debate.disagreements', count: counts.disagreements, tone: 'bg-gold-tint text-gold', icon: ABOUT_ICONS.scales },
    { k: 'about.debate.openQuestions', count: counts.openQuestions, tone: 'bg-indigo-tint text-indigo', icon: ABOUT_ICONS.question },
    { k: 'home.stat.legends', count: counts.legends, tone: 'bg-teal-tint text-teal-ink', icon: ABOUT_ICONS.speech },
  ]} />;
}

/** A row of open-licence photos, each with its credit underneath. */
export function PhotoStrip({ photos }: { photos: HomePhoto[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3" data-photo-strip>
      {photos.map((p, i) => (
        <li key={p.id} className={i === 2 ? 'col-span-2 md:col-span-1' : undefined}>
          <figure className="space-y-1">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-surface-2"><Photo photo={p} sizes="(min-width: 768px) 16rem, 50vw" /></div>
            <figcaption lang="en" className="text-xs leading-snug text-muted [overflow-wrap:anywhere]">{p.credit}</figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}

const svg = (body: React.ReactNode, size = 20) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">{body}</svg>
);
export const ABOUT_ICONS = {
  book: svg(<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11" />),
  grade: svg(<><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" /><path d="M8.8 12l2.2 2.2 4.4-4.4" /></>),
  pin: svg(<><path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11Z" /><circle cx={12} cy={10} r={2.2} /></>),
  scales: svg(<path d="M12 4v16M8 20h8M5 7h14M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z" />),
  question: svg(<><circle cx={12} cy={12} r={9} /><path d="M9.5 9.5a2.6 2.6 0 1 1 3.7 2.3c-.8.4-1.2 1-1.2 1.8v.4" /><circle cx={12} cy={17} r={0.6} fill="currentColor" /></>),
  speech: svg(<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />),
  coins: svg(<><ellipse cx={9} cy={7} rx={6} ry={3} /><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7M15 11.2c3.4.2 6 1.5 6 2.8v4c0 1.7-2.7 3-6 3-2.2 0-4.1-.6-5.2-1.5" /></>),
  camera: svg(<path d="M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7" />),
  hourglass: svg(<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" />),
  hand: svg(<path d="M12 21c-3 0-6-2-7-5l-1.5-4a1.4 1.4 0 0 1 2.6-1L7 13V5.5a1.5 1.5 0 0 1 3 0V11V4a1.5 1.5 0 0 1 3 0v7V5a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v6c0 4-3 7-7 7z" />),
  licence: svg(<><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v4h4M9 12h7M9 16h5" /></>),
  todo: svg(<circle cx={12} cy={12} r={8} strokeDasharray="3 3" />, 18),
};

/** The icon tile beside each section heading, by section id. */
export const SECTION_ICON: Record<string, { icon: React.ReactNode; tone: string }> = {
  'core-book': { icon: ABOUT_ICONS.book, tone: 'bg-teal-tint text-teal-ink' },
  grading: { icon: ABOUT_ICONS.grade, tone: 'bg-moss-tint text-moss-ink' },
  locations: { icon: ABOUT_ICONS.pin, tone: 'bg-primary-tint text-primary-tint-ink' },
  disagreements: { icon: ABOUT_ICONS.scales, tone: 'bg-gold-tint text-gold' },
  costs: { icon: ABOUT_ICONS.coins, tone: 'bg-indigo-tint text-indigo' },
  photos: { icon: ABOUT_ICONS.camera, tone: 'bg-moss-tint text-moss-ink' },
  'not-done': { icon: ABOUT_ICONS.hourglass, tone: 'bg-surface-2 text-ink' },
  contribute: { icon: ABOUT_ICONS.hand, tone: 'bg-primary-tint text-primary-tint-ink' },
  licences: { icon: ABOUT_ICONS.licence, tone: 'bg-teal-tint text-teal-ink' },
};
