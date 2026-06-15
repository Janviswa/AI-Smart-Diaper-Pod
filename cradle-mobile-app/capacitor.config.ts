import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jananiv.smartdiaperpod',
  appName: 'Smart Diaper Pod',
  webDir: 'dist',
  bundledWebRuntime: false,

  android: {
    allowMixedContent: true
  },

  server: {
    androidScheme: 'https',
    cleartext: true
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      showSpinner: false
    },

    StatusBar: {
      style: 'DARK'
    }
  }
};

export default config;