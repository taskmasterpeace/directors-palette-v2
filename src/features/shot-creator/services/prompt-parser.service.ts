/**
 * Prompt Parser Service
 *
 * Parses messy prompts into structured format using Gemini 2.0 Flash.
 * Uses comprehensive Page2Prompt token system.
 */

import type { StructuredPrompt, ParseResult, DetectedReference } from '../types/prompt-organizer.types'
import { logger } from '@/lib/logger'

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
            logger.shotCreator.error('Parse error', { error: error instanceof Error ? error.message : String(error) })
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
     * Follows cinematic prompt structure order
     */
    reconstruct(structured: StructuredPrompt): string {
        const parts: string[] = []

        // Style prefix first
        if (structured.stylePrefix) {
            parts.push(structured.stylePrefix)
        }

        // Shot size and camera angle (cinematography opener)
        if (structured.shotSize) {
            parts.push(structured.shotSize)
        }
        if (structured.cameraAngle) {
            parts.push(structured.cameraAngle)
        }

        // Subject with reference
        if (structured.subject.reference) {
            parts.push(structured.subject.reference)
        }
        if (structured.subject.description) {
            parts.push(structured.subject.description)
        }

        // Action - what the subject is doing
        if (structured.action) {
            parts.push(structured.action)
        }

        // Emotion
        if (structured.subject.emotion) {
            parts.push(`${structured.subject.emotion} expression`)
        }

        // Wardrobe
        if (structured.wardrobe) {
            parts.push(`wearing ${structured.wardrobe}`)
        }

        // Subject facing direction
        if (structured.subjectFacing) {
            parts.push(`${structured.subjectFacing} view`)
        }

        // Shot type
        if (structured.shotType) {
            parts.push(structured.shotType)
        }

        // Framing/composition
        if (structured.framing) {
            parts.push(`${structured.framing} composition`)
        }

        // Foreground elements
        if (structured.foreground) {
            parts.push(`${structured.foreground} in foreground`)
        }

        // Background/location
        if (structured.background) {
            parts.push(`in ${structured.background}`)
        }

        // Visual look
        if (structured.lensEffect) {
            parts.push(structured.lensEffect)
        }
        if (structured.depthOfField) {
            parts.push(structured.depthOfField)
        }
        if (structured.lighting) {
            parts.push(structured.lighting)
        }
        if (structured.colorGrade) {
            parts.push(`${structured.colorGrade} color grade`)
        }
        if (structured.filmGrain) {
            parts.push(`${structured.filmGrain} film grain`)
        }

        // Motion (for video)
        if (structured.cameraMovement && structured.cameraMovement !== 'static') {
            parts.push(structured.cameraMovement)
        }
        if (structured.movementIntensity && structured.movementIntensity !== 'moderate') {
            parts.push(`${structured.movementIntensity} movement`)
        }
        if (structured.subjectMotion && structured.subjectMotion !== 'static') {
            parts.push(`subject ${structured.subjectMotion}`)
        }

        // Additional details
        if (structured.additional) {
            parts.push(structured.additional)
        }

        // Style suffix last
        if (structured.styleSuffix) {
            parts.push(structured.styleSuffix)
        }

        return parts.join(', ')
    }
}

export const promptParserService = new PromptParserService()
