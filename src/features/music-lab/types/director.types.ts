/**
 * Director Types for Music Lab
 *
 * Director fingerprints and proposal structures.
 */

import type { DirectorCameraRig } from '@/features/storyboard/types/storyboard.types'

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
        riskTolerance: 'low' | 'medium' | 'high' | 'maximum'
        ambiguityPreference: 'explicit' | 'suggestive' | 'unresolved'
        emotionalTemperature: 'warm' | 'cool' | 'neutral' | 'warm_but_distant' | 'electric'
        controlVsSpontaneity: 'controlled' | 'adaptive' | 'exploratory' | 'stylized'
    }

    // Story Interpretation
    storyInterpretation: {
        readsFor: string[]
        themeExtractionStyle: 'explicit' | 'implicit' | 'visual'
        subtextSensitivity: 'low' | 'medium' | 'high'
        symbolismUsage: 'minimal' | 'restrained' | 'heavy' | 'iconic'
    }

    // Emotional Language
    emotionalLanguage: {
        preferredEmotionalStates: string[]
        contrastStrategy: 'subtle' | 'gradual' | 'sharp' | 'stark' | 'extreme'
        emotionalArcBias: 'build' | 'plateau' | 'oscillate' | 'resolve' | 'escalate'
        sentimentalityThreshold: 'avoids' | 'tolerates' | 'embraces'
    }

    // Actor Direction
    actorDirection: {
        directionMode: 'physical' | 'emotional_intention' | 'textual' | 'choreographed' | 'performance_focused'
        performancePreferences: string[]
        noteStyle: 'direct' | 'conceptual' | 'metaphorical' | 'precise' | 'hype'
        lineDeliveryBias: 'naturalistic' | 'stylized' | 'restrained' | 'flat' | 'energetic'
    }

    // Camera Philosophy
    cameraPhilosophy: {
        pointOfViewBias: 'subjective' | 'objective' | 'observational' | 'heroic'
        framingInstinct: string[]
        distanceBias: 'intimate' | 'mid-range' | 'detached' | 'wide' | 'extreme'
        stillnessVsMovement: 'stillness-dominant' | 'balanced' | 'movement-dominant' | 'static-or-tracking'
    }

    // Camera Motion Profile (swappable)
    cameraMotionProfile: {
        enabled: boolean
        motionBias: string[]
        motionFrequency: 'rare' | 'occasional' | 'frequent' | 'constant'
        escalationRule: 'none' | 'emotional' | 'story-driven' | 'rhythmic' | 'beat-driven'
        forbiddenMovements: string[]
    }

    // Visual Decision Biases
    visualDecisionBiases: {
        complexityPreference: 'minimal' | 'layered' | 'dense' | 'curated' | 'high-contrast'
        environmentRole: 'background' | 'character' | 'antagonist' | 'sci-fi-backdrop'
        iconicFrameTendency: 'rare' | 'selective' | 'frequent' | 'constant' | 'always'
        motifRepetition: 'avoids' | 'deliberate' | 'automatic' | 'obsessive' | 'loop-ready'
    }

    // Rhythm and Pacing
    rhythmAndPacing: {
        baselinePacing: 'measured' | 'controlled' | 'dynamic' | 'snappy' | 'frantic'
        sectionalVariation: {
            verse: string
            chorus: string
            bridge: string
        }
        shotDurationBias: 'short' | 'mixed' | 'long'
        cutMotivation: 'rhythmic' | 'emotional' | 'narrative' | 'visual_match' | 'beat'
    }

    // Communication Profile
    communicationProfile: {
        tone: 'calm' | 'reflective' | 'intense' | 'polite' | 'energetic'
        confidenceExpression: 'quiet' | 'assertive' | 'matter-of-fact' | 'loud'
        feedbackStyle: 'supportive' | 'surgical' | 'provocative' | 'specific' | 'hype-man'
        metaphorUsage: 'low' | 'medium' | 'high'
    }

    // Questioning Strategy
    questioningStrategy: {
        defaultMode: 'clarifying' | 'probing' | 'challenging' | 'aesthetic' | 'visual'
        preferredQuestions: string[]
        stopConditions: string[]
    }

    // Opinionation Model
    opinionationModel: {
        defaultStance: 'consultant' | 'interpreter' | 'auteur' | 'visionary'
        overrideThreshold: 'low' | 'medium' | 'high' | 'zero'
        conflictResponse: 'defer' | 'reframe' | 'insist' | 'ignore' | 'overwhelm'
    }

    // Spectacle Profile - VFX, signature moments, memorable visuals
    spectacleProfile: {
        vfxTolerance: 'none' | 'subtle' | 'moderate' | 'embraces' | 'stylized' | 'maximum'
        signatureMoments: string[]       // Types of hero shots this director favors
        surrealTendency: 'grounded' | 'light-touch' | 'dreamlike' | 'surreal' | 'stylized' | 'high'
        practicalVsDigital: 'practical-only' | 'practical-preferred' | 'balanced' | 'digital-forward' | 'miniature-style' | 'hybrid-glossy'
        spectacleTypes: string[]         // What kind of spectacle they'd create
        budgetAssumption: 'indie' | 'mid' | 'blockbuster' | 'high' | 'unlimited'
    }

    // Image Generation (for UI)
    imagePrompt: {
        base: string
        variations: string[]
    }

    // Camera Rig (optional - for cinematography enhancement)
    cameraRig?: DirectorCameraRig

    // Constraints
    constraints: {
        immutableSections: string[]
        swappableSections: string[]
        styleExcluded: boolean
    }

    // Director Questions (optional - for interactive refinement)
    questions?: DirectorQuestion[]
}

// =============================================================================
// DIRECTOR QUESTIONS
// =============================================================================

export interface DirectorQuestionOption {
    label: string           // What user sees (short)
    value: string           // Identifier for the answer
    description?: string    // Optional longer explanation
    isDefault?: boolean     // Pre-selected option
}

export interface DirectorQuestion {
    id: string
    questionText: string    // The question the director asks
    options: DirectorQuestionOption[]
    category: 'emotional' | 'visual' | 'narrative' | 'spectacle'
}

// User's answers to director questions
export interface DirectorQuestionAnswers {
    directorId: string
    answers: Record<string, string>  // questionId -> selected value
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
    directorName: string

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
