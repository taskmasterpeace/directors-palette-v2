/**
 * Mandate Service
 * Parses a creative brief into a structured CreativeMandate using OpenRouter tool calling
 */

import type { CreativeMandate } from '../types/ad-lab.types'

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenRouterTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

interface OpenRouterResponse {
  id: string
  choices: Array<{
    message: {
      role: string
      content: string | null
      tool_calls?: Array<{
        id: string
        type: 'function'
        function: {
          name: string
          arguments: string
        }
      }>
    }
    finish_reason: string
  }>
}

const MANDATE_TOOL: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'create_mandate',
    description: 'Create a structured creative mandate from a brand brief',
    parameters: {
      type: 'object',
      properties: {
        audienceDemographics: {
          type: 'string',
          description: 'Target audience demographics: age range, gender split, income level, interests, platforms they use'
        },
        primaryPainPoint: {
          type: 'string',
          description: 'The core problem or pain point the product/service solves for the audience. Be specific.'
        },
        brandVoice: {
          type: 'string',
          description: 'Brand tone and voice: e.g., "bold and irreverent", "warm and empathetic", "premium and aspirational"'
        },
        forbiddenWords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Words or phrases that must NOT appear in any ad copy (competitor names, negative terms, off-brand language)'
        },
        durationStrategy: {
          type: 'object',
          properties: {
            '5s': { type: 'string', description: 'Strategy for 5-second ads: what to prioritize in ultra-short format' },
            '15s': { type: 'string', description: 'Strategy for 15-second ads: how to structure the narrative arc' },
            '30s': { type: 'string', description: 'Strategy for 30-second ads: full story structure with beats' }
          },
          required: ['5s', '15s', '30s']
        },
        platformConstraints: {
          type: 'object',
          properties: {
            '16:9': { type: 'string', description: 'Notes for landscape (YouTube, desktop): framing, text placement, visual hierarchy' },
            '9:16': { type: 'string', description: 'Notes for vertical (TikTok, Reels, Shorts): mobile-first design considerations' }
          },
          required: ['16:9', '9:16']
        }
      },
      required: ['audienceDemographics', 'primaryPainPoint', 'brandVoice', 'forbiddenWords', 'durationStrategy', 'platformConstraints']
    }
  }
}

const MANDATE_SYSTEM_PROMPT = `You are an expert creative strategist for video advertising. Given a brand brief, extract and structure a creative mandate that will guide the generation of 12 video ad prompts (2 aspect ratios × 3 durations × 2 A/B variants).

Analyze the brief thoroughly and produce:
1. Audience demographics - be specific about who we're targeting
2. Primary pain point - the core problem being solved
3. Brand voice - how the brand should sound and feel
4. Forbidden words - terms to avoid (competitors, negative associations, off-brand language)
5. Duration strategy - what works best for 5s, 15s, and 30s formats
6. Platform constraints - specific notes for 16:9 (landscape/desktop) and 9:16 (vertical/mobile)

If the brief is vague on any dimension, make intelligent inferences based on the product/service category. Never leave a field empty.`

export class MandateService {
  private apiKey: string
  private model: string
  private baseUrl = 'https://openrouter.ai/api/v1'

  constructor(apiKey: string, model: string = 'openai/gpt-4.1-mini') {
    this.apiKey = apiKey
    this.model = model
  }

  async parseBrief(briefText: string): Promise<CreativeMandate> {
    const messages: OpenRouterMessage[] = [
      { role: 'system', content: MANDATE_SYSTEM_PROMPT },
      { role: 'user', content: `Parse this creative brief into a structured mandate:\n\n${briefText}` }
    ]

    const response = await this.callWithTool(messages, MANDATE_TOOL)
    const toolCall = response.choices[0]?.message?.tool_calls?.[0]
    if (!toolCall) {
      throw new Error('No structured output returned from LLM')
    }

    return JSON.parse(toolCall.function.arguments) as CreativeMandate
  }

  private async callWithTool(
    messages: OpenRouterMessage[],
    tool: OpenRouterTool
  ): Promise<OpenRouterResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://directors-palette.app',
        'X-Title': 'Directors Palette - Ad Lab'
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        tools: [tool],
        tool_choice: { type: 'function', function: { name: tool.function.name } }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = errorText
      try {
        const errorJson = JSON.parse(errorText)
        errorMessage = errorJson.error?.message || errorJson.message || errorText
      } catch {
        // Keep raw text
      }
      throw new Error(`OpenRouter API error: ${response.status} - ${errorMessage}`)
    }

    return response.json()
  }
}

export function createMandateService(apiKey?: string, model?: string): MandateService {
  const key = apiKey || process.env.OPENROUTER_API_KEY || ''
  const selectedModel = model || 'openai/gpt-4.1-mini'
  if (!key) throw new Error('OpenRouter API key is required')
  return new MandateService(key, selectedModel)
}
