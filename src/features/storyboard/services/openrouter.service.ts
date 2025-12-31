/**
 * OpenRouter Service for Storyboard LLM calls
 * Uses tool calling for structured JSON outputs
 */

import { ExtractionResult } from '../types/storyboard.types'

interface OpenRouterMessage {
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string
    tool_call_id?: string
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
    usage: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
    }
}

// Extraction tool schema for structured output
const EXTRACTION_TOOL: OpenRouterTool = {
    type: 'function',
    function: {
        name: 'extract_entities',
        description: 'Extract characters and locations from the story text',
        parameters: {
            type: 'object',
            properties: {
                characters: {
                    type: 'array',
                    description: 'List of characters found in the story',
                    items: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                description: 'Character name as it appears in the story'
                            },
                            mentions: {
                                type: 'number',
                                description: 'Approximate number of times this character is mentioned'
                            },
                            description: {
                                type: 'string',
                                description: 'VISUAL description for image generation: race/ethnicity, clothing, accessories, physical features, age. Format as comma-separated attributes (e.g., "Black man, 30s, bald, gold chain, white tee, jeans")'
                            }
                        },
                        required: ['name', 'mentions']
                    }
                },
                locations: {
                    type: 'array',
                    description: 'List of locations/settings found in the story',
                    items: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                description: 'Location name or description'
                            },
                            tag: {
                                type: 'string',
                                description: 'Short tag for the location (e.g., @courtroom, @apartment)'
                            },
                            mentions: {
                                type: 'number',
                                description: 'Approximate number of times this location appears'
                            },
                            description: {
                                type: 'string',
                                description: 'VISUAL description for image generation: setting details, lighting, atmosphere, notable objects (e.g., "dimly lit warehouse, exposed brick walls, hanging industrial lights, concrete floor")'
                            }
                        },
                        required: ['name', 'tag', 'mentions']
                    }
                }
            },
            required: ['characters', 'locations']
        }
    }
}

const EXTRACTION_SYSTEM_PROMPT = `You are a story analyst extracting characters and locations for AI image generation.

For characters:
- Include named characters (proper nouns)
- Include titled characters (e.g., "The Judge", "The Doctor")
- Include significant unnamed characters if they appear multiple times
- Count approximate mentions (how many times they appear)
- IMPORTANT: Extract a VISUAL DESCRIPTION suitable for image generation that includes:
  * Race/ethnicity/skin tone (if mentioned or implied)
  * Clothing and outfit details
  * Accessories (jewelry, hats, glasses, watches, chains, etc.)
  * Physical features (hair color/style, build, facial hair, distinguishing marks)
  * Age range if apparent
  * If these details are NOT in the story, make reasonable inferences based on context
  * Format as a comma-separated list of visual attributes, NOT a sentence

Example good description: "African American man, mid-30s, muscular build, bald head, gold chain necklace, white tank top, baggy jeans, fresh Jordans"
Example bad description: "Marcus is a confident man who works at the store" (this is NOT visual)

For locations:
- Identify all settings where scenes take place
- Create a short tag using @ prefix (e.g., @courtroom, @bedroom, @city_street)
- Count how many times the location is referenced
- Extract visual details about the location for image generation`

export class OpenRouterService {
    private apiKey: string
    private model: string
    private baseUrl = 'https://openrouter.ai/api/v1'

    constructor(apiKey: string, model: string = 'openai/gpt-4o-mini') {
        this.apiKey = apiKey
        this.model = model
    }

    /**
     * Extract characters and locations from story text
     */
    async extractEntities(storyText: string): Promise<ExtractionResult> {
        const messages: OpenRouterMessage[] = [
            { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
            { role: 'user', content: `Extract all characters and locations from this story:\n\n${storyText}` }
        ]

        const response = await this.callWithTool(messages, EXTRACTION_TOOL)

        // Parse the tool call arguments
        const toolCall = response.choices[0]?.message?.tool_calls?.[0]
        if (!toolCall) {
            throw new Error('No tool call in response')
        }

        try {
            const result = JSON.parse(toolCall.function.arguments) as ExtractionResult
            return result
        } catch {
            throw new Error('Failed to parse extraction result')
        }
    }

    /**
     * Generate B-roll shot descriptions based on story context
     */
    async generateBRollPrompts(storyContext: string, count: number = 5): Promise<string[]> {
        const messages: OpenRouterMessage[] = [
            {
                role: 'system',
                content: `You are a cinematographer generating B-roll shot descriptions. B-roll shots are contextual reinforcement visuals that support the narrative without being directly from the text. Think: establishing shots, detail shots, atmospheric shots, reaction shots.`
            },
            {
                role: 'user',
                content: `Based on this story context, generate ${count} B-roll shot descriptions that would enhance the visual storytelling. Each description should be a single image prompt suitable for AI image generation.

Story context:
${storyContext}

Generate exactly ${count} diverse B-roll shot descriptions.`
            }
        ]

        const tool: OpenRouterTool = {
            type: 'function',
            function: {
                name: 'generate_broll',
                description: 'Generate B-roll shot descriptions',
                parameters: {
                    type: 'object',
                    properties: {
                        shots: {
                            type: 'array',
                            items: {
                                type: 'string',
                                description: 'A visual prompt for the B-roll shot'
                            }
                        }
                    },
                    required: ['shots']
                }
            }
        }

        const response = await this.callWithTool(messages, tool)
        const toolCall = response.choices[0]?.message?.tool_calls?.[0]

        if (!toolCall) {
            throw new Error('No tool call in response')
        }

        try {
            const result = JSON.parse(toolCall.function.arguments) as { shots: string[] }
            return result.shots
        } catch {
            throw new Error('Failed to parse B-roll prompts')
        }
    }

    /**
     * Generate shot prompts from text segments
     * Transforms story text into cinematic shot descriptions
     */
    async generateShotPrompts(
        segments: Array<{ text: string; sequence: number; directorNote?: string }>,
        stylePrompt?: string,
        characterDescriptions?: Record<string, string>,
        storyContext?: string
    ): Promise<Array<{ sequence: number; prompt: string; shotType: string }>> {
        const characterContext = characterDescriptions && Object.keys(characterDescriptions).length > 0
            ? `\n\nCharacter references (IMPORTANT: Use the exact @name format when referring to characters):
${Object.entries(characterDescriptions)
                  .map(([name, desc]) => `- ${name}: ${desc || 'no description'}`)
                  .join('\n')}

When a character appears in a shot, use their @name (e.g., @marcus or @sarah_jones) in the prompt.`
            : ''

        const styleContext = stylePrompt
            ? `\n\nVisual style to apply to ALL shots: ${stylePrompt}`
            : ''

        const storyOverview = storyContext
            ? `\n\nFull story context for reference:\n${storyContext.substring(0, 2000)}${storyContext.length > 2000 ? '...' : ''}`
            : ''

        const messages: OpenRouterMessage[] = [
            {
                role: 'system',
                content: `You are a professional storyboard artist creating STILL IMAGE descriptions. Your task is to convert story text segments into detailed visual shot descriptions suitable for AI image generation.

IMPORTANT RULES:
- These are STILL IMAGES, not video. Do NOT use movement terms like "dolly", "crane", "rack focus", "pan", "tilt", etc.
- Focus on composition, framing, lighting, and atmosphere
- For BATTLE RAP scenes: DO NOT include microphones. Battle rap is face-to-face without mics. Show two people facing each other with crowd in a half-circle behind them.

For each segment, create a cinematic shot prompt that includes:
1. Shot type (establishing, wide, medium, close-up, or detail)
2. Subject and action/pose
3. Setting/environment details
4. Mood/atmosphere and lighting
5. Composition and framing

The shot type should be based on the content:
- "establishing" - for opening scenes, location introductions, or scene transitions
- "wide" - for showing full environment with characters
- "medium" - for character interactions, waist-up framing
- "close-up" - for emotional moments, face/expression focus
- "detail" - for specific objects, hands, symbolic elements${styleContext}${characterContext}${storyOverview}`
            },
            {
                role: 'user',
                content: `Convert these story segments into detailed visual shot prompts. Each prompt should be a complete image description:

${segments
    .map((s) => {
        let text = `[Shot ${s.sequence}] "${s.text}"`
        if (s.directorNote) {
            text += `\n  Director's Note: ${s.directorNote}`
        }
        return text
    })
    .join('\n\n')}

For each shot, provide:
1. The sequence number (matching the input)
2. A detailed visual prompt (2-3 sentences describing the exact image)
3. The shot type (establishing/wide/medium/close-up/detail)

IMPORTANT: When a Director's Note is provided, incorporate that specific guidance into your visual description for that shot.`
            }
        ]

        const tool: OpenRouterTool = {
            type: 'function',
            function: {
                name: 'generate_shot_prompts',
                description: 'Generate visual shot prompts from story segments',
                parameters: {
                    type: 'object',
                    properties: {
                        shots: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    sequence: {
                                        type: 'number',
                                        description: 'The shot sequence number'
                                    },
                                    prompt: {
                                        type: 'string',
                                        description: 'Detailed visual description for image generation (2-3 sentences)'
                                    },
                                    shotType: {
                                        type: 'string',
                                        enum: ['establishing', 'wide', 'medium', 'close-up', 'detail'],
                                        description: 'The type of camera shot'
                                    }
                                },
                                required: ['sequence', 'prompt', 'shotType']
                            }
                        }
                    },
                    required: ['shots']
                }
            }
        }

        const response = await this.callWithTool(messages, tool)
        const toolCall = response.choices[0]?.message?.tool_calls?.[0]

        if (!toolCall) {
            throw new Error('No tool call in response')
        }

        try {
            const result = JSON.parse(toolCall.function.arguments) as {
                shots: Array<{ sequence: number; prompt: string; shotType: string }>
            }
            return result.shots
        } catch {
            throw new Error('Failed to parse shot prompts')
        }
    }

    /**
     * Make API call with tool calling
     */
    private async callWithTool(
        messages: OpenRouterMessage[],
        tool: OpenRouterTool
    ): Promise<OpenRouterResponse> {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://directors-palette.app',
                'X-Title': 'Directors Palette'
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
            // Try to parse as JSON for better error messages
            let errorMessage = errorText
            try {
                const errorJson = JSON.parse(errorText)
                errorMessage = errorJson.error?.message || errorJson.message || errorText
            } catch {
                // Keep raw text if not JSON
            }
            throw new Error(`OpenRouter API error: ${response.status} - ${errorMessage}`)
        }

        return response.json()
    }

    /**
     * Test connection to OpenRouter
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            })
            return response.ok
        } catch {
            return false
        }
    }
}

/**
 * Create OpenRouter service from environment or settings
 */
export function createOpenRouterService(
    apiKey?: string,
    model?: string
): OpenRouterService {
    const key = apiKey || process.env.OPENROUTER_API_KEY || ''
    const selectedModel = model || 'openai/gpt-4o-mini'

    if (!key) {
        throw new Error('OpenRouter API key is required')
    }

    return new OpenRouterService(key, selectedModel)
}
