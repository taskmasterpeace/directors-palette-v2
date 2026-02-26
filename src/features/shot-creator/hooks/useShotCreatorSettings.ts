import { useEffect, useCallback, useState } from 'react';
import { shotCreatorSettingsService } from '../services';
import { ShotCreatorSettings } from '../types';
import { getClient } from "@/lib/db/client";
import { DEFAULT_SETTINGS, useShotCreatorStore } from "../store";
import { migrateModelId } from '@/config';
import type { ModelId } from '@/config';
import { logger } from '@/lib/logger'
/**
 * Custom hook for managing shot creator settings with Supabase
 * Settings are persisted to Supabase only
 */
export function useShotCreatorSettings() {
  const { settings, setSettings } = useShotCreatorStore()
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Load settings from Supabase on mount (overrides localStorage if available)
   */
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const supabase = await getClient()
        if (!supabase) {
          logger.shotCreator.warn('Supabase client not available, using default settings')
          setIsInitialized(true);
          return;
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          logger.shotCreator.error('Auth error loading settings', { authError: authError })
          setIsInitialized(true);
          return;
        }

        if (!user) {
          setIsInitialized(true);
          return;
        }

        const loadedSettings = await shotCreatorSettingsService.loadSettings(user.id);
        if (loadedSettings) {
          const mergedSettings = { ...DEFAULT_SETTINGS, ...loadedSettings };
          // Migrate deprecated model IDs (e.g., 'nano-banana' -> 'nano-banana-2')
          if (mergedSettings.model) {
            mergedSettings.model = migrateModelId(mergedSettings.model) as ModelId;
          }
          setSettings(mergedSettings);
        }
      } catch (error) {
        logger.shotCreator.error('Failed to load settings from Supabase', { error: error instanceof Error ? error.message : String(error) })
      } finally {
        setIsInitialized(true);
      }
    };

    loadSettings();
  }, [setSettings]);

  /**
   * Save settings to both Supabase and localStorage immediately on change
   */
  const updateSettings = useCallback(async (partialSettings: Partial<ShotCreatorSettings>) => {
    // Update local state immediately
    setSettings(prev => {
      const newSettings = { ...prev, ...partialSettings };

      // Save to Supabase in background (don't wait)
      getClient()
        .then(async (supabase) => {
          if (!supabase) {
            logger.shotCreator.warn('Supabase client not available, settings not persisted')
            return;
          }

          const { data: { user }, error: authError } = await supabase.auth.getUser();

          if (authError) {
            logger.shotCreator.error('Auth error saving settings', { authError: authError })
            return;
          }

          if (user) {
            await shotCreatorSettingsService.updateSettings(user.id, partialSettings);
          }
        })
        .catch(error => {
          logger.shotCreator.error('Failed to save settings to Supabase', { error: error })
        });

      return newSettings;
    });
  }, [setSettings]);

  return {
    settings,
    updateSettings,
    isInitialized,
  };
}
