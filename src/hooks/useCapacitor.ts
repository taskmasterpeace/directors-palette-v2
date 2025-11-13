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

        // Wait for DOM to be fully loaded and initial render to complete
        // This ensures the app is visually ready before hiding the splash screen
        if (document.readyState === 'complete') {
          // DOM already loaded, wait a brief moment for React hydration
          await new Promise(resolve => setTimeout(resolve, 100));
          await SplashScreen.hide();
        } else {
          // Wait for DOM to load, then hide splash screen
          window.addEventListener('load', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            await SplashScreen.hide();
          }, { once: true });
        }
      } catch (error) {
        console.error('Error setting up native features:', error);
        // Ensure splash screen is hidden even if there's an error
        try {
          await SplashScreen.hide();
        } catch (e) {
          console.error('Failed to hide splash screen:', e);
        }
      }
    };

    setupNativeFeatures();
  }, []);

  return {
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
  };
}
