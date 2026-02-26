import { SupabaseSettingsRepository } from "@/lib/db/repositories/settings.repository";
import { ShotCreatorSettings } from "../types";
import { logger } from '@/lib/logger'

/**
 * Settings Service for Shot Creator
 * Handles persistence of shot creator settings to Supabase
 */
export class ShotCreatorSettingsService {
  private settingsRepo: SupabaseSettingsRepository;
  private readonly SETTINGS_KEY = 'shot_creator';

  constructor(settingsRepository?: SupabaseSettingsRepository) {
    this.settingsRepo = settingsRepository || new SupabaseSettingsRepository();
  }

  /**
   * Load shot creator settings from Supabase
   */
  async loadSettings(userId: string): Promise<ShotCreatorSettings | null> {
    try {
      const result = await this.settingsRepo.findByUserId(userId);

      if (!result || !result.data.config) {
        return null;
      }

      const config = result.data.config as Record<string, unknown>;
      const shotCreatorConfig = config[this.SETTINGS_KEY] as Partial<ShotCreatorSettings> | undefined;

      if (!shotCreatorConfig) {
        return null;
      }

      // Merge with defaults for backward compatibility
      return {
        ...this.getDefaultSettings(),
        ...shotCreatorConfig
      };
    } catch (error) {
      logger.shotCreator.error('Failed to load shot creator settings', { error: error instanceof Error ? error.message : String(error) })
      return null;
    }
  }

  /**
   * Save shot creator settings to Supabase
   */
  async saveSettings(userId: string, settings: ShotCreatorSettings): Promise<void> {
    try {
      await this.settingsRepo.upsert({
        user_id: userId,
        config: {
          [this.SETTINGS_KEY]: settings
        }
      });
    } catch (error) {
      logger.shotCreator.error('Failed to save shot creator settings', { error: error instanceof Error ? error.message : String(error) })
      throw error;
    }
  }

  /**
   * Update specific setting fields
   */
  async updateSettings(userId: string, partialSettings: Partial<ShotCreatorSettings>): Promise<void> {
    try {
      // Get current settings (returns null on error)
      let currentSettings: ShotCreatorSettings | null = null
      try {
        currentSettings = await this.loadSettings(userId);
      } catch (error) {
        logger.shotCreator.warn('Failed to load current settings, using defaults', { error: error instanceof Error ? error.message : String(error) })
      }

      // Merge with new settings
      const mergedSettings: ShotCreatorSettings = {
        ...this.getDefaultSettings(),
        ...(currentSettings || {}),
        ...partialSettings
      };

      await this.saveSettings(userId, mergedSettings);
    } catch (error) {
      logger.shotCreator.error('Failed to update shot creator settings', { error: error instanceof Error ? error.message : String(error) })
      throw error;
    }
  }

  /**
   * Get default settings
   */
  private getDefaultSettings(): ShotCreatorSettings {
    return {
      aspectRatio: "16:9",
      resolution: "2K",
      seed: undefined,
      model: "nano-banana",
    };
  }
}

// Singleton instance
export const shotCreatorSettingsService = new ShotCreatorSettingsService();
