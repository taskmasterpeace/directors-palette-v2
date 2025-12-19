/**
 * Style Expansion API
 * Takes a simple style name (e.g., "LEGO") and expands it into a detailed
 * visual description for image generation
 */

import { NextRequest, NextResponse } from 'next/server'

interface ExpandStyleRequest {
  styleName: string
  characterAge?: number
}

interface ExpandStyleResponse {
  originalStyle: string
  expandedStyle: string
  keywords: string[]
}

// Tool schema for structured output
const EXPAND_STYLE_TOOL = {
  type: 'function' as const,
  function: {
    name: 'expand_style_description',
    description: 'Expand a simple style name into a detailed visual description for children\'s book illustration',
    parameters: {
      type: 'object',
      properties: {
        expandedStyle: {
          type: 'string',
          description: 'A detailed visual description of the style, including texture, lighting, color palette, and artistic techniques. Should be 50-100 words.'
        },
        keywords: {
          type: 'array',
          description: 'Array of 5-8 key visual keywords that define this style',
          items: {
            type: 'string'
          }
        }
      },
      required: ['expandedStyle', 'keywords']
    }
  }
}

function buildSystemPrompt(characterAge: number): string {
  const ageContext = characterAge <= 5
    ? 'The book is for very young children (toddlers), so the style should be soft, friendly, and not scary.'
    : characterAge <= 8
      ? 'The book is for children aged 5-8, so the style can be more dynamic and detailed.'
      : 'The book is for older children (8+), so the style can be more sophisticated.'

  return `You are an expert in children's book illustration styles and visual aesthetics.

Your task is to take a simple style name or keyword and expand it into a detailed visual description that can be used to guide AI image generation.

${ageContext}

EXPANSION GUIDELINES:
1. Describe the visual texture (smooth, blocky, painted, etc.)
2. Mention lighting style (soft, dramatic, warm, natural)
3. Include color palette characteristics (bright, pastel, muted, etc.)
4. Reference artistic techniques or media (watercolor washes, thick brushstrokes, etc.)
5. Note any special effects (tilt-shift, bloom, vignette, etc.)
6. Mention the overall mood/atmosphere

EXAMPLES:
- "LEGO" → "LEGO brick minifigure aesthetic, blocky plastic toy figures, bright primary colors, glossy reflective surfaces, tilt-shift photography effect, cheerful playroom lighting, clean rendered 3D look"
- "Watercolor" → "Soft watercolor illustration, delicate painted textures with visible brushstrokes, pastel color palette with gentle bleeds and washes, dreamy ethereal atmosphere, whimsical storybook quality"
- "Pixar" → "Pixar-style 3D animation, smooth subsurface scattering on skin, expressive cartoon proportions, warm cinematic lighting, rich saturated colors, professional studio quality rendering"

Keep the description concise but visually rich. Focus on elements that AI image generators understand.`
}

export async function POST(request: NextRequest) {
  try {
    const body: ExpandStyleRequest = await request.json()
    const { styleName, characterAge = 5 } = body

    // Validate inputs
    if (!styleName?.trim()) {
      return NextResponse.json(
        { error: 'Style name is required' },
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

    const systemPrompt = buildSystemPrompt(characterAge)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://directors-palette.app',
        'X-Title': 'Directors Palette - Style Expansion'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.2-3b-instruct', // 3.5x faster, 8x cheaper than GPT-4o-mini
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Expand this style for a children's book: "${styleName}"`
          }
        ],
        tools: [EXPAND_STYLE_TOOL],
        tool_choice: { type: 'function', function: { name: 'expand_style_description' } }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter API error:', error)
      return NextResponse.json(
        { error: 'Failed to expand style' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]

    if (!toolCall) {
      console.error('No tool call in response:', data)
      return NextResponse.json(
        { error: 'Failed to parse style expansion' },
        { status: 500 }
      )
    }

    try {
      const result = JSON.parse(toolCall.function.arguments)

      const responseData: ExpandStyleResponse = {
        originalStyle: styleName,
        expandedStyle: result.expandedStyle,
        keywords: result.keywords
      }

      return NextResponse.json(responseData)
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse style expansion' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in expand-style:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
