import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Glacier — Legacy Tracker',
    short_name: 'Glacier',
    description: 'The FIFA World Cup 2026 legacy leaderboard by Glacier.',
    start_url: '/',
    display: 'standalone',
    background_color: '#00112B',
    theme_color: '#00112B',
    orientation: 'portrait',
    icons: [
      { src: '/WC26Logo.png', sizes: '192x192', type: 'image/png' },
      { src: '/WC26Logo.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
