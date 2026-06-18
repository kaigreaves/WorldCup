import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.legacy.tracker',
  appName: 'Legacy Tracker',
  // Load the live Vercel deployment rather than bundled static files.
  // This keeps server-side ISR, API routes, and Reddit data working correctly,
  // and ensures the web app and native app always stay in sync.
  server: {
    url: 'https://world-cup-story.vercel.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#00112B',
  },
};

export default config;
