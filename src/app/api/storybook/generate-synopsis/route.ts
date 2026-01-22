/**
 * Synopsis Generation API
 * Generates a compelling back cover synopsis for a children's book
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'

interface GenerateSynopsisRequest {
  title: string
  mainCharacter: string
  storyText: string // Full story or first few beats
  targetAge: number
  educationTopic?: string
}

interface GenerateSynopsisResponse {
  synopsis: string
  tagline?: string
}

// Tool schema for structured output
const GENERATE_SYNOPSIS_TOOL = {
  type: 'function' as const,
  function: {
    name: 'generate_synopsis',
    description: 'Generate a compelling back cover synopsis for a children\'s book',
    parameters: {
      type: 'object',
      properties: {
        synopsis: {
          type: 'string',
          description: 'A compelling 2-4 sentence synopsis that hooks readers without spoiling the ending'
        },
        tagline: {
          type: 'string',
          description: 'An optional short tagline (5-10 words) that captures the essence of the story'
        }
      },
      required: ['synopsis']
    }
  }
}

function buildSystemPrompt(
  title: string,
  mainCharacter: string,
  targetAge: number,
  educationTopic?: string
): string {
  let topicContext = ''
  if (educationTopic) {
    topicContext = `\nThis is an educational book teaching about: ${educationTopic}`
  }

  return `You are a professional children's book marketer who writes compelling back cover copy.

Your task is to write a back cover synopsis for a children's picture book.

BOOK TITLE: "${title}"
MAIN CHARACTER: ${mainCharacter}
TARGET AGE: ${targetAge} years old${topicContext}

REQUIREMENTS:
1. SYNOPSIS (2-4 sentences):
   - Hook readers with the central conflict or adventure
   - Create excitement and curiosity
   - DO NOT give away the ending
   - Use age-appropriate vocabulary for a ${targetAge}-year-old reader's parent
   - Focus on the emotional journey and what makes this story special
   - Make parents WANT to read this to their children

2. TAGLINE (optional, 5-10 words):
   - A catchy phrase that captures the story's essence
   - Something memorable that could go on marketing materials

TONE:
- Warm and inviting
- Exciting but not overdramatic
- Focus on themes of ${targetAge <= 5 ? 'discovery, friendship, and simple joys' : 'adventure, growth, and learning'}

Example good synopsis structure:
"When [character] discovers [inciting incident], [they/she/he] must [challenge]. Join [character] on a [adjective] adventure about [theme]."

Write naturally and engagingly. Make parents excited to read this book with their children!`
}

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

    console.log(`[Storybook API] generate-synopsis called by user ${user.id}`)

    const body: GenerateSynopsisRequest = await request.json()
    const { title, mainCharacter, storyText, targetAge, educationTopic } = body

    // Validate inputs
    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Book title is required' },
        { status: 400 }
      )
    }

    if (!mainCharacter?.trim()) {
      return NextResponse.json(
        { error: 'Main character name is required' },
        { status: 400 }
      )
    }

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

    const systemPrompt = buildSystemPrompt(
      title,
      mainCharacter,
      targetAge || 5,
      educationTopic
    )

    // Truncate story text if too long (keep first ~2000 chars for context)
    const truncatedStory = storyText.length > 2000
      ? storyText.slice(0, 2000) + '...'
      : storyText

    const userMessage = `Here is the full story to summarize for the back cover:

---
${truncatedStory}
---

Write a compelling synopsis that will make parents want to buy this book for their children.`

    const openRouterStart = Date.now()
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://directors-palette.app',
        'X-Title': 'Directors Palette - Synopsis Generation'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        tools: [GENERATE_SYNOPSIS_TOOL],
        tool_choice: { type: 'function', function: { name: 'generate_synopsis' } }
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
        { error: 'Failed to generate synopsis' },
        { status: 500 }
      )
    }

    lognog.debug(`openrouter OK ${Date.now() - openRouterStart}ms`, {
      type: 'integration',
      integration: 'openrouter',
      latency_ms: Date.now() - openRouterStart,
      http_status: 200,
      model: 'openai/gpt-4o-mini',
      prompt_length: systemPrompt.length + userMessage.length,
      user_id: userId,
      user_email: userEmail,
    })

    const data = await response.json()
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]

    if (!toolCall) {
      console.error('No tool call in response:', data)
      return NextResponse.json(
        { error: 'Failed to parse synopsis' },
        { status: 500 }
      )
    }

    try {
      const result = JSON.parse(toolCall.function.arguments)

      const responseData: GenerateSynopsisResponse = {
        synopsis: result.synopsis,
        tagline: result.tagline
      }

      lognog.info(`POST /api/storybook/generate-synopsis 200 (${Date.now() - apiStart}ms)`, {
        type: 'api',
        route: '/api/storybook/generate-synopsis',
        method: 'POST',
        status_code: 200,
        duration_ms: Date.now() - apiStart,
        user_id: userId,
        user_email: userEmail,
        integration: 'openrouter',
        model: 'openai/gpt-4o-mini',
      })

      return NextResponse.json(responseData)
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse synopsis' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in generate-synopsis:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    lognog.error(errorMessage, {
      type: 'error',
      route: '/api/storybook/generate-synopsis',
      user_id: userId,
      user_email: userEmail,
    })

    lognog.info(`POST /api/storybook/generate-synopsis 500 (${Date.now() - apiStart}ms)`, {
      type: 'api',
      route: '/api/storybook/generate-synopsis',
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
