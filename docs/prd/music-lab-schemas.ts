/**
 * Music Lab + Director's Palette - Core Type Schemas
 *
 * Hierarchy: Style > Prompt > Director
 * - Style defines visual physics (lighting, texture, render logic)
 * - Prompt defines what exists
 * - Director defines framing, pacing, editing (NEVER overrides style)
 */

// =============================================================================
// DIRECTOR PERSONA SCHEMA
// =============================================================================

export interface DirectorPersona {
  id: string;
  name: string;                    // "The Tension Architect" (NOT real director names)
  icon: string;                    // Emoji or icon identifier

  // Core Philosophy
  philosophy: string;              // 2-3 sentence creative worldview

  // Visual Tendencies
  shotTendencies: {
    preferredAngles: CameraAngle[];      // low_angle, eye_level, high_angle, dutch
    preferredFraming: FramingStyle[];    // tight, medium, wide, extreme_wide
    movementBias: 'static' | 'minimal' | 'dynamic';  // For future video
    depthPreference: 'shallow' | 'deep' | 'mixed';
  };

  // Editing & Pacing
  editingRhythm: {
    defaultPacing: 'fast' | 'standard' | 'cinematic';
    averageShotDuration: number;         // seconds
    chorusTreatment: 'intensify' | 'contrast' | 'sustain';
    transitionStyle: 'hard_cut' | 'motivated' | 'rhythmic';
  };

  // Narrative Approach
  narrativeBias: {
    storytellingMode: 'linear' | 'fragmented' | 'cyclical' | 'abstract';
    artistPresence: 'central' | 'supporting' | 'absent' | 'symbolic';
    motifUsage: 'heavy' | 'subtle' | 'none';
  };

  // Prompt Engineering
  promptStyle: {
    prefixTemplates: string[];           // Cinematic openers
    suffixConstraints: string[];         // Quality/style locks
    cameraVocabulary: string[];          // Preferred camera language
    lightingVocabulary: string[];        // Preferred lighting terms
    forbiddenTerms: string[];            // Words this director avoids
  };

  // Metadata
  moodTags: string[];                    // gritty, dreamy, kinetic, elegant
  genreStrengths: string[];              // hip-hop, indie, electronic, ballad
  budgetIllusion: 'gritty_real' | 'polished_indie' | 'luxury' | 'surreal';

  createdAt: string;
  updatedAt: string;
}

export type CameraAngle =
  | 'extreme_low' | 'low_angle' | 'eye_level'
  | 'high_angle' | 'birds_eye' | 'dutch' | 'over_shoulder';

export type FramingStyle =
  | 'extreme_closeup' | 'closeup' | 'medium_closeup'
  | 'medium' | 'medium_wide' | 'wide' | 'extreme_wide';

// =============================================================================
// DIRECTOR PROPOSAL SCHEMA
// =============================================================================

export interface DirectorProposal {
  id: string;
  projectId: string;                     // Music Lab project reference
  directorPersonaId: string;

  // Card Header
  moodTags: string[];                    // 3-5 mood chips
  cutStyle: 'fast' | 'standard' | 'cinematic';
  confidenceScore: number;               // 0-100 based on completeness

  // Pitch Content
  pitch: {
    logline: string;                     // 2-3 sentence vision summary

    structureStrategy: {
      chorusTreatment: string;           // How chorus hits visually
      verseTreatment: string;            // Verse visual approach
      recurringMotifs: string[];         // Visual themes that repeat
      energyCurve: 'steady' | 'builds' | 'drops' | 'rollercoaster';
    };

    locations: ProposedLocation[];
    wardrobeSets: ProposedWardrobe[];

    shotRhythm: {
      averageShotLength: number;         // seconds
      pacingRule: string;                // e.g., "chorus = faster"
      totalEstimatedShots: number;
    };
  };

  // Generated Shot Plan
  shotPlan: ProposedShot[];

  // Prompt Enhancement
  flavorPack: {
    prefixTemplates: string[];
    suffixTemplates: string[];
    samplePrompts: string[];             // 3-5 example enhanced prompts
  };

  // Status
  status: 'generating' | 'ready' | 'selected' | 'rejected';
  isSelectedForSynthesis: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface ProposedLocation {
  id: string;
  name: string;                          // "Neon-lit alley"
  description: string;                   // Visual description
  usageContext: string;                  // "Verse 1, Bridge"
  referenceImageUrl?: string;            // Optional cheap preview
}

export interface ProposedWardrobe {
  id: string;
  name: string;                          // "Street King Look"
  description: string;                   // Visual description
  pieces: string[];                      // Individual items
  usageContext: string;                  // "Intro, Verse 2"
  referenceImageUrl?: string;
}

export interface ProposedShot {
  id: string;
  sequenceNumber: number;
  sectionId: string;                     // Links to SongSection

  // Timing
  startTime: number;                     // seconds
  endTime: number;                       // seconds
  duration: number;                      // endTime - startTime

  // Content
  promptRaw: string;                     // Base prompt
  promptEnhanced?: string;               // With director prefix/suffix
  directorNotes: string;                 // Why this shot, what it achieves

  // Classification
  typeTag: ShotTypeTag;
  cameraAngle: CameraAngle;
  framingStyle: FramingStyle;

  // References
  locationRef?: string;                  // Location ID
  wardrobeRef?: string;                  // Wardrobe set ID
  characterRefs: string[];               // @artist, @character names

  // For cheap preview
  previewImageUrl?: string;
}

export type ShotTypeTag =
  | 'performance'      // Artist performing/singing
  | 'narrative'        // Story moment
  | 'broll'           // Contextual/atmospheric
  | 'abstract'        // Non-literal visual
  | 'cutaway'         // Quick insert shot
  | 'establishing';   // Location/mood setter

// =============================================================================
// TIMELINE BLOCK SCHEMA (Final Assembly)
// =============================================================================

export interface TimelineBlock {
  id: string;
  projectId: string;

  // Timing
  startTime: number;
  endTime: number;
  sectionId: string;                     // Links to detected song section

  // Content
  typeTag: ShotTypeTag;
  promptRaw: string;
  promptEnhanced: string;                // Final prompt with all enhancements
  directorNotes: string;

  // References
  locationRef?: string;
  wardrobeRef?: string;
  characterRefs: string[];
  styleGuideRef?: string;                // Style always takes precedence

  // Continuity Locks
  locks: {
    wardrobeLocked: boolean;             // Don't change outfit
    locationLocked: boolean;             // Don't change location
    styleLocked: boolean;                // Always true - style never changes
  };

  // Source Tracking
  sourceProposalId?: string;             // Which director proposal this came from
  sourceDirectorId?: string;
  isUserModified: boolean;

  // Rendering
  renderStatus: 'pending' | 'generating' | 'completed' | 'failed';
  galleryId?: string;                    // Generated image
  previewImageUrl?: string;              // Cheap preview

  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// SONG ANALYSIS SCHEMA
// =============================================================================

export interface SongAnalysis {
  id: string;
  projectId: string;

  // Audio File
  audioFileUrl: string;
  audioDuration: number;                 // Total seconds

  // From all-in-one-music-structure-analyzer
  structureAnalysis: {
    bpm: number;
    beats: number[];                     // Timestamps of each beat
    downbeats: number[];                 // Timestamps of downbeats
    sections: SongSection[];
  };

  // From Whisper
  lyricsAnalysis: {
    fullText: string;
    segments: LyricSegment[];
    language: string;
    confidence: number;
  };

  // User Confirmations
  userConfirmed: {
    chorusMarkers: boolean;
    sectionLabels: boolean;
    bpm: boolean;
  };

  createdAt: string;
  updatedAt: string;
}

export interface SongSection {
  id: string;
  label: SectionLabel;
  startTime: number;
  endTime: number;
  confidence: number;                    // Model confidence
  isChorusCandidate: boolean;
  userConfirmed: boolean;
}

export type SectionLabel =
  | 'intro' | 'verse' | 'pre_chorus' | 'chorus'
  | 'post_chorus' | 'bridge' | 'outro' | 'instrumental' | 'unknown';

export interface LyricSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  words: LyricWord[];
}

export interface LyricWord {
  word: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

// =============================================================================
// MUSIC LAB PROJECT SCHEMA
// =============================================================================

export interface MusicLabProject {
  id: string;
  userId: string;
  title: string;

  // Song
  songAnalysisId: string;

  // Creative Intent (from user interview)
  creativeIntent: {
    videoType: 'performance' | 'narrative' | 'hybrid' | 'abstract' | 'custom';
    artistPresence: 'always' | 'mostly' | 'occasionally' | 'never';
    tone: 'uplifting' | 'aggressive' | 'melancholic' | 'romantic' | 'dark' | 'other';
    energyCurve: 'steady' | 'builds' | 'drops' | 'rollercoaster';

    visualAnchors: {
      useRecurringMotifs: boolean;
      motifThemes: string[];             // money, street, nature, fire, neon
      budgetIllusion: 'gritty_real' | 'polished_indie' | 'luxury' | 'surreal';
    };

    continuityRules: {
      wardrobeStrategy: 'one_outfit' | 'few_outfits' | 'per_section' | 'no_preference';
      locationStrategy: 'one_primary' | 'few_locations' | 'many' | 'no_preference';
    };

    mustShowMoments: MustShowMoment[];   // Max 3
  };

  // Style (ALWAYS takes precedence)
  styleGuideId?: string;

  // Artist/Characters
  artistId?: string;                     // Primary artist character sheet
  characterIds: string[];                // Supporting characters

  // Wardrobe
  wardrobeSets: WardrobeSet[];

  // Director Proposals
  proposalIds: string[];
  selectedProposalId?: string;           // Chosen for synthesis

  // Final Timeline
  timelineBlocks: TimelineBlock[];

  // Status
  status:
    | 'uploading'           // Song being uploaded
    | 'analyzing'           // Running through Whisper + Structure analyzer
    | 'interview'           // User answering creative intent questions
    | 'proposing'           // Directors generating pitches
    | 'comparing'           // User reviewing proposals
    | 'assembling'          // Cherry-picking and synthesis
    | 'editing'             // Timeline editing
    | 'rendering'           // Generating final images
    | 'completed';

  // Progress Tracking
  progress: {
    analysisComplete: boolean;
    interviewComplete: boolean;
    proposalsGenerated: number;
    proposalsTotal: number;
    blocksRendered: number;
    blocksTotal: number;
  };

  createdAt: string;
  updatedAt: string;
}

export interface MustShowMoment {
  id: string;
  description: string;
  timestampStart: number;
  timestampEnd: number;
}

export interface WardrobeSet {
  id: string;
  name: string;
  description: string;
  pieces: WardrobePiece[];
  usedInSections: string[];              // Section IDs
  referenceImageUrl?: string;
}

export interface WardrobePiece {
  id: string;
  type: 'top' | 'bottom' | 'footwear' | 'accessory' | 'headwear' | 'outerwear';
  description: string;
  referenceImageUrl?: string;            // User-uploaded or generated
  isolatedImageUrl?: string;             // Product-style isolated image
}

// =============================================================================
// CHERRY-PICK SELECTION SCHEMA
// =============================================================================

export interface CherryPickSelection {
  projectId: string;

  // Elements picked from different proposals
  selectedElements: {
    locationsFrom: { proposalId: string; locationIds: string[] }[];
    wardrobeFrom: { proposalId: string; wardrobeIds: string[] }[];
    pacingFrom: { proposalId: string };  // Only one pacing template
    shotsFrom: { proposalId: string; shotIds: string[] }[];
    flavorPackFrom: { proposalId: string };
  };

  // Missing elements that need resolution
  missingElements: {
    type: 'location' | 'wardrobe' | 'shot' | 'pacing';
    sectionId: string;
    resolution: 'auto_fill' | 'select_from_other' | 'manual_input' | 'pending';
    resolvedValue?: string;
  }[];

  // Director chosen to synthesize final
  synthesisDirectorId: string;
}
