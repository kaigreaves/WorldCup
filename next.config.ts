import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.api-sports.io',
      },
    ],
  },
  async headers() {
    return [
      {
        // s-maxage: Vercel CDN edge caches the ISR output for 60 s.
        // stale-while-revalidate: CDN serves stale HTML while regenerating in background.
        // no-cache: browsers must revalidate — prevents iOS PWA from serving stale HTML.
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=120, no-cache' },
        ],
      },
    ];
  },
};

export default nextConfig;
