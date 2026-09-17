import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.redbeard.app',
  appName: 'Redbeard',
  webDir: 'public/android-shell',
  server: {
    // Allow the WebView to navigate to redbeard.store URLs in-app
    // instead of opening them in an external browser.
    allowNavigation: ['redbeard.store', '*.redbeard.store'],
  },
  android: {
    appendUserAgent: 'RedbeardApp'
  }
};

export default config;
