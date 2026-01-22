/**
 * KDP Page Count Validator
 * Validates and calculates page counts for Amazon KDP compliance
 */

import type { StorybookProject } from '../types/storybook.types'

export interface KDPPageBreakdownItem {
  name: string
  count: number
}

export interface KDPPageBreakdown {
  frontMatter: {
    total: number
    items: KDPPageBreakdownItem[]
  }
  storyPages: {
    total: number
    beats: number
  }
  backMatter: {
    total: number
    items: KDPPageBreakdownItem[]
  }
  grandTotal: number
  isKDPReady: boolean
  kdpMinimum: number
  shortfall: number
}

/**
 * Calculate the complete page breakdown for a storybook project
 */
export function calculateKDPPageBreakdown(project: StorybookProject): KDPPageBreakdown {
  // Front matter calculation
  const frontMatterItems: KDPPageBreakdownItem[] = []

  if (project.includeFrontMatter !== false) {
    frontMatterItems.push({ name: 'Half Title', count: 1 })
    frontMatterItems.push({ name: 'Blank', count: 1 })
    frontMatterItems.push({ name: 'Title Page', count: 1 })
    frontMatterItems.push({ name: 'Copyright', count: 1 })

    if (project.dedicationText) {
      frontMatterItems.push({ name: 'Dedication', count: 1 })
      frontMatterItems.push({ name: 'Blank', count: 1 })
    }
  }

  const frontMatterTotal = frontMatterItems.reduce((sum, item) => sum + item.count, 0)

  // Story pages calculation
  // Each beat/spread creates 2 physical pages
  const beatCount = project.beats?.length || 0
  const pageArrayCount = project.pages?.length || 0
  const spreadCount = project.spreads?.length || 0

  // Use the most accurate count available
  let storyPageTotal = 0
  let beatsUsed = 0

  if (spreadCount > 0) {
    // New architecture: each spread = 2 pages
    storyPageTotal = spreadCount * 2
    beatsUsed = spreadCount
  } else if (beatCount > 0) {
    // Beats without spreads yet
    storyPageTotal = beatCount * 2
    beatsUsed = beatCount
  } else if (pageArrayCount > 0) {
    // Legacy: direct page count
    storyPageTotal = pageArrayCount
    beatsUsed = Math.ceil(pageArrayCount / 2)
  } else if (project.pageCount) {
    // Configured page count
    storyPageTotal = project.pageCount
    beatsUsed = Math.ceil(project.pageCount / 2)
  }

  // Back matter calculation
  const backMatterItems: KDPPageBreakdownItem[] = []

  if (project.includeBackMatter !== false) {
    backMatterItems.push({ name: 'The End', count: 1 })

    if (project.aboutAuthorText) {
      backMatterItems.push({ name: 'About Author', count: 1 })
    }
  }

  const backMatterTotal = backMatterItems.reduce((sum, item) => sum + item.count, 0)

  // Calculate totals
  const grandTotal = frontMatterTotal + storyPageTotal + backMatterTotal
  const kdpMinimum = 24
  const isKDPReady = grandTotal >= kdpMinimum
  const shortfall = Math.max(0, kdpMinimum - grandTotal)

  return {
    frontMatter: {
      total: frontMatterTotal,
      items: frontMatterItems,
    },
    storyPages: {
      total: storyPageTotal,
      beats: beatsUsed,
    },
    backMatter: {
      total: backMatterTotal,
      items: backMatterItems,
    },
    grandTotal,
    isKDPReady,
    kdpMinimum,
    shortfall,
  }
}

/**
 * Get a recommended action if not KDP ready
 */
export function getKDPRecommendation(breakdown: KDPPageBreakdown): string | null {
  if (breakdown.isKDPReady) {
    return null
  }

  const pagesNeeded = breakdown.shortfall
  const beatsNeeded = Math.ceil(pagesNeeded / 2)

  if (pagesNeeded <= 2) {
    return `Add ${beatsNeeded} more story beat to meet the KDP minimum of ${breakdown.kdpMinimum} pages.`
  }

  return `Add ${beatsNeeded} more story beats (${pagesNeeded} pages) to meet the KDP minimum of ${breakdown.kdpMinimum} pages.`
}

/**
 * Format page count for display (e.g., "32 pages")
 */
export function formatPageCount(count: number): string {
  return count === 1 ? '1 page' : `${count} pages`
}
