/**
 * Adhub Extract Copy API
 * POST - Extract structured ad copy from raw text using LLM
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClient } from '@/lib/db/client'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await getClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { rawText } = body

    if (!rawText || rawText.trim().length < 10) {
      return NextResponse.json({
        error: 'Please provide at least 10 characters of product description'
      }, { status: 400 })
    }

    // Call OpenRouter with tool calling to extract structured copy
    const openrouterKey = process.env.OPENROUTER_API_KEY
    if (!openrouterKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 })
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert advertising copywriter. Extract structured ad copy from the provided product description. Be concise and punchy - this is for visual advertisements.`,
          },
          {
            role: 'user',
            content: `Extract ad copy from this product/service description:\n\n${rawText.slice(0, 4000)}`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_ad_copy',
              description: 'Extract structured advertising copy from product description',
              parameters: {
                type: 'object',
                properties: {
                  headline: {
                    type: 'string',
                    description: 'Short, punchy headline (5-10 words max)',
                  },
                  tagline: {
                    type: 'string',
                    description: 'Memorable tagline or slogan (under 10 words)',
                  },
                  valueProp: {
                    type: 'string',
                    description: 'Core value proposition in 1-2 sentences',
                  },
                  features: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '3-5 key features or benefits, each under 10 words',
                  },
                  audience: {
                    type: 'string',
                    description: 'Target audience description in 1 sentence',
                  },
                },
                required: ['headline', 'tagline', 'valueProp', 'features', 'audience'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'extract_ad_copy' } },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      logger.api.error('OpenRouter error', { error: errorData instanceof Error ? errorData.message : String(errorData) })
      return NextResponse.json({ error: 'Failed to extract copy from text' }, { status: 500 })
    }

    const result = await response.json()
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0]

    if (!toolCall?.function?.arguments) {
      return NextResponse.json({ error: 'LLM did not return structured copy' }, { status: 500 })
    }

    const extractedCopy = JSON.parse(toolCall.function.arguments)

    // Validate the response has all required fields
    if (!extractedCopy.headline || !extractedCopy.tagline || !extractedCopy.valueProp) {
      return NextResponse.json({ error: 'LLM returned incomplete copy' }, { status: 500 })
    }

    // Ensure features is an array
    if (!Array.isArray(extractedCopy.features)) {
      extractedCopy.features = []
    }

    return NextResponse.json({ extractedCopy })
  } catch (error) {
    logger.api.error('Error extracting copy', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: 'Failed to extract copy' }, { status: 500 })
  }
}
