/**
 * Character Description Enhancement API
 * Takes user hints (gender, race, age, features) and expands them into
 * a detailed visual description suitable for character sheet generation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'

interface EnhanceDescriptionRequest {
  characterHint: string  // User's brief description/hints
  characterName: string
  role?: string  // 'protagonist', 'sibling', 'friend', 'pet', etc.
  storyContext?: string  // Optional story excerpt for context
}

interface EnhanceDescriptionResponse {
  expandedDescription: string
  visualKeywords: string[]
}

// Tool schema for structured output
const ENHANCE_DESCRIPTION_TOOL = {
  type: 'function' as const,
  function: {
    name: 'enhance_character_description',
    description: 'Expand brief character hints into a detailed visual description',
    parameters: {
      type: 'object',
      properties: {
        expandedDescription: {
          type: 'string',
          description: 'A detailed visual description suitable for AI image generation (2-4 sentences covering appearance, clothing, and distinguishing features)'
        },
        visualKeywords: {
          type: 'array',
          description: 'Array of 6-10 key visual keywords describing the character',
          items: {
            type: 'string'
          }
        }
      },
      required: ['expandedDescription', 'visualKeywords']
    }
  }
}

const SYSTEM_PROMPT = `You are an expert character designer for children's book illustrations.

TASK: Take brief character hints from a user and expand them into a rich, detailed visual description suitable for AI image generation.

USER HINTS may include:
- Demographics (age, gender, ethnicity)
- Basic appearance (hair color, body type)
- Personality hints (cheerful, shy, adventurous)
- Key features (glasses, freckles, curly hair)

YOUR JOB:
1. Preserve ALL specifics the user provided (especially demographics and key features)
2. Add complementary visual details that feel cohesive
3. Suggest age-appropriate clothing and accessories
4. Include expressive details that bring the character to life
5. Keep it suitable for children's book illustration

GUIDELINES:
- Be specific and concrete (not abstract)
- Include hair color/style, eye color, skin tone, clothing
- Add 1-2 distinguishing features if not specified
- For children: Include details that make them relatable
- For adults: Include details that show their role (teacher, parent, etc.)
- For pets: Describe species, coloring, size, and personality-reflecting features

IMPORTANT:
- If user specifies ethnicity/race, describe skin tone respectfully and accurately
- Match the age to appropriate proportions and features
- Clothing should fit the character's role and personality

OUTPUT:
- expandedDescription: 2-4 sentences of visual description
- visualKeywords: 6-10 key terms for the character

EXAMPLES:
- Input: "African American girl, 5, curly hair"
  Output: "A cheerful 5-year-old African American girl with beautiful bouncy curly black hair. She has warm brown skin, bright expressive eyes, and an infectious gap-toothed smile. She wears a colorful rainbow dress with white sneakers, and has a favorite sparkly hair clip holding back her curls."

- Input: "grandmother, Asian, kind, bakes cookies"
  Output: "A warm elderly Asian grandmother with silver-streaked black hair pulled back in a neat bun. She has gentle crow's feet around her kind brown eyes and rosy cheeks from the kitchen warmth. She wears a soft cream-colored cardigan over a floral apron dusted with flour, always ready to offer a fresh-baked treat."`

export async function POST(request: NextRequest) {
  const apiStart = Date.now()
  let userId: string | undefined
  let userEmail: string | undefined

  try {
    // Verify authentication
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth
    userId = user.id
    userEmail = user.email

    console.log(`[Storybook API] enhance-character-description called by user ${user.id}`)

    const body: EnhanceDescriptionRequest = await request.json()
    const { characterHint, characterName, role, storyContext } = body

    if (!characterHint?.trim()) {
      return NextResponse.json(
        { error: 'Character hint is required' },
        { status: 400 }
      )
    }

    if (!characterName?.trim()) {
      return NextResponse.json(
        { error: 'Character name is required' },
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

    // Build the user message with context
    let userMessage = `Character name: ${characterName}\n`
    userMessage += `User's description hints: "${characterHint}"\n`
    if (role) userMessage += `Role in story: ${role}\n`
    if (storyContext?.trim()) {
      userMessage += `\nStory context (for reference):\n${storyContext.substring(0, 1000)}`
    }
    userMessage += '\n\nPlease expand these hints into a detailed visual description.'

    const openRouterStart = Date.now()
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://directors-palette.app',
        'X-Title': 'Directors Palette - Character Enhancement'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // Better quality for character descriptions
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        tools: [ENHANCE_DESCRIPTION_TOOL],
        tool_choice: { type: 'function', function: { name: 'enhance_character_description' } }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter API error:', error)

      lognog.integration({
        integration: 'openrouter',
        success: false,
        latency_ms: Date.now() - openRouterStart,
        http_status: response.status,
        model: 'openai/gpt-4o-mini',
        error,
        user_id: userId,
        user_email: userEmail,
      })

      return NextResponse.json(
        { error: 'Failed to enhance description' },
        { status: 500 }
      )
    }

    lognog.integration({
      integration: 'openrouter',
      success: true,
      latency_ms: Date.now() - openRouterStart,
      http_status: 200,
      model: 'openai/gpt-4o-mini',
      prompt_length: userMessage.length,
      user_id: userId,
      user_email: userEmail,
    })

    const data = await response.json()
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]

    if (!toolCall) {
      console.error('No tool call in response:', data)
      return NextResponse.json(
        { error: 'Failed to parse enhancement response' },
        { status: 500 }
      )
    }

    try {
      const result: EnhanceDescriptionResponse = JSON.parse(toolCall.function.arguments)

      lognog.api({
        route: '/api/storybook/enhance-character-description',
        method: 'POST',
        status_code: 200,
        duration_ms: Date.now() - apiStart,
        user_id: userId,
        user_email: userEmail,
        integration: 'openrouter',
        model: 'openai/gpt-4o-mini',
      })

      return NextResponse.json(result)
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse enhanced description' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in enhance-character-description:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    lognog.error({
      message: errorMessage,
      route: '/api/storybook/enhance-character-description',
      user_id: userId,
      user_email: userEmail,
    })

    lognog.api({
      route: '/api/storybook/enhance-character-description',
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
