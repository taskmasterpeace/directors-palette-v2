/**
 * Clipboard Manager - Unified clipboard API for all platforms
 *
 * Provides a single interface for clipboard operations that works across:
 * - iOS (via Capacitor plugin)
 * - Android (via Capacitor plugin)
 * - Web browsers (via navigator.clipboard)
 *
 * Handles errors gracefully and provides user-friendly feedback.
 */

import { Clipboard } from '@capacitor/clipboard'
import { Capacitor } from '@capacitor/core'

export interface ClipboardError {
  message: string
  code: 'PERMISSION_DENIED' | 'NOT_SUPPORTED' | 'EMPTY_CLIPBOARD' | 'UNKNOWN'
}

/**
 * Helper function to convert Blob to Data URL
 */
async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Helper function to convert Data URL to Blob
 */
async function dataURLToBlob(dataURL: string): Promise<Blob> {
  const response = await fetch(dataURL)
  return await response.blob()
}

/**
 * Clipboard Manager Class
 */
class ClipboardManager {
  /**
   * Read text from clipboard
   */
  async readText(): Promise<string> {
    try {
      if (Capacitor.isNativePlatform()) {
        // Use Capacitor plugin on iOS/Android
        const { value, type } = await Clipboard.read()
        if (type === 'text/plain' && value) {
          return value
        }
        throw new Error('Clipboard does not contain text')
      } else {
        // Use web API on desktop/web
        if (!navigator.clipboard?.readText) {
          throw new Error('Clipboard API not supported in this browser')
        }
        return await navigator.clipboard.readText()
      }
    } catch (error: unknown) {
      console.error('Clipboard readText error:', error)
      throw this.formatError(error)
    }
  }

  /**
   * Write text to clipboard
   */
  async writeText(text: string): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        // Use Capacitor plugin on iOS/Android
        await Clipboard.write({ string: text })
      } else {
        // Use web API on desktop/web
        if (!navigator.clipboard?.writeText) {
          throw new Error('Clipboard API not supported in this browser')
        }
        await navigator.clipboard.writeText(text)
      }
    } catch (error: unknown) {
      console.error('Clipboard writeText error:', error)
      throw this.formatError(error)
    }
  }

  /**
   * Read image from clipboard
   * Returns data URL (base64 encoded image)
   */
  async readImage(): Promise<string | null> {
    try {
      if (Capacitor.isNativePlatform()) {
        // Use Capacitor plugin on iOS/Android
        const { value, type } = await Clipboard.read()

        // Capacitor returns base64 string for images
        if (type.startsWith('image/')) {
          // If it already has data URL prefix, return as is
          if (value.startsWith('data:')) {
            return value
          }
          // Otherwise, add the prefix
          return `data:${type};base64,${value}`
        }

        return null
      } else {
        // Use web API on desktop/web
        if (!navigator.clipboard?.read) {
          throw new Error('Clipboard image reading not supported in this browser')
        }

        const clipboardItems = await navigator.clipboard.read()

        for (const item of clipboardItems) {
          // Find first image type
          const imageType = item.types.find((type) => type.startsWith('image/'))

          if (imageType) {
            const blob = await item.getType(imageType)
            return await blobToDataURL(blob)
          }
        }

        return null
      }
    } catch (error: unknown) {
      console.error('Clipboard readImage error:', error)
      // Don't throw on image read failures - just return null
      // This allows graceful degradation when clipboard is empty
      return null
    }
  }

  /**
   * Write image to clipboard
   * Accepts data URL (base64 encoded image)
   */
  async writeImage(dataURL: string): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        // Use Capacitor plugin on iOS/Android
        await Clipboard.write({ image: dataURL })
      } else {
        // Use web API on desktop/web
        if (!navigator.clipboard?.write) {
          throw new Error('Clipboard image writing not supported in this browser')
        }

        const blob = await dataURLToBlob(dataURL)
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ])
      }
    } catch (error: unknown) {
      console.error('Clipboard writeImage error:', error)
      throw this.formatError(error)
    }
  }

  /**
   * Check if clipboard contains image data
   */
  async hasImage(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const { type } = await Clipboard.read()
        return type.startsWith('image/')
      } else {
        if (!navigator.clipboard?.read) {
          return false
        }

        const items = await navigator.clipboard.read()
        return items.some(item =>
          item.types.some(type => type.startsWith('image/'))
        )
      }
    } catch (error) {
      console.error('Clipboard hasImage error:', error)
      return false
    }
  }

  /**
   * Check if clipboard contains text data
   */
  async hasText(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const { type } = await Clipboard.read()
        return type === 'text/plain'
      } else {
        if (!navigator.clipboard?.read) {
          return false
        }

        const items = await navigator.clipboard.read()
        return items.some(item =>
          item.types.includes('text/plain')
        )
      }
    } catch (error) {
      console.error('Clipboard hasText error:', error)
      return false
    }
  }

  /**
   * Format error into user-friendly ClipboardError
   */
  private formatError(error: unknown): ClipboardError {
    const message = (error instanceof Error ? error.message : undefined) || 'Unknown clipboard error'

    if (message.includes('permission') || message.includes('denied')) {
      return {
        code: 'PERMISSION_DENIED',
        message: 'Clipboard access denied. Please grant permissions in Settings.'
      }
    }

    if (message.includes('not supported')) {
      return {
        code: 'NOT_SUPPORTED',
        message: 'Clipboard operation not supported in this browser/device.'
      }
    }

    if (message.includes('does not contain') || message.includes('empty')) {
      return {
        code: 'EMPTY_CLIPBOARD',
        message: 'Clipboard is empty or does not contain the expected data type.'
      }
    }

    return {
      code: 'UNKNOWN',
      message: `Clipboard error: ${message}`
    }
  }
}

// Export singleton instance
export const clipboardManager = new ClipboardManager()

// Export class for testing
export { ClipboardManager }
