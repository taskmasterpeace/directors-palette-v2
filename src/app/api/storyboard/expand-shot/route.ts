import { NextRequest, NextResponse } from 'next/server'
import { createOpenRouterService } from '@/features/storyboard/services/openrouter.service'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthenticatedUser(request)
        if (auth instanceof NextResponse) return auth

        const body = await request.json()
        const { shotSequence, characterTag, characterDescription, existingPrompt, storyContext, model } = body

        if (!existingPrompt || !characterTag) {
            return NextResponse.json(
                { error: 'existingPrompt and characterTag are required' },
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

        const service = createOpenRouterService(apiKey, model || 'openai/gpt-4.1-mini')

        const messages = [
            {
                role: 'system' as const,
                content: `You are a film director. A character needs to be added to a scene. Generate 1-3 new shots that naturally introduce and cover this character in the context of the existing scene.

Rules:
- These are STILL IMAGES, not video
- Use appropriate shot types: medium for introduction, close-up for emphasis
- Each new shot should show the character (${characterTag}) doing something relevant to the scene
- Reference the character using their @tag: ${characterTag}
- ${characterDescription ? `Character appearance: ${characterDescription}` : 'No specific appearance description available.'}
- Keep the visual style and atmosphere consistent with the existing shot`
            },
            {
                role: 'user' as const,
                content: `The current shot #${shotSequence} is:
"${existingPrompt}"

${storyContext ? `Story context: ${storyContext.substring(0, 1000)}` : ''}

Generate 1-3 new shots that add ${characterTag} to this scene. These will be inserted after shot #${shotSequence}.`
            }
        ]

        const tool = {
            type: 'function' as const,
            function: {
                name: 'expand_shot_with_character',
                description: 'Generate new shots that introduce a character into a scene',
                parameters: {
                    type: 'object',
                    properties: {
                        shots: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    prompt: {
                                        type: 'string',
                                        description: 'Detailed visual description for image generation'
                                    },
                                    shotType: {
                                        type: 'string',
                                        enum: ['establishing', 'wide', 'medium', 'close-up', 'detail']
                                    }
                                },
                                required: ['prompt', 'shotType']
                            },
                            minItems: 1,
                            maxItems: 3
                        }
                    },
                    required: ['shots']
                }
            }
        }

        const response = await service.callWithTool(messages, tool)
        const toolCall = response.choices[0]?.message?.tool_calls?.[0]

        if (!toolCall) {
            throw new Error('No tool call in response')
        }

        const result = JSON.parse(toolCall.function.arguments) as {
            shots: Array<{ prompt: string; shotType: string }>
        }

        return NextResponse.json({ shots: result.shots })
    } catch (error) {
        logger.api.error('Expand shot error', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to expand shot' },
            { status: 500 }
        )
    }
}
