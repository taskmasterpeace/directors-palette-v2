import imageCompression from 'browser-image-compression'

export async function compressImage(file: File): Promise<File> {
  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 3,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    })
    console.log(`Compressed: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB`)
    return compressedFile
  } catch (error) {
    console.error('Compression failed:', error)
    throw new Error('Failed to compress image')
  }
}
