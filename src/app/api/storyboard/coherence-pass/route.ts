import { NextRequest, NextResponse } from 'next/server'
import { createOpenRouterService } from '@/features/storyboard/services/openrouter.service'
import { getAuthenticatedUser } from '@/lib/auth/api-auth'
import { lognog } from '@/lib/lognog'
import { logger } from '@/lib/logger'

export const maxDuration = 120

export async function POST(request: NextRequest) {
    const apiStart = Date.now()

    try {
        const auth = await getAuthenticatedUser(request)
        if (auth instanceof NextResponse) return auth

        const body = await request.json()
        const { shots, narrativeSummary, model } = body

        if (!shots || !Array.isArray(shots) || shots.length === 0) {
            return NextResponse.json({ error: 'Shots array is required' }, { status: 400 })
        }

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) {
            return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 })
        }

        const service = createOpenRouterService(apiKey, model || 'openai/gpt-4.1-mini')

        const shotListText = shots.map((s: { sequence: number; chapterLabel?: string; prompt: string; shotType: string; characterTags?: string[] }) =>
            `[${s.chapterLabel || s.sequence}] (${s.shotType}) ${s.prompt}${s.characterTags?.length ? ` | Characters: ${s.characterTags.join(', ')}` : ''}`
        ).join('\n')

        const messages = [
            {
                role: 'system' as const,
                content: `You are a film editor reviewing a complete shot list for visual coherence. Analyze ALL shots and suggest up to 10 high-impact improvements. Focus on:

1. CALLBACKS: Visual parallels between early and late shots. If two shots share a theme, suggest making them visual mirrors (same framing, different lighting).
2. MISSING TYPES: If there are no title_card, text_overlay, or abstract shots, suggest where to add them.
3. PACING: Flag sequences of 5+ consecutive shots with the same character — suggest inserting a reaction, location, or abstract shot.
4. VARIETY: Ensure the shot list uses a range of shot types, not just medium and close-up.

Return EXACTLY a JSON array of suggestions. Maximum 10 suggestions.`
            },
            {
                role: 'user' as const,
                content: `Review this shot list for coherence and suggest improvements.

${narrativeSummary ? `STORY CONTEXT:\n${narrativeSummary}\n\n` : ''}SHOT LIST (${shots.length} shots):
${shotListText}

Return up to 10 suggestions as a JSON array. Each suggestion must have:
- id: unique string (e.g., "s1", "s2")
- type: "edit" or "insert"
- targetSequence: the shot sequence number to edit or insert after
- description: human-readable explanation of what to change and why
- newPrompt: (for edits) the replacement prompt text
- newShot: (for inserts) object with { prompt, shotType, characterTags }

Return ONLY the JSON array, no other text.`
            }
        ]

        const response = await service.callChat(messages)
        const content = response.choices[0]?.message?.content

        if (!content) {
            throw new Error('No content in coherence pass response')
        }

        let suggestionsText = content.trim()
        if (suggestionsText.startsWith('```')) {
            suggestionsText = suggestionsText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        }

        const suggestions = JSON.parse(suggestionsText)

        const validSuggestions = Array.isArray(suggestions)
            ? suggestions.slice(0, 10).map((s: Record<string, unknown>, i: number) => ({
                id: String(s.id || `s${i + 1}`),
                type: s.type === 'insert' ? 'insert' : 'edit',
                targetSequence: Number(s.targetSequence) || 1,
                description: String(s.description || ''),
                newPrompt: s.type === 'edit' ? String(s.newPrompt || '') : undefined,
                newShot: s.type === 'insert' && s.newShot ? {
                    prompt: String((s.newShot as Record<string, unknown>).prompt || ''),
                    shotType: String((s.newShot as Record<string, unknown>).shotType || 'abstract'),
                    characterTags: Array.isArray((s.newShot as Record<string, unknown>).characterTags)
                        ? (s.newShot as Record<string, unknown>).characterTags as string[]
                        : []
                } : undefined,
                accepted: false,
            }))
            : []

        lognog.info(`POST /api/storyboard/coherence-pass 200 (${Date.now() - apiStart}ms)`, {
            type: 'api',
            route: '/api/storyboard/coherence-pass',
            method: 'POST',
            status_code: 200,
            duration_ms: Date.now() - apiStart,
            suggestion_count: validSuggestions.length,
        })

        return NextResponse.json({ suggestions: validSuggestions })
    } catch (error) {
        logger.api.error('Coherence pass error', { error: error instanceof Error ? error.message : String(error) })

        lognog.error(error instanceof Error ? error.message : 'Coherence pass failed', {
            type: 'error',
            route: '/api/storyboard/coherence-pass',
        })

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Coherence pass failed' },
            { status: 500 }
        )
    }
}
