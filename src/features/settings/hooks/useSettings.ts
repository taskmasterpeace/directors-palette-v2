'use client'
import { useEffect } from 'react'
import { useSettingStore } from '@/features/settings/store/setting.store'
import { SettingsConfig } from '@/features/settings/types/setting.types'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useToast } from "@/hooks/use-toast"
import { createLogger } from '@/lib/logger'


const log = createLogger('Settings')
export const useSettings = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const {
    config,
    isLoading,
    error,
    getSettings,
    updateSettings,
    resetToDefaults,
  } = useSettingStore()

  useEffect(() => {
    if (user?.id) {
      getSettings(user.id)
    }
  }, [user?.id, getSettings])

  // Helper functions with user ID automatically included
  const updateUserSettings = async (configUpdate: Partial<SettingsConfig>) => {
    if (!user?.id) return
    await updateSettings(user.id, configUpdate)
  }

  const updateShotCreatorSettings = async (shotCreator: Partial<SettingsConfig['shotCreator']>) => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please log in to save your settings.",
      })
      return
    }

    await updateSettings(user.id, {
      shotCreator: { ...config.shotCreator, ...shotCreator }
    })
  }

  const updateShotAnimatorSettings = async (shotAnimator: Partial<SettingsConfig['shotAnimator']>) => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please log in to save your settings.",
      })
      return
    }

    await updateSettings(user.id, {
      shotAnimator: { ...config.shotAnimator, ...shotAnimator }
    })
  }

  // Reusable reset functions with authentication and toast notifications
  const resetShotCreator = async () => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please log in to reset your settings.",
      })
      return
    }

    try {
      await resetToDefaults(user.id, 'shotCreator')
      toast({
        variant: "default",
        title: "Success",
        description: "Shot creator settings reset to defaults.",
      })
    } catch (error) {
      log.error('Failed to reset shot creator settings', { error: error instanceof Error ? error.message : String(error) })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reset shot creator settings.",
      })
      throw error
    }
  }

  const resetShotAnimator = async () => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please log in to reset your settings.",
      })
      return
    }

    try {
      await resetToDefaults(user.id, 'shotAnimator')
      toast({
        variant: "default",
        title: "Success",
        description: "Shot animator settings reset to defaults.",
      })
    } catch (error) {
      log.error('Failed to reset shot animator settings', { error: error instanceof Error ? error.message : String(error) })
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reset shot animator settings.",
      })
      throw error
    }
  }

  return {
    // State
    config,
    isLoading,
    error,
    user,

    // Actions (with user ID automatically included)
    updateSettings: updateUserSettings,
    updateShotCreatorSettings,
    updateShotAnimatorSettings,

    // Reusable reset methods (with authentication and toast notifications)    
    resetShotCreator,
    resetShotAnimator,

    // Direct access to individual settings
    shotCreator: config.shotCreator,
    shotAnimator: config.shotAnimator,
  }
}
