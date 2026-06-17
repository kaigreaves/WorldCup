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
        // Force browsers (including iOS PWA) to always revalidate the HTML page.
        // Without this, iOS home-screen apps serve stale cached HTML indefinitely.
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
