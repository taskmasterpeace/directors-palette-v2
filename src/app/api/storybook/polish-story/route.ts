/**
 * Story Polish API Endpoint
 * Uses OpenRouter (GPT-4o-mini) to polish and enhance children's stories
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'

interface PolishStoryRequest {
  storyText: string
  targetAge: number
  pageCount: number
  keepExactWords: boolean
}

interface PolishedStoryResponse {
  pages: string[]
  mainCharacter?: {
    name: string
    tag: string
    description: string
  }
  supportingCharacters?: Array<{
    name: string
    description: string
  }>
  locations?: Array<{
    name: string
    description: string
  }>
}

// Tool schema for structured output
const POLISH_STORY_TOOL = {
  type: 'function' as const,
  function: {
    name: 'polish_story',
    description: 'Polish and split a children\'s story into pages',
    parameters: {
      type: 'object',
      properties: {
        pages: {
          type: 'array',
          description: 'The story split into pages, each with age-appropriate text (25-50 words per page)',
          items: {
            type: 'string',
            description: 'Text content for one page of the storybook'
          }
        },
        mainCharacter: {
          type: 'object',
          description: 'The main character of the story (if identifiable)',
          properties: {
            name: { type: 'string', description: 'Character name' },
            tag: { type: 'string', description: 'Character tag like @Maya or @fluffy' },
            description: { type: 'string', description: 'Visual description for image generation' }
          },
          required: ['name', 'tag', 'description']
        },
        supportingCharacters: {
          type: 'array',
          description: 'Other important characters in the story',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string', description: 'Visual description for image generation' }
            },
            required: ['name', 'description']
          }
        },
        locations: {
          type: 'array',
          description: 'Key locations in the story',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string', description: 'Visual description for image generation' }
            },
            required: ['name', 'description']
          }
        }
      },
      required: ['pages']
    }
  }
}

function getSystemPrompt(targetAge: number, pageCount: number, keepExactWords: boolean): string {
  const vocabularyGuidance = keepExactWords
    ? 'Keep the exact wording from the original story. Only split it into pages without changing any words.'
    : `Rewrite the story with vocabulary appropriate for a ${targetAge}-year-old child.
       - For ages 3-5: Use very simple words (1-2 syllables), short sentences, lots of repetition
       - For ages 6-8: Use simple words with some variety, moderate sentence length
       - For ages 9-12: Use richer vocabulary, more complex sentences, nuanced emotions`

  return `You are an expert children's book author. A parent has written a story for their child.
Your job is to polish and enhance it while preserving their vision.

TARGET AGE: ${targetAge} years old
NUMBER OF PAGES: ${pageCount}

VOCABULARY GUIDANCE:
${vocabularyGuidance}

TASKS:
1. Split the story into exactly ${pageCount} pages
2. Each page should have 25-50 words (readable on one illustrated page)
3. Identify the MAIN CHARACTER (the protagonist, usually tagged with @)
4. Identify supporting characters with their visual descriptions
5. Identify key locations that need visual descriptions
6. Ensure the story has a clear beginning, middle, and end
7. Each page should have a clear visual moment that can be illustrated

IMPORTANT FOR VISUAL DESCRIPTIONS:
- Include physical appearance: age, ethnicity, hair, clothing
- Include setting details: time of day, weather, environment
- Make descriptions specific enough for AI image generation`
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

    console.log(`[Storybook API] polish-story called by user ${user.id}`)

    const body: PolishStoryRequest = await request.json()
    const { storyText, targetAge, pageCount, keepExactWords } = body

    if (!storyText?.trim()) {
      return NextResponse.json(
        { error: 'Story text is required' },
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

    const systemPrompt = getSystemPrompt(targetAge, pageCount, keepExactWords)

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
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Please polish and split this story into ${pageCount} pages:\n\n${storyText}`
          }
        ],
        tools: [POLISH_STORY_TOOL],
        tool_choice: { type: 'function', function: { name: 'polish_story' } }
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
        { error: 'Failed to polish story' },
        { status: 500 }
      )
    }

    lognog.integration({
      integration: 'openrouter',
      success: true,
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
        { error: 'Failed to parse story response' },
        { status: 500 }
      )
    }

    try {
      const result: PolishedStoryResponse = JSON.parse(toolCall.function.arguments)

      lognog.api({
        route: '/api/storybook/polish-story',
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
        { error: 'Failed to parse polished story' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in polish-story:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    lognog.error({
      message: errorMessage,
      route: '/api/storybook/polish-story',
      user_id: userId,
      user_email: userEmail,
    })

    lognog.api({
      route: '/api/storybook/polish-story',
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
