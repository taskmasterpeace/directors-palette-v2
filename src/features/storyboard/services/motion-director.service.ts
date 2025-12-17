import { DirectorFingerprint } from "@/features/music-lab/types/director.types"

interface MotionContext {
    imageUrl: string
    tags: Array<{
        entityId: string
        type: 'character' | 'location' | 'prop'
        label: string
        box: { x: number, y: number, w: number, h: number }
    }>
    storyContext: string // The segment text
    visualDescription: string // From Vision Model
}

/**
 * Motion Director Service
 * 
 * Generates reliable, subtle motion prompts for Seedream (ByteDance) model.
 * Enforces the "Locked Image" philosophy.
 */
export class MotionDirectorService {

    /**
     * Generate the full Seedream prompt
     */
    static generateSeedreamPrompt(
        context: MotionContext,
        director?: DirectorFingerprint
    ): string {
        const { storyContext, visualDescription, tags } = context

        // 1. Core Pattern: "Use this exact image..."
        const basePattern = "Use this exact image as the base. Do not change the character’s design, clothing, or background."

        // 2. Derive Subject Motion from Tags + Story
        // We look for verbs in the storyContext related to the tagged characters
        const subjectMotion = this.deriveSubjectMotion(tags, storyContext)

        // 3. Derive Environment Motion (Subtle)
        // We extract environmental cues from visual description (e.g. "rain", "wind", "light")
        const envMotion = this.deriveEnvironmentMotion(visualDescription, director)

        // 4. Camera & Intensity
        const camera = "Gentle handheld-style camera sway, very light."
        const intensity = "Very subtle idle breathing and micro-movements."

        // 5. Assemble
        const prompt = [
            basePattern,
            intensity,
            subjectMotion,
            envMotion,
            camera,
            "Keep all other details, lighting, and composition the same as the original image."
        ].filter(Boolean).join(' ')

        return prompt
    }

    private static deriveSubjectMotion(tags: MotionContext['tags'], storyText: string): string {
        // Simple heuristic: If story text has "look left", we add it.
        // Otherwise default to "idle".
        // In a real implementation, an LLM would extract this.

        const motions: string[] = []

        tags.filter(t => t.type === 'character').forEach(tag => {
            if (storyText.toLowerCase().includes('laugh')) {
                motions.push(`${tag.label} laughs slightly, shoulders moving`)
            } else if (storyText.toLowerCase().includes('look')) {
                motions.push(`${tag.label} turns head slightly`)
            } else {
                motions.push(`${tag.label} has subtle facial expression changes, eyes blink naturally`)
            }
        })

        if (motions.length === 0) return "Character subject has subtle idle breathing."

        return motions.join('. ') + "."
    }

    private static deriveEnvironmentMotion(_visualDesc: string, director?: DirectorFingerprint): string {
        const aesthetic = director?.coreIntent.emotionalTemperature === 'warm'
            ? "Dust motes drifting slowly in the warm light."
            : "Cold atmosphere, subtle air movement."

        return aesthetic
    }
}
