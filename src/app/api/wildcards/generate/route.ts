import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// Use a cheap, fast model for list generation
const MODEL = 'meta-llama/llama-3-8b-instruct'

interface GenerateRequest {
    name: string
    existingEntries: string[]
    category?: string
    description?: string
}

export async function POST(request: NextRequest) {
    try {
        // Check for API key
        if (!OPENROUTER_API_KEY) {
            return NextResponse.json(
                { error: 'OpenRouter API key not configured. Add OPENROUTER_API_KEY to your environment.' },
                { status: 500 }
            )
        }

        const body: GenerateRequest = await request.json()
        const { name, existingEntries, category, description } = body

        // Validate input
        if (!name || typeof name !== 'string') {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            )
        }

        if (!existingEntries || !Array.isArray(existingEntries) || existingEntries.length === 0) {
            return NextResponse.json(
                { error: 'At least one example entry is required' },
                { status: 400 }
            )
        }

        // Build the prompt with context
        const humanReadableName = name.replace(/_/g, ' ')
        const examplesText = existingEntries.slice(0, 10).join('\n') // Limit examples to prevent token overflow

        // Build context section if category or description provided
        let contextSection = ''
        if (category || description) {
            contextSection = '\nContext:'
            if (category) contextSection += `\n- Category: ${category}`
            if (description) contextSection += `\n- Description: ${description}`
            contextSection += '\n'
        }

        const prompt = `Generate 10 more items for a list called "${humanReadableName}".
${contextSection}
Existing examples:
${examplesText}

Rules:
- One item per line
- Keep the same style and format as the examples
- Be creative but stay relevant to the category and description
- No numbering, bullets, or extra formatting
- No explanations, just the list items

Output only the new items, one per line:`

        // Call OpenRouter API
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://directorspalette.com',
                'X-Title': 'Directors Palette',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                max_tokens: 500,
                temperature: 0.8, // Slightly creative
            }),
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            logger.api.error('OpenRouter API error', { error: errorData instanceof Error ? errorData.message : String(errorData) })
            return NextResponse.json(
                { error: 'AI generation failed. Please try again.' },
                { status: 500 }
            )
        }

        const data = await response.json()
        const generatedText = data.choices?.[0]?.message?.content || ''

        // Parse the response into individual entries
        const newEntries = generatedText
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => {
                // Remove empty lines
                if (!line) return false
                // Remove lines that look like numbering (1., 2., -, *, etc)
                if (/^[\d\-\*•]+[\.\)]\s*/.test(line)) {
                    return false
                }
                return true
            })
            .map((line: string) => {
                // Clean up any remaining numbering at the start
                return line.replace(/^[\d\-\*•]+[\.\)]\s*/, '').trim()
            })
            .filter((line: string) => line.length > 0)
            // Remove duplicates with existing entries
            .filter((line: string) => {
                const lowerLine = line.toLowerCase()
                return !existingEntries.some(
                    existing => existing.toLowerCase() === lowerLine
                )
            })

        return NextResponse.json({
            entries: newEntries,
            model: MODEL,
        })

    } catch (error) {
        logger.api.error('Wildcard generation error', { error: error instanceof Error ? error.message : String(error) })
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        )
    }
}
