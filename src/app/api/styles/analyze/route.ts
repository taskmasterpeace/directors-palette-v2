import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * POST /api/styles/analyze
 *
 * Analyzes an uploaded image using AI vision to generate style metadata:
 * - Style name
 * - Description
 * - Style prompt for image generation
 */
export async function POST(request: NextRequest) {
    try {
        const { image } = await request.json()

        if (!image || typeof image !== 'string') {
            return NextResponse.json(
                { error: 'Image data URL is required' },
                { status: 400 }
            )
        }

        // Validate base64 image format
        if (!image.startsWith('data:image/')) {
            return NextResponse.json(
                { error: 'Invalid image format. Must be a data URL' },
                { status: 400 }
            )
        }

        // Get OpenRouter API key from env
        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            logger.api.error('OPENROUTER_API_KEY not found in environment')
            return NextResponse.json(
                { error: 'OpenRouter API key not configured' },
                { status: 500 }
            )
        }

        // Call OpenRouter with vision model (GPT-4 Vision)
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://directors-palette-v2.vercel.app',
                'X-Title': 'Directors Palette'
            },
            body: JSON.stringify({
                model: 'openai/gpt-4o-2024-11-20', // GPT-4o with vision
                messages: [
                    {
                        role: 'system',
                        content: `You are a visual style analyzer for an AI image generation tool. Analyze the provided image and extract its artistic style characteristics.

Your task:
1. Identify the dominant visual style (e.g., "Anime", "Watercolor", "Comic Book", "Clay Animation", "Oil Painting", etc.)
2. Provide a brief description of the style (1-2 sentences)
3. Create a concise style prompt that captures the essence of this visual style for use in AI image generation

Be specific and focus on visual characteristics like:
- Art medium (digital, traditional, 3D, photography, etc.)
- Color palette and lighting
- Line work and detail level
- Texture and rendering style
- Overall aesthetic (realistic, stylized, abstract, etc.)

Respond ONLY with valid JSON in this exact format:
{
  "name": "Style Name (2-4 words max)",
  "description": "Brief description of the style",
  "stylePrompt": "Concise prompt for AI image generation (e.g., 'in the [style] style with [key characteristics]')"
}

Do not include any text outside the JSON object.`
                    },
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Analyze this image and identify its visual style:'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: image
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            logger.api.error('OpenRouter API error', { status: response.status, errorText: errorText })
            return NextResponse.json(
                { error: `OpenRouter API error: ${response.status}` },
                { status: 500 }
            )
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content

        if (!content) {
            logger.api.error('No content in OpenRouter response', { detail: data })
            return NextResponse.json(
                { error: 'No response from AI' },
                { status: 500 }
            )
        }

        // Parse JSON response
        let styleData
        try {
            // Try to extract JSON from response (in case there's extra text)
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                styleData = JSON.parse(jsonMatch[0])
            } else {
                styleData = JSON.parse(content)
            }
        } catch (_parseError) {
            logger.api.error('Failed to parse AI response as JSON', { detail: content })
            return NextResponse.json(
                { error: 'Invalid AI response format' },
                { status: 500 }
            )
        }

        // Validate response structure
        if (!styleData.name || !styleData.description || !styleData.stylePrompt) {
            logger.api.error('Missing required fields in AI response', { detail: styleData })
            return NextResponse.json(
                { error: 'Incomplete AI response' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            name: styleData.name,
            description: styleData.description,
            stylePrompt: styleData.stylePrompt
        })

    } catch (error) {
        logger.api.error('Style analysis error', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
