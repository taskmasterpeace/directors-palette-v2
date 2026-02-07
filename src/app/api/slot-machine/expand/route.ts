/**
 * Slot Machine Expand API
 *
 * Expands {seed text} into [variation1, variation2, variation3] using AI.
 * Uses Gemini 2.0 Flash via OpenRouter (free tier).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'

const GEMINI_MODEL = 'google/gemini-2.0-flash-001'

function buildSystemPrompt(variationCount: number): string {
    return `You are a Semantic Variation Engine for image generation prompts.

TASK: Find all text inside curly brackets {text} in the user's prompt. For each bracketed section, generate creative variations that could replace it.

RULES:
1. Output the COMPLETE sentence with the prompt intact
2. Replace each {seed} with [variation1, variation2, variation3, ...]
3. Generate exactly ${variationCount} variations per bracket
4. CRITICAL: No commas inside any variation (use "and" or rephrase)
5. Variations must grammatically fit the sentence
6. If seed includes an article (a/an), include the appropriate article in each variation
7. Keep variations semantically related but creatively different
8. Preserve all other text exactly as-is (including @tags, existing [brackets], wildcards)

EXAMPLES:

Input: "A woman {holding} a flower"
Output: "A woman [smelling, crushing, admiring] a flower"

Input: "A man {in a suit} walking through {the city}"
Output: "A man [in a tuxedo, wearing casual clothes, in a leather jacket] walking through [downtown Manhattan, a rainy street, the financial district]"

Input: "@marcus {looking} at the camera with {intensity}"
Output: "@marcus [staring, glancing, gazing] at the camera with [fierce determination, quiet confidence, playful curiosity]"

Input: "A {red} car parked {on the street}"
Output: "A [blue, vintage black, chrome silver] car parked [in an alley, by the beach, under a bridge]"

Return ONLY the expanded prompt, nothing else. No explanations, no markdown.`
}

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const auth = await getAuthenticatedUser(request)
        if (auth instanceof NextResponse) return auth

        const { prompt, variationCount = 3 } = await request.json()

        if (!prompt) {
            return NextResponse.json({ error: 'No prompt provided' }, { status: 400 })
        }

        // Validate variation count (2-5)
        const validatedCount = Math.max(2, Math.min(5, variationCount))

        // Check if prompt has slot machine syntax
        const slotMachineRegex = /\{([^{}]+)\}/g
        const matches = [...prompt.matchAll(slotMachineRegex)]

        if (matches.length === 0) {
            return NextResponse.json({
                expandedPrompt: prompt,
                slots: [],
                message: 'No {brackets} found to expand'
            })
        }

        // Extract slot info
        const slots = matches.map(match => ({
            seed: match[1],
            position: match.index,
            fullMatch: match[0]
        }))

        // Limit to 5 brackets per prompt (token limit protection)
        if (slots.length > 5) {
            return NextResponse.json({
                error: 'Too many {brackets}. Maximum is 5 per prompt.',
                slots: slots.slice(0, 5)
            }, { status: 400 })
        }

        // Call OpenRouter with Gemini 2.0 Flash (free)
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                'X-Title': 'Director\'s Palette Slot Machine'
            },
            body: JSON.stringify({
                model: GEMINI_MODEL,
                messages: [
                    { role: 'system', content: buildSystemPrompt(validatedCount) },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7, // Higher temperature for creative variations
                max_tokens: 500
            })
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('OpenRouter error:', error)
            return NextResponse.json({ error: 'Expansion failed' }, { status: 500 })
        }

        const data = await response.json()
        let expandedPrompt = data.choices?.[0]?.message?.content?.trim()

        if (!expandedPrompt) {
            return NextResponse.json({ error: 'No response from model' }, { status: 500 })
        }

        // Post-process: ensure no commas inside variations (AI sometimes ignores this)
        // Find all [bracketed content] and replace internal commas with " and "
        expandedPrompt = expandedPrompt.replace(/\[([^\]]+)\]/g, (_match: string, content: string) => {
            // Split by comma, then check each variation for embedded commas
            const variations = content.split(',').map((v: string) => v.trim())
            // Rejoin - commas between variations are fine, but ensure no commas within
            const cleanVariations = variations.map((v: string) => {
                // If variation still contains comma (nested), replace with "and"
                return v.replace(/,/g, ' and ')
            })
            return `[${cleanVariations.join(', ')}]`
        })

        // Extract the expanded slots for UI display
        const expandedSlots = [...expandedPrompt.matchAll(/\[([^\]]+)\]/g)].map((match, index) => ({
            seed: slots[index]?.seed || 'unknown',
            variations: match[1].split(',').map((v: string) => v.trim())
        }))

        return NextResponse.json({
            expandedPrompt,
            slots: expandedSlots,
            originalPrompt: prompt,
            variationCount: validatedCount
        })

    } catch (error) {
        console.error('Slot machine expand error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
