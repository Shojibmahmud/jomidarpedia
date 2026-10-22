/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',            // static HTML in out/, no server at runtime
  trailingSlash: true,         // /site/JB-DHK-064/baliati-palace/ → index.html, works on any static host
  images: { unoptimized: true }, // no image server in a static export; thumbnails are pre-sized WebP
  reactStrictMode: true,
};

export default nextConfig;
