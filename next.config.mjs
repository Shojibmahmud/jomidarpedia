import { resolveMode } from './scripts/data-mode.mjs';

// Pages named page.dev.tsx (the /dev/ test pages) are built in local and preview mode only.
// The mode resolves as for the data build (scripts/data-mode.mjs), so release leaves them out.
const devPages = resolveMode(process.env).mode !== 'release';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',            // static HTML in out/, no server at runtime
  trailingSlash: true,         // /site/JB-DHK-064/baliati-palace/ → index.html, works on any static host
  images: { unoptimized: true }, // no image server in a static export; thumbnails are pre-sized WebP
  reactStrictMode: true,
  pageExtensions: devPages ? ['dev.tsx', 'tsx', 'ts'] : ['tsx', 'ts'],
};

export default nextConfig;
