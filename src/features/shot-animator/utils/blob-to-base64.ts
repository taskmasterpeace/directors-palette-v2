/**
 * Convert a blob: URL to a base64 data URL.
 *
 * blob: URLs are session-scoped and die on page refresh. Converting to
 * base64 data URLs allows them to be persisted in localStorage via Zustand
 * persist middleware.
 *
 * Regular https: and data: URLs are returned as-is since they already
 * survive serialization.
 */
export async function blobUrlToBase64(url: string): Promise<string> {
  // Only convert blob: URLs; everything else is already persistable
  if (!url.startsWith('blob:')) {
    return url
  }

  const response = await fetch(url)
  const blob = await response.blob()

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('FileReader did not produce a string result'))
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
