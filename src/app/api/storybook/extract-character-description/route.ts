/**
 * Character Description Extraction API Endpoint
 * Uses OpenRouter (GPT-4o-mini) to extract visual descriptions from story text
 * Used when a character has no photo - extracts description for character sheet generation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'
import { logger } from '@/lib/logger'

interface ExtractDescriptionRequest {
  characterName: string
  storyText: string
  role?: string  // e.g., 'sibling', 'friend', 'pet'
  relationship?: string  // e.g., "Emma's little brother"
}

interface ExtractDescriptionResponse {
  description: string
  visualTraits: {
    age?: string
    gender?: string
    hairColor?: string
    hairStyle?: string
    eyeColor?: string
    skinTone?: string
    build?: string
    height?: string
    clothing?: string
    distinguishingFeatures?: string[]
  }
}

// Tool schema for structured output
const EXTRACT_DESCRIPTION_TOOL = {
  type: 'function' as const,
  function: {
    name: 'extract_character_description',
    description: 'Extract visual description of a character from story context',
    parameters: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'A detailed visual description of the character suitable for image generation (2-3 sentences covering appearance, clothing, and distinguishing features)'
        },
        visualTraits: {
          type: 'object',
          description: 'Specific visual traits extracted from or inferred from the story',
          properties: {
            age: { type: 'string', description: 'Approximate age or age range (e.g., "5 years old", "young adult", "elderly")' },
            gender: { type: 'string', description: 'Gender presentation (e.g., "girl", "boy", "woman", "man")' },
            hairColor: { type: 'string', description: 'Hair color (e.g., "brown", "blonde", "black", "red")' },
            hairStyle: { type: 'string', description: 'Hair style (e.g., "long braids", "short curly", "ponytail")' },
            eyeColor: { type: 'string', description: 'Eye color if mentioned or implied' },
            skinTone: { type: 'string', description: 'Skin tone (be respectful and descriptive)' },
            build: { type: 'string', description: 'Body build (e.g., "slim", "athletic", "sturdy")' },
            height: { type: 'string', description: 'Relative height (e.g., "tall for age", "average", "short")' },
            clothing: { type: 'string', description: 'Typical clothing or outfit described' },
            distinguishingFeatures: {
              type: 'array',
              items: { type: 'string' },
              description: 'Notable features (e.g., "freckles", "glasses", "missing front tooth")'
            }
          }
        }
      },
      required: ['description', 'visualTraits']
    }
  }
}

const SYSTEM_PROMPT = `You are a character designer extracting visual descriptions from children's stories.

TASK: Create a detailed visual description for a character that can be used to generate a consistent character sheet. The description should be suitable for image generation AI.

APPROACH:
1. Look for ANY explicit descriptions in the story text
2. Infer reasonable visual traits from context (age, role, relationships)
3. If minimal info is available, create age-appropriate defaults that match the story's tone
4. For pets/animals, describe species, coloring, size, and personality-reflecting features

CRITICAL RULES:
- Be specific about physical features (hair color, eye color, clothing, etc.)
- Descriptions should be visually concrete, not abstract
- If the character is a child, describe them with appropriate age features
- For siblings, consider family resemblance with the main character
- For pets, describe realistic or fantastical features as story suggests
- Never include inappropriate or overly detailed descriptions
- Keep descriptions suitable for a children's book illustration

OUTPUT FORMAT:
- description: 2-3 sentence visual description for image generation
- visualTraits: structured breakdown of specific features

EXAMPLES:
- "Emma's little brother Max" → "A cheerful 4-year-old boy with messy brown hair and bright blue eyes. He wears a red t-shirt with a dinosaur print and denim shorts. He has a gap-toothed smile and rosy cheeks."
- "Fluffy the cat" → "A fluffy orange tabby cat with big green eyes and a bushy tail. She has white paws and a pink nose, with whiskers that seem to always be twitching curiously."
- "Grandma Rose" → "A warm, elderly woman with silver hair pulled back in a soft bun. She wears a lavender cardigan with pearl buttons and reading glasses perched on her nose. Her face has gentle smile lines around kind brown eyes."`

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

    const body: ExtractDescriptionRequest = await request.json()
    const { characterName, storyText, role, relationship } = body

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

    // Build context from available information
    let contextInfo = `Character name: ${characterName}`
    if (role) contextInfo += `\nRole in story: ${role}`
    if (relationship) contextInfo += `\nRelationship: ${relationship}`
    if (storyText?.trim()) {
      contextInfo += `\n\nStory text (for context):\n${storyText.substring(0, 3000)}` // Limit story length
    }

    const openRouterStart = Date.now()
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://directors-palette.app',
        'X-Title': 'Directors Palette - Storybook'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Please create a detailed visual description for this character:\n\n${contextInfo}`
          }
        ],
        tools: [EXTRACT_DESCRIPTION_TOOL],
        tool_choice: { type: 'function', function: { name: 'extract_character_description' } }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      logger.api.error('OpenRouter API error', { error })

      lognog.warn(`openrouter FAIL ${Date.now() - openRouterStart}ms`, {
        type: 'integration',
        integration: 'openrouter',
        latency_ms: Date.now() - openRouterStart,
        http_status: response.status,
        model: 'openai/gpt-4o-mini',
        error,
        user_id: userId,
        user_email: userEmail,
      })

      return NextResponse.json(
        { error: 'Failed to extract character description' },
        { status: 500 }
      )
    }

    lognog.debug(`openrouter OK ${Date.now() - openRouterStart}ms`, {
      type: 'integration',
      integration: 'openrouter',
      latency_ms: Date.now() - openRouterStart,
      http_status: 200,
      model: 'openai/gpt-4o-mini',
      prompt_length: contextInfo.length,
      user_id: userId,
      user_email: userEmail,
    })

    const data = await response.json()
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]

    if (!toolCall) {
      logger.api.error('No tool call in response', { detail: data })
      return NextResponse.json(
        { error: 'Failed to parse character description response' },
        { status: 500 }
      )
    }

    try {
      const result: ExtractDescriptionResponse = JSON.parse(toolCall.function.arguments)

      lognog.info(`POST /api/storybook/extract-character-description 200 (${Date.now() - apiStart}ms)`, {
        type: 'api',
        route: '/api/storybook/extract-character-description',
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
      logger.api.error('Failed to parse tool call arguments', { error: parseError instanceof Error ? parseError.message : String(parseError) })
      return NextResponse.json(
        { error: 'Failed to parse character description' },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.api.error('Error in extract-character-description', { error: error instanceof Error ? error.message : String(error) })

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    lognog.error(errorMessage, {
      type: 'error',
      route: '/api/storybook/extract-character-description',
      user_id: userId,
      user_email: userEmail,
    })

    lognog.info(`POST /api/storybook/extract-character-description 500 (${Date.now() - apiStart}ms)`, {
      type: 'api',
      route: '/api/storybook/extract-character-description',
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
