import type { Metadata, Viewport } from 'next';
import { fontVariables } from './fonts';
import './tokens.css';

export const metadata: Metadata = {
  title: { default: 'Jomidarpedia · জমিদারপিডিয়া', template: '%s · Jomidarpedia' },
  description: 'The zamindar palaces of Bangladesh: 399 sites with sources, conditions and day trips from Dhaka.',
  icons: { icon: '/icon.svg', apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F2E8' },
    { media: '(prefers-color-scheme: dark)', color: '#191712' },
  ],
};

// Runs before paint so a saved theme and language never flash the wrong way.
// Values are written by <ThemeToggle> and <LanguageToggle> to localStorage.
const bootScript = `try{var t=localStorage.getItem('jp-theme');if(t)document.documentElement.dataset.theme=t;var l=localStorage.getItem('jp-lang');if(l==='bn'){document.documentElement.lang='bn';document.documentElement.dataset.lang='bn'}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-toast focus:rounded-md focus:bg-surface focus:px-4 focus:py-3">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
