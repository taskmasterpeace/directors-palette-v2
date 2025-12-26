/**
 * Story Ideas Generation API
 * Generates 4 different story approach ideas for the user to choose from
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { getCategoryById, getTopicById, getRandomApproaches } from '@/features/storybook/types/education.types'
import type { StoryCharacterInput } from '@/features/storybook/types/storybook.types'

interface GenerateIdeasRequest {
  characterName: string
  characterAge: number
  category: string
  topic: string
  // For custom stories
  customStoryIdea?: string
  // Customization options
  setting?: string
  customElements?: string[]
  customNotes?: string
  // Additional story characters
  storyCharacters?: StoryCharacterInput[]
}

interface StoryIdea {
  id: string
  approach: string
  approachIcon: string
  title: string
  summary: string
}

interface GenerateIdeasResponse {
  ideas: StoryIdea[]
}

// Tool schema for structured output
const GENERATE_IDEAS_TOOL = {
  type: 'function' as const,
  function: {
    name: 'generate_story_ideas',
    description: 'Generate 4 different story ideas for a children\'s book',
    parameters: {
      type: 'object',
      properties: {
        ideas: {
          type: 'array',
          description: 'Array of 4 story ideas with different approaches',
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'A catchy, child-friendly title for the story'
              },
              summary: {
                type: 'string',
                description: 'A 2-3 sentence summary of what happens in the story'
              }
            },
            required: ['title', 'summary']
          },
          minItems: 4,
          maxItems: 4
        }
      },
      required: ['ideas']
    }
  }
}

function buildSystemPrompt(
  characterName: string,
  characterAge: number,
  categoryName: string,
  topicName: string,
  topicDescription: string,
  topicKeywords: string[],
  approaches: { id: string; name: string; description: string }[],
  setting?: string,
  customElements?: string[],
  customNotes?: string,
  storyCharacters?: StoryCharacterInput[]
): string {
  const approachList = approaches
    .map((a, i) => `${i + 1}. ${a.name}: ${a.description}`)
    .join('\n')

  // Build customization section
  let customization = ''
  if (setting) {
    customization += `\nSETTING: The story takes place in/at: ${setting}`
  }
  if (customElements && customElements.length > 0) {
    customization += `\nINCLUDE THESE ELEMENTS: ${customElements.join(', ')}`
  }
  if (customNotes) {
    customization += `\nSPECIAL REQUESTS: ${customNotes}`
  }

  // Build additional characters section
  let charactersSection = ''
  if (storyCharacters && storyCharacters.length > 0) {
    const characterDescriptions = storyCharacters.map(c => {
      let desc = `- ${c.name} (${c.role})`
      if (c.relationship) desc += `: ${c.relationship}`
      if (c.description) desc += ` - ${c.description}`
      return desc
    }).join('\n')
    charactersSection = `\n\nADDITIONAL CHARACTERS TO INCLUDE:\n${characterDescriptions}`
  }

  return `You are a creative children's book author specializing in educational content.

Generate 4 different story ideas for a children's book about "${topicName}" (${topicDescription}).

MAIN CHARACTER: ${characterName}, age ${characterAge}${charactersSection}
CATEGORY: ${categoryName}
TOPIC: ${topicName} - ${topicDescription}
KEYWORDS TO INCORPORATE: ${topicKeywords.join(', ')}${customization}

CREATE 4 DIFFERENT STORY IDEAS using these approaches (in this order):
${approachList}

REQUIREMENTS FOR EACH IDEA:
- Title: Catchy, memorable, age-appropriate (5-8 words max)
- Summary: 2-3 sentences explaining the story premise
- Feature ${characterName} as the main character${storyCharacters && storyCharacters.length > 0 ? `\n- Include the additional characters listed above in meaningful ways` : ''}
- Naturally incorporate the topic (${topicName}) into the plot${setting ? `\n- Set the story in/at: ${setting}` : ''}${customElements && customElements.length > 0 ? `\n- Include these fun elements: ${customElements.join(', ')}` : ''}${customNotes ? `\n- Honor this special request: ${customNotes}` : ''}
- Make it engaging and fun for a ${characterAge}-year-old
- Each approach should feel distinctly different

VOCABULARY:
- For ages 2-4: Very simple concepts and words
- For ages 5-7: Simple but varied vocabulary
- For ages 8-12: More complex themes allowed

Be creative! Each story should take a unique angle on teaching ${topicName}.`
}

// Build system prompt for CUSTOM stories (freeform, non-educational)
function buildCustomSystemPrompt(
  characterName: string,
  characterAge: number,
  customStoryIdea: string,
  approaches: { id: string; name: string; description: string }[],
  setting?: string,
  customElements?: string[],
  storyCharacters?: StoryCharacterInput[]
): string {
  const approachList = approaches
    .map((a, i) => `${i + 1}. ${a.name}: ${a.description}`)
    .join('\n')

  // Build customization section
  let customization = ''
  if (setting) {
    customization += `\nSETTING: The story takes place in/at: ${setting}`
  }
  if (customElements && customElements.length > 0) {
    customization += `\nINCLUDE THESE ELEMENTS: ${customElements.join(', ')}`
  }

  // Build additional characters section
  let charactersSection = ''
  if (storyCharacters && storyCharacters.length > 0) {
    const characterDescriptions = storyCharacters.map(c => {
      let desc = `- ${c.name} (${c.role})`
      if (c.relationship) desc += `: ${c.relationship}`
      if (c.description) desc += ` - ${c.description}`
      return desc
    }).join('\n')
    charactersSection = `\n\nADDITIONAL CHARACTERS TO INCLUDE:\n${characterDescriptions}`
  }

  return `You are a creative children's book author who creates magical, engaging stories for children.

Generate 4 different story ideas based on this custom story concept:
"${customStoryIdea}"

MAIN CHARACTER: ${characterName}, age ${characterAge}${charactersSection}${customization}

CREATE 4 DIFFERENT STORY IDEAS using these approaches (in this order):
${approachList}

REQUIREMENTS FOR EACH IDEA:
- Title: Catchy, memorable, age-appropriate (5-8 words max)
- Summary: 2-3 sentences explaining the story premise
- Feature ${characterName} as the main character${storyCharacters && storyCharacters.length > 0 ? `\n- Include the additional characters listed above in meaningful ways` : ''}
- Base the story on the user's custom idea above${setting ? `\n- Set the story in/at: ${setting}` : ''}${customElements && customElements.length > 0 ? `\n- Include these fun elements: ${customElements.join(', ')}` : ''}
- Make it engaging and fun for a ${characterAge}-year-old
- Each approach should feel distinctly different

VOCABULARY:
- For ages 2-4: Very simple concepts and words
- For ages 5-7: Simple but varied vocabulary
- For ages 8-12: More complex themes allowed

Be creative! Bring the user's story idea to life in 4 unique and exciting ways.`
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication FIRST
    const auth = await getAuthenticatedUser(request)
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    console.log(`[Storybook API] generate-ideas called by user ${user.id}`)

    const body: GenerateIdeasRequest = await request.json()
    const { characterName, characterAge, category, topic, customStoryIdea, setting, customElements, customNotes, storyCharacters } = body

    // Validate inputs
    if (!characterName?.trim()) {
      return NextResponse.json(
        { error: 'Character name is required' },
        { status: 400 }
      )
    }

    // Check if this is a custom story
    const isCustomStory = category === 'custom'

    // For custom stories, require customStoryIdea
    if (isCustomStory && !customStoryIdea?.trim()) {
      return NextResponse.json(
        { error: 'Custom story idea is required for custom stories' },
        { status: 400 }
      )
    }

    // For educational stories, require valid category and topic
    if (!isCustomStory) {
      if (!category || !topic) {
        return NextResponse.json(
          { error: 'Category and topic are required' },
          { status: 400 }
        )
      }

      // Get category and topic details
      const categoryData = getCategoryById(category)
      const topicData = getTopicById(category, topic)

      if (!categoryData || !topicData) {
        return NextResponse.json(
          { error: 'Invalid category or topic' },
          { status: 400 }
        )
      }
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      )
    }

    // Get 4 random approaches for variety
    const approaches = getRandomApproaches(4)

    // Build appropriate system prompt based on story type
    let systemPrompt: string
    let userMessage: string

    if (isCustomStory) {
      // Custom story - freeform
      systemPrompt = buildCustomSystemPrompt(
        characterName,
        characterAge,
        customStoryIdea!,
        approaches,
        setting,
        customElements,
        storyCharacters
      )
      userMessage = `Generate 4 story ideas for ${characterName}'s custom story: "${customStoryIdea}"`
    } else {
      // Educational story
      const categoryData = getCategoryById(category)!
      const topicData = getTopicById(category, topic)!

      systemPrompt = buildSystemPrompt(
        characterName,
        characterAge,
        categoryData.name,
        topicData.name,
        topicData.description,
        topicData.promptKeywords,
        approaches,
        setting,
        customElements,
        customNotes,
        storyCharacters
      )
      userMessage = `Generate 4 story ideas for ${characterName}'s book about ${topicData.name}.`
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://directors-palette.app',
        'X-Title': 'Directors Palette - Story Ideas'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        tools: [GENERATE_IDEAS_TOOL],
        tool_choice: { type: 'function', function: { name: 'generate_story_ideas' } }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter API error:', error)
      return NextResponse.json(
        { error: 'Failed to generate story ideas' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]

    if (!toolCall) {
      console.error('No tool call in response:', data)
      return NextResponse.json(
        { error: 'Failed to parse story ideas' },
        { status: 500 }
      )
    }

    try {
      const result = JSON.parse(toolCall.function.arguments)

      // Map the ideas with approach details
      const ideasWithApproaches: StoryIdea[] = result.ideas.map((idea: { title: string; summary: string }, index: number) => ({
        id: `idea_${Date.now()}_${index}`,
        approach: approaches[index].id,
        approachIcon: approaches[index].icon,
        title: idea.title,
        summary: idea.summary
      }))

      const responseData: GenerateIdeasResponse = {
        ideas: ideasWithApproaches
      }

      return NextResponse.json(responseData)
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse story ideas' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in generate-ideas:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
