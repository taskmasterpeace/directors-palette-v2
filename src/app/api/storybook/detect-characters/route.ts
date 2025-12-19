/**
 * Character Detection API Endpoint
 * Uses OpenRouter (GPT-4o-mini) to intelligently detect characters from story text
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'

interface DetectCharactersRequest {
  storyText: string
}

interface DetectedCharacter {
  name: string
  tag: string
  role: 'main' | 'supporting'
  description: string
}

interface DetectCharactersResponse {
  characters: DetectedCharacter[]
}

// Tool schema for structured output
const DETECT_CHARACTERS_TOOL = {
  type: 'function' as const,
  function: {
    name: 'detect_characters',
    description: 'Extract all named characters from a children\'s story',
    parameters: {
      type: 'object',
      properties: {
        characters: {
          type: 'array',
          description: 'List of characters found in the story',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'The character\'s name (e.g., "Maya", "Mr. Whiskers", "Grandma Rose")'
              },
              tag: {
                type: 'string',
                description: 'Character tag for reference in format @Name (e.g., "@Maya", "@MrWhiskers")'
              },
              role: {
                type: 'string',
                enum: ['main', 'supporting'],
                description: 'Whether this is the main protagonist or a supporting character'
              },
              description: {
                type: 'string',
                description: 'Brief visual description of the character based on story context'
              }
            },
            required: ['name', 'tag', 'role', 'description']
          }
        }
      },
      required: ['characters']
    }
  }
}

const SYSTEM_PROMPT = `You are analyzing a children's story to identify characters.

TASK: Extract all NAMED characters from the story. These can be:
- People (children, adults, family members)
- Animals with names or personalities
- Magical beings, toys, or imaginary friends
- Any entity that acts as a character in the story

RULES:
1. DO NOT include pronouns (he, she, they, it) as characters
2. DO NOT include generic nouns (the girl, a boy, the dog) unless they have a name
3. DO include characters even if they're only mentioned once
4. The MAIN character is the protagonist - usually the character the story follows most closely
5. Create tags by removing spaces and adding @ prefix (e.g., "Mr. Whiskers" → "@MrWhiskers")
6. Provide brief visual descriptions based on story context

EXAMPLES OF VALID CHARACTERS:
- "Maya" → @Maya (main character)
- "Fluffy the cat" → @Fluffy (supporting)
- "Grandma Rose" → @GrandmaRose (supporting)
- "The Magic Tree" → @MagicTree (if it speaks/acts)

EXAMPLES OF INVALID "CHARACTERS":
- "She" (pronoun)
- "The little girl" (generic description)
- "Her friend" (no name given)
- "One day" (not a character)`

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth

    const body: DetectCharactersRequest = await request.json()
    const { storyText } = body

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
            content: `Please identify all named characters in this children's story:\n\n${storyText}`
          }
        ],
        tools: [DETECT_CHARACTERS_TOOL],
        tool_choice: { type: 'function', function: { name: 'detect_characters' } }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter API error:', error)
      return NextResponse.json(
        { error: 'Failed to detect characters' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]

    if (!toolCall) {
      console.error('No tool call in response:', data)
      return NextResponse.json(
        { error: 'Failed to parse character detection response' },
        { status: 500 }
      )
    }

    try {
      const result: DetectCharactersResponse = JSON.parse(toolCall.function.arguments)
      return NextResponse.json(result)
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse detected characters' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in detect-characters:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
