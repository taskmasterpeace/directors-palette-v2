export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const GALLERY_IMAGE_MIME_TYPE = 'application/x-gallery-image'

export interface GalleryImageDragPayload {
  url: string
  name: string
  originalPrompt?: string
  imageModel?: string
}
