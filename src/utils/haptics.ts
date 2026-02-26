import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { createLogger } from '@/lib/logger'


const log = createLogger('Utils')
export const haptics = {
  light: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch (e) {
        log.warn('Haptics not available', { error: e instanceof Error ? e.message : String(e) })
      }
    }
  },
  medium: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium })
      } catch (e) {
        log.warn('Haptics not available', { error: e instanceof Error ? e.message : String(e) })
      }
    }
  },
  heavy: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy })
      } catch (e) {
        log.warn('Haptics not available', { error: e instanceof Error ? e.message : String(e) })
      }
    }
  },
  warning: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.notification({ type: NotificationType.Warning })
      } catch (e) {
        log.warn('Haptics not available', { error: e instanceof Error ? e.message : String(e) })
      }
    }
  },
  success: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.notification({ type: NotificationType.Success })
      } catch (e) {
        log.warn('Haptics not available', { error: e instanceof Error ? e.message : String(e) })
      }
    }
  },
  error: async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.notification({ type: NotificationType.Error })
      } catch (e) {
        log.warn('Haptics not available', { error: e instanceof Error ? e.message : String(e) })
      }
    }
  }
}
