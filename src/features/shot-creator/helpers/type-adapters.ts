import { ShotCreatorReferenceImage } from '../types/shot-creator.types'
import { LibraryImageReference, Category } from '../types/library.types'

/**
 * Converts ShotCreatorReferenceImage to LibraryImageReference for fullscreen display
 *
 * This adapter enables reference images to be displayed in the unified fullscreen modal
 * which expects LibraryImageReference type.
 */
export function shotImageToLibraryReference(
  image: ShotCreatorReferenceImage
): LibraryImageReference {
  return {
    id: image.id,
    imageData: image.preview, // Use preview as imageData
    preview: image.preview,   // Also set preview for fallback
    tags: image.tags,
    category: 'Reference Images' as Category, // Default category for reference images
    source: image.file ? 'uploaded' : 'generated',
    createdAt: new Date(),
    prompt: undefined, // Reference images don't have generation prompts
  }
}
