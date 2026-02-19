/**
 * Grading Service
 * Grades 12 ad prompts across 5 dimensions, sending A/B pairs together
 */

import type { CreativeMandate, AdPrompt, GradeScore } from '../types/ad-lab.types'

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

const GRADE_SCHEMA = {
  type: 'object',
  properties: {
    promptId: { type: 'string' },
    hook: { type: 'number', minimum: 0, maximum: 20, description: 'Hook strength: does the opening frame grab attention instantly? 0-20' },
    voice: { type: 'number', minimum: 0, maximum: 20, description: 'Brand voice alignment: does the tone match the mandate? 0-20' },
    native: { type: 'number', minimum: 0, maximum: 20, description: 'Platform nativeness: does it feel native to 16:9 or 9:16? 0-20' },
    cta: { type: 'number', minimum: 0, maximum: 20, description: 'CTA effectiveness: is the call-to-action clear and well-placed? 0-20' },
    abDiff: { type: 'number', minimum: 0, maximum: 20, description: 'A/B differentiation: how distinct is this from its variant pair? 0-20' },
    total: { type: 'number', minimum: 0, maximum: 100 },
    letterGrade: { type: 'string', enum: ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'] },
    status: { type: 'string', enum: ['pass', 'refine'] },
    feedback: {
      type: 'object',
      properties: {
        hook: { type: 'string', description: 'Specific feedback on hook strength' },
        voice: { type: 'string', description: 'Specific feedback on brand voice alignment' },
        native: { type: 'string', description: 'Specific feedback on platform nativeness' },
        cta: { type: 'string', description: 'Specific feedback on CTA effectiveness' },
        abDiff: { type: 'string', description: 'Specific feedback on A/B differentiation' }
      },
      required: ['hook', 'voice', 'native', 'cta', 'abDiff']
    }
  },
  required: ['promptId', 'hook', 'voice', 'native', 'cta', 'abDiff', 'total', 'letterGrade', 'status', 'feedback']
}

const GRADING_TOOL: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'grade_prompt_pair',
    description: 'Grade a pair of A/B variant ad prompts across 5 dimensions',
    parameters: {
      type: 'object',
      properties: {
        grades: {
          type: 'array',
          items: GRADE_SCHEMA,
          minItems: 2,
          maxItems: 2,
          description: 'Grades for the A and B variants'
        }
      },
      required: ['grades']
    }
  }
}

const GRADING_SYSTEM_PROMPT = `You are an expert video ad creative reviewer. Grade each prompt across 5 dimensions (0-20 each, 100 total):

1. **Hook** (0-20): Does the opening frame grab attention instantly? Would a viewer stop scrolling?
2. **Voice** (0-20): Does the tone and language match the brand mandate? Is it on-brand?
3. **Native** (0-20): Does it feel native to its platform (16:9 for YouTube/desktop, 9:16 for TikTok/Reels)?
4. **CTA** (0-20): Is the call-to-action clear, compelling, and well-timed for the duration?
5. **A/B Diff** (0-20): How distinct is this variant from its A/B pair? Both should test different creative approaches, not just wording changes.

Scoring guide:
- 17-20: Exceptional
- 14-16: Strong
- 10-13: Adequate
- 6-9: Weak
- 0-5: Failing

Total = sum of all 5 dimensions. Letter grades: A+ (95+), A (85-94), B+ (78-84), B (70-77), C (60-69), D (40-59), F (<40).
Status: "pass" if total >= 70, "refine" if total < 70.

Provide specific, actionable feedback for each dimension. Be critical but constructive.`

export class GradingService {
  private apiKey: string
  private model: string
  private baseUrl = 'https://openrouter.ai/api/v1'

  constructor(apiKey: string, model: string = 'openai/gpt-4.1-mini') {
    this.apiKey = apiKey
    this.model = model
  }

  async gradeMatrix(prompts: AdPrompt[], mandate: CreativeMandate): Promise<GradeScore[]> {
    // Group prompts into A/B pairs (same ratio + duration)
    const pairs: [AdPrompt, AdPrompt][] = []
    const grouped: Record<string, AdPrompt[]> = {}

    for (const p of prompts) {
      const key = `${p.aspectRatio}-${p.duration}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(p)
    }

    for (const key in grouped) {
      const pair = grouped[key]
      if (pair.length === 2) {
        pairs.push([pair[0], pair[1]])
      } else {
        // Fallback: grade individually with a dummy pair
        for (const p of pair) {
          pairs.push([p, p])
        }
      }
    }

    const allGrades: GradeScore[] = []
    for (const [a, b] of pairs) {
      const grades = await this.gradePair(a, b, mandate)
      allGrades.push(...grades)
    }

    return allGrades
  }

  private async gradePair(promptA: AdPrompt, promptB: AdPrompt, mandate: CreativeMandate): Promise<GradeScore[]> {
    const mandateText = JSON.stringify(mandate, null, 2)
    const messages: OpenRouterMessage[] = [
      { role: 'system', content: GRADING_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Grade this A/B pair against the mandate.

MANDATE:
${mandateText}

VARIANT A (${promptA.id}):
Opening Frame: ${promptA.openingFrame}
Full Prompt: ${promptA.fullPrompt}
Camera: ${promptA.cameraWork}
CTA: ${promptA.ctaPlacement}
Duration: ${promptA.duration} | Ratio: ${promptA.aspectRatio}

VARIANT B (${promptB.id}):
Opening Frame: ${promptB.openingFrame}
Full Prompt: ${promptB.fullPrompt}
Camera: ${promptB.cameraWork}
CTA: ${promptB.ctaPlacement}
Duration: ${promptB.duration} | Ratio: ${promptB.aspectRatio}`
      }
    ]

    const response = await this.callWithTool(messages, GRADING_TOOL)
    const toolCall = response.choices[0]?.message?.tool_calls?.[0]
    if (!toolCall) throw new Error('No grading output returned')

    const parsed = JSON.parse(toolCall.function.arguments) as { grades: GradeScore[] }
    return parsed.grades
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

export function createGradingService(apiKey?: string, model?: string): GradingService {
  const key = apiKey || process.env.OPENROUTER_API_KEY || ''
  const selectedModel = model || 'openai/gpt-4.1-mini'
  if (!key) throw new Error('OpenRouter API key is required')
  return new GradingService(key, selectedModel)
}
