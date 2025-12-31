/**
 * Story Generation API
 * Generates a complete children's story based on user selections
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getCategoryById,
  getTopicById,
  type PageCount,
  type SentencesPerPage,
  type GeneratedStory,
  type GeneratedStoryPage
} from '@/features/storybook/types/education.types'
import type { StoryCharacterInput } from '@/features/storybook/types/storybook.types'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'

interface GenerateStoryRequest {
  characterName: string
  characterAge: number
  category: string
  topic: string
  pageCount: PageCount
  sentencesPerPage: SentencesPerPage
  approach: string
  approachTitle?: string
  approachSummary?: string
  // Customization options (from BookSettingsStep)
  setting?: string
  customElements?: string[]
  customNotes?: string
  // For custom stories
  customStoryIdea?: string
  // Additional story characters
  storyCharacters?: StoryCharacterInput[]
}

// Tool schema for structured output
const GENERATE_STORY_TOOL = {
  type: 'function' as const,
  function: {
    name: 'generate_story',
    description: 'Generate a complete children\'s story with pages',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The title of the story'
        },
        summary: {
          type: 'string',
          description: 'A brief summary of the story (1-2 sentences)'
        },
        pages: {
          type: 'array',
          description: 'Array of story pages',
          items: {
            type: 'object',
            properties: {
              pageNumber: {
                type: 'number',
                description: 'The page number (starting from 1)'
              },
              text: {
                type: 'string',
                description: 'The story text for this page'
              },
              sceneDescription: {
                type: 'string',
                description: 'Visual description of the scene for image generation'
              },
              learningNote: {
                type: 'string',
                description: 'Optional educational callout or interactive prompt for the reader'
              }
            },
            required: ['pageNumber', 'text', 'sceneDescription']
          }
        }
      },
      required: ['title', 'summary', 'pages']
    }
  }
}

function buildSystemPrompt(
  characterName: string,
  characterAge: number,
  categoryId: string,
  categoryName: string,
  topicName: string,
  topicDescription: string,
  topicKeywords: string[],
  pageCount: number,
  sentencesPerPage: number,
  approach: string,
  approachTitle?: string,
  approachSummary?: string,
  setting?: string,
  customElements?: string[],
  customNotes?: string,
  storyCharacters?: StoryCharacterInput[]
): string {
  // Category-specific guidance
  let categoryGuidance = ''
  switch (categoryId) {
    case 'math':
      categoryGuidance = `
MATH STORY REQUIREMENTS:
- Naturally integrate ${topicName} into the narrative
- Include interactive counting/math prompts: "Can you count the [objects] with ${characterName}?"
- Make numbers visible and countable in each scene description
- Reinforce the skill progressively throughout the story
- Include a learningNote on each page with a math question or activity`
      break
    case 'reading':
      categoryGuidance = `
READING STORY REQUIREMENTS:
- For phonics: Repeat target sounds (${topicKeywords.join(', ')}) throughout
- For sight words: Bold or emphasize key words, repeat 3+ times
- For rhyming: Include rhyming pairs on each page
- Include word play and repetition appropriate for learning
- Include a learningNote highlighting the reading skill on each page`
      break
    case 'narrative':
      categoryGuidance = `
NARRATIVE STORY REQUIREMENTS:
- Teach the lesson of ${topicName} naturally through the story
- Follow the Rule of Three: ${characterName} tries 3 times before succeeding
- Don't explicitly state the moral - let it emerge from the story
- ${characterName} should grow and learn the lesson by the end
- Clear emotional journey: problem → struggle → resolution`
      break
    case 'science':
      categoryGuidance = `
SCIENCE STORY REQUIREMENTS:
- Introduce scientific concepts about ${topicName} naturally
- Include age-appropriate facts and discoveries
- Encourage curiosity and observation
- Include a learningNote with a fun fact or question on each page`
      break
    case 'social':
      categoryGuidance = `
SOCIAL SKILLS REQUIREMENTS:
- Model appropriate social behavior through ${characterName}'s actions
- Show realistic social situations a ${characterAge}-year-old would encounter
- Include emotional vocabulary appropriate for the age
- Demonstrate positive outcomes from good social choices`
      break
    case 'creativity':
      categoryGuidance = `
CREATIVITY REQUIREMENTS:
- Inspire imagination and creative thinking
- Include sensory descriptions that spark creativity
- Encourage the reader to imagine, create, or participate
- Leave room for the child's own creative interpretation`
      break
    default:
      categoryGuidance = ''
  }

  // Vocabulary guidance based on age
  let vocabularyGuidance = ''
  if (characterAge <= 3) {
    vocabularyGuidance = 'Use very simple words (1-2 syllables), short sentences, lots of repetition. Simple concepts only.'
  } else if (characterAge <= 5) {
    vocabularyGuidance = 'Use simple words with some variety. Short to medium sentences. Repetitive patterns help.'
  } else if (characterAge <= 7) {
    vocabularyGuidance = 'Use varied vocabulary appropriate for early readers. Medium-length sentences. Some challenge is good.'
  } else {
    vocabularyGuidance = 'Use richer vocabulary. Longer, more complex sentences allowed. Can handle nuanced emotions.'
  }

  const storyContext = approachTitle && approachSummary
    ? `\nSTORY PREMISE (use this as your guide):\nTitle: ${approachTitle}\nPremise: ${approachSummary}`
    : `\nAPPROACH: ${approach}`

  // Build customization section
  let customizationSection = ''
  if (setting) {
    customizationSection += `\nSTORY SETTING: Set the story in/at: ${setting}`
  }
  if (customElements && customElements.length > 0) {
    customizationSection += `\nINCLUDE THESE ELEMENTS: ${customElements.join(', ')} - weave these into the story naturally`
  }
  if (customNotes) {
    customizationSection += `\nSPECIAL REQUESTS FROM PARENT: ${customNotes}`
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
    charactersSection = `\n\nADDITIONAL CHARACTERS (must appear in the story):\n${characterDescriptions}\nMake sure each additional character plays a meaningful role in at least 2-3 pages.`
  }

  return `You are an expert children's book author creating educational content.

MAIN CHARACTER: ${characterName}, age ${characterAge}${charactersSection}
CATEGORY: ${categoryName}
TOPIC: ${topicName} - ${topicDescription}
KEYWORDS: ${topicKeywords.join(', ')}
${storyContext}${customizationSection}

STORY STRUCTURE:
- NUMBER OF PAGES: Exactly ${pageCount} pages
- SENTENCES PER PAGE: Exactly ${sentencesPerPage} sentences per page
- Total story length: ${pageCount * sentencesPerPage} sentences

VOCABULARY GUIDANCE:
${vocabularyGuidance}
${categoryGuidance}

REQUIREMENTS FOR EACH PAGE:
1. text: Exactly ${sentencesPerPage} sentence(s) of story content
2. sceneDescription: Detailed visual description for AI image generation including:
   - Character positions, expressions, actions
   - Setting details (time of day, weather, environment)
   - Key objects that should be visible
   - Color palette suggestions
3. learningNote (optional but encouraged): Interactive prompt or educational callout

STORY STRUCTURE:
- Beginning (first 1-2 pages): Introduce ${characterName} and the situation
- Middle (${pageCount - 3} pages): The adventure/learning unfolds
- End (last 1-2 pages): Resolution and what ${characterName} learned

Make the story engaging, fun, and educational for a ${characterAge}-year-old!`
}

// Build system prompt for CUSTOM stories (freeform, non-educational)
function buildCustomSystemPrompt(
  characterName: string,
  characterAge: number,
  pageCount: number,
  sentencesPerPage: number,
  customStoryIdea: string,
  approachTitle?: string,
  approachSummary?: string,
  setting?: string,
  customElements?: string[],
  storyCharacters?: StoryCharacterInput[]
): string {
  // Vocabulary guidance based on age
  let vocabularyGuidance = ''
  if (characterAge <= 3) {
    vocabularyGuidance = 'Use very simple words (1-2 syllables), short sentences, lots of repetition.'
  } else if (characterAge <= 5) {
    vocabularyGuidance = 'Use simple words with some variety. Short to medium sentences.'
  } else if (characterAge <= 7) {
    vocabularyGuidance = 'Use varied vocabulary. Medium-length sentences. Some challenge is good.'
  } else {
    vocabularyGuidance = 'Use richer vocabulary. Longer, more complex sentences allowed.'
  }

  const storyContext = approachTitle && approachSummary
    ? `\nSTORY PREMISE (use this as your guide):\nTitle: ${approachTitle}\nPremise: ${approachSummary}`
    : `\nSTORY CONCEPT: ${customStoryIdea}`

  // Build customization section
  let customizationSection = ''
  if (setting) {
    customizationSection += `\nSTORY SETTING: Set the story in/at: ${setting}`
  }
  if (customElements && customElements.length > 0) {
    customizationSection += `\nINCLUDE THESE ELEMENTS: ${customElements.join(', ')} - weave these into the story naturally`
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
    charactersSection = `\n\nADDITIONAL CHARACTERS (must appear in the story):\n${characterDescriptions}\nMake sure each additional character plays a meaningful role in at least 2-3 pages.`
  }

  return `You are a creative children's book author who writes magical, engaging stories.

MAIN CHARACTER: ${characterName}, age ${characterAge}${charactersSection}
${storyContext}${customizationSection}

STORY STRUCTURE:
- NUMBER OF PAGES: Exactly ${pageCount} pages
- SENTENCES PER PAGE: Exactly ${sentencesPerPage} sentences per page
- Total story length: ${pageCount * sentencesPerPage} sentences

VOCABULARY GUIDANCE:
${vocabularyGuidance}

REQUIREMENTS FOR EACH PAGE:
1. text: Exactly ${sentencesPerPage} sentence(s) of story content
2. sceneDescription: Detailed visual description for AI image generation including:
   - Character positions, expressions, actions
   - Setting details (time of day, weather, environment)
   - Key objects that should be visible
   - Color palette suggestions
3. learningNote (optional): Fun fact, question, or interactive prompt

STORY STRUCTURE:
- Beginning (first 1-2 pages): Introduce ${characterName} and the situation
- Middle (${pageCount - 3} pages): The adventure unfolds
- End (last 1-2 pages): Satisfying resolution

Create a fun, imaginative story that a ${characterAge}-year-old will love!`
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

    console.log(`[Storybook API] generate-story (GPT-4o) called by user ${user.id}`)

    const body: GenerateStoryRequest = await request.json()
    const {
      characterName,
      characterAge,
      category,
      topic,
      pageCount,
      sentencesPerPage,
      approach,
      approachTitle,
      approachSummary,
      setting,
      customElements,
      customNotes,
      customStoryIdea,
      storyCharacters
    } = body

    // Validate inputs
    if (!characterName?.trim()) {
      return NextResponse.json(
        { error: 'Character name is required' },
        { status: 400 }
      )
    }

    if (!pageCount || !sentencesPerPage) {
      return NextResponse.json(
        { error: 'Page count and sentences per page are required' },
        { status: 400 }
      )
    }

    // Check if this is a custom story
    const isCustomStory = category === 'custom'

    // For custom stories, require customStoryIdea
    if (isCustomStory && !customStoryIdea?.trim() && !approachSummary) {
      return NextResponse.json(
        { error: 'Custom story idea is required for custom stories' },
        { status: 400 }
      )
    }

    // For educational stories, require valid category and topic
    if (!isCustomStory && (!category || !topic)) {
      return NextResponse.json(
        { error: 'Category and topic are required' },
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

    // Build appropriate system prompt and user message
    let systemPrompt: string
    let userMessage: string

    if (isCustomStory) {
      // Custom story - freeform
      systemPrompt = buildCustomSystemPrompt(
        characterName,
        characterAge,
        pageCount,
        sentencesPerPage,
        customStoryIdea || approachSummary || '',
        approachTitle,
        approachSummary,
        setting,
        customElements,
        storyCharacters
      )
      userMessage = `Generate a ${pageCount}-page custom story for ${characterName}. Each page should have exactly ${sentencesPerPage} sentence(s).`
    } else {
      // Educational story
      const categoryData = getCategoryById(category)
      const topicData = getTopicById(category, topic)

      if (!categoryData || !topicData) {
        return NextResponse.json(
          { error: 'Invalid category or topic' },
          { status: 400 }
        )
      }

      systemPrompt = buildSystemPrompt(
        characterName,
        characterAge,
        category,
        categoryData.name,
        topicData.name,
        topicData.description,
        topicData.promptKeywords,
        pageCount,
        sentencesPerPage,
        approach,
        approachTitle,
        approachSummary,
        setting,
        customElements,
        customNotes,
        storyCharacters
      )
      userMessage = `Generate a ${pageCount}-page story for ${characterName} about ${topicData.name}. Each page should have exactly ${sentencesPerPage} sentence(s).`
    }

    // Use GPT-4o for better story quality (not mini)
    const openRouterStart = Date.now()
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://directors-palette.app',
        'X-Title': 'Directors Palette - Story Generation'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o', // Use full GPT-4o for better story quality
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        tools: [GENERATE_STORY_TOOL],
        tool_choice: { type: 'function', function: { name: 'generate_story' } }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter API error:', error)

      // Log OpenRouter failure
      lognog.integration({
        integration: 'openrouter',
        success: false,
        latency_ms: Date.now() - openRouterStart,
        http_status: response.status,
        model: 'openai/gpt-4o',
        error,
        user_id: userId,
        user_email: userEmail,
      })

      return NextResponse.json(
        { error: 'Failed to generate story' },
        { status: 500 }
      )
    }

    // Log OpenRouter success
    lognog.integration({
      integration: 'openrouter',
      success: true,
      latency_ms: Date.now() - openRouterStart,
      http_status: 200,
      model: 'openai/gpt-4o',
      prompt_length: systemPrompt.length + userMessage.length,
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
      const result = JSON.parse(toolCall.function.arguments)

      // Ensure pages are properly numbered
      const pages: GeneratedStoryPage[] = result.pages.map((page: GeneratedStoryPage, index: number) => ({
        pageNumber: index + 1,
        text: page.text,
        sceneDescription: page.sceneDescription,
        learningNote: page.learningNote
      }))

      const story: GeneratedStory = {
        title: result.title,
        summary: result.summary,
        pages
      }

      // Log story generation success
      lognog.business({
        event: 'story_generated',
        user_id: userId,
        user_email: userEmail,
        category: category,
        topic: topic,
        character_name: characterName,
        character_age: characterAge,
        page_count: pageCount,
        sentences_per_page: sentencesPerPage,
        generated_title: result.title,
      })

      // Log API success
      lognog.api({
        route: '/api/storybook/generate-story',
        method: 'POST',
        status_code: 200,
        duration_ms: Date.now() - apiStart,
        user_id: userId,
        user_email: userEmail,
        integration: 'openrouter',
        model: 'openai/gpt-4o',
      })

      return NextResponse.json(story)
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse generated story' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in generate-story:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log error
    lognog.error({
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      route: '/api/storybook/generate-story',
      user_id: userId,
      user_email: userEmail,
    })

    // Log API failure
    lognog.api({
      route: '/api/storybook/generate-story',
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
