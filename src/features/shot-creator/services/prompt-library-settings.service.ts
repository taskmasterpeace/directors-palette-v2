

import { SupabaseSettingsRepository } from "@/lib/db/repositories/settings.repository";
import { PromptCategory, SavedPrompt } from "../store/prompt-library-store";
import { logger } from '@/lib/logger'

/**
 * Prompt Library Settings
 */
export interface PromptLibrarySettings {
    prompts: SavedPrompt[]
    categories: PromptCategory[]
    quickPrompts: SavedPrompt[]
}

/**
 * Settings Service for Prompt Library
 * Handles persistence of prompt library data to Supabase
 */
export class PromptLibrarySettingsService {
    private settingsRepo: SupabaseSettingsRepository;
    private readonly SETTINGS_KEY = 'prompt_library';

    constructor(settingsRepository?: SupabaseSettingsRepository) {
        this.settingsRepo = settingsRepository || new SupabaseSettingsRepository();
    }

    /**
     * Load prompt library settings from Supabase
     */
    async loadSettings(userId: string): Promise<PromptLibrarySettings | null> {
        try {
            const result = await this.settingsRepo.findByUserId(userId);

            if (!result || !result.data.config) {
                return null;
            }

            const config = result.data.config as Record<string, unknown>;
            const promptLibraryConfig = config[this.SETTINGS_KEY] as Partial<PromptLibrarySettings> | undefined;

            if (!promptLibraryConfig) {
                return null;
            }

            // Ensure backward compatibility - regenerate quickPrompts if missing
            const prompts = promptLibraryConfig.prompts || [];
            const quickPrompts = promptLibraryConfig.quickPrompts || prompts.filter(p => p.isQuickAccess);

            return {
                prompts,
                categories: promptLibraryConfig.categories || [],
                quickPrompts
            };
        } catch (error) {
            logger.shotCreator.error('Failed to load prompt library settings', { error: error instanceof Error ? error.message : String(error) })
            return null;
        }
    }

    /**
     * Save prompt library settings to Supabase
     */
    async saveSettings(userId: string, settings: PromptLibrarySettings): Promise<void> {
        try {
            await this.settingsRepo.upsert({
                user_id: userId,
                config: {
                    [this.SETTINGS_KEY]: settings
                }
            });
        } catch (error) {
            logger.shotCreator.error('Failed to save prompt library settings', { error: error instanceof Error ? error.message : String(error) })
            throw error;
        }
    }

    /**
     * Update specific setting fields
     */
    async updateSettings(userId: string, partialSettings: Partial<PromptLibrarySettings>): Promise<void> {
        try {
            // Get current settings
            const currentSettings = await this.loadSettings(userId);

            // Merge with new settings
            const mergedSettings: PromptLibrarySettings = {
                prompts: [],
                categories: [],
                quickPrompts: [],
                ...currentSettings,
                ...partialSettings
            };

            await this.saveSettings(userId, mergedSettings);
        } catch (error) {
            logger.shotCreator.error('Failed to update prompt library settings', { error: error instanceof Error ? error.message : String(error) })
            throw error;
        }
    }
}

// Singleton instance
export const promptLibrarySettingsService = new PromptLibrarySettingsService();
