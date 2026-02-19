/**
 * Refine Service
 * Rewrites a failing prompt and self-grades the revision
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

const REFINE_TOOL: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'refine_prompt',
    description: 'Rewrite a failing ad prompt addressing specific weaknesses, then self-grade the revision',
    parameters: {
      type: 'object',
      properties: {
        revisedPrompt: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            aspectRatio: { type: 'string', enum: ['16:9', '9:16'] },
            duration: { type: 'string', enum: ['5s', '15s', '30s'] },
            variant: { type: 'string', enum: ['A', 'B'] },
            openingFrame: { type: 'string' },
            fullPrompt: { type: 'string' },
            beatTimings: { type: 'array', items: { type: 'string' } },
            cameraWork: { type: 'string' },
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
            ctaPlacement: { type: 'string' }
          },
          required: ['id', 'aspectRatio', 'duration', 'variant', 'openingFrame', 'fullPrompt', 'beatTimings', 'cameraWork', 'textOverlays', 'ctaPlacement']
        },
        revisedGrade: {
          type: 'object',
          properties: {
            promptId: { type: 'string' },
            hook: { type: 'number', minimum: 0, maximum: 20 },
            voice: { type: 'number', minimum: 0, maximum: 20 },
            native: { type: 'number', minimum: 0, maximum: 20 },
            cta: { type: 'number', minimum: 0, maximum: 20 },
            abDiff: { type: 'number', minimum: 0, maximum: 20 },
            total: { type: 'number', minimum: 0, maximum: 100 },
            letterGrade: { type: 'string', enum: ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'] },
            status: { type: 'string', enum: ['pass', 'refine'] },
            feedback: {
              type: 'object',
              properties: {
                hook: { type: 'string' },
                voice: { type: 'string' },
                native: { type: 'string' },
                cta: { type: 'string' },
                abDiff: { type: 'string' }
              },
              required: ['hook', 'voice', 'native', 'cta', 'abDiff']
            }
          },
          required: ['promptId', 'hook', 'voice', 'native', 'cta', 'abDiff', 'total', 'letterGrade', 'status', 'feedback']
        },
        changes: { type: 'string', description: 'Summary of what was changed and why' },
        targetDimension: { type: 'string', description: 'Which dimension was primarily improved' }
      },
      required: ['revisedPrompt', 'revisedGrade', 'changes', 'targetDimension']
    }
  }
}

const REFINE_SYSTEM_PROMPT = `You are an expert video ad creative director revising a failing prompt.

Given:
1. The creative mandate (brand brief)
2. The original prompt that scored below 70
3. The detailed grade with per-dimension feedback
4. The attempt number (1, 2, or 3)

Your job:
- Identify the weakest dimension(s) from the grade feedback
- Rewrite the prompt to address those specific weaknesses
- Maintain everything that's already working well
- Self-grade the revised version honestly (don't inflate scores)
- The revision should keep the same id, aspectRatio, duration, and variant

Be aggressive in your improvements. Target a total score of 75+ on the revision.
Grade status: "pass" if total >= 70, "refine" if total < 70.`

export class RefineService {
  private apiKey: string
  private model: string
  private baseUrl = 'https://openrouter.ai/api/v1'

  constructor(apiKey: string, model: string = 'openai/gpt-4.1-mini') {
    this.apiKey = apiKey
    this.model = model
  }

  async refinePrompt(
    prompt: AdPrompt,
    grade: GradeScore,
    mandate: CreativeMandate,
    attemptNumber: number
  ): Promise<{ revisedPrompt: AdPrompt; revisedGrade: GradeScore; changes: string; targetDimension: string }> {
    const messages: OpenRouterMessage[] = [
      { role: 'system', content: REFINE_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `ATTEMPT ${attemptNumber}/3

MANDATE:
${JSON.stringify(mandate, null, 2)}

ORIGINAL PROMPT (${prompt.id}):
Opening Frame: ${prompt.openingFrame}
Full Prompt: ${prompt.fullPrompt}
Camera: ${prompt.cameraWork}
CTA: ${prompt.ctaPlacement}
Duration: ${prompt.duration} | Ratio: ${prompt.aspectRatio} | Variant: ${prompt.variant}

GRADE (Total: ${grade.total}/100 - ${grade.status.toUpperCase()}):
Hook: ${grade.hook}/20 - ${grade.feedback.hook}
Voice: ${grade.voice}/20 - ${grade.feedback.voice}
Native: ${grade.native}/20 - ${grade.feedback.native}
CTA: ${grade.cta}/20 - ${grade.feedback.cta}
A/B Diff: ${grade.abDiff}/20 - ${grade.feedback.abDiff}

Revise this prompt to score >= 70. Focus on the weakest dimensions.`
      }
    ]

    const response = await this.callWithTool(messages, REFINE_TOOL)
    const toolCall = response.choices[0]?.message?.tool_calls?.[0]
    if (!toolCall) throw new Error('No refinement output returned')

    return JSON.parse(toolCall.function.arguments)
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

export function createRefineService(apiKey?: string, model?: string): RefineService {
  const key = apiKey || process.env.OPENROUTER_API_KEY || ''
  const selectedModel = model || 'openai/gpt-4.1-mini'
  if (!key) throw new Error('OpenRouter API key is required')
  return new RefineService(key, selectedModel)
}
