/**
 * Style Expansion API
 * Takes a simple style name (e.g., "LEGO") and expands it into a detailed
 * visual description for image generation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'

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
  const apiStart = Date.now()
  let userId: string | undefined
  let userEmail: string | undefined

  try {
    // Verify authentication FIRST
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth
    userId = user.id
    userEmail = user.email

    console.log(`[Storybook API] expand-style called by user ${user.id}`)

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

    const openRouterStart = Date.now()
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

      lognog.warn(`openrouter FAIL ${Date.now() - openRouterStart}ms`, {
        type: 'integration',
        integration: 'openrouter',
        latency_ms: Date.now() - openRouterStart,
        http_status: response.status,
        model: 'meta-llama/llama-3.2-3b-instruct',
        error,
        user_id: userId,
        user_email: userEmail,
      })

      return NextResponse.json(
        { error: 'Failed to expand style' },
        { status: 500 }
      )
    }

    lognog.debug(`openrouter OK ${Date.now() - openRouterStart}ms`, {
      type: 'integration',
      integration: 'openrouter',
      latency_ms: Date.now() - openRouterStart,
      http_status: 200,
      model: 'meta-llama/llama-3.2-3b-instruct',
      prompt_length: styleName.length,
      user_id: userId,
      user_email: userEmail,
    })

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

      lognog.info(`POST /api/storybook/expand-style 200 (${Date.now() - apiStart}ms)`, {
        type: 'api',
        route: '/api/storybook/expand-style',
        method: 'POST',
        status_code: 200,
        duration_ms: Date.now() - apiStart,
        user_id: userId,
        user_email: userEmail,
        integration: 'openrouter',
        model: 'meta-llama/llama-3.2-3b-instruct',
      })

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

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    lognog.error(errorMessage, {
      type: 'error',
      route: '/api/storybook/expand-style',
      user_id: userId,
      user_email: userEmail,
    })

    lognog.info(`POST /api/storybook/expand-style 500 (${Date.now() - apiStart}ms)`, {
      type: 'api',
      route: '/api/storybook/expand-style',
      method: 'POST',
      status_code: 500,
      duration_ms: Date.now() - apiStart,
      user_id: userId,
      user_email: userEmail,
      error: errorMessage,
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
