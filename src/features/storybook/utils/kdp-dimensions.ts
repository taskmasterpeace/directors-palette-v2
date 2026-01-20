/**
 * KDP Dimensions Utility
 * Calculates print-ready dimensions for Amazon KDP children's books
 *
 * References:
 * - https://kdp.amazon.com/en_US/help/topic/G201834180
 * - https://kdp.amazon.com/en_US/help/topic/G201834230
 */

import type { BookFormat, KDPPageCount } from '../types/storybook.types'

// KDP requires 300 DPI for print
export const KDP_DPI = 300

// Bleed margin in inches (KDP requires 0.125")
export const BLEED_INCHES = 0.125

// Safe zone margin in inches (keep important content within)
export const SAFE_ZONE_INCHES = 0.25

// Paper thickness for spine calculation (inches per page)
export const PAPER_THICKNESS = {
  'premium-color': 0.00225, // Premium color paper
  'standard-color': 0.0032, // Standard color paper
  'white-paper': 0.002252, // White paper
  'cream-paper': 0.0025, // Cream paper
} as const

export type PaperType = keyof typeof PAPER_THICKNESS

// Book trim sizes in inches (width x height)
export const KDP_TRIM_SIZES: Record<BookFormat, { width: number; height: number }> = {
  square: { width: 8.5, height: 8.5 },
  landscape: { width: 10, height: 7 }, // Note: width > height for landscape
  portrait: { width: 8, height: 10 },
  wide: { width: 8.25, height: 6 },
}

export interface PDFDimensions {
  // Page dimensions in inches
  trimWidth: number
  trimHeight: number
  bleedWidth: number // trimWidth + (bleed * 2)
  bleedHeight: number // trimHeight + (bleed * 2)
  safeWidth: number // trimWidth - (safeZone * 2)
  safeHeight: number // trimHeight - (safeZone * 2)

  // Page dimensions in pixels at 300 DPI
  trimWidthPx: number
  trimHeightPx: number
  bleedWidthPx: number
  bleedHeightPx: number
  safeWidthPx: number
  safeHeightPx: number

  // Margins in pixels
  bleedPx: number
  safeZonePx: number
}

/**
 * Calculate page dimensions for interior PDF
 */
export function calculatePageDimensions(bookFormat: BookFormat): PDFDimensions {
  const trim = KDP_TRIM_SIZES[bookFormat]

  // Calculate dimensions in inches
  const bleedWidth = trim.width + BLEED_INCHES * 2
  const bleedHeight = trim.height + BLEED_INCHES * 2
  const safeWidth = trim.width - SAFE_ZONE_INCHES * 2
  const safeHeight = trim.height - SAFE_ZONE_INCHES * 2

  // Convert to pixels at 300 DPI
  return {
    trimWidth: trim.width,
    trimHeight: trim.height,
    bleedWidth,
    bleedHeight,
    safeWidth,
    safeHeight,
    trimWidthPx: Math.round(trim.width * KDP_DPI),
    trimHeightPx: Math.round(trim.height * KDP_DPI),
    bleedWidthPx: Math.round(bleedWidth * KDP_DPI),
    bleedHeightPx: Math.round(bleedHeight * KDP_DPI),
    safeWidthPx: Math.round(safeWidth * KDP_DPI),
    safeHeightPx: Math.round(safeHeight * KDP_DPI),
    bleedPx: Math.round(BLEED_INCHES * KDP_DPI),
    safeZonePx: Math.round(SAFE_ZONE_INCHES * KDP_DPI),
  }
}

export interface CoverDimensions {
  // Cover components in inches
  frontWidth: number
  backWidth: number
  spineWidth: number
  wrapHeight: number

  // Total wrap dimensions
  totalWrapWidth: number // backWidth + spineWidth + frontWidth + (bleed * 2)
  totalWrapHeight: number // wrapHeight + (bleed * 2)

  // Barcode safe area (bottom-left of back cover)
  barcodeArea: {
    x: number // From left edge of back cover
    y: number // From bottom edge
    width: number
    height: number
  }

  // Pixel dimensions at 300 DPI
  totalWrapWidthPx: number
  totalWrapHeightPx: number
  spineWidthPx: number
  bleedPx: number
}

/**
 * Calculate spine width based on page count and paper type
 */
export function calculateSpineWidth(
  pageCount: KDPPageCount | number,
  paperType: PaperType = 'premium-color'
): number {
  return pageCount * PAPER_THICKNESS[paperType]
}

/**
 * Check if book qualifies for spine text (minimum 79 pages for KDP)
 */
export function canHaveSpineText(pageCount: number): boolean {
  return pageCount >= 79
}

/**
 * Calculate cover wrap dimensions
 */
export function calculateCoverDimensions(
  bookFormat: BookFormat,
  pageCount: KDPPageCount | number,
  paperType: PaperType = 'premium-color'
): CoverDimensions {
  const trim = KDP_TRIM_SIZES[bookFormat]
  const spineWidth = calculateSpineWidth(pageCount, paperType)

  // Cover uses trim size (same as interior pages)
  const frontWidth = trim.width
  const backWidth = trim.width
  const wrapHeight = trim.height

  // Total width: back + spine + front + bleed on outer edges
  const totalWrapWidth = backWidth + spineWidth + frontWidth + BLEED_INCHES * 2
  const totalWrapHeight = wrapHeight + BLEED_INCHES * 2

  // Barcode area: 2" x 1.2" minimum, positioned 0.25" from trim edges
  const barcodeArea = {
    x: 0.25, // 0.25" from left edge of back cover
    y: 0.25, // 0.25" from bottom edge
    width: 2,
    height: 1.2,
  }

  return {
    frontWidth,
    backWidth,
    spineWidth,
    wrapHeight,
    totalWrapWidth,
    totalWrapHeight,
    barcodeArea,
    totalWrapWidthPx: Math.round(totalWrapWidth * KDP_DPI),
    totalWrapHeightPx: Math.round(totalWrapHeight * KDP_DPI),
    spineWidthPx: Math.round(spineWidth * KDP_DPI),
    bleedPx: Math.round(BLEED_INCHES * KDP_DPI),
  }
}

/**
 * Convert inches to pixels at KDP resolution
 */
export function inchesToPixels(inches: number): number {
  return Math.round(inches * KDP_DPI)
}

/**
 * Convert pixels to inches at KDP resolution
 */
export function pixelsToInches(pixels: number): number {
  return pixels / KDP_DPI
}

/**
 * Get required image resolution for KDP
 */
export function getRequiredImageResolution(bookFormat: BookFormat): {
  width: number
  height: number
  description: string
} {
  const dims = calculatePageDimensions(bookFormat)
  return {
    width: dims.bleedWidthPx,
    height: dims.bleedHeightPx,
    description: `${dims.bleedWidthPx} x ${dims.bleedHeightPx} pixels at ${KDP_DPI} DPI`,
  }
}

/**
 * Get recommended aspect ratio for book format
 */
export function getAspectRatioForFormat(bookFormat: BookFormat): string {
  const trim = KDP_TRIM_SIZES[bookFormat]
  // Simplify the ratio
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const divisor = gcd(trim.width * 100, trim.height * 100)
  const w = (trim.width * 100) / divisor
  const h = (trim.height * 100) / divisor
  return `${w}:${h}`
}

/**
 * Check if image dimensions meet KDP requirements
 */
export function validateImageDimensions(
  widthPx: number,
  heightPx: number,
  bookFormat: BookFormat,
  includeBleed: boolean = true
): { valid: boolean; message: string } {
  const dims = calculatePageDimensions(bookFormat)
  const requiredWidth = includeBleed ? dims.bleedWidthPx : dims.trimWidthPx
  const requiredHeight = includeBleed ? dims.bleedHeightPx : dims.trimHeightPx

  if (widthPx < requiredWidth || heightPx < requiredHeight) {
    return {
      valid: false,
      message: `Image too small. Required: ${requiredWidth}x${requiredHeight}px, Got: ${widthPx}x${heightPx}px`,
    }
  }

  return { valid: true, message: 'Image meets KDP requirements' }
}
