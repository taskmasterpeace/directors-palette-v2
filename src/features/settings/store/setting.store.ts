import { create } from 'zustand'
import { SettingsConfig } from '@/features/settings/types/setting.types'
import { defaultSettings } from '@/features/settings/constants'
import { settingsService } from '@/features/settings/services/settings.service'
import { createLogger } from '@/lib/logger'


const log = createLogger('Settings')
type ResetKey = 'all' | 'shotCreator' | 'shotAnimator'

interface SettingStore {
  // State
  config: SettingsConfig
  isLoading: boolean
  error: string | null

  // Actions
  getSettings: (userId: string) => Promise<void>
  updateSettings: (userId: string, config: Partial<SettingsConfig>) => Promise<void>
  resetToDefaults: (userId: string, key?: ResetKey) => Promise<void>
}

const initialState = {
  config: defaultSettings,
  isLoading: false,
  error: null,
}

export const useSettingStore = create<SettingStore>()(
  (set) => ({
    // Initial state
    ...initialState,

    // Actions
    getSettings: async (userId: string) => {
      if (!userId) return

      set({ isLoading: true, error: null })
      try {
        const config = await settingsService.getByUserId(userId)
        set({ config, isLoading: false })
      } catch (error) {
        log.error('Failed to get settings', { error: error instanceof Error ? error.message : String(error) })
        set({
          error: 'Failed to load settings',
          isLoading: false,
          config: defaultSettings
        })
      }
    },

    updateSettings: async (userId: string, configUpdate: Partial<SettingsConfig>) => {
      if (!userId) return

      set({ isLoading: true, error: null })
      try {
        const updatedConfig = await settingsService.upsert(userId, configUpdate)
        set({ config: updatedConfig, isLoading: false })
      } catch (error) {
        log.error('Failed to update settings', { error: error instanceof Error ? error.message : String(error) })
        set({ error: 'Failed to update settings', isLoading: false })
      }
    },

    resetToDefaults: async (userId: string, key: ResetKey = 'all') => {
      if (!userId) return

      set({ isLoading: true, error: null })
      try {
        let resetConfig: Partial<SettingsConfig>

        switch (key) {
          case 'all':
            resetConfig = defaultSettings
            break
          case 'shotCreator':
            resetConfig = { shotCreator: defaultSettings.shotCreator }
            break
          case 'shotAnimator':
            resetConfig = { shotAnimator: defaultSettings.shotAnimator }
            break
          default:
            throw new Error(`Invalid reset key: ${key}`)
        }

        const updatedConfig = await settingsService.upsert(userId, resetConfig)
        set({ config: updatedConfig, isLoading: false })
      } catch (error) {
        log.error('Failed to reset [key] settings', { key, error: error instanceof Error ? error.message : String(error) })
        set({ error: `Failed to reset ${key} settings`, isLoading: false })
        throw error
      }
    },
  })
)