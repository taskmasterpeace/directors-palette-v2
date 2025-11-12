import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

export const haptics = {
  light: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch (e) {
        console.warn('Haptics not available:', e)
      }
    }
  },
  medium: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium })
      } catch (e) {
        console.warn('Haptics not available:', e)
      }
    }
  },
  heavy: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy })
      } catch (e) {
        console.warn('Haptics not available:', e)
      }
    }
  },
  warning: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.notification({ type: NotificationType.Warning })
      } catch (e) {
        console.warn('Haptics not available:', e)
      }
    }
  },
  success: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.notification({ type: NotificationType.Success })
      } catch (e) {
        console.warn('Haptics not available:', e)
      }
    }
  },
  error: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.notification({ type: NotificationType.Error })
      } catch (e) {
        console.warn('Haptics not available:', e)
      }
    }
  }
}
