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
 * Generate story structure guidance based on page count
 * Provides beat-by-beat pacing for different book lengths
 */
function getStoryStructureGuidance(characterName: string, pageCount: number): string {
  if (pageCount <= 12) {
    // Short story (12 pages)
    return `STORY PACING (12-page structure):
- Pages 1-2: SETUP - Introduce ${characterName}, their world, and hint at the problem
- Pages 3-4: INCITING INCIDENT - Something happens that starts the adventure
- Pages 5-6: FIRST ATTEMPT - ${characterName} tries to solve the problem (fails or partial success)
- Pages 7-8: ESCALATION - Things get harder, stakes increase
- Pages 9-10: CLIMAX - The big moment, ${characterName} faces the main challenge
- Pages 11-12: RESOLUTION - Problem solved, lesson learned, satisfying ending`
  } else if (pageCount <= 24) {
    // Standard picture book (24 pages)
    return `STORY PACING (24-page structure - Standard Picture Book):
- Pages 1-3: OPENING - Introduce ${characterName}, their personality, and everyday world
- Pages 4-6: SETUP - Establish the situation, hint at what ${characterName} wants or needs
- Pages 7-9: INCITING INCIDENT - Something disrupts the normal, adventure begins
- Pages 10-12: FIRST CHALLENGE - ${characterName} faces first obstacle (Rule of Three: attempt 1)
- Pages 13-15: RISING ACTION - Stakes increase, second attempt (Rule of Three: attempt 2)
- Pages 16-18: MIDPOINT TWIST - Something changes, new information or setback
- Pages 19-20: DARK MOMENT - Things look hopeless, ${characterName} must dig deep
- Pages 21-22: CLIMAX - Final attempt, ${characterName} overcomes the challenge (Rule of Three: attempt 3)
- Pages 23-24: RESOLUTION - Celebration, lesson learned, return home transformed

PACING TIPS:
- Each spread (2 pages) should have one clear story beat
- Vary emotional tone: funny → tense → heartwarming
- End odd pages with mini-cliffhangers to encourage page turning`
  } else if (pageCount <= 28) {
    // Extended picture book (28 pages)
    return `STORY PACING (28-page structure - Extended Picture Book):
- Pages 1-3: OPENING - Introduce ${characterName}, their personality, world, and daily life
- Pages 4-6: DESIRE - Show what ${characterName} wants or needs (the story goal)
- Pages 7-9: INCITING INCIDENT - The call to adventure, something changes everything
- Pages 10-12: FIRST CHALLENGE - ${characterName} faces first obstacle, learns something
- Pages 13-15: ALLY/MENTOR - ${characterName} meets someone who helps or teaches
- Pages 16-18: RISING ACTION - Bigger challenges, stakes increase
- Pages 19-21: MIDPOINT REVELATION - A twist, new information changes the approach
- Pages 22-23: DARK MOMENT - All seems lost, ${characterName} must find inner strength
- Pages 24-25: CLIMAX - The big confrontation or final challenge
- Pages 26-27: RESOLUTION - Victory! The problem is solved
- Page 28: EPILOGUE - Brief glimpse of the new normal, lesson reinforced

PACING TIPS:
- Build emotional investment in first third
- Escalate tension in middle third
- Deliver satisfying payoff in final third`
  } else {
    // Long-form picture book (32 pages)
    return `STORY PACING (32-page structure - Long-Form Picture Book):
- Pages 1-4: WORLD BUILDING - Introduce ${characterName}, their personality, relationships, and world
- Pages 5-7: DESIRE & STAKES - What ${characterName} wants and why it matters
- Pages 8-10: INCITING INCIDENT - The event that launches the adventure
- Pages 11-13: FIRST CHALLENGE - Initial obstacle, first lesson learned
- Pages 14-16: ALLY/MENTOR - Someone joins or helps ${characterName}
- Pages 17-19: RISING ACTION - Challenges escalate, skills are tested
- Pages 20-22: MIDPOINT TWIST - Major revelation or setback changes everything
- Pages 23-25: DARK MOMENT - Crisis point, ${characterName} doubts themselves
- Pages 26-27: RALLY - ${characterName} finds courage, makes a plan
- Pages 28-29: CLIMAX - The ultimate challenge is faced
- Pages 30-31: RESOLUTION - Victory and its immediate aftermath
- Page 32: EPILOGUE - The new normal, growth shown, door open for more adventures

PACING TIPS:
- Use subplots or secondary characters for depth
- Create memorable set pieces every 4-5 pages
- Each spread should move the story forward
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

${getStoryStructureGuidance(characterName, pageCount)}

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
    charactersSection = `\n\nADDITIONAL CHARACTERS (must appear in the story):\n${characterDescriptions}\nMake sure each additional character plays a meaningful role in at least 2-3 pages.`
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

${getStoryStructureGuidance(characterName, pageCount)}

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
      userMessage = `Generate a ${pageCount}-page story for ${characterName} about ${topicData.name}. Each page should have exactly ${sentencesPerPage} sentence(s).`
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
