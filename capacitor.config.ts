import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.redbeard.app',
  appName: 'Redbeard',
  webDir: 'public/android-shell',
  server: {
    url: 'https://redbeard.store',
    errorPath: 'library.html',
  },
  android: {
    appendUserAgent: 'RedbeardApp'
  }
};

export default config;
