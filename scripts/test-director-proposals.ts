// @ts-nocheck
/**
 * Director Proposal Test Script - Real Songs
 * 
 * Tests with actual song structures:
 * - Kendrick Lamar "HUMBLE" (2017)
 * - TLC "Waterfalls" (1994)
 * 
 * Run: npx tsx scripts/test-director-proposals.ts
 */

import { DIRECTORS } from '../src/features/music-lab/data/directors.data'
import { buildProposalPrompt } from '../src/features/music-lab/services/director-proposal.service'
import type { SongAnalysis, GenreSelection, LocationRequest } from '../src/features/music-lab/types/music-lab.types'

// =============================================================================
// Kendrick Lamar - HUMBLE (2017) - 150 BPM, F# minor
// =============================================================================

const KENDRICK_HUMBLE: SongAnalysis = {
    transcription: {
        fullText: 'Be humble sit down... Biyombo... I remember syrup sandwiches...',
        words: [],
        segments: []
    },
    structure: {
        bpm: 150,
        key: 'F# minor',
        timeSignature: '4/4',
        sections: [
            { type: 'intro', startTime: 0, endTime: 8 },
            { type: 'verse', startTime: 8, endTime: 38 },
            { type: 'chorus', startTime: 38, endTime: 54 },
            { type: 'verse', startTime: 54, endTime: 89 },
            { type: 'chorus', startTime: 89, endTime: 105 },
            { type: 'verse', startTime: 105, endTime: 140 },
            { type: 'chorus', startTime: 140, endTime: 156 },
            { type: 'outro', startTime: 156, endTime: 177 }
        ]
    },
    confirmedSections: [
        { id: 's1', type: 'intro', startTime: 0, endTime: 8, lyrics: '[Piano intro, haunting minimalist melody]', confirmed: true },
        { id: 's2', type: 'verse', startTime: 8, endTime: 38, lyrics: 'Poverty reflections, syrup sandwiches, crime stats, coming up from nothing. Confrontational.', confirmed: true },
        { id: 's3', type: 'chorus', startTime: 38, endTime: 54, lyrics: 'BE HUMBLE - direct command, calling out ego. Sit down.', confirmed: true },
        { id: 's4', type: 'verse', startTime: 54, endTime: 89, lyrics: 'Critiques fake artists, real success vs image. Viral moment reference.', confirmed: true },
        { id: 's5', type: 'chorus', startTime: 89, endTime: 105, lyrics: 'BE HUMBLE - hook intensifies.', confirmed: true },
        { id: 's6', type: 'verse', startTime: 105, endTime: 140, lyrics: 'Natural beauty, anti-Photoshop message. Authenticity theme.', confirmed: true },
        { id: 's7', type: 'outro', startTime: 156, endTime: 177, lyrics: '[Piano outro, fade]', confirmed: true }
    ]
}

const KENDRICK_GENRE: GenreSelection = { genre: 'hip-hop', subgenre: 'west coast conscious rap' }

const KENDRICK_LOCATIONS: LocationRequest[] = [
    { id: 'l1', name: 'Long dinner table', description: 'Last Supper reference, iconography' },
    { id: 'l2', name: 'Empty streets', description: 'Power walk, cinematic urban' },
    { id: 'l3', name: 'Church/sanctuary', description: 'Religious imagery, moral authority' }
]

// =============================================================================
// TLC - Waterfalls (1994) - 86 BPM, Eb major
// =============================================================================

const TLC_WATERFALLS: SongAnalysis = {
    transcription: {
        fullText: 'Dont go chasing waterfalls, stick to the rivers...',
        words: [],
        segments: []
    },
    structure: {
        bpm: 86,
        key: 'E flat major',
        timeSignature: '4/4',
        sections: [
            { type: 'intro', startTime: 0, endTime: 15 },
            { type: 'verse', startTime: 15, endTime: 65 },
            { type: 'chorus', startTime: 65, endTime: 95 },
            { type: 'verse', startTime: 95, endTime: 145 },
            { type: 'chorus', startTime: 145, endTime: 175 },
            { type: 'bridge', startTime: 175, endTime: 210 },
            { type: 'verse', startTime: 210, endTime: 250 },
            { type: 'chorus', startTime: 250, endTime: 280 },
            { type: 'outro', startTime: 280, endTime: 310 }
        ]
    },
    confirmedSections: [
        { id: 's1', type: 'intro', startTime: 0, endTime: 15, lyrics: '[Synth intro, water sounds, ethereal]', confirmed: true },
        { id: 's2', type: 'verse', startTime: 15, endTime: 65, lyrics: 'Young man in the drug trade, mother worried. Only way he knows. Tragedy unfolds.', confirmed: true },
        { id: 's3', type: 'chorus', startTime: 65, endTime: 95, lyrics: 'Dont chase waterfalls, stick to rivers and lakes. Warning, acceptance.', confirmed: true },
        { id: 's4', type: 'verse', startTime: 95, endTime: 145, lyrics: 'Promiscuity leading to disease. Cautionary, emotional depth.', confirmed: true },
        { id: 's5', type: 'chorus', startTime: 145, endTime: 175, lyrics: 'Chorus deepens with context.', confirmed: true },
        { id: 's6', type: 'bridge', startTime: 175, endTime: 210, lyrics: 'Rap break: Dreams vs self-destruction reality check.', confirmed: true },
        { id: 's7', type: 'verse', startTime: 210, endTime: 250, lyrics: 'Reflection, hope, moving forward with wisdom gained.', confirmed: true },
        { id: 's8', type: 'outro', startTime: 280, endTime: 310, lyrics: '[Harmonies fade, water imagery returns]', confirmed: true }
    ]
}

const TLC_GENRE: GenreSelection = { genre: 'r&b', subgenre: '90s new jack swing' }

const TLC_LOCATIONS: LocationRequest[] = [
    { id: 'l1', name: 'Waterfall/nature', description: 'Central metaphor, flowing water' },
    { id: 'l2', name: 'Urban neighborhood', description: 'Real community, struggles' },
    { id: 'l3', name: 'Abstract dreamscape', description: 'Ethereal, emotional, surreal' }
]

// =============================================================================
// TEST EXECUTION
// =============================================================================

console.log('='.repeat(80))
console.log('DIRECTOR PROPOSAL TEST - REAL SONGS')
console.log('='.repeat(80))

// Test 1: Kendrick HUMBLE
console.log('\n🎤 KENDRICK LAMAR - HUMBLE (150 BPM, West Coast)\n')

DIRECTORS.forEach(director => {
    console.log(`\n--- ${director.name.toUpperCase()} ---`)
    console.log(`Style: ${director.description}`)

    const prompt = buildProposalPrompt(director, {
        songAnalysis: KENDRICK_HUMBLE,
        genreSelection: KENDRICK_GENRE,
        locationRequests: KENDRICK_LOCATIONS,
        artistName: 'Kendrick Lamar',
        artistNotes: 'Iconic, confrontational, religious imagery. The Last Supper. Power.'
    })

    // Show key director-specific elements
    console.log(`\nCamera: ${director.cameraPhilosophy.pointOfViewBias} POV, ${director.cameraPhilosophy.distanceBias} distance`)
    console.log(`Pacing: ${director.rhythmAndPacing.baselinePacing}, ${director.rhythmAndPacing.shotDurationBias} shots`)
    console.log(`Emotion: ${director.emotionalLanguage.preferredEmotionalStates.slice(0, 2).join(', ')}`)
    console.log(`Prompt length: ${prompt.length} chars`)
})

// Test 2: TLC Waterfalls  
console.log('\n\n🎵 TLC - WATERFALLS (86 BPM, 90s R&B)\n')

DIRECTORS.forEach(director => {
    console.log(`\n--- ${director.name.toUpperCase()} ---`)
    console.log(`Style: ${director.description}`)

    const prompt = buildProposalPrompt(director, {
        songAnalysis: TLC_WATERFALLS,
        genreSelection: TLC_GENRE,
        locationRequests: TLC_LOCATIONS,
        artistName: 'TLC',
        artistNotes: 'Emotional storytelling, water imagery, cautionary tales, powerful harmonies.'
    })

    console.log(`\nCamera: ${director.cameraPhilosophy.pointOfViewBias} POV, ${director.cameraPhilosophy.distanceBias} distance`)
    console.log(`Pacing: ${director.rhythmAndPacing.baselinePacing}, ${director.rhythmAndPacing.shotDurationBias} shots`)
    console.log(`Emotion: ${director.emotionalLanguage.preferredEmotionalStates.slice(0, 2).join(', ')}`)
    console.log(`Prompt length: ${prompt.length} chars`)
})

// Test 3: Compare how directors would differ
console.log('\n\n' + '='.repeat(80))
console.log('📊 DIRECTOR COMPARISON - Same Song, Different Visions')
console.log('='.repeat(80))

// Print Hype Millions Prompt explicitly to check logic
const hype = DIRECTORS.find(d => d.name.includes('Hype'))
if (hype) {
    console.log(`\n🔍 DEEP DIVE: ${hype.name.toUpperCase()} PROMPT GENERATION\n`)
    const hypePrompt = buildProposalPrompt(hype, {
        songAnalysis: KENDRICK_HUMBLE,
        genreSelection: KENDRICK_GENRE,
        locationRequests: KENDRICK_LOCATIONS,
        artistName: 'Kendrick Lamar',
        artistNotes: 'Iconic performance'
    })
    console.log(hypePrompt)
    console.log('-'.repeat(80))
}

console.log('\nFor HUMBLE by Kendrick Lamar (Comparison Table):\n')

const comparisons = DIRECTORS.map(director => ({
    name: director.name,
    pov: director.cameraPhilosophy.pointOfViewBias,
    distance: director.cameraPhilosophy.distanceBias,
    pacing: director.rhythmAndPacing.baselinePacing,
    emotion: director.emotionalLanguage.emotionalArcBias,
    stance: director.opinionationModel.defaultStance,
    motion: director.cameraMotionProfile.enabled ? director.cameraMotionProfile.motionBias[0] : 'static'
}))

console.log('| Director       | POV     | Distance | Pacing  | Arc     | Stance  | Motion  |')
console.log('|----------------|---------|----------|---------|---------|---------|---------|')
comparisons.forEach(c => {
    // Truncate or pad
    const name = c.name.slice(0, 14).padEnd(14)
    const pov = c.pov.slice(0, 7).padEnd(7)
    const dist = c.distance.slice(0, 8).padEnd(8)
    const pace = c.pacing.slice(0, 7).padEnd(7)
    const arc = c.emotion.slice(0, 7).padEnd(7)
    const stance = c.stance.slice(0, 7).padEnd(7)
    const motion = (c.motion || 'none').slice(0, 7).padEnd(7)

    console.log(`| ${name} | ${pov} | ${dist} | ${pace} | ${arc} | ${stance} | ${motion} |`)
})

console.log('\n✅ Real song test complete!')
