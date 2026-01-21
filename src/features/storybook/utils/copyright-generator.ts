/**
 * Copyright Page Text Generator
 *
 * Generates standard copyright page text for children's books.
 * The user fills in their details, we format it properly.
 */

export interface CopyrightInfo {
  authorName: string
  year?: number
  publisherName?: string
  publisherCity?: string
  isbn?: string
  illustratorName?: string
  editionNumber?: number
  countryPrinted?: string
  website?: string
  additionalCredits?: string
}

/**
 * Generate copyright page text from user inputs
 */
export function generateCopyrightText(info: CopyrightInfo): string {
  const year = info.year || new Date().getFullYear()
  const lines: string[] = []

  // Copyright notice
  lines.push(`© ${year} ${info.authorName}`)
  lines.push('All rights reserved.')
  lines.push('')

  // Illustrator credit (if different from author)
  if (info.illustratorName && info.illustratorName !== info.authorName) {
    lines.push(`Illustrations © ${year} ${info.illustratorName}`)
    lines.push('')
  }

  // ISBN
  if (info.isbn) {
    lines.push(`ISBN: ${info.isbn}`)
    lines.push('')
  }

  // Publisher info
  if (info.publisherName) {
    lines.push(`Published by ${info.publisherName}`)
    if (info.publisherCity) {
      lines.push(info.publisherCity)
    }
    lines.push('')
  }

  // Website
  if (info.website) {
    lines.push(info.website)
    lines.push('')
  }

  // Edition
  if (info.editionNumber) {
    const ordinal = getOrdinal(info.editionNumber)
    lines.push(`${ordinal} Edition`)
    lines.push('')
  } else {
    lines.push('First Edition')
    lines.push('')
  }

  // Country printed
  lines.push(`Printed in ${info.countryPrinted || 'the United States of America'}`)

  // Additional credits
  if (info.additionalCredits) {
    lines.push('')
    lines.push(info.additionalCredits)
  }

  // Legal disclaimer
  lines.push('')
  lines.push('No part of this publication may be reproduced, stored in a')
  lines.push('retrieval system, or transmitted in any form or by any means,')
  lines.push('electronic, mechanical, photocopying, recording, or otherwise,')
  lines.push('without written permission of the publisher.')

  return lines.join('\n')
}

/**
 * Generate minimal copyright text (for space-constrained layouts)
 */
export function generateMinimalCopyrightText(info: CopyrightInfo): string {
  const year = info.year || new Date().getFullYear()
  const lines: string[] = []

  lines.push(`© ${year} ${info.authorName}`)
  lines.push('All rights reserved.')

  if (info.isbn) {
    lines.push(`ISBN: ${info.isbn}`)
  }

  if (info.publisherName) {
    lines.push(`Published by ${info.publisherName}`)
  }

  return lines.join(' | ')
}

/**
 * Get ordinal suffix for edition numbers
 */
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/**
 * Amazon KDP Links for finishing the book
 */
export const KDP_LINKS = {
  // Main KDP portal
  dashboard: 'https://kdp.amazon.com/',

  // Cover Creator tool
  coverCreator: 'https://kdp.amazon.com/en_US/help/topic/G201113520',

  // Cover calculator (for dimensions)
  coverCalculator: 'https://kdp.amazon.com/cover-calculator',

  // Paperback formatting guide
  paperbackFormatting: 'https://kdp.amazon.com/en_US/help/topic/G201834190',

  // Submission guidelines
  submissionGuidelines: 'https://kdp.amazon.com/en_US/help/topic/G201857950',

  // Manuscript templates
  manuscriptTemplates: 'https://kdp.amazon.com/en_US/help/topic/G201834230',

  // Print previewer info
  printPreviewer: 'https://kdp.amazon.com/en_US/help/topic/G201834230',

  // ISBN info
  isbnInfo: 'https://kdp.amazon.com/en_US/help/topic/G201834170',
}

/**
 * Get helpful KDP link based on current task
 */
export function getKDPHelpLink(task: 'cover' | 'interior' | 'publish' | 'isbn'): string {
  switch (task) {
    case 'cover':
      return KDP_LINKS.coverCreator
    case 'interior':
      return KDP_LINKS.paperbackFormatting
    case 'publish':
      return KDP_LINKS.submissionGuidelines
    case 'isbn':
      return KDP_LINKS.isbnInfo
    default:
      return KDP_LINKS.dashboard
  }
}
