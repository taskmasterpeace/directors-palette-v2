/**
 * PDF Export Service
 * Generates print-ready PDFs for Amazon KDP
 *
 * Features:
 * - Interior PDF with bleed margins
 * - Cover wrap PDF with spine
 * - 300 DPI for print quality
 * - Embedded fonts
 * - RGB or CMYK color space
 */

import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib'
import type { StorybookProject, BookFormat, KDPPageCount } from '../types/storybook.types'
import {
  calculatePageDimensions,
  calculateCoverDimensions,
  KDP_DPI,
  inchesToPixels,
  type PaperType,
} from '../utils/kdp-dimensions'
import { generateCopyrightText, type CopyrightInfo } from '../utils/copyright-generator'

export interface PDFExportOptions {
  includeBleed: boolean
  colorSpace: 'rgb' | 'cmyk'
  embedFonts: boolean
  quality: 'draft' | 'print' // draft = lower quality for preview
}

const DEFAULT_OPTIONS: PDFExportOptions = {
  includeBleed: true,
  colorSpace: 'rgb', // KDP accepts RGB
  embedFonts: true,
  quality: 'print',
}

/**
 * Fetch image as bytes
 */
async function fetchImageBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${url}`)
  }
  const arrayBuffer = await response.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}

/**
 * Detect image type from URL or bytes
 */
function detectImageType(url: string, bytes: Uint8Array): 'png' | 'jpg' {
  // Check magic bytes first
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png'
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return 'jpg'
  }

  // Fallback to URL extension
  const lowerUrl = url.toLowerCase()
  if (lowerUrl.includes('.png') || lowerUrl.includes('format=png')) {
    return 'png'
  }
  return 'jpg'
}

/**
 * Generate interior PDF for KDP
 */
export async function generateInteriorPDF(
  project: StorybookProject,
  options: Partial<PDFExportOptions> = {}
): Promise<Uint8Array> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const dims = calculatePageDimensions(project.bookFormat)

  // Use bleed dimensions for full-bleed printing
  const pageWidth = opts.includeBleed ? dims.bleedWidth : dims.trimWidth
  const pageHeight = opts.includeBleed ? dims.bleedHeight : dims.trimHeight

  // Convert to PDF points (72 points per inch)
  const pdfWidth = pageWidth * 72
  const pdfHeight = pageHeight * 72

  // Create PDF document
  const pdfDoc = await PDFDocument.create()

  // Embed fonts for text
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  // ========================================
  // FRONT MATTER: Title Page
  // ========================================
  const titlePage = pdfDoc.addPage([pdfWidth, pdfHeight])

  // Add title page image if available
  if (project.titlePageImageUrl) {
    try {
      const imageBytes = await fetchImageBytes(project.titlePageImageUrl)
      const imageType = detectImageType(project.titlePageImageUrl, imageBytes)
      const image = imageType === 'png'
        ? await pdfDoc.embedPng(imageBytes)
        : await pdfDoc.embedJpg(imageBytes)

      const { width: imgWidth, height: imgHeight } = image.scale(1)
      const scale = Math.max(pdfWidth / imgWidth, pdfHeight / imgHeight)
      const scaledWidth = imgWidth * scale
      const scaledHeight = imgHeight * scale
      const x = (pdfWidth - scaledWidth) / 2
      const y = (pdfHeight - scaledHeight) / 2

      titlePage.drawImage(image, { x, y, width: scaledWidth, height: scaledHeight })
    } catch (error) {
      console.error('Failed to embed title page image:', error)
    }
  }

  // Draw title and author text on title page
  const titleFontSize = 28
  const authorFontSize = 16
  const titleText = project.title || 'Untitled'
  const authorText = project.author ? `by ${project.author}` : ''

  // Center title at top third
  const titleWidth = fontBold.widthOfTextAtSize(titleText, titleFontSize)
  titlePage.drawText(titleText, {
    x: (pdfWidth - titleWidth) / 2,
    y: pdfHeight * 0.75,
    size: titleFontSize,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })

  // Center author below title
  if (authorText) {
    const authorWidth = fontItalic.widthOfTextAtSize(authorText, authorFontSize)
    titlePage.drawText(authorText, {
      x: (pdfWidth - authorWidth) / 2,
      y: pdfHeight * 0.75 - titleFontSize - 20,
      size: authorFontSize,
      font: fontItalic,
      color: rgb(0.3, 0.3, 0.3),
    })
  }

  // ========================================
  // FRONT MATTER: Copyright Page
  // ========================================
  const copyrightPage = pdfDoc.addPage([pdfWidth, pdfHeight])

  // Generate copyright text from project info
  const copyrightInfo: CopyrightInfo = {
    authorName: project.author || 'Author',
    year: project.copyrightYear || new Date().getFullYear(),
    publisherName: project.publisherName,
    isbn: project.isbnPlaceholder,
  }
  const copyrightText = generateCopyrightText(copyrightInfo)

  // Draw copyright text centered on page
  const copyrightFontSize = 10
  const copyrightLines = copyrightText.split('\n')
  const lineHeight = copyrightFontSize + 4
  const totalHeight = copyrightLines.length * lineHeight
  let currentY = (pdfHeight + totalHeight) / 2

  for (const line of copyrightLines) {
    if (line.trim()) {
      const lineWidth = font.widthOfTextAtSize(line, copyrightFontSize)
      copyrightPage.drawText(line, {
        x: (pdfWidth - lineWidth) / 2,
        y: currentY,
        size: copyrightFontSize,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      })
    }
    currentY -= lineHeight
  }

  // ========================================
  // STORY PAGES
  // ========================================
  // Process each page
  for (const page of project.pages) {
    const pdfPage = pdfDoc.addPage([pdfWidth, pdfHeight])

    // If page has an image, embed it
    if (page.imageUrl) {
      try {
        const imageBytes = await fetchImageBytes(page.imageUrl)
        const imageType = detectImageType(page.imageUrl, imageBytes)

        const image = imageType === 'png'
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes)

        // Scale image to fill page (with bleed)
        const { width: imgWidth, height: imgHeight } = image.scale(1)
        const scale = Math.max(pdfWidth / imgWidth, pdfHeight / imgHeight)

        // Center the image
        const scaledWidth = imgWidth * scale
        const scaledHeight = imgHeight * scale
        const x = (pdfWidth - scaledWidth) / 2
        const y = (pdfHeight - scaledHeight) / 2

        pdfPage.drawImage(image, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        })
      } catch (error) {
        console.error(`Failed to embed image for page ${page.pageNumber}:`, error)
        // Draw placeholder rectangle
        pdfPage.drawRectangle({
          x: 0,
          y: 0,
          width: pdfWidth,
          height: pdfHeight,
          color: rgb(0.9, 0.9, 0.9),
        })
      }
    }

    // Add text overlay if present
    if (page.text && page.textPosition !== 'none') {
      const bleedOffset = opts.includeBleed ? inchesToPixels(0.125) * 72 / KDP_DPI : 0
      const safeMargin = inchesToPixels(0.25) * 72 / KDP_DPI

      // Calculate text box position based on textPosition
      let textX = bleedOffset + safeMargin
      let textY: number
      const textWidth = pdfWidth - (bleedOffset + safeMargin) * 2
      const fontSize = 14

      switch (page.textPosition) {
        case 'top':
          textY = pdfHeight - bleedOffset - safeMargin - fontSize
          break
        case 'bottom':
        default:
          textY = bleedOffset + safeMargin + fontSize * 2
          break
        case 'left':
          textX = bleedOffset + safeMargin
          textY = pdfHeight / 2
          break
        case 'right':
          textX = pdfWidth - bleedOffset - safeMargin - textWidth / 2
          textY = pdfHeight / 2
          break
      }

      // Draw semi-transparent background for text readability
      const textLines = wrapText(page.text, font, fontSize, textWidth)
      const textHeight = textLines.length * (fontSize + 4)

      pdfPage.drawRectangle({
        x: textX - 10,
        y: textY - textHeight - 10,
        width: textWidth + 20,
        height: textHeight + 20,
        color: rgb(1, 1, 1),
        opacity: 0.8,
      })

      // Draw text
      let currentY = textY
      for (const line of textLines) {
        pdfPage.drawText(line, {
          x: textX,
          y: currentY,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        })
        currentY -= fontSize + 4
      }
    }
  }

  // Set PDF metadata
  pdfDoc.setTitle(project.title)
  pdfDoc.setAuthor(project.author || 'Unknown')
  pdfDoc.setCreator('Directors Palette Storybook')
  pdfDoc.setProducer('pdf-lib')

  return pdfDoc.save()
}

/**
 * Generate cover wrap PDF for KDP
 * Layout: [Back Cover] [Spine] [Front Cover]
 */
export async function generateCoverWrapPDF(
  project: StorybookProject,
  coverConfig: {
    frontCoverUrl: string
    backCoverUrl?: string
    backCoverColor?: { r: number; g: number; b: number }
    backCoverText?: string
    spineText?: string
    pageCount: KDPPageCount | number
    paperType?: PaperType
  },
  options: Partial<PDFExportOptions> = {}
): Promise<Uint8Array> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const coverDims = calculateCoverDimensions(
    project.bookFormat,
    coverConfig.pageCount,
    coverConfig.paperType || 'premium-color'
  )

  // Convert to PDF points (72 points per inch)
  const pdfWidth = coverDims.totalWrapWidth * 72
  const pdfHeight = coverDims.totalWrapHeight * 72
  const spineWidthPt = coverDims.spineWidth * 72
  const bleedPt = 0.125 * 72

  // Create PDF document
  const pdfDoc = await PDFDocument.create()
  const coverPage = pdfDoc.addPage([pdfWidth, pdfHeight])

  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Calculate positions
  const backCoverX = 0
  const spineX = coverDims.backWidth * 72 + bleedPt
  const frontCoverX = spineX + spineWidthPt

  // === BACK COVER ===
  if (coverConfig.backCoverUrl) {
    try {
      const imageBytes = await fetchImageBytes(coverConfig.backCoverUrl)
      const imageType = detectImageType(coverConfig.backCoverUrl, imageBytes)
      const image = imageType === 'png'
        ? await pdfDoc.embedPng(imageBytes)
        : await pdfDoc.embedJpg(imageBytes)

      const backWidth = coverDims.backWidth * 72 + bleedPt
      const backHeight = pdfHeight

      coverPage.drawImage(image, {
        x: backCoverX,
        y: 0,
        width: backWidth,
        height: backHeight,
      })
    } catch (error) {
      console.error('Failed to embed back cover image:', error)
    }
  } else {
    // Draw solid color back cover
    const bgColor = coverConfig.backCoverColor || { r: 0.95, g: 0.95, b: 0.95 }
    coverPage.drawRectangle({
      x: backCoverX,
      y: 0,
      width: coverDims.backWidth * 72 + bleedPt,
      height: pdfHeight,
      color: rgb(bgColor.r, bgColor.g, bgColor.b),
    })
  }

  // Back cover text (synopsis)
  if (coverConfig.backCoverText) {
    const textX = bleedPt + 36 // 0.5" from edge
    const textY = pdfHeight - bleedPt - 72 // Start 1" from top
    const maxWidth = coverDims.backWidth * 72 - 72 // Leave margins
    const fontSize = 11

    const lines = wrapText(coverConfig.backCoverText, font, fontSize, maxWidth)
    let currentY = textY

    for (const line of lines) {
      coverPage.drawText(line, {
        x: textX,
        y: currentY,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      })
      currentY -= fontSize + 4
    }
  }

  // Barcode area indicator (back cover, bottom-left)
  const barcodeX = bleedPt + coverDims.barcodeArea.x * 72
  const barcodeY = bleedPt + coverDims.barcodeArea.y * 72
  const barcodeW = coverDims.barcodeArea.width * 72
  const barcodeH = coverDims.barcodeArea.height * 72

  // Draw barcode placeholder
  coverPage.drawRectangle({
    x: barcodeX,
    y: barcodeY,
    width: barcodeW,
    height: barcodeH,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.5, 0.5, 0.5),
    borderWidth: 1,
  })
  coverPage.drawText('BARCODE AREA', {
    x: barcodeX + 20,
    y: barcodeY + barcodeH / 2 - 5,
    size: 10,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  })

  // === SPINE ===
  // Only add spine text if book is thick enough (>= 79 pages)
  if (coverConfig.spineText && coverConfig.pageCount >= 79) {
    const spineTextSize = Math.min(spineWidthPt * 0.6, 14) // Scale text to spine width

    // Rotate text 90 degrees for spine (reads bottom to top)
    coverPage.pushOperators()
    // The spine text reads from bottom to top when book is on shelf
    const textWidth = font.widthOfTextAtSize(coverConfig.spineText, spineTextSize)
    const textX = spineX + spineWidthPt / 2 + spineTextSize / 3
    const textY = (pdfHeight - textWidth) / 2

    // Draw rotated text
    // Note: pdf-lib doesn't have direct rotation, so we use transformation
    // Note: pdf-lib drawText doesn't natively support rotation
    // For spine text, we draw horizontally (will appear rotated when book is on shelf)
    coverPage.drawText(coverConfig.spineText, {
      x: textX,
      y: textY,
      size: spineTextSize,
      font: fontBold,
      color: rgb(0, 0, 0),
    })
  }

  // === FRONT COVER ===
  try {
    const imageBytes = await fetchImageBytes(coverConfig.frontCoverUrl)
    const imageType = detectImageType(coverConfig.frontCoverUrl, imageBytes)
    const image = imageType === 'png'
      ? await pdfDoc.embedPng(imageBytes)
      : await pdfDoc.embedJpg(imageBytes)

    const frontWidth = coverDims.frontWidth * 72 + bleedPt
    const frontHeight = pdfHeight

    coverPage.drawImage(image, {
      x: frontCoverX,
      y: 0,
      width: frontWidth,
      height: frontHeight,
    })
  } catch (error) {
    console.error('Failed to embed front cover image:', error)
    // Draw placeholder
    coverPage.drawRectangle({
      x: frontCoverX,
      y: 0,
      width: coverDims.frontWidth * 72 + bleedPt,
      height: pdfHeight,
      color: rgb(0.95, 0.9, 0.8),
    })
    coverPage.drawText('FRONT COVER', {
      x: frontCoverX + 100,
      y: pdfHeight / 2,
      size: 24,
      font: fontBold,
      color: rgb(0.5, 0.5, 0.5),
    })
  }

  // Draw trim guides (for print reference)
  if (opts.quality === 'draft') {
    // Vertical trim lines
    coverPage.drawLine({
      start: { x: bleedPt, y: 0 },
      end: { x: bleedPt, y: pdfHeight },
      color: rgb(0, 1, 1),
      thickness: 0.5,
    })
    coverPage.drawLine({
      start: { x: pdfWidth - bleedPt, y: 0 },
      end: { x: pdfWidth - bleedPt, y: pdfHeight },
      color: rgb(0, 1, 1),
      thickness: 0.5,
    })
    // Horizontal trim lines
    coverPage.drawLine({
      start: { x: 0, y: bleedPt },
      end: { x: pdfWidth, y: bleedPt },
      color: rgb(0, 1, 1),
      thickness: 0.5,
    })
    coverPage.drawLine({
      start: { x: 0, y: pdfHeight - bleedPt },
      end: { x: pdfWidth, y: pdfHeight - bleedPt },
      color: rgb(0, 1, 1),
      thickness: 0.5,
    })
    // Spine lines
    coverPage.drawLine({
      start: { x: spineX, y: 0 },
      end: { x: spineX, y: pdfHeight },
      color: rgb(1, 0, 1),
      thickness: 0.5,
    })
    coverPage.drawLine({
      start: { x: spineX + spineWidthPt, y: 0 },
      end: { x: spineX + spineWidthPt, y: pdfHeight },
      color: rgb(1, 0, 1),
      thickness: 0.5,
    })
  }

  // Set PDF metadata
  pdfDoc.setTitle(`${project.title} - Cover`)
  pdfDoc.setAuthor(project.author || 'Unknown')
  pdfDoc.setCreator('Directors Palette Storybook')
  pdfDoc.setProducer('pdf-lib')

  return pdfDoc.save()
}

/**
 * Word wrap text to fit within maxWidth
 */
function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const testWidth = font.widthOfTextAtSize(testLine, fontSize)

    if (testWidth <= maxWidth) {
      currentLine = testLine
    } else {
      if (currentLine) {
        lines.push(currentLine)
      }
      currentLine = word
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

/**
 * Generate a simple front matter page (text only)
 */
export async function generateTextPage(
  text: string,
  bookFormat: BookFormat,
  config: {
    fontSize?: number
    centered?: boolean
    bold?: boolean
  } = {}
): Promise<Uint8Array> {
  const dims = calculatePageDimensions(bookFormat)
  const pdfWidth = dims.bleedWidth * 72
  const pdfHeight = dims.bleedHeight * 72

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([pdfWidth, pdfHeight])

  const font = config.bold
    ? await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    : await pdfDoc.embedFont(StandardFonts.Helvetica)

  const fontSize = config.fontSize || 16
  const bleedPt = 0.125 * 72
  const marginPt = 0.5 * 72

  // Background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pdfWidth,
    height: pdfHeight,
    color: rgb(1, 1, 1),
  })

  // Text
  const lines = text.split('\n')
  const lineHeight = fontSize * 1.5
  const totalTextHeight = lines.length * lineHeight
  let startY = config.centered
    ? (pdfHeight + totalTextHeight) / 2
    : pdfHeight - bleedPt - marginPt - fontSize

  for (const line of lines) {
    const textWidth = font.widthOfTextAtSize(line, fontSize)
    const x = config.centered
      ? (pdfWidth - textWidth) / 2
      : bleedPt + marginPt

    page.drawText(line, {
      x,
      y: startY,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    })
    startY -= lineHeight
  }

  return pdfDoc.save()
}

/**
 * Merge multiple PDFs into one
 */
export async function mergePDFs(pdfBuffers: Uint8Array[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create()

  for (const buffer of pdfBuffers) {
    const pdf = await PDFDocument.load(buffer)
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
    for (const page of pages) {
      mergedPdf.addPage(page)
    }
  }

  return mergedPdf.save()
}

/**
 * Generate interior PDF from spreads (new beats/spreads architecture)
 * Each spread generates 2 pages in the PDF
 */
export async function generateInteriorFromSpreads(
  project: StorybookProject,
  options: Partial<PDFExportOptions> = {}
): Promise<Uint8Array> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const dims = calculatePageDimensions(project.bookFormat)

  // Use bleed dimensions for full-bleed printing
  const pageWidth = opts.includeBleed ? dims.bleedWidth : dims.trimWidth
  const pageHeight = opts.includeBleed ? dims.bleedHeight : dims.trimHeight

  // Convert to PDF points (72 points per inch)
  const pdfWidth = pageWidth * 72
  const pdfHeight = pageHeight * 72

  // Create PDF document
  const pdfDoc = await PDFDocument.create()

  // Embed font for text
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const spreads = project.spreads || []

  // Process each spread (creates 2 pages)
  for (const spread of spreads) {
    // === LEFT PAGE ===
    const leftPage = pdfDoc.addPage([pdfWidth, pdfHeight])

    if (spread.leftImageUrl) {
      try {
        const imageBytes = await fetchImageBytes(spread.leftImageUrl)
        const imageType = detectImageType(spread.leftImageUrl, imageBytes)
        const image = imageType === 'png'
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes)

        // Scale image to fill page
        const { width: imgWidth, height: imgHeight } = image.scale(1)
        const scale = Math.max(pdfWidth / imgWidth, pdfHeight / imgHeight)
        const scaledWidth = imgWidth * scale
        const scaledHeight = imgHeight * scale
        const x = (pdfWidth - scaledWidth) / 2
        const y = (pdfHeight - scaledHeight) / 2

        leftPage.drawImage(image, { x, y, width: scaledWidth, height: scaledHeight })
      } catch (error) {
        console.error(`Failed to embed left image for spread ${spread.spreadNumber}:`, error)
        leftPage.drawRectangle({ x: 0, y: 0, width: pdfWidth, height: pdfHeight, color: rgb(0.9, 0.9, 0.9) })
      }
    }

    // Add text to left page if configured
    if (spread.leftPageText && (spread.textPlacement === 'left' || spread.textPlacement === 'both')) {
      // Convert textPosition to drawPageText format (only accepts 'top' | 'bottom' | undefined)
      const position: 'top' | 'bottom' | undefined =
        spread.textPosition === 'top' ? 'top' :
        spread.textPosition === 'bottom' ? 'bottom' :
        spread.textPosition === 'none' ? undefined :
        'bottom' // Default fallback for 'left' or 'right'
      if (position) {
        drawPageText(leftPage, spread.leftPageText, font, pdfWidth, pdfHeight, position, opts.includeBleed)
      }
    }

    // === RIGHT PAGE ===
    const rightPage = pdfDoc.addPage([pdfWidth, pdfHeight])

    if (spread.rightImageUrl) {
      try {
        const imageBytes = await fetchImageBytes(spread.rightImageUrl)
        const imageType = detectImageType(spread.rightImageUrl, imageBytes)
        const image = imageType === 'png'
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes)

        const { width: imgWidth, height: imgHeight } = image.scale(1)
        const scale = Math.max(pdfWidth / imgWidth, pdfHeight / imgHeight)
        const scaledWidth = imgWidth * scale
        const scaledHeight = imgHeight * scale
        const x = (pdfWidth - scaledWidth) / 2
        const y = (pdfHeight - scaledHeight) / 2

        rightPage.drawImage(image, { x, y, width: scaledWidth, height: scaledHeight })
      } catch (error) {
        console.error(`Failed to embed right image for spread ${spread.spreadNumber}:`, error)
        rightPage.drawRectangle({ x: 0, y: 0, width: pdfWidth, height: pdfHeight, color: rgb(0.9, 0.9, 0.9) })
      }
    }

    // Add text to right page if configured
    if (spread.rightPageText && (spread.textPlacement === 'right' || spread.textPlacement === 'both')) {
      // Convert textPosition to drawPageText format (only accepts 'top' | 'bottom' | undefined)
      const rightPosition: 'top' | 'bottom' | undefined =
        spread.textPosition === 'top' ? 'top' :
        spread.textPosition === 'bottom' ? 'bottom' :
        spread.textPosition === 'none' ? undefined :
        'bottom' // Default fallback for 'left' or 'right'
      if (rightPosition) {
        drawPageText(rightPage, spread.rightPageText, font, pdfWidth, pdfHeight, rightPosition, opts.includeBleed)
      }
    }
  }

  // Set PDF metadata
  pdfDoc.setTitle(project.title)
  pdfDoc.setAuthor(project.author || 'Unknown')
  pdfDoc.setCreator('Directors Palette Storybook')
  pdfDoc.setProducer('pdf-lib')

  return pdfDoc.save()
}

/**
 * Helper to draw text on a page with background
 */
function drawPageText(
  page: import('pdf-lib').PDFPage,
  text: string,
  font: PDFFont,
  pdfWidth: number,
  pdfHeight: number,
  position: 'top' | 'bottom' | undefined,
  includeBleed: boolean
): void {
  const bleedOffset = includeBleed ? 0.125 * 72 : 0
  const safeMargin = 0.25 * 72
  const fontSize = 14

  const textX = bleedOffset + safeMargin
  let textY: number
  const textWidth = pdfWidth - (bleedOffset + safeMargin) * 2

  if (position === 'top') {
    textY = pdfHeight - bleedOffset - safeMargin - fontSize
  } else {
    textY = bleedOffset + safeMargin + fontSize * 2
  }

  const textLines = wrapText(text, font, fontSize, textWidth)
  const textHeight = textLines.length * (fontSize + 4)

  // Draw semi-transparent background
  page.drawRectangle({
    x: textX - 10,
    y: textY - textHeight - 10,
    width: textWidth + 20,
    height: textHeight + 20,
    color: rgb(1, 1, 1),
    opacity: 0.8,
  })

  // Draw text
  let currentY = textY
  for (const line of textLines) {
    page.drawText(line, {
      x: textX,
      y: currentY,
      size: fontSize,
      font: font,
      color: rgb(0, 0, 0),
    })
    currentY -= fontSize + 4
  }
}

/**
 * Export complete storybook as interior PDF
 * Supports both legacy pages array and new spreads array
 */
export async function exportStorybookInterior(
  project: StorybookProject,
  options: Partial<PDFExportOptions> = {}
): Promise<{ pdf: Uint8Array; filename: string }> {
  // Use spreads if available, otherwise fall back to pages
  const pdf = project.spreads && project.spreads.length > 0
    ? await generateInteriorFromSpreads(project, options)
    : await generateInteriorPDF(project, options)

  const filename = `${project.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-interior.pdf`

  return { pdf, filename }
}

/**
 * Export complete cover wrap as PDF
 */
export async function exportStorybookCover(
  project: StorybookProject,
  pageCount: KDPPageCount | number,
  options: Partial<PDFExportOptions> = {}
): Promise<{ pdf: Uint8Array; filename: string } | null> {
  if (!project.coverImageUrl) {
    return null
  }

  const pdf = await generateCoverWrapPDF(
    project,
    {
      frontCoverUrl: project.coverImageUrl,
      spineText: project.title,
      pageCount,
    },
    options
  )

  const filename = `${project.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-cover.pdf`

  return { pdf, filename }
}
