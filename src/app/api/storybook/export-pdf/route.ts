/**
 * PDF Export API Route
 * Generates print-ready PDFs for Amazon KDP
 *
 * POST /api/storybook/export-pdf
 * Body: { project: StorybookProject, type: 'interior' | 'cover' | 'both', pageCount?: number }
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/features/auth/hooks/useAuth'
import type { StorybookProject, KDPPageCount } from '@/features/storybook/types/storybook.types'
import {
  exportStorybookInterior,
  exportStorybookCover,
  mergePDFs,
} from '@/features/storybook/services/pdf-export.service'

export async function POST(request: Request) {
  try {
    // Auth check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      project,
      type = 'interior',
      pageCount,
      options = {},
    } = body as {
      project: StorybookProject
      type: 'interior' | 'cover' | 'both'
      pageCount?: KDPPageCount | number
      options?: {
        includeBleed?: boolean
        quality?: 'draft' | 'print'
      }
    }

    if (!project) {
      return NextResponse.json({ error: 'Project data required' }, { status: 400 })
    }

    // Calculate page count if not provided
    const effectivePageCount = pageCount || project.kdpPageCount || (project.pages.length + 8) // pages + front/back matter

    let pdfBuffer: Uint8Array
    let filename: string

    switch (type) {
      case 'interior': {
        const result = await exportStorybookInterior(project, options)
        pdfBuffer = result.pdf
        filename = result.filename
        break
      }

      case 'cover': {
        if (!project.coverImageUrl) {
          return NextResponse.json(
            { error: 'Cover image required for cover PDF export' },
            { status: 400 }
          )
        }
        const result = await exportStorybookCover(project, effectivePageCount, options)
        if (!result) {
          return NextResponse.json(
            { error: 'Failed to generate cover PDF' },
            { status: 500 }
          )
        }
        pdfBuffer = result.pdf
        filename = result.filename
        break
      }

      case 'both': {
        const interiorResult = await exportStorybookInterior(project, options)
        const coverResult = await exportStorybookCover(project, effectivePageCount, options)

        if (coverResult) {
          // Merge cover and interior (cover first, then interior pages)
          pdfBuffer = await mergePDFs([coverResult.pdf, interiorResult.pdf])
          filename = `${project.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-complete.pdf`
        } else {
          pdfBuffer = interiorResult.pdf
          filename = interiorResult.filename
        }
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    // Return PDF as binary response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('PDF export error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET endpoint for checking export capabilities
export async function GET() {
  return NextResponse.json({
    available: true,
    formats: ['interior', 'cover', 'both'],
    features: {
      bleed: true,
      dpi: 300,
      colorSpaces: ['rgb'],
      embedFonts: true,
    },
    kdpPageCounts: [24, 28, 32, 36, 40],
    bookFormats: ['square', 'landscape', 'portrait', 'wide'],
  })
}
