import JSZip from 'jszip'
import { logger } from '@/lib/logger'

export interface DownloadProgress {
  current: number
  total: number
  status: 'downloading' | 'zipping' | 'complete' | 'error'
  error?: string
}

export class BulkDownloadService {
  /**
   * Download multiple images as a ZIP file
   * @param images Array of image objects with url and id
   * @param zipName Name for the ZIP file (default: gallery-export-YYYY-MM-DD.zip)
   * @param onProgress Callback for progress updates
   */
  static async downloadAsZip(
    images: { url: string; id: string }[],
    zipName?: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    const zip = new JSZip()
    const total = images.length

    // Use default name if not provided
    const fileName = zipName || `gallery-export-${new Date().toISOString().split('T')[0]}.zip`

    try {
      // Download each image and add to ZIP
      for (let i = 0; i < images.length; i++) {
        const image = images[i]

        onProgress?.({
          current: i + 1,
          total,
          status: 'downloading'
        })

        try {
          // Fetch image as blob
          const response = await fetch(image.url)
          if (!response.ok) {
            logger.shotCreator.warn('Failed to fetch image', { imageId: image.id, status: response.statusText })
            continue // Skip failed images
          }

          const blob = await response.blob()

          // Get filename from URL or use ID
          const filename = this.getFilename(image.url, image.id, i)

          // Add to ZIP
          zip.file(filename, blob)
        } catch (error) {
          logger.shotCreator.warn('Error downloading image [id]', { id: image.id, error: error instanceof Error ? error.message : String(error) })
          // Continue with other images
        }
      }

      // Generate ZIP
      onProgress?.({
        current: total,
        total,
        status: 'zipping'
      })

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      })

      // Create download link and trigger
      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      link.download = fileName
      document.body.appendChild(link)
      link.click()

      // Clean up
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)

      onProgress?.({
        current: total,
        total,
        status: 'complete'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      onProgress?.({
        current: 0,
        total,
        status: 'error',
        error: errorMessage
      })
      throw error
    }
  }

  /**
   * Extract filename from URL or generate from ID
   * @private
   */
  private static getFilename(url: string, id: string, index: number): string {
    try {
      // Try to get filename from URL
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      const segments = pathname.split('/')
      const lastSegment = segments[segments.length - 1]

      // Check if it has a valid extension
      if (lastSegment && /\.(jpg|jpeg|png|webp|gif)$/i.test(lastSegment)) {
        return lastSegment
      }
    } catch (_error) {
      // URL parsing failed, fall through to default
    }

    // Fallback: use image ID or index with .png extension
    const sanitizedId = id.replace(/[^a-zA-Z0-9-_]/g, '_')
    return `image_${sanitizedId || index + 1}.png`
  }
}
