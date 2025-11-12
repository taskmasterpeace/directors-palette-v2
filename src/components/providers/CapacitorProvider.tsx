'use client';

import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { useCapacitor } from '@/hooks/useCapacitor';

/**
 * Capacitor Provider
 * Handles deep linking for Supabase authentication on native platforms
 * Also configures status bar and splash screen
 */
export function CapacitorProvider({ children }: { children: React.ReactNode }) {
  // Initialize Capacitor features (status bar, splash screen)
  useCapacitor();

  useEffect(() => {
    // Only run on native platforms (iOS/Android)
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let listener: PluginListenerHandle | undefined;

    // Handle deep link URLs (for Supabase OAuth callbacks)
    const setupListener = async () => {
      listener = await CapacitorApp.addListener('appUrlOpen', (data) => {
        const url = new URL(data.url);

        // Handle Supabase auth callback
        if (url.pathname === '/auth/callback') {
          // Navigate to the callback route which will handle the OAuth code exchange
          window.location.href = data.url;
        }
      });
    };

    setupListener();

    // Cleanup listener on unmount
    return () => {
      listener?.remove();
    };
  }, []);

  return <>{children}</>;
}
