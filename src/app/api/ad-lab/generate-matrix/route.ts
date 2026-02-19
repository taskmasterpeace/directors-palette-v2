import { NextRequest, NextResponse } from 'next/server'
import { createMatrixService } from '@/features/ad-lab/services/matrix.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mandate, model } = body

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

    const service = createMatrixService(apiKey, model || 'openai/gpt-4.1-mini')
    const prompts = await service.generateMatrix(mandate)

    return NextResponse.json({ prompts })
  } catch (error) {
    console.error('Matrix generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Matrix generation failed' },
      { status: 500 }
    )
  }
}
