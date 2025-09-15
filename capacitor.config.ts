// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.saveinqr.app',
  appName: 'SaveInQR',
  webDir: 'out',
  server: {
    url: 'https://saveinqr.com',   // tu dominio en prod
    cleartext: false,
    androidScheme: 'https',
  },
  backgroundColor: '#FFFFFF',
};

export default config;