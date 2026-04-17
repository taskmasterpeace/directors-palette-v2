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
                { error: 'Image URL is required' },
                { status: 400 }
            )
        }

        // Accept either a base64 data URL (from the user-side style picker, which
        // analyzes before upload) or a public http(s) URL (from the admin Style
        // Sheets tab, which uploads first and then analyzes the hosted file).
        const isDataUrl = image.startsWith('data:image/')
        const isHttpUrl = image.startsWith('http://') || image.startsWith('https://')
        if (!isDataUrl && !isHttpUrl) {
            return NextResponse.json(
                { error: 'Image must be a data URL or http(s) URL' },
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
                        content: `You are a visual style analyzer for an AI image generation tool. Analyze the provided image and extract a DETAILED, ATTRIBUTE-RICH style manifest the model can use for strong style transfer.

Your task:
1. Identify the dominant visual style (e.g., "Anime", "Watercolor", "Comic Book", "Clay Animation", "Oil Painting", etc.)
2. Provide a brief description of the style (1-2 sentences, for humans browsing the catalog)
3. Produce a RICH stylePrompt that names concrete, observable attributes of the style so a downstream generator can reproduce it faithfully.

The stylePrompt is NOT a tagline — it is the attribute manifest that drives style transfer. It must explicitly describe EVERY axis below, in natural comma-separated prose, 80–160 words:
- Art medium (digital illustration, oil on canvas, ink on Bristol board, stop-motion clay, felt puppetry, 35mm film, CGI, etc. — be specific)
- Color palette (named hues, saturation, warmth/coolness, whether it is limited or full-spectrum, any signature color relationships)
- Lighting and tonal range (soft/hard, directional, chiaroscuro, flat, rim-lit, studio vs practical, shadow quality, highlight behavior)
- Line work and edge treatment (weight variation, hand-drawn vs clean vector, inked contours, halftones, no lines, etc.)
- Texture and grain (visible brushstrokes, canvas weave, film grain, halftone dots, clay fingerprints, felt fibers, digital smooth, etc.)
- Rendering technique (flat cel shading, painterly blending, photoreal, stylized, cross-hatching, etc.)
- Compositional language if distinctive (dutch angles, foreshortening, symmetrical framing, etc.)

Style this like the exemplars: "classic American comic book illustration, bold confident ink linework with varying line weight, dramatic chiaroscuro with deep solid black shadows and stark white highlights, flat cel-shaded color fills in saturated primaries, visible Ben-Day dot halftone patterns in midtones, printed on matte newsprint stock…"

Avoid generic phrases like "vibrant colors" or "nice lighting." Every attribute should be something the generator can actually reproduce.

Respond ONLY with valid JSON in this exact format:
{
  "name": "Style Name (2-4 words max)",
  "description": "Brief tagline for the catalog (1-2 sentences)",
  "stylePrompt": "80–160 word attribute manifest covering every axis above, natural comma-separated prose"
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
                max_tokens: 900,
                temperature: 0.6
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
