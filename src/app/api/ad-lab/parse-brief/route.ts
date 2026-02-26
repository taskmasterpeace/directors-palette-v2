import { NextRequest, NextResponse } from 'next/server'
import { createMandateService } from '@/features/ad-lab/services/mandate.service'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { briefText, model } = body

    if (!briefText || typeof briefText !== 'string') {
      return NextResponse.json(
        { error: 'Brief text is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    const service = createMandateService(apiKey, model || 'openai/gpt-4.1-mini')
    const mandate = await service.parseBrief(briefText)

    return NextResponse.json(mandate)
  } catch (error) {
    logger.api.error('Brief parsing error', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Brief parsing failed' },
      { status: 500 }
    )
  }
}
