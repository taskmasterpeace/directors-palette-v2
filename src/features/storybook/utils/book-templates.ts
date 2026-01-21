/**
 * Book Templates for Storybook Generation
 *
 * Defines supported book formats for KDP publishing with exact nano-banana aspect ratio matches.
 * Only Square and Portrait formats are supported because they have perfect matches
 * with nano-banana-pro's supported ratios.
 *
 * IMPORTANT: Landscape and Wide formats are NOT supported because their aspect ratios
 * don't have exact matches in nano-banana-pro, which would require cropping.
 *
 * nano-banana-pro supported ratios:
 * ✅ 1:1, 4:5, 5:4, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 21:9, match_input_image
 */

import type { BookFormat } from '../types/storybook.types'

/**
 * Supported book formats for KDP publishing
 * Only formats with exact nano-banana ratio matches
 */
export type SupportedBookFormat = 'square' | 'portrait'

/**
 * Check if a book format is supported for KDP export
 */
export function isSupportedFormat(format: BookFormat): format is SupportedBookFormat {
  return format === 'square' || format === 'portrait'
}

/**
 * Book template configuration
 * Defines how images should be generated for each format
 */
export interface BookTemplate {
  format: SupportedBookFormat
  name: string
  description: string
  trimSize: { width: number; height: number }  // inches
  singlePageRatio: string       // exact nano-banana ratio for single pages
  spreadBlendRatio: string      // ratio to generate blend at (if blending spreads)
  spreadCropRatio: string       // ratio to crop blended spread to
  kdpPrintDPI: number
  wordsPerBeat: { min: number; max: number }  // Recommended words per story beat
  bestFor: string[]             // Use cases
}

/**
 * Predefined book templates for supported formats
 */
export const BOOK_TEMPLATES: Record<SupportedBookFormat, BookTemplate> = {
  square: {
    format: 'square',
    name: 'Square (8.5" × 8.5")',
    description: 'Classic picture book format, most popular on Amazon KDP',
    trimSize: { width: 8.5, height: 8.5 },
    singlePageRatio: '1:1',     // ✅ Perfect nano-banana match
    spreadBlendRatio: '21:9',   // For optional spread blending (widest available)
    spreadCropRatio: '2:1',     // Crop blended spread to exact 2:1 for two square pages
    kdpPrintDPI: 300,
    wordsPerBeat: { min: 20, max: 50 },
    bestFor: ['Bedtime stories', 'Character-focused tales', 'Board books'],
  },
  portrait: {
    format: 'portrait',
    name: 'Portrait (8" × 10")',
    description: 'Traditional picture book format, elegant vertical layout',
    trimSize: { width: 8, height: 10 },
    singlePageRatio: '4:5',     // ✅ Perfect nano-banana match
    spreadBlendRatio: '16:9',   // For optional spread blending
    spreadCropRatio: '8:5',     // Crop to exact 8:5 for two portrait pages
    kdpPrintDPI: 300,
    wordsPerBeat: { min: 30, max: 70 },
    bestFor: ['Fairy tales', 'Adventure stories', 'Educational books'],
  },
}

/**
 * Get template for a book format
 * Returns undefined for unsupported formats
 */
export function getBookTemplate(format: BookFormat): BookTemplate | undefined {
  if (isSupportedFormat(format)) {
    return BOOK_TEMPLATES[format]
  }
  return undefined
}

/**
 * Get generation aspect ratio for single page images
 */
export function getSinglePageAspectRatio(format: BookFormat): string {
  const template = getBookTemplate(format)
  if (template) {
    return template.singlePageRatio
  }
  // Fallback to 1:1 for unsupported formats
  return '1:1'
}

/**
 * Get generation aspect ratio for spread images
 * Spreads are 2 pages side by side
 *
 * For Square: Two 1:1 pages = 2:1 spread
 * For Portrait: Two 4:5 pages = 8:5 spread
 */
export function getSpreadAspectRatio(format: BookFormat): string {
  switch (format) {
    case 'square':
      return '2:1'      // Two 1:1 pages side by side
    case 'portrait':
      return '8:5'      // Two 4:5 pages side by side (8:10 simplified)
    default:
      return '2:1'      // Fallback
  }
}

/**
 * Nearest supported nano-banana ratio for spread generation
 *
 * Since nano-banana doesn't have exact 2:1 or 8:5, we generate
 * at the closest available ratio and crop.
 *
 * Supported: 21:9 (2.33:1), 16:9 (1.78:1)
 */
export function getNearestSpreadGenerationRatio(format: BookFormat): string {
  const template = getBookTemplate(format)
  if (template) {
    return template.spreadBlendRatio
  }
  return '21:9'
}

/**
 * Calculate how many story beats for a given page count
 * Formula: beats = pageCount / 2 (one beat per spread)
 */
export function calculateBeatsFromPageCount(pageCount: number): number {
  return Math.floor(pageCount / 2)
}

/**
 * Calculate page count from story beats
 * Formula: pageCount = beats * 2
 */
export function calculatePageCountFromBeats(beats: number): number {
  return beats * 2
}

/**
 * Page count configurations for different book lengths
 * These are KDP-compliant page counts
 */
export interface PageCountConfig {
  pageCount: number
  beats: number
  name: string
  description: string
  frontMatterPages: number
  storyPages: number
  backMatterPages: number
  recommendedFor: string
}

export const PAGE_COUNT_CONFIGS: PageCountConfig[] = [
  {
    pageCount: 12,
    beats: 6,
    name: '12 Pages (Quick Story)',
    description: 'Perfect for very young readers or simple concepts',
    frontMatterPages: 0,  // No front matter for short books
    storyPages: 12,
    backMatterPages: 0,
    recommendedFor: 'Ages 2-3, concept books, board books',
  },
  {
    pageCount: 24,
    beats: 12,
    name: '24 Pages (KDP Minimum)',
    description: 'Amazon KDP minimum, standard picture book length',
    frontMatterPages: 6,
    storyPages: 16,
    backMatterPages: 2,
    recommendedFor: 'Ages 3-5, most picture books',
  },
  {
    pageCount: 28,
    beats: 14,
    name: '28 Pages (Standard)',
    description: 'Traditional picture book with room to breathe',
    frontMatterPages: 6,
    storyPages: 20,
    backMatterPages: 2,
    recommendedFor: 'Ages 4-6, story-driven picture books',
  },
  {
    pageCount: 32,
    beats: 16,
    name: '32 Pages (Most Common)',
    description: 'Industry standard, perfect for rich storytelling',
    frontMatterPages: 6,
    storyPages: 24,
    backMatterPages: 2,
    recommendedFor: 'Ages 5-8, complex narratives, educational books',
  },
]

/**
 * Get page count configuration by page count
 */
export function getPageCountConfig(pageCount: number): PageCountConfig | undefined {
  return PAGE_COUNT_CONFIGS.find(config => config.pageCount === pageCount)
}

/**
 * Calculate the number of story beats needed given:
 * - Total page count
 * - Number of front matter pages
 * - Number of back matter pages
 */
export function calculateStoryBeats(
  totalPageCount: number,
  frontMatterPages: number = 0,
  backMatterPages: number = 0
): number {
  const storyPages = totalPageCount - frontMatterPages - backMatterPages
  return Math.floor(storyPages / 2)
}

/**
 * Generate spread numbers and page mappings
 * Returns array of { spreadNumber, leftPageNumber, rightPageNumber }
 */
export function generateSpreadMappings(
  totalStoryBeats: number,
  firstStoryPageNumber: number = 1
): Array<{ spreadNumber: number; leftPageNumber: number; rightPageNumber: number }> {
  return Array.from({ length: totalStoryBeats }, (_, index) => {
    const spreadNumber = index + 1
    const leftPageNumber = firstStoryPageNumber + index * 2
    const rightPageNumber = leftPageNumber + 1
    return { spreadNumber, leftPageNumber, rightPageNumber }
  })
}

/**
 * Validate that a format is supported for generation
 * Throws an error with helpful message for unsupported formats
 */
export function validateSupportedFormat(format: BookFormat): SupportedBookFormat {
  if (isSupportedFormat(format)) {
    return format
  }
  throw new Error(
    `Book format "${format}" is not supported for KDP export. ` +
    `Supported formats: Square (8.5"×8.5") and Portrait (8"×10"). ` +
    `These formats have exact matches with nano-banana-pro's supported aspect ratios.`
  )
}
