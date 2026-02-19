import { NextRequest, NextResponse } from 'next/server'
import { createRefineService } from '@/features/ad-lab/services/refine.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, grade, mandate, attemptNumber, model } = body

    if (!prompt || !grade || !mandate) {
      return NextResponse.json(
        { error: 'Prompt, grade, and mandate are required' },
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

    const service = createRefineService(apiKey, model || 'openai/gpt-4.1-mini')
    const result = await service.refinePrompt(prompt, grade, mandate, attemptNumber || 1)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Refinement error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Refinement failed' },
      { status: 500 }
    )
  }
}
