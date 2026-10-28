// Tailwind CSS v3.4 config. Colours read the CSS variables in app/tokens.css,
// so one class works in light and dark (no dark: variants needed for colour).
// On Tailwind v4, keep this file and load it from CSS with:  @config "../tailwind.config.ts";
import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const colors = [
  'bg', 'surface', 'surface-2', 'ink', 'muted', 'line', 'line-strong',
  'primary', 'primary-hover', 'on-primary', 'primary-tint', 'primary-tint-ink',
  'moss', 'moss-tint', 'moss-ink', 'teal', 'teal-tint', 'teal-ink',
  'indigo', 'indigo-tint', 'on-indigo', 'gold', 'gold-tint',
  'lost', 'lost-tint', 'unknown', 'focus', 'map-land',
];

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  // Theme switching is done by the CSS variables; this only enables dark: for rare non-colour tweaks.
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    screens: { md: '768px', lg: '1024px', xl: '1280px', '2xl': '1440px' }, // designed at 390 (base) and 1440
    extend: {
      colors: Object.fromEntries(colors.map((c) => [c, v(c)])),
      fontFamily: {
        wordmark: ['var(--font-cinzel)', 'Georgia', 'serif'], // logo only: uppercase, tracking 0.06em, weight 600
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-source-sans)', 'system-ui', 'sans-serif'],
        'bn-serif': ['var(--font-tiro-bangla)', 'Noto Serif Bengali', 'serif'],
        bn: ['var(--font-bn-digits)', 'var(--font-hind-siliguri)', 'Noto Sans Bengali', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      // [size, line-height]. Bangla runs ~5% larger with ~30% taller lines.
      fontSize: {
        display: ['56px', '60px'], 'bn-display': ['58px', '76px'],
        h1: ['40px', '46px'], 'bn-h1': ['42px', '58px'],
        h2: ['30px', '36px'], 'bn-h2': ['32px', '46px'],
        h3: ['22px', '28px'], 'bn-h3': ['23px', '34px'],
        lg: ['18px', '28px'], 'bn-lg': ['19px', '32px'],
        base: ['16px', '24px'], 'bn-base': ['17px', '28px'],
        sm: ['14px', '20px'], 'bn-sm': ['15px', '24px'],
        xs: ['12px', '16px'], 'bn-xs': ['13px', '20px'],
      },
      spacing: { 18: '72px', 22: '88px' }, // 4 px base scale otherwise
      minHeight: { tap: '44px' },
      minWidth: { tap: '44px' },
      borderRadius: { sm: '4px', md: '10px', lg: '14px', xl: '20px' },
      boxShadow: { 1: 'var(--shadow-1)', 2: 'var(--shadow-2)', 3: 'var(--shadow-3)' },
      // Above Leaflet's own panes (200–700).
      zIndex: { controls: '800', panel: '900', header: '1000', dropdown: '1100', drawer: '1200', lightbox: '1300', toast: '1400' },
      maxWidth: { page: '1280px' },
    },
  },
  plugins: [],
} satisfies Config;
