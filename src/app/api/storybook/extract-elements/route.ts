/**
 * Extract Elements API
 * Extracts characters and locations from a generated story for reference image generation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'
import type { ExtractedElements, ExtractedCharacter, ExtractedLocation, GeneratedStoryPage } from '@/features/storybook/types/education.types'

interface ExtractElementsRequest {
  title: string
  pages: GeneratedStoryPage[]
  mainCharacterName: string
}

// Tool schema for structured output
const EXTRACT_ELEMENTS_TOOL = {
  type: 'function' as const,
  function: {
    name: 'extract_story_elements',
    description: 'Extract characters and locations from a children\'s story for image generation',
    parameters: {
      type: 'object',
      properties: {
        characters: {
          type: 'array',
          description: 'All characters in the story',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Character name'
              },
              description: {
                type: 'string',
                description: 'Detailed visual description for consistent image generation (appearance, clothing, distinguishing features)'
              },
              appearances: {
                type: 'array',
                items: { type: 'number' },
                description: 'Page numbers where this character appears'
              },
              role: {
                type: 'string',
                enum: ['main', 'supporting'],
                description: 'Whether this is the main character or a supporting character'
              }
            },
            required: ['name', 'description', 'appearances', 'role']
          }
        },
        locations: {
          type: 'array',
          description: 'Key locations/settings in the story',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Location name'
              },
              description: {
                type: 'string',
                description: 'Detailed visual description for consistent image generation (environment, lighting, key features)'
              },
              appearances: {
                type: 'array',
                items: { type: 'number' },
                description: 'Page numbers where this location is the setting'
              }
            },
            required: ['name', 'description', 'appearances']
          }
        }
      },
      required: ['characters', 'locations']
    }
  }
}

function buildSystemPrompt(mainCharacterName: string): string {
  return `You are an expert at analyzing children's stories to extract visual elements for illustration.

Your job is to identify all CHARACTERS and LOCATIONS in the story so we can generate consistent reference images.

MAIN CHARACTER: ${mainCharacterName} (this should always be marked as 'main' role)

FOR EACH CHARACTER, provide:
- name: The character's name
- description: Detailed visual description including:
  * Age/size (child, adult, animal type)
  * Physical appearance (hair color, eye color if mentioned)
  * Clothing or distinctive features
  * Personality traits that show in appearance (cheerful smile, curious eyes)
- appearances: Which page numbers they appear on
- role: 'main' for ${mainCharacterName}, 'supporting' for others

FOR EACH LOCATION, provide:
- name: A short name for the location
- description: Detailed visual description including:
  * Type of place (park, bedroom, forest, etc.)
  * Time of day and lighting
  * Key visual elements and colors
  * Mood/atmosphere
- appearances: Which page numbers use this location

IMPORTANT:
- ${mainCharacterName} MUST be included with role='main'
- Include ALL named characters, even if briefly mentioned
- Identify distinct locations - if the story moves to a new place, that's a new location
- Descriptions should be detailed enough for AI image generation`
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

    console.log(`[Storybook API] extract-elements called by user ${user.id}`)

    const body: ExtractElementsRequest = await request.json()
    const { title, pages, mainCharacterName } = body

    // Validate inputs
    if (!pages || pages.length === 0) {
      return NextResponse.json(
        { error: 'Story pages are required' },
        { status: 400 }
      )
    }

    if (!mainCharacterName?.trim()) {
      return NextResponse.json(
        { error: 'Main character name is required' },
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

    // Build the story text for analysis
    const storyText = pages.map((page, index) => {
      const sceneInfo = page.sceneDescription ? `\n[Scene: ${page.sceneDescription}]` : ''
      return `Page ${index + 1}:\n${page.text}${sceneInfo}`
    }).join('\n\n')

    const systemPrompt = buildSystemPrompt(mainCharacterName)

    const openRouterStart = Date.now()
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://directors-palette.app',
        'X-Title': 'Directors Palette - Extract Elements'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Analyze this children's story titled "${title}" and extract all characters and locations:\n\n${storyText}`
          }
        ],
        tools: [EXTRACT_ELEMENTS_TOOL],
        tool_choice: { type: 'function', function: { name: 'extract_story_elements' } }
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
        model: 'openai/gpt-4o-mini',
        error,
        user_id: userId,
        user_email: userEmail,
      })

      return NextResponse.json(
        { error: 'Failed to extract story elements' },
        { status: 500 }
      )
    }

    lognog.debug(`openrouter OK ${Date.now() - openRouterStart}ms`, {
      type: 'integration',
      integration: 'openrouter',
      latency_ms: Date.now() - openRouterStart,
      http_status: 200,
      model: 'openai/gpt-4o-mini',
      prompt_length: storyText.length,
      user_id: userId,
      user_email: userEmail,
    })

    const data = await response.json()
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]

    if (!toolCall) {
      console.error('No tool call in response:', data)
      return NextResponse.json(
        { error: 'Failed to parse extracted elements' },
        { status: 500 }
      )
    }

    try {
      const result = JSON.parse(toolCall.function.arguments)

      // Ensure main character is always first and marked correctly
      const characters: ExtractedCharacter[] = result.characters.map((char: ExtractedCharacter) => ({
        ...char,
        role: char.name.toLowerCase() === mainCharacterName.toLowerCase() ? 'main' : char.role
      }))

      // Sort so main character is first
      characters.sort((a, b) => {
        if (a.role === 'main') return -1
        if (b.role === 'main') return 1
        return 0
      })

      const locations: ExtractedLocation[] = result.locations || []

      const extractedElements: ExtractedElements = {
        characters,
        locations
      }

      lognog.info(`POST /api/storybook/extract-elements 200 (${Date.now() - apiStart}ms)`, {
        type: 'api',
        route: '/api/storybook/extract-elements',
        method: 'POST',
        status_code: 200,
        duration_ms: Date.now() - apiStart,
        user_id: userId,
        user_email: userEmail,
        integration: 'openrouter',
        model: 'openai/gpt-4o-mini',
      })

      return NextResponse.json(extractedElements)
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse extracted elements' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in extract-elements:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    lognog.error(errorMessage, {
      type: 'error',
      route: '/api/storybook/extract-elements',
      user_id: userId,
      user_email: userEmail,
    })

    lognog.info(`POST /api/storybook/extract-elements 500 (${Date.now() - apiStart}ms)`, {
      type: 'api',
      route: '/api/storybook/extract-elements',
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
