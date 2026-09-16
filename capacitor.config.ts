import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.redbeard.app',
  appName: 'Redbeard',
  webDir: 'public',
  // Since this is a Next.js App Router project with SSR, database, and APIs,
  // we must load the deployed remote URL instead of static local files.
  server: {
    url: 'https://redbeard.store', // IMPORTANT: Update this to your deployed production URL
    cleartext: true
  }
};

export default config;
