/**
 * Server-side LLM Chat API Route
 * Proxies LLM requests to Requesty API to keep API key secure
 */

import { NextRequest, NextResponse } from 'next/server'

const REQUESTY_API_URL = 'https://router.requesty.ai/v1/chat/completions'

interface ChatRequest {
    messages: Array<{ role: string; content: string }>
    model?: string
    temperature?: number
    max_tokens?: number
}

export async function POST(request: NextRequest) {
    try {
        const apiKey = process.env.REQUESTY_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                { error: 'LLM API not configured' },
                { status: 500 }
            )
        }

        const body: ChatRequest = await request.json()
        const { messages, model = 'openai/gpt-4o-mini', temperature = 0.7, max_tokens = 4096 } = body

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: 'Messages array is required' },
                { status: 400 }
            )
        }

        const response = await fetch(REQUESTY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                max_tokens
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('LLM API error:', response.status, errorText)
            return NextResponse.json(
                { error: 'LLM service error', details: errorText },
                { status: response.status }
            )
        }

        const data = await response.json()
        return NextResponse.json(data)

    } catch (error) {
        console.error('LLM chat route error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
