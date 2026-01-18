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
 * Based on Amazon KDP-compliant trim sizes for children's books
 *
 * KDP Reference: https://kdp.amazon.com/en_US/help/topic/G201834180
 */
export function calculateBookDimensions(format: BookFormat = 'square'): BookDimensions {
  switch (format) {
    case 'square':
      // 1:1 aspect ratio - KDP: 8.5" x 8.5" (most popular for children's books)
      // Updated for modern viewport - much larger for better screen utilization
      return {
        width: 900,
        height: 900,
        minWidth: 500,
        maxWidth: 1400,
        aspectRatio: 1,
      }

    case 'landscape':
      // 7:10 aspect ratio - KDP: 7" x 10" landscape
      return {
        width: 900,
        height: 1286, // 900 * (10/7)
        minWidth: 500,
        maxWidth: 1200,
        aspectRatio: 7 / 10,
      }

    case 'portrait':
      // 4:5 aspect ratio - KDP: 8" x 10" portrait (traditional picture book)
      return {
        width: 800,
        height: 1000, // 800 * (10/8)
        minWidth: 450,
        maxWidth: 1100,
        aspectRatio: 4 / 5,
      }

    case 'wide':
      // 11:8 aspect ratio - KDP: 8.25" x 6" landscape (panoramic)
      return {
        width: 1100,
        height: 800, // 1100 * (6/8.25) ≈ 800
        minWidth: 600,
        maxWidth: 1500,
        aspectRatio: 11 / 8,
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
 * Matches KDP trim size aspect ratios
 */
export function getAspectRatioClass(format: BookFormat = 'square'): string {
  switch (format) {
    case 'square':
      return 'aspect-square' // 1:1 (8.5" x 8.5")
    case 'landscape':
      return 'aspect-[7/10]' // 7:10 (7" x 10")
    case 'portrait':
      return 'aspect-[4/5]' // 4:5 (8" x 10")
    case 'wide':
      return 'aspect-[11/8]' // 11:8 (8.25" x 6")
    default:
      return 'aspect-square'
  }
}
