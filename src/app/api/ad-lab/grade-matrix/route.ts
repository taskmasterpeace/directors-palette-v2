import { NextRequest, NextResponse } from 'next/server'
import { createGradingService } from '@/features/ad-lab/services/grading.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompts, mandate, model } = body

    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json(
        { error: 'Prompts array is required' },
        { status: 400 }
      )
    }

    if (!mandate) {
      return NextResponse.json(
        { error: 'Creative mandate is required' },
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

    const service = createGradingService(apiKey, model || 'openai/gpt-4.1-mini')
    const grades = await service.gradeMatrix(prompts, mandate)

    return NextResponse.json({ grades })
  } catch (error) {
    console.error('Grading error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Grading failed' },
      { status: 500 }
    )
  }
}
