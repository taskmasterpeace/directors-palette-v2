/**
 * Director Types for Music Lab
 * 
 * Director fingerprints and proposal structures.
 */

// =============================================================================
// DIRECTOR FINGERPRINT
// =============================================================================

export type CameraAngle =
    | 'extreme_low'
    | 'low_angle'
    | 'eye_level'
    | 'high_angle'
    | 'birds_eye'
    | 'dutch'
    | 'over_shoulder'

export type FramingStyle =
    | 'extreme_closeup'
    | 'closeup'
    | 'medium_closeup'
    | 'medium'
    | 'medium_wide'
    | 'wide'
    | 'extreme_wide'

export interface DirectorFingerprint {
    id: string
    name: string
    version: string
    description: string               // Single line summary of director's approach

    // Core Intent (immutable)
    coreIntent: {
        primaryFocus: string[]
        riskTolerance: 'low' | 'medium' | 'high'
        ambiguityPreference: 'explicit' | 'suggestive' | 'unresolved'
        emotionalTemperature: 'warm' | 'cool' | 'neutral'
        controlVsSpontaneity: 'controlled' | 'adaptive' | 'exploratory'
    }

    // Story Interpretation
    storyInterpretation: {
        readsFor: string[]
        themeExtractionStyle: 'explicit' | 'implicit'
        subtextSensitivity: 'low' | 'medium' | 'high'
        symbolismUsage: 'minimal' | 'restrained' | 'heavy'
    }

    // Emotional Language
    emotionalLanguage: {
        preferredEmotionalStates: string[]
        contrastStrategy: 'subtle' | 'gradual' | 'sharp'
        emotionalArcBias: 'build' | 'plateau' | 'oscillate'
        sentimentalityThreshold: 'avoids' | 'tolerates' | 'embraces'
    }

    // Actor Direction
    actorDirection: {
        directionMode: 'physical' | 'emotional_intention' | 'textual'
        performancePreferences: string[]
        noteStyle: 'direct' | 'conceptual' | 'metaphorical'
        lineDeliveryBias: 'naturalistic' | 'stylized' | 'restrained'
    }

    // Camera Philosophy
    cameraPhilosophy: {
        pointOfViewBias: 'subjective' | 'objective' | 'observational'
        framingInstinct: string[]
        distanceBias: 'intimate' | 'mid-range' | 'detached'
        stillnessVsMovement: 'stillness-dominant' | 'balanced' | 'movement-dominant'
    }

    // Camera Motion Profile (swappable)
    cameraMotionProfile: {
        enabled: boolean
        motionBias: string[]
        motionFrequency: 'rare' | 'occasional' | 'frequent'
        escalationRule: 'none' | 'emotional' | 'story-driven'
        forbiddenMovements: string[]
    }

    // Visual Decision Biases
    visualDecisionBiases: {
        complexityPreference: 'minimal' | 'layered' | 'dense'
        environmentRole: 'background' | 'character' | 'antagonist'
        iconicFrameTendency: 'rare' | 'selective' | 'frequent'
        motifRepetition: 'avoids' | 'deliberate' | 'automatic'
    }

    // Rhythm and Pacing
    rhythmAndPacing: {
        baselinePacing: 'measured' | 'controlled' | 'dynamic'
        sectionalVariation: {
            verse: string
            chorus: string
            bridge: string
        }
        shotDurationBias: 'short' | 'mixed' | 'long'
        cutMotivation: 'rhythmic' | 'emotional' | 'narrative'
    }

    // Communication Profile
    communicationProfile: {
        tone: 'calm' | 'reflective' | 'intense'
        confidenceExpression: 'quiet' | 'assertive'
        feedbackStyle: 'supportive' | 'surgical' | 'provocative'
        metaphorUsage: 'low' | 'medium' | 'high'
    }

    // Questioning Strategy
    questioningStrategy: {
        defaultMode: 'clarifying' | 'probing' | 'challenging'
        preferredQuestions: string[]
        stopConditions: string[]
    }

    // Opinionation Model
    opinionationModel: {
        defaultStance: 'consultant' | 'interpreter' | 'auteur'
        overrideThreshold: 'low' | 'medium' | 'high'
        conflictResponse: 'defer' | 'reframe' | 'insist'
    }

    // Spectacle Profile - VFX, signature moments, memorable visuals
    spectacleProfile: {
        vfxTolerance: 'none' | 'subtle' | 'moderate' | 'embraces'    // How much VFX/CGI
        signatureMoments: string[]       // Types of hero shots this director favors
        surrealTendency: 'grounded' | 'light-touch' | 'dreamlike' | 'surreal'
        practicalVsDigital: 'practical-only' | 'practical-preferred' | 'balanced' | 'digital-forward'
        spectacleTypes: string[]         // What kind of spectacle they'd create
        budgetAssumption: 'indie' | 'mid' | 'blockbuster'
    }

    // Image Generation (for UI)
    imagePrompt: {
        base: string
        variations: string[]
    }

    // Constraints
    constraints: {
        immutableSections: string[]
        swappableSections: string[]
        styleExcluded: boolean
    }
}

// =============================================================================
// DIRECTOR PROPOSAL
// =============================================================================

export interface ProposedLocation {
    id: string
    name: string
    description: string
    timeOfDay: string
    lighting: string
    forSections: string[]         // Section IDs
}

export interface ProposedWardrobe {
    id: string
    lookName: string              // "Street King"
    description: string           // Full wardrobe description
    forSections: string[]         // Section IDs
    previewImageUrl?: string      // P-Edit generated preview
}

export interface ProposedShot {
    id: string
    sectionId: string
    sequence: number
    timestamp: number             // Time in song

    // Shot details
    framing: FramingStyle
    angle?: CameraAngle
    subject: string               // @artist, location detail, etc.
    emotion: string
    wardrobeLookId?: string
    locationId?: string

    // Prompt (without style)
    basePrompt: string
    directorNotes?: string

    // Preview
    previewImageUrl?: string      // P-Image generated
    userRating?: number           // 1-5 stars
}

export interface DirectorStyleSheet {
    id: string
    directorId: string
    gridImages: string[]          // 9 images for 3x3 grid
    generatedAt: string
}

export interface DirectorProposal {
    id: string
    projectId: string
    directorId: string

    // Pitch
    logline: string               // 2-3 sentence summary
    conceptOverview: string       // Full paragraph

    // Structure
    locations: ProposedLocation[]
    wardrobeLooks: ProposedWardrobe[]
    keyShots: ProposedShot[]      // 12 preview shots

    // Style sheet
    styleSheet?: DirectorStyleSheet

    // Ratings
    overallRating?: number        // 1-5 stars

    // Metadata
    createdAt: string
}

// =============================================================================
// CHERRY PICK
// =============================================================================

export interface CherryPickItem {
    type: 'location' | 'wardrobe' | 'shot'
    itemId: string
    fromProposalId: string
    fromDirectorId: string
    rating: number
}

export interface CherryPickSelection {
    leadDirectorId: string        // Primary director for the project
    selectedItems: CherryPickItem[]
}
