/**
 * Perplexity Sonar API Test Endpoint
 * Tests various use cases to determine best integration points
 */

import { NextRequest, NextResponse } from 'next/server'

interface PerplexityRequest {
  testType: 'story_research' | 'character_research' | 'style_research' | 'fact_check' | 'wildcard'
  query: string
}

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface PerplexityResponse {
  id: string
  model: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  citations?: string[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

const TEST_PROMPTS: Record<string, { system: string; userTemplate: string }> = {
  story_research: {
    system: 'You are a children\'s book research assistant. Provide accurate, age-appropriate facts that can be woven into educational stories. Include specific details, fun facts, and engaging elements.',
    userTemplate: 'Research the following topic for a children\'s story (ages 4-8): {query}. Provide 5-7 interesting facts, common misconceptions to avoid, and story-friendly details.'
  },
  character_research: {
    system: 'You are a character design researcher. Help find real-world references and cultural details for creating authentic, diverse characters.',
    userTemplate: 'Research character details for: {query}. Include cultural context, typical clothing/accessories, physical characteristics, and any important cultural considerations for respectful representation.'
  },
  style_research: {
    system: 'You are an art style researcher specializing in illustration and visual design. Provide detailed information about art movements, techniques, and visual references.',
    userTemplate: 'Research the following art style for illustration reference: {query}. Include key characteristics, color palettes, notable artists, and how to achieve this look digitally.'
  },
  fact_check: {
    system: 'You are a fact-checker for children\'s educational content. Verify accuracy and provide corrections with sources.',
    userTemplate: 'Fact-check the following statement for a children\'s book: {query}. Is this accurate? Provide the correct information if not, with brief explanations suitable for children.'
  },
  wildcard: {
    system: 'You are a creative brainstorming assistant for children\'s media. Generate diverse, unexpected, and engaging ideas.',
    userTemplate: 'Generate 10 creative and unexpected ideas related to: {query}. Make them whimsical, educational, and suitable for children ages 4-8.'
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body: PerplexityRequest = await request.json()
    const { testType, query } = body

    if (!testType || !query) {
      return NextResponse.json(
        { error: 'testType and query are required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.PERPLEXITY_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Perplexity API key not configured' },
        { status: 500 }
      )
    }

    const promptConfig = TEST_PROMPTS[testType]
    if (!promptConfig) {
      return NextResponse.json(
        { error: `Invalid testType: ${testType}` },
        { status: 400 }
      )
    }

    const messages: PerplexityMessage[] = [
      { role: 'system', content: promptConfig.system },
      { role: 'user', content: promptConfig.userTemplate.replace('{query}', query) }
    ]

    console.log(`[Perplexity Test] Type: ${testType}, Query: ${query}`)

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'sonar',  // Latest Sonar model
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        return_citations: true,
        search_recency_filter: 'month'  // Prefer recent information
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Perplexity Test] API Error:', errorText)
      return NextResponse.json(
        { error: `Perplexity API error: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const data: PerplexityResponse = await response.json()
    const endTime = Date.now()
    const responseTime = endTime - startTime

    return NextResponse.json({
      success: true,
      testType,
      query,
      response: data.choices[0]?.message?.content || '',
      citations: data.citations || [],
      model: data.model,
      usage: data.usage,
      responseTimeMs: responseTime,
      metadata: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
        citationCount: data.citations?.length || 0
      }
    })
  } catch (error) {
    console.error('[Perplexity Test] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET endpoint to list available test types
export async function GET() {
  return NextResponse.json({
    availableTests: Object.keys(TEST_PROMPTS),
    description: {
      story_research: 'Research topics for children\'s stories - facts, details, engaging elements',
      character_research: 'Research for authentic character design - cultural context, visual details',
      style_research: 'Research art styles - techniques, color palettes, visual references',
      fact_check: 'Verify facts in children\'s educational content',
      wildcard: 'Generate creative, unexpected ideas for children\'s content'
    },
    usage: 'POST with { testType: string, query: string }'
  })
}
