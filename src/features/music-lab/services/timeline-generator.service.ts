import { DirectorFingerprint, DirectorProposal } from '../types/director.types'
import { TimelineShot } from '../types/timeline.types'

interface SongSection {
    type: string
    startTime: number
    endTime: number
}

interface SongAnalysis {
    bpm: number
    sections: SongSection[]
    duration: number
}

// Simple UUID generator since we don't have the package
const generateId = () => `shot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export class TimelineGenerator {

    static generateTimeline(
        song: SongAnalysis,
        proposal: DirectorProposal,
        director: DirectorFingerprint
    ): TimelineShot[] {
        const shots: TimelineShot[] = []

        // 1. Determine Pacing (Shot Duration)
        const pacingMap: Record<string, number> = {
            'frantic': 1,   // 1 second cuts
            'snappy': 2,
            'dynamic': 3,
            'measured': 4,
            'controlled': 6
        }

        const baseDuration = pacingMap[director.rhythmAndPacing.baselinePacing] || 4

        // 2. Iterate Sections to create "Foundation Blocks"
        song.sections.forEach(section => {
            // Determine wardobe/location for this section
            // (Simple logic: Verse 1 -> Loc 0, Chorus 1 -> Loc 1, etc)
            const sectionsOfType = song.sections.filter(s => s.type === section.type)
            const indexWithType = sectionsOfType.indexOf(section)

            // Assign from Proposal Lists (safe modulo)
            const assignedLoc = proposal.locations.length > 0
                ? proposal.locations[(song.sections.indexOf(section) % proposal.locations.length)]
                : undefined

            const assignedJob = proposal.wardrobeLooks.length > 0
                ? proposal.wardrobeLooks[(song.sections.indexOf(section) % proposal.wardrobeLooks.length)]
                : undefined

            let currentTime = section.startTime

            // Safety: ensure infinite loop protection
            if (section.endTime <= section.startTime) return

            while (currentTime < section.endTime) {
                // Determine block duration (clamp to section end)
                const duration = Math.min(baseDuration, section.endTime - currentTime)

                if (duration < 0.5) break // Skip tiny fragments

                const shotId = generateId()
                const shot: TimelineShot = {
                    id: shotId,
                    sectionId: `${section.type}-${indexWithType}`,
                    startTime: currentTime,
                    endTime: currentTime + duration,
                    prompt: `${director.name} directing ${assignedJob?.lookName || 'Artist'} at ${assignedLoc?.name || 'Location'}. ${section.type} performance.`,
                    wardrobeLookId: assignedJob?.id,
                    locationId: assignedLoc?.id,
                    directorId: director.id,
                    proposalId: proposal.id,
                    color: '#10b981' // Green for "Generated/Performance"
                }

                shots.push(shot)
                currentTime += duration
            }
        })

        // 3. Anchor Key Shots (Overlay)
        proposal.keyShots.forEach(keyShot => {
            const duration = 4

            const newShot: TimelineShot = {
                id: generateId(),
                sectionId: keyShot.sectionId || 'unknown',
                startTime: keyShot.timestamp,
                endTime: keyShot.timestamp + duration,
                prompt: keyShot.basePrompt,
                wardrobeLookId: keyShot.wardrobeLookId,
                locationId: keyShot.locationId,
                directorId: director.id,
                proposalId: proposal.id,
                previewImageUrl: keyShot.previewImageUrl,
                color: '#3b82f6' // Blue for "Key/Story"
            }

            // Remove overlapping shots
            const conflictIndex = shots.findIndex(s =>
                (s.startTime >= newShot.startTime && s.startTime < newShot.endTime) ||
                (s.endTime > newShot.startTime && s.endTime <= newShot.endTime)
            )

            if (conflictIndex !== -1) {
                shots.splice(conflictIndex, 1)
            }

            shots.push(newShot)
        })

        // Sort by start time
        return shots.sort((a, b) => a.startTime - b.startTime)
    }
}
