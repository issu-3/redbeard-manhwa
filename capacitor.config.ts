import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.redbeard.app',
  appName: 'Redbeard',
  webDir: 'public/android-shell',
  server: {
    // Allow the WebView to navigate to redbeard.store URLs in-app
    // instead of opening them in an external browser.
    allowNavigation: ['redbeard.store', '*.redbeard.store'],
    // On network error, load the offline library directly instead of index.html
    // (which would attempt to reach the online site and redirect)
    errorPath: 'library.html',
  },
  android: {
    appendUserAgent: 'RedbeardApp'
  }
};

export default config;
