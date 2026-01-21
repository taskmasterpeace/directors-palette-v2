/**
 * Story Generation API
 * Generates a complete children's story based on user selections
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getCategoryById,
  getTopicById,
  calculateStoryBeats,
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
  characterDescription?: string  // Visual description of main character
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

/**
 * Generate story structure guidance based on beat count
 * Provides beat-by-beat pacing for different book lengths
 * @param characterName - The main character's name
 * @param beatCount - Number of story beats (spreads), not pages
 */
function getStoryStructureGuidance(characterName: string, beatCount: number): string {
  if (beatCount <= 6) {
    // Short story (6 beats = 12 pages)
    return `STORY PACING (6 beats):
- Beat 1: SETUP - Introduce ${characterName}, their world, and hint at the problem
- Beat 2: INCITING INCIDENT - Something happens that starts the adventure
- Beat 3: FIRST ATTEMPT - ${characterName} tries to solve the problem (fails or partial success)
- Beat 4: ESCALATION - Things get harder, stakes increase
- Beat 5: CLIMAX - The big moment, ${characterName} faces the main challenge
- Beat 6: RESOLUTION - Problem solved, lesson learned, satisfying ending`
  } else if (beatCount <= 12) {
    // Standard picture book (12 beats = 24 pages)
    return `STORY PACING (12 beats - Standard Picture Book):
- Beat 1: OPENING - Introduce ${characterName} and their everyday world
- Beat 2: SETUP - Establish what ${characterName} wants or needs
- Beat 3: INCITING INCIDENT - Something disrupts the normal, adventure begins
- Beat 4: FIRST CHALLENGE - ${characterName} faces first obstacle (attempt 1)
- Beat 5: COMPLICATION - Things don't go as planned
- Beat 6: RISING ACTION - Stakes increase, second attempt (attempt 2)
- Beat 7: MIDPOINT TWIST - Something changes, new information or setback
- Beat 8: DARK MOMENT - Things look hopeless
- Beat 9: RALLY - ${characterName} finds courage, new approach
- Beat 10: CLIMAX - Final attempt, ${characterName} overcomes (attempt 3)
- Beat 11: RESOLUTION - Victory! The problem is solved
- Beat 12: ENDING - Lesson learned, new normal established

PACING TIPS:
- Each beat = one spread (2 pages)
- Vary emotional tone: funny → tense → heartwarming
- End each beat with something that makes reader want to continue`
  } else if (beatCount <= 14) {
    // Extended picture book (14 beats = 28 pages)
    return `STORY PACING (14 beats - Extended Picture Book):
- Beat 1: OPENING - Introduce ${characterName}, personality, and world
- Beat 2: DESIRE - Show what ${characterName} wants (the story goal)
- Beat 3: INCITING INCIDENT - The call to adventure begins
- Beat 4: FIRST CHALLENGE - ${characterName} faces first obstacle
- Beat 5: LEARNING - ${characterName} learns something important
- Beat 6: ALLY/MENTOR - ${characterName} meets someone who helps
- Beat 7: RISING ACTION - Bigger challenges, stakes increase
- Beat 8: MIDPOINT - A twist changes the approach
- Beat 9: SETBACK - Things go wrong
- Beat 10: DARK MOMENT - All seems lost
- Beat 11: RALLY - ${characterName} finds inner strength
- Beat 12: CLIMAX - The big confrontation
- Beat 13: RESOLUTION - Victory and aftermath
- Beat 14: EPILOGUE - New normal, lesson reinforced

PACING TIPS:
- Build emotional investment in first third
- Escalate tension in middle third
- Deliver satisfying payoff in final third`
  } else {
    // Long-form picture book (16 beats = 32 pages)
    return `STORY PACING (16 beats - Long-Form Picture Book):
- Beat 1: WORLD BUILDING - Introduce ${characterName} and their world
- Beat 2: CHARACTER - Show ${characterName}'s personality and relationships
- Beat 3: DESIRE - What ${characterName} wants and why it matters
- Beat 4: INCITING INCIDENT - The event that launches the adventure
- Beat 5: FIRST CHALLENGE - Initial obstacle
- Beat 6: LEARNING - First lesson learned
- Beat 7: ALLY/MENTOR - Someone joins or helps ${characterName}
- Beat 8: RISING ACTION - Challenges escalate
- Beat 9: MIDPOINT TWIST - Major revelation or setback
- Beat 10: COMPLICATIONS - New problems arise
- Beat 11: DARK MOMENT - Crisis point, ${characterName} doubts themselves
- Beat 12: RALLY - ${characterName} finds courage, makes a plan
- Beat 13: APPROACH - Moving toward the final challenge
- Beat 14: CLIMAX - The ultimate challenge is faced
- Beat 15: RESOLUTION - Victory and its aftermath
- Beat 16: EPILOGUE - The new normal, growth shown

PACING TIPS:
- Use subplots or secondary characters for depth
- Create memorable moments every 3-4 beats
- Balance action with emotional beats
- The longer format allows for richer character development`
  }
}

function buildSystemPrompt(
  characterName: string,
  characterAge: number,
  characterDescription: string | undefined,
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

  // Build main character description line
  let mainCharacterLine = `MAIN CHARACTER: ${characterName}, age ${characterAge}`
  if (characterDescription?.trim()) {
    mainCharacterLine += ` — ${characterDescription}`
  }

  return `You are an expert children's book author creating educational content.

${mainCharacterLine}${charactersSection}
CATEGORY: ${categoryName}
TOPIC: ${topicName} - ${topicDescription}
KEYWORDS: ${topicKeywords.join(', ')}
${storyContext}${customizationSection}

STORY STRUCTURE:
- NUMBER OF STORY BEATS: Exactly ${calculateStoryBeats(pageCount)} beats (one per spread)
- This creates a ${pageCount}-page book with ${calculateStoryBeats(pageCount)} spreads
- SENTENCES PER BEAT: ${sentencesPerPage} sentence(s) per beat
- Total story length: ~${calculateStoryBeats(pageCount) * sentencesPerPage} sentences (~${calculateStoryBeats(pageCount) * sentencesPerPage * 10} words)

VOCABULARY GUIDANCE:
${vocabularyGuidance}
${categoryGuidance}

WHAT IS A STORY BEAT?
A "beat" is one story moment that will span a 2-page spread in the final book.
Each beat has text + an image. User will decide text placement (left page, right page, or both) later.

REQUIREMENTS FOR EACH BEAT:
1. text: ${sentencesPerPage} sentence(s) - this is the story text for this spread
2. sceneDescription: Detailed visual description for the spread illustration:
   - Character positions, expressions, actions
   - Setting details (time of day, weather, environment)
   - Key objects that should be visible
   - Mood and color palette
   - This image will span TWO pages as a spread
3. learningNote (optional): Interactive prompt or educational callout

${getStoryStructureGuidance(characterName, calculateStoryBeats(pageCount))}

Make the story engaging, fun, and educational for a ${characterAge}-year-old!`
}

// Build system prompt for CUSTOM stories (freeform, non-educational)
function buildCustomSystemPrompt(
  characterName: string,
  characterAge: number,
  characterDescription: string | undefined,
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
    charactersSection = `\n\nADDITIONAL CHARACTERS (must appear in the story):\n${characterDescriptions}\nMake sure each additional character plays a meaningful role in at least 2-3 beats.`
  }

  // Build main character description line
  let mainCharacterLine = `MAIN CHARACTER: ${characterName}, age ${characterAge}`
  if (characterDescription?.trim()) {
    mainCharacterLine += ` — ${characterDescription}`
  }

  return `You are a creative children's book author who writes magical, engaging stories.

${mainCharacterLine}${charactersSection}
${storyContext}${customizationSection}

STORY STRUCTURE:
- NUMBER OF STORY BEATS: Exactly ${calculateStoryBeats(pageCount)} beats (one per spread)
- This creates a ${pageCount}-page book with ${calculateStoryBeats(pageCount)} spreads
- SENTENCES PER BEAT: ${sentencesPerPage} sentence(s) per beat
- Total story length: ~${calculateStoryBeats(pageCount) * sentencesPerPage} sentences (~${calculateStoryBeats(pageCount) * sentencesPerPage * 10} words)

VOCABULARY GUIDANCE:
${vocabularyGuidance}

WHAT IS A STORY BEAT?
A "beat" is one story moment that will span a 2-page spread in the final book.
Each beat has text + an image. User will decide text placement (left page, right page, or both) later.

REQUIREMENTS FOR EACH BEAT:
1. text: ${sentencesPerPage} sentence(s) - this is the story text for this spread
2. sceneDescription: Detailed visual description for the spread illustration:
   - Character positions, expressions, actions
   - Setting details (time of day, weather, environment)
   - Key objects that should be visible
   - Mood and color palette
   - This image will span TWO pages as a spread
3. learningNote (optional): Fun fact, question, or interactive prompt

${getStoryStructureGuidance(characterName, calculateStoryBeats(pageCount))}

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
      characterDescription,
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
        characterDescription,
        pageCount,
        sentencesPerPage,
        customStoryIdea || approachSummary || '',
        approachTitle,
        approachSummary,
        setting,
        customElements,
        storyCharacters
      )
      userMessage = `Generate a ${calculateStoryBeats(pageCount)}-beat story for ${characterName} (${pageCount} pages, ${calculateStoryBeats(pageCount)} spreads). Each beat should have exactly ${sentencesPerPage} sentence(s).`
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
        characterDescription,
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
      userMessage = `Generate a ${calculateStoryBeats(pageCount)}-beat story for ${characterName} about ${topicData.name} (${pageCount} pages, ${calculateStoryBeats(pageCount)} spreads). Each beat should have exactly ${sentencesPerPage} sentence(s).`
    }

    // Use GPT-4o-mini (fast, cheap, good enough for children's stories)
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
        model: 'openai/gpt-4o-mini', // Fast and cheap, perfect for children's stories
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
      lognog.warn(`openrouter FAIL ${Date.now() - openRouterStart}ms openai/gpt-4o-mini`, {
        type: 'integration',
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
        { error: 'Failed to generate story' },
        { status: 500 }
      )
    }

    // Log OpenRouter success
    lognog.debug(`openrouter OK ${Date.now() - openRouterStart}ms openai/gpt-4o-mini`, {
      type: 'integration',
      integration: 'openrouter',
      success: true,
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
      lognog.info('story_generated', {
        type: 'business',
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
      lognog.info(`POST /api/storybook/generate-story 200 (${Date.now() - apiStart}ms)`, {
        type: 'api',
        route: '/api/storybook/generate-story',
        method: 'POST',
        status_code: 200,
        duration_ms: Date.now() - apiStart,
        user_id: userId,
        user_email: userEmail,
        integration: 'openrouter',
        model: 'openai/gpt-4o-mini',
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
    lognog.error(errorMessage, {
      type: 'error',
      stack: error instanceof Error ? error.stack : undefined,
      route: '/api/storybook/generate-story',
      user_id: userId,
      user_email: userEmail,
    })

    // Log API failure
    lognog.info(`POST /api/storybook/generate-story 500 (${Date.now() - apiStart}ms)`, {
      type: 'api',
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
