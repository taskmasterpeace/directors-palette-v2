/**
 * Prompt Organizer Types
 * 
 * Types for structured prompt parsing and editing.
 */

/**
 * Structured prompt format for organized editing
 */
export interface StructuredPrompt {
    // Subject
    subject: {
        reference?: string        // @reference tag (e.g., "@marcus")
        description: string       // Subject description
        emotion?: string          // Emotional state
    }

    // Scene elements
    wardrobe?: string          // Clothing/outfit description
    location?: string          // Setting/environment
    lighting?: string          // Lighting description

    // Camera/Composition
    framing?: string           // Shot framing (close-up, wide, etc.)
    angle?: string             // Camera angle (low, high, dutch, etc.)
    cameraMovement?: string    // For video (null for stills)

    // Additional
    additional?: string        // Anything not categorized

    // Original
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
