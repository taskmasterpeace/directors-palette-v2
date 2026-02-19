/**
 * Matrix Service
 * Generates 12 ad prompts (2 ratios × 3 durations × 2 A/B variants) from a creative mandate
 */

import type { CreativeMandate, AdPrompt } from '../types/ad-lab.types'

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

const PROMPT_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    aspectRatio: { type: 'string', enum: ['16:9', '9:16'] },
    duration: { type: 'string', enum: ['5s', '15s', '30s'] },
    variant: { type: 'string', enum: ['A', 'B'] },
    openingFrame: { type: 'string', description: 'Vivid visual description of the first frame (2-3 sentences). MUST be unique across all 12 prompts.' },
    fullPrompt: { type: 'string', description: 'Complete video ad prompt with visual direction, pacing, and mood. 3-6 sentences.' },
    beatTimings: { type: 'array', items: { type: 'string' }, description: 'Key visual beats with timestamps' },
    cameraWork: { type: 'string', description: 'Camera movement and framing notes' },
    textOverlays: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          timestamp: { type: 'string' }
        },
        required: ['text', 'timestamp']
      }
    },
    ctaPlacement: { type: 'string', description: 'Where and when the CTA appears' }
  },
  required: ['id', 'aspectRatio', 'duration', 'variant', 'openingFrame', 'fullPrompt', 'beatTimings', 'cameraWork', 'textOverlays', 'ctaPlacement']
}

const MATRIX_TOOL: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'generate_ad_matrix',
    description: 'Generate exactly 12 video ad prompts covering all combinations of aspect ratio, duration, and A/B variant',
    parameters: {
      type: 'object',
      properties: {
        prompts: {
          type: 'array',
          items: PROMPT_SCHEMA,
          minItems: 12,
          maxItems: 12,
          description: 'Exactly 12 prompts: 2 aspect ratios × 3 durations × 2 variants'
        }
      },
      required: ['prompts']
    }
  }
}

const MATRIX_SYSTEM_PROMPT = `You are an expert video ad creative director. Given a creative mandate, generate EXACTLY 12 unique video ad prompts covering every combination of:
- Aspect Ratios: 16:9 (landscape/YouTube) and 9:16 (vertical/TikTok/Reels)
- Durations: 5s, 15s, 30s
- Variants: A and B (each pair MUST have meaningfully different creative approaches)

Rules:
1. Every prompt MUST have a UNIQUE opening frame. No two ads should start with the same visual.
2. A/B variants for the same ratio+duration MUST differ in creative approach (not just wording). E.g., Variant A might use humor while B uses emotion.
3. Respect the duration strategy from the mandate - 5s ads are punchy hooks, 15s tell a micro-story, 30s develop a full narrative.
4. Respect platform constraints - 16:9 should optimize for landscape viewing, 9:16 for mobile-first vertical.
5. Adhere to the brand voice. Never use forbidden words.
6. Each prompt's openingFrame should be a vivid visual description suitable for image generation.
7. Beat timings should be realistic for the duration.

ID format: "{ratio}-{duration}-{variant}" e.g., "16:9-5s-A", "9:16-30s-B"`

export class MatrixService {
  private apiKey: string
  private model: string
  private baseUrl = 'https://openrouter.ai/api/v1'

  constructor(apiKey: string, model: string = 'openai/gpt-4.1-mini') {
    this.apiKey = apiKey
    this.model = model
  }

  async generateMatrix(mandate: CreativeMandate): Promise<AdPrompt[]> {
    const mandateText = JSON.stringify(mandate, null, 2)

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: MATRIX_SYSTEM_PROMPT },
      { role: 'user', content: `Generate 12 video ad prompts based on this creative mandate:\n\n${mandateText}` }
    ]

    const response = await this.callWithTool(messages, MATRIX_TOOL)
    const toolCall = response.choices[0]?.message?.tool_calls?.[0]
    if (!toolCall) {
      throw new Error('No structured output returned from LLM')
    }

    const parsed = JSON.parse(toolCall.function.arguments) as { prompts: AdPrompt[] }
    return parsed.prompts
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

export function createMatrixService(apiKey?: string, model?: string): MatrixService {
  const key = apiKey || process.env.OPENROUTER_API_KEY || ''
  const selectedModel = model || 'openai/gpt-4.1-mini'
  if (!key) throw new Error('OpenRouter API key is required')
  return new MatrixService(key, selectedModel)
}
