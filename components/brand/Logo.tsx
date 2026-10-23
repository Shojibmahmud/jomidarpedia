// Lockup A + Cinzel (roadmap task 3.8): the weathered rajbari mark and the inscriptional wordmark.
// Geometry: scripts/lib/logo.mjs. Colours are tokens, so the dark theme gets the board's dark lockup.

import { markGlyph, SIMPLE_BELOW, VIEWBOX } from '@/scripts/lib/logo.mjs';

/** The mark on its terracotta tile. Decorative: the link or heading around it carries the name. */
export function LogoMark({ size = 34, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox={VIEWBOX} width={size} height={size} aria-hidden="true" focusable="false" className={className}>
      <rect width="64" height="64" rx="14" fill="rgb(var(--primary))" />
      <g style={{ color: 'rgb(var(--on-primary))' }} dangerouslySetInnerHTML={{ __html: markGlyph({ simple: size < SIMPLE_BELOW }) }} />
    </svg>
  );
}

/** Mark + JOMIDARPEDIA + জমিদারপিডিয়া. `compact` is the 34 px header version. */
export function Lockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={compact ? 34 : 56} />
      <span className="flex flex-col leading-none">
        <span lang="en" className={`font-wordmark font-semibold uppercase tracking-[0.06em] ${compact ? 'text-[17px]' : 'text-[30px]'}`}>Jomidarpedia</span>
        <span lang="bn" className={`font-bn text-muted ${compact ? 'text-[12px] leading-4' : 'text-[18px] leading-6'}`}>জমিদারপিডিয়া</span>
      </span>
    </span>
  );
}
