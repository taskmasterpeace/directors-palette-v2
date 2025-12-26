import imageCompression from 'browser-image-compression'

export async function compressImage(file: File): Promise<File> {
  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 3,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    })

    // Better formatting for all file sizes
    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes}B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
      return `${(bytes / 1024 / 1024).toFixed(2)}MB`
    }

    console.log(`[Image Compression] ${formatSize(file.size)} → ${formatSize(compressedFile.size)} (${((compressedFile.size / file.size) * 100).toFixed(0)}% of original)`)

    // Log compression details for debugging
    if (compressedFile.size > file.size) {
      console.warn('[Image Compression] Warning: Compressed file is LARGER than original. Using original file.')
      return file  // Don't use compression if it made file bigger
    }

    return compressedFile
  } catch (error) {
    console.error('Compression failed:', error)
    throw new Error('Failed to compress image')
  }
}
