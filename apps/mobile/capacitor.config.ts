import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.redbeard.app',
  appName: 'redbeard',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    }
  }
};

export default config;
