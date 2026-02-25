/**
 * B-Roll Pool Service
 * Generates themed B-roll pools for documentary chapters via OpenRouter tool calling.
 * Makes direct fetch calls (not through OpenRouterService) because it needs a custom tool schema.
 */

import type { BRollPoolCategory, BRollPoolPrompt } from '../types/storyboard.types'

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let poolIdCounter = 0

function generatePoolId(): string {
    return `broll-pool-${Date.now()}-${++poolIdCounter}`
}

function generatePromptId(): string {
    return `broll-prompt-${Date.now()}-${++poolIdCounter}`
}

// ---------------------------------------------------------------------------
// Shared types for OpenRouter responses
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// generateBRollPool
// ---------------------------------------------------------------------------

export interface BRollPoolConfig {
    apiKey: string
    model: string
    chapterText: string
    chapterIndex: number
    storyContext: string
    stylePrompt?: string
    characterDescriptions?: string
}

export interface BRollPoolResult {
    success: boolean
    categories: BRollPoolCategory[]
    error?: string
}

const BROLL_POOL_SYSTEM_PROMPT = `You are an expert documentary cinematographer creating a themed B-roll pool for a documentary chapter. Your job is to create 8-12 thematic categories of B-roll imagery that visually support the narration.

IMPORTANT RULES:
- These are STILL IMAGES for AI image generation — NOT video
- Do NOT use camera movement terms like "dolly", "pan", "tilt", "crane", "tracking", "rack focus", "zoom"
- DO use composition terms: "wide shot", "close-up", "overhead angle", "low angle", "medium shot", "detail shot"
- Each prompt must be a COMPLETE, self-contained image generation prompt (2-3 sentences)
- Include: camera angle/framing, lighting conditions, composition details, atmosphere/mood
- Each category should have a clear visual theme (e.g., "Urban Decay", "Courtroom Tension", "Street Life")
- Create 4 prompt variants per category — each variant shows the same theme from a different angle or focus
- Prompts should be evocative and cinematic, suitable for high-quality AI image generation

For each category, generate 4 distinct prompt variants that explore the theme differently:
- Variant 1: Establishing/wide view of the theme
- Variant 2: Medium shot or detail focus
- Variant 3: Close-up or textural detail
- Variant 4: Atmospheric or symbolic interpretation`

const BROLL_POOL_TOOL = {
    type: 'function' as const,
    function: {
        name: 'generate_broll_pool',
        description: 'Generate themed B-roll pool categories with prompt variants for a documentary chapter',
        parameters: {
            type: 'object',
            properties: {
                categories: {
                    type: 'array',
                    description: '8-12 themed B-roll categories',
                    items: {
                        type: 'object',
                        properties: {
                            theme: {
                                type: 'string',
                                description: 'Human-readable theme name (e.g., "Ohio Winter Atmosphere", "Courtroom Tension")'
                            },
                            prompts: {
                                type: 'array',
                                description: '4 prompt variants exploring the theme from different angles',
                                items: {
                                    type: 'object',
                                    properties: {
                                        prompt: {
                                            type: 'string',
                                            description: 'Full cinematic image generation prompt (2-3 sentences with camera angle, lighting, composition)'
                                        }
                                    },
                                    required: ['prompt']
                                }
                            }
                        },
                        required: ['theme', 'prompts']
                    }
                }
            },
            required: ['categories']
        }
    }
}

export async function generateBRollPool(config: BRollPoolConfig): Promise<BRollPoolResult> {
    const {
        apiKey,
        model,
        chapterText,
        chapterIndex,
        storyContext,
        stylePrompt,
        characterDescriptions,
    } = config

    const characterContext = characterDescriptions
        ? `\n\nCharacter descriptions for visual reference:\n${characterDescriptions}`
        : ''

    const userMessage = `Generate a themed B-roll pool for Chapter ${chapterIndex + 1} of this documentary.

Story context (full):
${storyContext.substring(0, 3000)}${storyContext.length > 3000 ? '...' : ''}

Chapter text:
${chapterText}${characterContext}

Create 8-12 thematic B-roll categories with 4 prompt variants each. Each prompt must be a complete, cinematic still-image generation prompt.`

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://directors-palette.vercel.app',
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: BROLL_POOL_SYSTEM_PROMPT },
                    { role: 'user', content: userMessage },
                ],
                tools: [BROLL_POOL_TOOL],
                tool_choice: { type: 'function', function: { name: 'generate_broll_pool' } },
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            let errorMessage = errorText
            try {
                const errorJson = JSON.parse(errorText)
                errorMessage = errorJson.error?.message || errorJson.message || errorText
            } catch {
                // keep raw text
            }
            return { success: false, categories: [], error: `OpenRouter API error: ${response.status} - ${errorMessage}` }
        }

        const data: OpenRouterResponse = await response.json()
        const toolCall = data.choices[0]?.message?.tool_calls?.[0]

        if (!toolCall) {
            return { success: false, categories: [], error: 'No tool call in LLM response' }
        }

        const raw = JSON.parse(toolCall.function.arguments) as {
            categories: Array<{
                theme: string
                prompts: Array<{ prompt: string }>
            }>
        }

        // Transform raw results into BRollPoolCategory[] with generated IDs
        const categories: BRollPoolCategory[] = raw.categories.map((cat) => {
            const prompts: BRollPoolPrompt[] = cat.prompts.map((p, idx) => ({
                id: generatePromptId(),
                prompt: stylePrompt ? `${p.prompt} ${stylePrompt}` : p.prompt,
                status: 'pending' as const,
                selected: idx === 0, // First variant selected by default
            }))

            return {
                id: generatePoolId(),
                theme: cat.theme,
                chapterIndex,
                prompts,
                assignedSegments: [],
            }
        })

        return { success: true, categories }
    } catch (err) {
        return {
            success: false,
            categories: [],
            error: err instanceof Error ? err.message : 'Unknown error generating B-roll pool',
        }
    }
}

// ---------------------------------------------------------------------------
// assignBRollToSegments
// ---------------------------------------------------------------------------

const ASSIGN_BROLL_TOOL = {
    type: 'function' as const,
    function: {
        name: 'assign_broll',
        description: 'Assign B-roll categories to narration segments based on thematic relevance',
        parameters: {
            type: 'object',
            properties: {
                assignments: {
                    type: 'array',
                    description: 'Array mapping each narration segment to a B-roll category',
                    items: {
                        type: 'object',
                        properties: {
                            sequence: {
                                type: 'number',
                                description: 'The narration segment sequence number',
                            },
                            categoryIndex: {
                                type: 'number',
                                description: '0-based index into the categories array',
                            },
                        },
                        required: ['sequence', 'categoryIndex'],
                    },
                },
            },
            required: ['assignments'],
        },
    },
}

export async function assignBRollToSegments(config: {
    apiKey: string
    model: string
    narrationSegments: Array<{ sequence: number; text: string }>
    categories: BRollPoolCategory[]
}): Promise<Array<{ sequence: number; categoryId: string }>> {
    const { apiKey, model, narrationSegments, categories } = config

    const categoryList = categories
        .map((cat, idx) => `[${idx}] "${cat.theme}" — ${cat.prompts[0]?.prompt.substring(0, 80) ?? ''}...`)
        .join('\n')

    const segmentList = narrationSegments
        .map((seg) => `[${seg.sequence}] "${seg.text}"`)
        .join('\n')

    const systemPrompt = `You are a documentary film editor assigning B-roll visuals to narration segments. For each narration segment, choose the most thematically appropriate B-roll category. A single category can be assigned to multiple segments. Choose based on emotional tone, subject matter, and visual relevance.`

    const userMessage = `Assign a B-roll category to each narration segment.

Available B-roll categories:
${categoryList}

Narration segments:
${segmentList}

For each segment, return its sequence number and the 0-based index of the best-matching B-roll category.`

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://directors-palette.vercel.app',
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage },
                ],
                tools: [ASSIGN_BROLL_TOOL],
                tool_choice: { type: 'function', function: { name: 'assign_broll' } },
            }),
        })

        if (!response.ok) {
            return []
        }

        const data: OpenRouterResponse = await response.json()
        const toolCall = data.choices[0]?.message?.tool_calls?.[0]

        if (!toolCall) {
            return []
        }

        const raw = JSON.parse(toolCall.function.arguments) as {
            assignments: Array<{ sequence: number; categoryIndex: number }>
        }

        // Map categoryIndex to actual category.id
        return raw.assignments
            .filter((a) => a.categoryIndex >= 0 && a.categoryIndex < categories.length)
            .map((a) => ({
                sequence: a.sequence,
                categoryId: categories[a.categoryIndex].id,
            }))
    } catch {
        return []
    }
}
