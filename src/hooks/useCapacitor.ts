'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Hook to configure Capacitor native features
 * Handles status bar styling and splash screen
 */
export function useCapacitor() {
  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const setupNativeFeatures = async () => {
      try {
        // Configure status bar for dark theme
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#000000' });

        // Hide splash screen after app is ready
        await SplashScreen.hide();
      } catch (error) {
        console.error('Error setting up native features:', error);
      }
    };

    setupNativeFeatures();
  }, []);

  return {
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
  };
}
