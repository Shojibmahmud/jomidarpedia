// Illustration for sites without an open-licence photo (roadmap task 3.8; 5.14 builds NoPhotoPanel on it).
// One drawing per condition, as on the board "When there is no photo": the same facts as the badge, as a
// picture. Pure SVG in tokens, so it follows the theme, costs nothing to load and never looks like a photo.
// Decorative (aria-hidden): the card's text says the condition and that there is no photo.

import type { Condition } from '@/lib/types';

const t = (name: string) => `rgb(var(--${name}))`;
const SIZE = { card: 'aspect-[4/3] w-full', thumb: 'aspect-[4/3] w-20', band: 'h-40 w-full' } as const;

function Palm() {
  return (
    <g>
      <path d="M58 168 C60 140 62 118 70 96" stroke={t('ink')} strokeOpacity={0.75} strokeWidth={3} fill="none" />
      {[[-34, 6], [-24, -12], [0, -18], [22, -8], [30, 10]].map(([dx, dy], i) => (
        <path key={i} d={`M70 96 q${dx / 2} ${dy - 10} ${dx} ${dy + 6}`} stroke={t('moss')} strokeWidth={4} strokeLinecap="round" fill="none" />
      ))}
    </g>
  );
}

// Classic front: plinth, body, pediment, balustrade, columns, khorkhori shutters and a door.
function Facade({ ruined = false, sign = false }: { ruined?: boolean; sign?: boolean }) {
  const shutters = [104, 116, 128, 196, 208, 220];
  return (
    <g>
      <rect x={86} y={160} width={160} height={8} fill={t('primary-tint')} />
      <rect x={96} y={112} width={140} height={48} fill={t('surface')} stroke={t('line-strong')} />
      {ruined
        ? <path d="M96 112 V104 H150 L160 96 L170 106 L178 100 L186 112" fill="none" stroke={t('line-strong')} strokeWidth={2} />
        : <>
            <path d="M136 112 L166 94 L196 112 Z" fill={t('primary-tint')} stroke={t('line-strong')} />
            <path d="M96 106 H236" stroke={t('line-strong')} strokeWidth={2} />
            {[100, 112, 124, 208, 220, 232].map(x => <path key={x} d={`M${x} 106 V112`} stroke={t('line-strong')} />)}
          </>}
      {[146, 158, 174, 186].map(x => <rect key={x} x={x} y={114} width={4} height={46} fill={t('surface-2')} stroke={t('line-strong')} strokeWidth={0.75} />)}
      {shutters.map((x, i) => (ruined && i > 3 ? null : <rect key={x} x={x} y={124} width={7} height={18} fill={ruined ? t('surface-2') : t('moss')} />))}
      <rect x={162} y={138} width={8} height={22} fill={t('unknown')} />
      {ruined && <>
        <rect x={112} y={146} width={10} height={5} fill={t('primary')} opacity={0.6} />
        <rect x={204} y={120} width={9} height={5} fill={t('primary')} opacity={0.6} />
        <rect x={222} y={150} width={8} height={4} fill={t('primary')} opacity={0.6} />
      </>}
      {sign && <>
        <rect x={214} y={146} width={34} height={14} rx={1.5} fill={t('surface')} stroke={t('primary')} strokeWidth={1.5} />
        <path d="M220 151 H242 M220 155 H236" stroke={t('primary')} />
        <path d="M218 160 V168 M244 160 V168" stroke={t('primary')} />
      </>}
    </g>
  );
}

function Tree({ x, scale = 1 }: { x: number; scale?: number }) {
  return (
    <g transform={`translate(${x} 168) scale(${scale})`}>
      <path d="M0 0 V-34" stroke={t('ink')} strokeOpacity={0.7} strokeWidth={3} />
      <circle cx={-10} cy={-44} r={13} fill={t('moss')} />
      <circle cx={9} cy={-48} r={15} fill={t('moss')} />
      <circle cx={0} cy={-62} r={13} fill={t('moss')} />
    </g>
  );
}

const DASH = { fill: 'none', stroke: t('muted'), strokeDasharray: '4 3', strokeWidth: 1.25 };

const SCENES: Record<Condition, React.ReactNode> = {
  preserved: <Facade />,
  preserved_adaptive_reuse: <Facade sign />,
  in_ruins: <><Facade ruined /><Tree x={238} scale={1.15} /><path d="M232 168 V140 M244 168 V146" stroke={t('ink')} strokeOpacity={0.5} /></>,
  lost: <>
    <path d="M96 112 H236 V160 H96 Z M136 112 L166 94 L196 112" {...DASH} />
    <rect x={86} y={160} width={160} height={8} fill={t('primary-tint')} />
    {[110, 146, 186, 222].map((x, i) => <rect key={x} x={x} y={150 - (i % 2) * 6} width={6} height={10 + (i % 2) * 6} fill={t('surface')} stroke={t('line-strong')} />)}
    <Tree x={258} scale={0.8} />
  </>,
  unknown: <>
    <path d="M96 112 H236 V160 H96 Z M136 112 L166 94 L196 112 M86 164 H246" {...DASH} />
    <path d="M108 124 h14 v18 h-14 Z M210 124 h14 v18 h-14 Z" {...DASH} />
    <circle cx={166} cy={136} r={12} fill={t('surface')} stroke={t('muted')} strokeWidth={1.5} />
    <text x={166} y={141.5} fontSize={16} fontWeight={700} textAnchor="middle" fill={t('muted')}>?</text>
  </>,
};

export function PlaceholderArt({ size = 'card', tint = 'unknown', className = '' }: { size?: keyof typeof SIZE; tint?: Condition; className?: string }) {
  return (
    <svg viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"
      className={`block ${SIZE[size]} ${className}`} data-placeholder={tint}>
      <rect width={320} height={240} fill={t('surface-2')} />
      <circle cx={262} cy={56} r={14} fill={t('primary-tint')} />
      <path d="M0 160 Q50 136 100 150 T200 146 T320 150 V176 H0 Z" fill={t('moss-tint')} />
      <Palm />
      {SCENES[tint]}
      <rect y={168} width={320} height={72} fill={t('teal-tint')} />
      <path d="M40 190 H110 M150 202 H230 M70 216 H130 M240 186 H290" stroke={t('surface')} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
