// Empty-state illustrations (roadmap task 3.8), line drawings in tokens after the 404, search and
// offline boards. All decorative (aria-hidden): the heading beside each one says what happened.

const t = (name: string) => `rgb(var(--${name}))`;
const line = { fill: 'none', stroke: t('muted'), strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const svgProps = { 'aria-hidden': true, focusable: 'false' } as const;

/** 404: a portico fallen into ruin, a sapling growing through it ("This page has fallen into ruin"). */
export function NotFoundArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 240" className={className} {...svgProps}>
      <path d="M20 212 H320 M36 206 H200" {...line} />
      <path d="M56 98 L104 72 L136 90 M146 96 L160 104 H52 Z" {...line} />
      <path d="M100 86 a10 10 0 0 1 20 0" {...line} />
      <path d="M58 110 H162 M66 110 V206 M86 110 V206 M106 110 V206" {...line} />
      <path d="M180 206 V160 l3 -4 3 4 V206 M204 206 V176 l3 -3 3 3 V206 M226 206 V184 h6 V206" {...line} />
      <path d="M248 206 h24 v-10 h-24 Z M282 206 l24 -4 -2 -9 -24 4 Z" {...line} />
      <circle cx={318} cy={200} r={6} {...line} />
      <path d="M130 206 C132 160 120 120 112 96 M132 150 C140 120 160 104 186 98" stroke={t('moss')} strokeWidth={2} fill="none" strokeLinecap="round" />
      {[[96, 70, 16, 8], [126, 58, 15, 8], [168, 54, 18, 9], [196, 66, 22, 10]].map(([cx, cy, rx, ry]) =>
        <ellipse key={cx} cx={cx} cy={cy} rx={rx} ry={ry} fill={t('moss')} opacity={0.55} />)}
      <path d="M262 46 q4 -4 8 0 q4 -4 8 0 M282 30 q4 -4 8 0 q4 -4 8 0" {...line} />
    </svg>
  );
}

/** Search with no results: a dashed house under a magnifier, and a question mark. */
export function NoResultsArt({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 180" className={className} {...svgProps}>
      <g {...line} strokeDasharray="4 3">
        <path d="M40 150 V96 H190 V150 M70 96 L110 70 L150 96" />
        {[56, 80, 104, 128].map(x => <path key={x} d={`M${x} 110 h12 v14 h-12 Z M${x} 130 h12 v14 h-12 Z`} />)}
      </g>
      <path d="M20 156 H250" {...line} />
      <circle cx={192} cy={104} r={34} fill={t('primary-tint')} stroke={t('primary')} strokeWidth={5} />
      <path d="M216 128 L246 158" stroke={t('primary')} strokeWidth={9} strokeLinecap="round" />
      <path d="M174 96 h12 v12 h-12 Z M192 96 h12 v12 h-12 Z M176 116 a6 6 0 0 1 12 0 v12 M196 116 a6 6 0 0 1 12 0 v12" {...line} stroke={t('ink')} />
      <text x={262} y={64} fontSize={28} fontWeight={700} fill={t('primary')} textAnchor="middle">?</text>
      <path d="M106 36 q4 -4 8 0 q4 -4 8 0" {...line} />
    </svg>
  );
}

/** Offline: the wifi mark struck through. */
export function OfflineIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...svgProps}
      fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 8.5a14 14 0 0 1 5-2.9M12 5.2a14 14 0 0 1 9.5 3.3M5.5 12a9 9 0 0 1 3.6-2M15 10.2a9 9 0 0 1 3.5 1.8M9 15.5a4.5 4.5 0 0 1 6 0" />
      <circle cx={12} cy={19} r={1} fill="currentColor" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

/** No open-licence photo yet: a camera struck through (beside PlaceholderArt on cards). */
export function NoPhotoIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...svgProps}
      fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5h6l1.5 2H20a1 1 0 0 1 1 1v9.5M17 19H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h2" />
      <path d="M9.5 10.6a3.5 3.5 0 0 0 4.9 4.9" />
      <path d="M3 3l18 18" />
    </svg>
  );
}
