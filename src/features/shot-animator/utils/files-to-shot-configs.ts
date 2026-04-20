import type { ShotAnimationConfig } from '../types'

/**
 * Files above this size are still accepted, but we surface a one-shot toast
 * warning the user that the shot won't survive a page refresh — the store's
 * `partialize` strips `data:` URLs so they don't blow the ~5MB localStorage
 * quota. 3MB is the empirical cutoff where a single shot starts to push the
 * serialized blob over ~4MB once base64 encoding (1.33× inflation) is applied.
 */
export const LARGE_IMAGE_WARNING_BYTES = 3 * 1024 * 1024

/**
 * Convert an array of image Files into ShotAnimationConfig objects.
 *
 * Reads each file as a base64 `data:` URL so shots render immediately without
 * a network round-trip. Stays dumb on purpose — dedup/size checks belong to the
 * caller (e.g. the toolbar warns on oversized files before calling in).
 *
 * Shared by the toolbar upload button, the drop zone, and the clipboard-paste
 * handler so every entry point produces identical shot configs.
 */
export function filesToShotConfigs(files: File[]): Promise<ShotAnimationConfig[]> {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<ShotAnimationConfig>((resolve) => {
          const reader = new FileReader()
          reader.onload = (event) => {
            resolve({
              id: `shot-${Date.now()}-${Math.random()}`,
              imageUrl: event.target?.result as string,
              imageName: file.name,
              prompt: '',
              referenceImages: [],
              includeInBatch: true,
              generatedVideos: [],
            })
          }
          reader.readAsDataURL(file)
        })
    )
  )
}

/**
 * Return the names of files that exceed the persistence-friendly size cap.
 * Callers use this to surface a single pre-ingest warning toast — we warn once
 * per batch rather than per file so a drop of 10 large images doesn't spam the
 * user with 10 toasts.
 */
export function findOversizedFiles(files: File[]): string[] {
  return files.filter((f) => f.size > LARGE_IMAGE_WARNING_BYTES).map((f) => f.name)
}
