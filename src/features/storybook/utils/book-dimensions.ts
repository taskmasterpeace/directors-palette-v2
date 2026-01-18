/**
 * Book Dimensions Utility
 * Calculates responsive dimensions for book display based on BookFormat type
 */

import { BookFormat } from '../types/storybook.types'

export interface BookDimensions {
  width: number
  height: number
  minWidth: number
  maxWidth: number
  aspectRatio: number
}

export interface ThumbnailDimensions {
  width: number
  height: number
}

/**
 * Calculate book dimensions for HTMLFlipBook component
 * Based on BookFormat aspect ratios from storybook.types.ts
 */
export function calculateBookDimensions(format: BookFormat = 'square'): BookDimensions {
  switch (format) {
    case 'square':
      // 1:1 aspect ratio (8.5" x 8.5")
      return {
        width: 500,
        height: 500,
        minWidth: 300,
        maxWidth: 700,
        aspectRatio: 1,
      }

    case 'landscape':
      // 4:3 aspect ratio (10" x 8")
      return {
        width: 600,
        height: 450,
        minWidth: 400,
        maxWidth: 800,
        aspectRatio: 4 / 3,
      }

    case 'portrait':
      // 3:4 aspect ratio (8" x 10")
      return {
        width: 400,
        height: 533,
        minWidth: 300,
        maxWidth: 600,
        aspectRatio: 3 / 4,
      }

    case 'wide':
      // 16:9 aspect ratio (11" x 6.2")
      return {
        width: 640,
        height: 360,
        minWidth: 480,
        maxWidth: 800,
        aspectRatio: 16 / 9,
      }

    default:
      // Fallback to square
      return calculateBookDimensions('square')
  }
}

/**
 * Calculate thumbnail dimensions that maintain book aspect ratio
 * Used for thumbnail strip at bottom of preview
 */
export function getThumbnailDimensions(format: BookFormat = 'square'): ThumbnailDimensions {
  const dims = calculateBookDimensions(format)
  const baseHeight = 48 // Fixed height for consistency in thumbnail strip

  return {
    width: Math.round(baseHeight * dims.aspectRatio),
    height: baseHeight,
  }
}

/**
 * Get CSS aspect ratio string for container elements
 */
export function getAspectRatioClass(format: BookFormat = 'square'): string {
  switch (format) {
    case 'square':
      return 'aspect-square'
    case 'landscape':
      return 'aspect-[4/3]'
    case 'portrait':
      return 'aspect-[3/4]'
    case 'wide':
      return 'aspect-[16/9]'
    default:
      return 'aspect-square'
  }
}
