/**
 * Director Proposal Generation Service
 * 
 * Uses Gemini 2.0 Flash (via OpenRouter) to generate director-specific
 * proposals based on song analysis and director fingerprints.
 * 
 * Gemini chosen for:
 * - 1M+ token context (can hold full director fingerprint + song data)
 * - Fast inference
 * - Free tier available
 */

import type {
    DirectorFingerprint,
    DirectorProposal,
    ProposedShot,
    ProposedLocation,
    ProposedWardrobe
} from '../types/director.types'
import type { SongAnalysis, LocationRequest, GenreSelection } from '../types/music-lab.types'

// =============================================================================
// TYPES
// =============================================================================

export interface ProposalInput {
    songAnalysis: SongAnalysis
    genreSelection: GenreSelection
    locationRequests: LocationRequest[]
    artistName: string
    artistNotes?: string
}

// =============================================================================
// PROMPT BUILDING
// =============================================================================

function buildProposalPrompt(
    director: DirectorFingerprint,
    input: ProposalInput
): string {
    const { songAnalysis, genreSelection, locationRequests, artistName, artistNotes } = input

    return `You are ${director.name}, a film director with a distinct approach:

## Your Director Philosophy
${director.description}

### Core Intent
- Primary Focus: ${director.coreIntent.primaryFocus.join(', ')}
- Emotional Temperature: ${director.coreIntent.emotionalTemperature}
- Control Style: ${director.coreIntent.controlVsSpontaneity}

### Story Interpretation
You read for: ${director.storyInterpretation.readsFor.join(', ')}
Theme Style: ${director.storyInterpretation.themeExtractionStyle}

### Emotional Language
Preferred States: ${director.emotionalLanguage.preferredEmotionalStates.join(', ')}
Arc Bias: ${director.emotionalLanguage.emotionalArcBias}

### Camera Philosophy
POV Bias: ${director.cameraPhilosophy.pointOfViewBias}
Framing: ${director.cameraPhilosophy.framingInstinct.join(', ')}
Distance: ${director.cameraPhilosophy.distanceBias}

### Rhythm & Pacing
Baseline: ${director.rhythmAndPacing.baselinePacing}
Shot Duration: ${director.rhythmAndPacing.shotDurationBias}
Cut Motivation: ${director.rhythmAndPacing.cutMotivation}

### Spectacle & Signature Moments
VFX Tolerance: ${director.spectacleProfile.vfxTolerance}
Signature Moments: ${director.spectacleProfile.signatureMoments.join(', ')}
Surreal Tendency: ${director.spectacleProfile.surrealTendency}
Spectacle Types: ${director.spectacleProfile.spectacleTypes.join(', ')}
Budget Assumption: ${director.spectacleProfile.budgetAssumption}

---

## Song Information
Artist: ${artistName}
Genre: ${genreSelection.genre} / ${genreSelection.subgenre}
BPM: ${songAnalysis.structure.bpm}
${artistNotes ? `Artist Notes: ${artistNotes}` : ''}

## Song Sections
${songAnalysis.confirmedSections.map(s =>
        `- ${s.type.toUpperCase()} (${s.startTime.toFixed(1)}s - ${s.endTime.toFixed(1)}s): "${s.lyrics.substring(0, 100)}${s.lyrics.length > 100 ? '...' : ''}"`
    ).join('\n')}

## Requested Locations
${locationRequests.length > 0
            ? locationRequests.map(l => `- ${l.name}: ${l.description || 'No description'}`).join('\n')
            : 'No specific locations requested'}

---

## Your Task
Create a music video proposal in YOUR DISTINCT STYLE. Generate:

1. **Logline**: 2-3 sentences summarizing your vision
2. **Concept Overview**: Full paragraph explaining the emotional journey
3. **Signature Moment**: ONE memorable spectacle shot that defines this video (VFX, camera trick, or striking visual)
4. **3 Locations**: With lighting and time of day
5. **1-5 Wardrobe Looks**: With section assignments
6. **6 Key Shots**: Spread across the song sections

OUTPUT FORMAT (JSON only, no markdown):
{
  "logline": "Your 2-3 sentence summary",
  "conceptOverview": "Full paragraph explanation",
  "signatureMoment": {
    "description": "The ONE unforgettable visual that makes this video iconic",
    "technique": "How it's achieved (VFX, practical, camera move, etc)",
    "timestamp": "When it hits (e.g. 'chorus drop at 45s')",
    "emotionalPurpose": "Why this moment matters"
  },
  "locations": [
    {
      "name": "Location name",
      "description": "Detailed description",
      "timeOfDay": "golden hour / night / day / dawn",
      "lighting": "Lighting description",
      "forSections": ["chorus", "verse"]
    }
  ],
  "wardrobeLooks": [
    {
      "lookName": "Look name",
      "description": "Detailed wardrobe description",
      "forSections": ["intro", "outro"]
    }
  ],
  "keyShots": [
    {
      "sectionType": "verse",
      "timestamp": 30.5,
      "framing": "close-up / medium / wide",
      "angle": "eye-level / low / high",
      "subject": "@artist or detail",
      "emotion": "emotional state",
      "basePrompt": "Full prompt for this shot WITHOUT style",
      "directorNotes": "Why this shot matters",
      "isSpectacle": false
    }
  ]
}`
}

// =============================================================================
// API SERVICE
// =============================================================================

class DirectorProposalService {
    private apiEndpoint = '/api/director-proposal/generate'

    /**
     * Generate a proposal for a single director
     */
    async generateProposal(
        director: DirectorFingerprint,
        input: ProposalInput
    ): Promise<DirectorProposal> {
        let response: Response

        try {
            response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    directorId: director.id,
                    directorName: director.name,
                    prompt: buildProposalPrompt(director, input)
                })
            })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Network request failed'
            throw new Error(`Failed to connect to proposal service: ${message}`)
        }

        if (!response.ok) {
            throw new Error(`Proposal generation failed: ${response.statusText}`)
        }

        let data: {
            logline?: string
            conceptOverview?: string
            locations?: Array<Omit<ProposedLocation, 'id'>>
            wardrobeLooks?: Array<Omit<ProposedWardrobe, 'id'>>
            keyShots?: Array<Omit<ProposedShot, 'id' | 'sectionId'> & { sectionType: string }>
        }

        try {
            data = await response.json()
        } catch {
            throw new Error('Invalid response format from proposal service')
        }

        // Validate required fields exist
        if (!data.logline || !data.conceptOverview) {
            throw new Error('Proposal response missing required fields')
        }

        return {
            id: `proposal_${director.id}_${Date.now()}`,
            projectId: 'temp_project_id', // Needs to be injected or managed by store
            directorId: director.id,
            directorName: director.name,
            logline: data.logline,
            conceptOverview: data.conceptOverview,
            locations: (data.locations || []).map((l, i) => ({
                ...l,
                id: `loc_${i}`
            })),
            wardrobeLooks: (data.wardrobeLooks || []).map((w, i) => ({
                ...w,
                id: `ward_${i}`
            })),
            keyShots: (data.keyShots || []).map((s, i) => ({
                ...s,
                id: `shot_${i}`,
                sectionId: s.sectionType // Map sectionType (from JSON) to sectionId (Type)
            })),
            createdAt: new Date().toISOString()
        }
    }

    /**
     * Generate proposals for multiple directors in parallel
     */
    async generateAllProposals(
        directors: DirectorFingerprint[],
        input: ProposalInput
    ): Promise<DirectorProposal[]> {
        const promises = directors.map(d => this.generateProposal(d, input))
        return Promise.all(promises)
    }
}

export const directorProposalService = new DirectorProposalService()
export { buildProposalPrompt }
export type { DirectorProposal, ProposedShot, ProposedLocation, ProposedWardrobe }
