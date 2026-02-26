import imageCompression from 'browser-image-compression'
import { createLogger } from '@/lib/logger'


const log = createLogger('Utils')
export async function compressImage(file: File): Promise<File> {
  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 3,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    })

    log.info('Image compressed', { originalSize: file.size, compressedSize: compressedFile.size, ratio: `${((compressedFile.size / file.size) * 100).toFixed(0)}%` })

    // Log compression details for debugging
    if (compressedFile.size > file.size) {
      log.warn('[Image Compression] Warning: Compressed file is LARGER than original. Using original file.')
      return file  // Don't use compression if it made file bigger
    }

    return compressedFile
  } catch (error) {
    log.error('Compression failed', { error: error instanceof Error ? error.message : String(error) })
    throw new Error('Failed to compress image')
  }
}
