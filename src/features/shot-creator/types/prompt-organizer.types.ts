/**
 * Prompt Organizer Types
 *
 * Types for structured prompt parsing and editing.
 * Based on the comprehensive Page2Prompt token system.
 */

/**
 * Structured prompt format for organized editing
 * Full cinematic structure with all fields
 */
export interface StructuredPrompt {
    // ============================================
    // CINEMATOGRAPHY
    // ============================================
    shotSize?: string          // ECU, BCU, CU, MCU, MS, MCS, KNEE, MWS, FS, WS, EWS, EST
    cameraAngle?: string       // eye-level, low-angle, high-angle, worms-eye, birds-eye, dutch-angle
    subjectFacing?: string     // frontal, three-quarter, profile, three-quarter-back, from-behind
    shotType?: string          // single, two-shot, group-shot, over-shoulder, reaction, insert, pov
    framing?: string           // centered, rule-of-thirds, symmetrical, leading-lines, etc.

    // ============================================
    // CONTENT
    // ============================================
    subject: {
        reference?: string     // @reference tag (e.g., "@marcus")
        description: string    // Subject description (man, woman, person, etc.)
        emotion?: string       // Emotional state
    }
    action?: string            // What the subject is doing (standing, walking, talking, fighting, etc.)
    foreground?: string        // Foreground elements (out-of-focus, foliage, particles, smoke)
    background?: string        // Background/location (urban-city, nature, interior, studio)
    shotPurpose?: string       // moment, establishing, transition, broll, reaction, insert

    // ============================================
    // VISUAL LOOK
    // ============================================
    lensEffect?: string        // sharp, soft-focus, anamorphic, vintage-lens, tilt-shift, macro
    depthOfField?: string      // shallow-dof, deep-focus, rack-focus, bokeh
    lighting?: string          // natural, golden-hour, overcast, night + custom
    colorGrade?: string        // neutral, warm, cool, desaturated, vibrant, teal-orange
    filmGrain?: string         // none, fine-grain, medium-grain, 35mm, 16mm, 8mm

    // ============================================
    // MOTION (for video)
    // ============================================
    cameraMovement?: string    // static, pan, tilt, dolly, tracking, crane, zoom, orbit, etc.
    movementIntensity?: string // subtle, gentle, moderate, dynamic, aggressive
    subjectMotion?: string     // static, slight-movement, walking, running, gesturing

    // ============================================
    // STYLE
    // ============================================
    stylePrefix?: string       // cinematic, photorealistic, dramatic
    styleSuffix?: string       // Additional style modifiers

    // ============================================
    // ADDITIONAL
    // ============================================
    wardrobe?: string          // Clothing/outfit description
    additional?: string        // Anything not categorized

    // Original prompt
    originalPrompt: string     // The raw input prompt
}

/**
 * Detected reference in prompt
 */
export interface DetectedReference {
    tag: string                // "@marcus"
    position: number           // Position in string
    matched: boolean           // Whether it matches a known reference
}

/**
 * Parser result
 */
export interface ParseResult {
    structured: StructuredPrompt
    references: DetectedReference[]
    confidence: number         // 0-1 how confident the parse was
}
