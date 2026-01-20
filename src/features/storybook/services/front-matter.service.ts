/**
 * Front Matter Service
 * Generates front matter pages for KDP-compliant children's books
 *
 * Front matter structure:
 * Page 1: Half-title (book title only)
 * Page 2: Blank or Frontispiece
 * Page 3: Title page (full title, author, illustrator)
 * Page 4: Copyright page
 * Page 5: Dedication page
 * Page 6: Blank
 */

import { v4 as uuidv4 } from 'uuid'
import type { StorybookPage, PageType, KDPPageCount, StorybookProject } from '../types/storybook.types'
import { KDP_PAGE_COUNTS } from '../types/storybook.types'

export interface FrontMatterConfig {
  title: string
  author?: string
  illustrator?: string
  dedicationText?: string
  copyrightYear?: number
  publisherName?: string
  isbnPlaceholder?: string
  includeFrontispiece?: boolean
  frontispieceImageUrl?: string
}

/**
 * Generate default copyright text
 */
function generateCopyrightText(config: FrontMatterConfig): string {
  const year = config.copyrightYear || new Date().getFullYear()
  const author = config.author || 'Author Name'
  const publisher = config.publisherName || 'Self-Published'

  return `Copyright © ${year} ${author}

All rights reserved. No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher.

${config.isbnPlaceholder || 'ISBN: [To be assigned]'}

Published by ${publisher}

First Edition`
}

/**
 * Generate front matter pages for a storybook project
 */
export function generateFrontMatterPages(config: FrontMatterConfig): StorybookPage[] {
  const pages: StorybookPage[] = []

  // Page 1: Half-title
  pages.push({
    id: uuidv4(),
    pageNumber: 1,
    text: config.title,
    textPosition: 'none',
    pageType: 'half-title',
    isFrontMatter: true,
    physicalPageNumbers: [1],
    layout: 'text-only',
  })

  // Page 2: Frontispiece or Blank
  if (config.includeFrontispiece && config.frontispieceImageUrl) {
    pages.push({
      id: uuidv4(),
      pageNumber: 2,
      text: '',
      textPosition: 'none',
      pageType: 'frontispiece',
      isFrontMatter: true,
      physicalPageNumbers: [2],
      layout: 'image-only',
      imageUrl: config.frontispieceImageUrl,
    })
  } else {
    pages.push({
      id: uuidv4(),
      pageNumber: 2,
      text: '',
      textPosition: 'none',
      pageType: 'blank',
      isFrontMatter: true,
      physicalPageNumbers: [2],
      layout: 'text-only',
    })
  }

  // Page 3: Title Page
  const illustratorLine = config.illustrator
    ? `\n\nIllustrated by ${config.illustrator}`
    : ''
  const authorLine = config.author ? `\n\nBy ${config.author}` : ''

  pages.push({
    id: uuidv4(),
    pageNumber: 3,
    text: `${config.title}${authorLine}${illustratorLine}`,
    textPosition: 'none',
    pageType: 'title-page',
    isFrontMatter: true,
    physicalPageNumbers: [3],
    layout: 'text-only',
  })

  // Page 4: Copyright Page
  pages.push({
    id: uuidv4(),
    pageNumber: 4,
    text: generateCopyrightText(config),
    textPosition: 'none',
    pageType: 'copyright',
    isFrontMatter: true,
    physicalPageNumbers: [4],
    layout: 'text-only',
  })

  // Page 5: Dedication Page
  if (config.dedicationText) {
    pages.push({
      id: uuidv4(),
      pageNumber: 5,
      text: config.dedicationText,
      textPosition: 'none',
      pageType: 'dedication',
      isFrontMatter: true,
      physicalPageNumbers: [5],
      layout: 'text-only',
    })
  } else {
    pages.push({
      id: uuidv4(),
      pageNumber: 5,
      text: '',
      textPosition: 'none',
      pageType: 'blank',
      isFrontMatter: true,
      physicalPageNumbers: [5],
      layout: 'text-only',
    })
  }

  // Page 6: Blank
  pages.push({
    id: uuidv4(),
    pageNumber: 6,
    text: '',
    textPosition: 'none',
    pageType: 'blank',
    isFrontMatter: true,
    physicalPageNumbers: [6],
    layout: 'text-only',
  })

  return pages
}

/**
 * Generate back matter pages for a storybook project
 */
export function generateBackMatterPages(
  startingPage: number,
  config: {
    includeTheEnd?: boolean
    includeAboutAuthor?: boolean
    aboutAuthorText?: string
    authorPhotoUrl?: string
    includeOtherBooks?: boolean
    otherBooksText?: string
  }
): StorybookPage[] {
  const pages: StorybookPage[] = []
  let currentPage = startingPage

  // The End page
  if (config.includeTheEnd !== false) {
    pages.push({
      id: uuidv4(),
      pageNumber: currentPage,
      text: 'The End',
      textPosition: 'bottom',
      pageType: 'the-end',
      isBackMatter: true,
      physicalPageNumbers: [currentPage],
      layout: 'image-with-text',
    })
    currentPage++
  }

  // About the Author page
  if (config.includeAboutAuthor && config.aboutAuthorText) {
    pages.push({
      id: uuidv4(),
      pageNumber: currentPage,
      text: config.aboutAuthorText,
      textPosition: 'none',
      pageType: 'about-author',
      isBackMatter: true,
      physicalPageNumbers: [currentPage],
      layout: 'text-only',
      imageUrl: config.authorPhotoUrl,
    })
    currentPage++
  }

  // Other Books page
  if (config.includeOtherBooks && config.otherBooksText) {
    pages.push({
      id: uuidv4(),
      pageNumber: currentPage,
      text: config.otherBooksText,
      textPosition: 'none',
      pageType: 'other-books',
      isBackMatter: true,
      physicalPageNumbers: [currentPage],
      layout: 'text-only',
    })
    currentPage++
  }

  return pages
}

/**
 * Calculate how many story pages fit in a KDP book
 */
export function calculateStoryPageCount(kdpPageCount: KDPPageCount): {
  totalPages: number
  frontMatterPages: number
  storyPages: number
  backMatterPages: number
  storyStartPage: number
  storyEndPage: number
} {
  const config = KDP_PAGE_COUNTS.find((c) => c.count === kdpPageCount)
  if (!config) {
    // Default to 32 pages
    return {
      totalPages: 32,
      frontMatterPages: 6,
      storyPages: 24,
      backMatterPages: 2,
      storyStartPage: 7,
      storyEndPage: 30,
    }
  }

  return {
    totalPages: config.count,
    frontMatterPages: config.frontMatterPages,
    storyPages: config.storyPages,
    backMatterPages: config.backMatterPages,
    storyStartPage: config.frontMatterPages + 1,
    storyEndPage: config.count - config.backMatterPages,
  }
}

/**
 * Convert existing story pages to KDP-compliant page numbers
 * Story pages start after front matter (usually page 7)
 */
export function assignPhysicalPageNumbers(
  storyPages: StorybookPage[],
  startingPage: number = 7
): StorybookPage[] {
  let currentPhysicalPage = startingPage

  return storyPages.map((page, index) => {
    const updatedPage = {
      ...page,
      pageNumber: index + 1, // Logical page number (1, 2, 3...)
      physicalPageNumbers: [currentPhysicalPage],
      pageType: page.isSpread ? 'story-spread' as PageType : 'story-single' as PageType,
    }

    // Spreads take 2 physical pages
    if (page.isSpread) {
      updatedPage.physicalPageNumbers = [currentPhysicalPage, currentPhysicalPage + 1]
      currentPhysicalPage += 2
    } else {
      currentPhysicalPage += 1
    }

    return updatedPage
  })
}

/**
 * Merge front matter, story pages, and back matter into a complete book
 */
export function assembleCompleteBook(
  project: StorybookProject,
  options: {
    includeFrontMatter?: boolean
    includeBackMatter?: boolean
  } = {}
): StorybookPage[] {
  const { includeFrontMatter = true, includeBackMatter = true } = options
  const allPages: StorybookPage[] = []

  // Add front matter
  if (includeFrontMatter) {
    const frontMatter = generateFrontMatterPages({
      title: project.title,
      author: project.author,
      dedicationText: project.dedicationText,
      copyrightYear: project.copyrightYear,
      publisherName: project.publisherName,
      isbnPlaceholder: project.isbnPlaceholder,
    })
    allPages.push(...frontMatter)
  }

  // Add story pages with proper page numbers
  const storyStartPage = includeFrontMatter ? 7 : 1
  const storyPages = assignPhysicalPageNumbers(project.pages, storyStartPage)
  allPages.push(...storyPages)

  // Add back matter
  if (includeBackMatter) {
    const lastStoryPage = storyPages[storyPages.length - 1]
    const lastPhysicalPage = lastStoryPage?.physicalPageNumbers?.[
      lastStoryPage.physicalPageNumbers.length - 1
    ] || storyStartPage + storyPages.length

    const backMatter = generateBackMatterPages(lastPhysicalPage + 1, {
      includeTheEnd: true,
      includeAboutAuthor: !!project.aboutAuthorText,
      aboutAuthorText: project.aboutAuthorText,
      authorPhotoUrl: project.authorPhotoUrl,
    })
    allPages.push(...backMatter)
  }

  return allPages
}

/**
 * Get page type display info for UI
 */
export function getPageTypeDisplay(pageType: PageType): {
  icon: string
  label: string
  color: string
} {
  const displays: Record<PageType, { icon: string; label: string; color: string }> = {
    'half-title': { icon: '📖', label: 'Half Title', color: 'text-blue-400' },
    'frontispiece': { icon: '🖼️', label: 'Frontispiece', color: 'text-purple-400' },
    'title-page': { icon: '📕', label: 'Title Page', color: 'text-blue-400' },
    'copyright': { icon: '©', label: 'Copyright', color: 'text-gray-400' },
    'dedication': { icon: '💝', label: 'Dedication', color: 'text-pink-400' },
    'blank': { icon: '⬜', label: 'Blank', color: 'text-gray-500' },
    'story-single': { icon: '📄', label: 'Story Page', color: 'text-amber-400' },
    'story-spread': { icon: '📰', label: 'Two-Page Spread', color: 'text-amber-500' },
    'the-end': { icon: '🔚', label: 'The End', color: 'text-green-400' },
    'about-author': { icon: '👤', label: 'About Author', color: 'text-cyan-400' },
    'other-books': { icon: '📚', label: 'Other Books', color: 'text-indigo-400' },
  }

  return displays[pageType] || { icon: '📄', label: 'Page', color: 'text-white' }
}
