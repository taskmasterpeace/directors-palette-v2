/**
 * Prompt Parser Service
 * 
 * Parses messy prompts into structured format using Gemini 2.0 Flash.
 */

import type { StructuredPrompt, ParseResult, DetectedReference } from '../types/prompt-organizer.types'
// System prompt used by API route (kept here for reference)
const _SYSTEM_PROMPT = `You are a prompt parser for AI image generation. Extract components from the user's prompt into JSON.

RULES:
1. Identify @references (e.g., @marcus, @sarah) - these are character tags
2. Extract wardrobe/clothing descriptions
3. Extract location/setting descriptions  
4. Extract lighting descriptions (golden hour, dramatic lighting, etc.)
5. Extract framing terms (close-up, wide shot, medium shot, etc.)
6. Extract camera angles (low angle, high angle, dutch angle, etc.)
7. Extract camera movement for video (dolly, pan, tracking, etc.) - null for stills
8. Extract emotional state (contemplative, joyful, intense, etc.)
9. Put anything else in "additional"

OUTPUT FORMAT (JSON only, no markdown):
{
  "subject": {
    "reference": "@tag or null",
    "description": "subject description without the @tag",
    "emotion": "emotional state or null"
  },
  "wardrobe": "clothing description or null",
  "location": "setting description or null", 
  "lighting": "lighting description or null",
  "framing": "shot framing or null",
  "angle": "camera angle or null",
  "cameraMovement": null,
  "additional": "other details or null"
}`

class PromptParserService {
    /**
     * Parse a prompt using Gemini 2.0 Flash (via OpenRouter)
     */
    async parse(prompt: string): Promise<ParseResult> {
        // First, detect @references
        const references = this.detectReferences(prompt)

        try {
            const response = await fetch('/api/prompt-organizer/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            })

            if (!response.ok) {
                throw new Error('Parse failed')
            }

            const data = await response.json()

            return {
                structured: {
                    ...data.structured,
                    originalPrompt: prompt
                },
                references,
                confidence: data.confidence || 0.8
            }
        } catch (error) {
            console.error('Parse error:', error)
            // Return basic fallback parse
            return this.fallbackParse(prompt, references)
        }
    }

    /**
     * Detect @references in prompt
     */
    detectReferences(prompt: string): DetectedReference[] {
        const regex = /@(\w+)/g
        const references: DetectedReference[] = []
        let match

        while ((match = regex.exec(prompt)) !== null) {
            references.push({
                tag: match[0],
                position: match.index,
                matched: true // Will be updated when we check against gallery
            })
        }

        return references
    }

    /**
     * Fallback parsing when API fails
     */
    private fallbackParse(prompt: string, references: DetectedReference[]): ParseResult {
        // Simple heuristic parsing
        const structured: StructuredPrompt = {
            subject: {
                reference: references[0]?.tag,
                description: prompt.replace(/@\w+/g, '').trim(),
                emotion: undefined
            },
            originalPrompt: prompt
        }

        // Try to detect common terms
        const lowerPrompt = prompt.toLowerCase()

        // Framing
        if (lowerPrompt.includes('close-up') || lowerPrompt.includes('closeup')) {
            structured.framing = 'close-up'
        } else if (lowerPrompt.includes('wide shot') || lowerPrompt.includes('wide angle')) {
            structured.framing = 'wide shot'
        } else if (lowerPrompt.includes('medium shot')) {
            structured.framing = 'medium shot'
        }

        // Lighting
        if (lowerPrompt.includes('golden hour')) {
            structured.lighting = 'golden hour'
        } else if (lowerPrompt.includes('dramatic lighting')) {
            structured.lighting = 'dramatic lighting'
        } else if (lowerPrompt.includes('natural light')) {
            structured.lighting = 'natural light'
        }

        return {
            structured,
            references,
            confidence: 0.4 // Low confidence for fallback
        }
    }

    /**
     * Reconstruct prompt from structured data
     */
    reconstruct(structured: StructuredPrompt): string {
        const parts: string[] = []

        // Subject with reference
        if (structured.subject.reference) {
            parts.push(structured.subject.reference)
        }
        if (structured.subject.description) {
            parts.push(structured.subject.description)
        }
        if (structured.subject.emotion) {
            parts.push(`${structured.subject.emotion} expression`)
        }

        // Wardrobe
        if (structured.wardrobe) {
            parts.push(`wearing ${structured.wardrobe}`)
        }

        // Location
        if (structured.location) {
            parts.push(`in ${structured.location}`)
        }

        // Lighting
        if (structured.lighting) {
            parts.push(structured.lighting)
        }

        // Framing
        if (structured.framing) {
            parts.push(structured.framing)
        }

        // Angle
        if (structured.angle) {
            parts.push(structured.angle)
        }

        // Camera movement
        if (structured.cameraMovement) {
            parts.push(structured.cameraMovement)
        }

        // Additional
        if (structured.additional) {
            parts.push(structured.additional)
        }

        return parts.join(', ')
    }
}

export const promptParserService = new PromptParserService()
