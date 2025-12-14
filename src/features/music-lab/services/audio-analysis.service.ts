/**
 * Audio Analysis Service
 * 
 * Handles audio transcription and structure analysis using Replicate models.
 */

import type { SongAnalysis, SongSection, SongSectionType, TimestampedWord } from '../types/music-lab.types'

// Replicate model IDs (used for reference, API routes handle actual calls)
const _MODELS = {
    whisperDiarization: 'thomasmol/whisper-diarization',
    musicStructure: 'sakemin/all-in-one-music-structure-analyzer',
    demucs: 'cjwbw/demucs'
}

interface WhisperResponse {
    segments: Array<{
        text: string
        start: number
        end: number
        words: Array<{
            word: string
            start: number
            end: number
            probability: number
        }>
    }>
}

interface StructureResponse {
    bpm: number
    key?: string
    time_signature?: string
    sections: Array<{
        label: string
        start: number
        end: number
    }>
    beats: number[]
}

class AudioAnalysisService {
    private replicateApiKey: string | null = null

    setApiKey(key: string) {
        this.replicateApiKey = key
    }

    /**
     * Transcribe audio using Whisper with word-level timestamps
     */
    async transcribe(audioUrl: string): Promise<{
        fullText: string
        words: TimestampedWord[]
    }> {
        const response = await fetch('/api/music-lab/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioUrl })
        })

        if (!response.ok) {
            throw new Error('Transcription failed')
        }

        const data: WhisperResponse = await response.json()

        // Flatten words from all segments
        const words: TimestampedWord[] = []
        let fullText = ''

        for (const segment of data.segments) {
            fullText += segment.text + ' '
            for (const word of segment.words) {
                words.push({
                    word: word.word,
                    startTime: word.start,
                    endTime: word.end,
                    confidence: word.probability
                })
            }
        }

        return {
            fullText: fullText.trim(),
            words
        }
    }

    /**
     * Analyze song structure (BPM, sections, beats)
     */
    async analyzeStructure(audioUrl: string): Promise<{
        bpm: number
        key?: string
        timeSignature?: string
        sections: Array<{ type: SongSectionType; startTime: number; endTime: number }>
        beats: number[]
    }> {
        const response = await fetch('/api/music-lab/analyze-structure', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioUrl })
        })

        if (!response.ok) {
            throw new Error('Structure analysis failed')
        }

        const data: StructureResponse = await response.json()

        // Map section labels to our types
        const sections = data.sections.map(s => ({
            type: this.mapSectionLabel(s.label),
            startTime: s.start,
            endTime: s.end
        }))

        return {
            bpm: data.bpm,
            key: data.key,
            timeSignature: data.time_signature,
            sections,
            beats: data.beats
        }
    }

    /**
     * Full analysis pipeline
     */
    async analyze(audioUrl: string): Promise<SongAnalysis> {
        // Run transcription and structure analysis in parallel
        const [transcription, structure] = await Promise.all([
            this.transcribe(audioUrl),
            this.analyzeStructure(audioUrl)
        ])

        // Create initial confirmed sections from structure
        const confirmedSections: SongSection[] = structure.sections.map((s, i) => ({
            id: `section-${i}`,
            type: s.type,
            startTime: s.startTime,
            endTime: s.endTime,
            lyrics: this.extractLyricsForTimeRange(
                transcription.words,
                s.startTime,
                s.endTime
            )
        }))

        return {
            transcription,
            structure,
            confirmedSections
        }
    }

    /**
     * Extract lyrics within a time range
     */
    private extractLyricsForTimeRange(
        words: TimestampedWord[],
        startTime: number,
        endTime: number
    ): string {
        return words
            .filter(w => w.startTime >= startTime && w.endTime <= endTime)
            .map(w => w.word)
            .join(' ')
    }

    /**
     * Map structure analyzer labels to our section types
     */
    private mapSectionLabel(label: string): SongSectionType {
        const normalized = label.toLowerCase()

        if (normalized.includes('intro')) return 'intro'
        if (normalized.includes('verse')) return 'verse'
        if (normalized.includes('pre-chorus') || normalized.includes('pre_chorus')) return 'pre-chorus'
        if (normalized.includes('chorus') || normalized.includes('hook')) return 'chorus'
        if (normalized.includes('post-chorus') || normalized.includes('post_chorus')) return 'post-chorus'
        if (normalized.includes('bridge')) return 'bridge'
        if (normalized.includes('breakdown') || normalized.includes('break')) return 'breakdown'
        if (normalized.includes('outro') || normalized.includes('end')) return 'outro'

        return 'verse' // Default
    }
}

export const audioAnalysisService = new AudioAnalysisService()
