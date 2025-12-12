/**
 * Shot Breakdown Service
 * Parses story text into shots based on granularity level
 */

import { BreakdownLevel, ShotBreakdownResult, ShotBreakdownSegment } from '../types/storyboard.types'

// Color palette for shot highlighting
const SHOT_COLORS = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Gold
    '#BB8FCE', // Purple
    '#85C1E9', // Light Blue
    '#F8B500', // Amber
    '#58D68D', // Emerald
]

/**
 * Get a color for a shot based on its sequence number
 */
function getColorForSequence(sequence: number): string {
    return SHOT_COLORS[sequence % SHOT_COLORS.length]
}

/**
 * Clean and normalize text for splitting
 */
function normalizeText(text: string): string {
    return text
        .replace(/\r\n/g, '\n')
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * Split text into segments at given delimiters
 */
function _splitAtDelimiters(text: string, delimiters: RegExp): string[] {
    // Use a capturing group to keep delimiters
    const parts = text.split(delimiters)
    const segments: string[] = []
    let current = ''

    for (const part of parts) {
        current += part
        // Check if this part ends with a delimiter
        if (/[.,!?;]$/.test(current.trim())) {
            const trimmed = current.trim()
            if (trimmed) {
                segments.push(trimmed)
            }
            current = ''
        }
    }

    // Add any remaining text
    if (current.trim()) {
        segments.push(current.trim())
    }

    return segments.filter(s => s.length > 0)
}

/**
 * Level 1: Split at every comma AND period (fine granularity)
 */
function breakdownLevel1(text: string): string[] {
    const normalized = normalizeText(text)
    const segments: string[] = []
    let currentSegment = ''
    // currentIndex not needed

    for (let i = 0; i < normalized.length; i++) {
        const char = normalized[i]
        currentSegment += char

        // Split on comma, period, exclamation, question mark
        if ([',', '.', '!', '?'].includes(char)) {
            const trimmed = currentSegment.trim()
            if (trimmed.length > 0) {
                segments.push(trimmed)
            }
            currentSegment = ''
            // position tracking
        }
    }

    // Add remaining text
    if (currentSegment.trim().length > 0) {
        segments.push(currentSegment.trim())
    }

    return segments.filter(s => s.length > 2) // Filter out very short segments
}

/**
 * Level 2: Split at every sentence (standard granularity)
 */
function breakdownLevel2(text: string): string[] {
    const normalized = normalizeText(text)

    // Split at sentence endings (. ! ?) followed by space or end
    const sentenceRegex = /(?<=[.!?])\s+/
    const sentences = normalized.split(sentenceRegex)

    return sentences
        .map(s => s.trim())
        .filter(s => s.length > 0)
}

/**
 * Level 3: Group every 2 sentences (coarse granularity)
 */
function breakdownLevel3(text: string): string[] {
    const sentences = breakdownLevel2(text)
    const groups: string[] = []

    for (let i = 0; i < sentences.length; i += 2) {
        const group = sentences.slice(i, i + 2).join(' ')
        if (group.trim().length > 0) {
            groups.push(group.trim())
        }
    }

    return groups
}

/**
 * Find the start and end indices of a segment in the original text
 */
function findSegmentIndices(
    originalText: string,
    segment: string,
    startAfter: number = 0
): { start: number; end: number } {
    // Normalize for comparison
    const normalizedOriginal = originalText.toLowerCase()
    const normalizedSegment = segment.toLowerCase().trim()

    // Find first significant words to locate position
    const words = normalizedSegment.split(/\s+/).filter(w => w.length > 2)
    if (words.length === 0) {
        return { start: startAfter, end: startAfter + segment.length }
    }

    // Search for the first word after startAfter
    const firstWord = words[0].replace(/[.,!?;:'"]/g, '')
    let searchIndex = startAfter

    while (searchIndex < normalizedOriginal.length) {
        const foundIndex = normalizedOriginal.indexOf(firstWord, searchIndex)
        if (foundIndex === -1) break

        // Try to match more of the segment
        let matchLength = 0
        let origIdx = foundIndex
        let segIdx = 0

        while (
            origIdx < normalizedOriginal.length &&
            segIdx < normalizedSegment.length
        ) {
            const origChar = normalizedOriginal[origIdx]
            const segChar = normalizedSegment[segIdx]

            if (origChar === segChar) {
                matchLength++
                origIdx++
                segIdx++
            } else if (/\s/.test(origChar)) {
                origIdx++
            } else if (/\s/.test(segChar)) {
                segIdx++
            } else {
                break
            }
        }

        // If we matched most of the segment, use this position
        if (matchLength > normalizedSegment.length * 0.5) {
            return {
                start: foundIndex,
                end: origIdx
            }
        }

        searchIndex = foundIndex + 1
    }

    // Fallback: estimate position
    return { start: startAfter, end: startAfter + segment.length }
}

/**
 * Main breakdown function
 */
export function breakdownStory(
    storyText: string,
    level: BreakdownLevel
): ShotBreakdownResult {
    let rawSegments: string[]

    switch (level) {
        case 1:
            rawSegments = breakdownLevel1(storyText)
            break
        case 2:
            rawSegments = breakdownLevel2(storyText)
            break
        case 3:
            rawSegments = breakdownLevel3(storyText)
            break
        default:
            rawSegments = breakdownLevel2(storyText)
    }

    // Build segments with positions and colors
    const segments: ShotBreakdownSegment[] = []
    let lastEnd = 0

    for (let i = 0; i < rawSegments.length; i++) {
        const text = rawSegments[i]
        const indices = findSegmentIndices(storyText, text, lastEnd)

        segments.push({
            sequence: i + 1,
            text,
            start_index: indices.start,
            end_index: indices.end,
            color: getColorForSequence(i)
        })

        lastEnd = indices.end
    }

    return {
        segments,
        total_count: segments.length,
        level
    }
}

/**
 * Get level description for UI
 */
export function getLevelDescription(level: BreakdownLevel): string {
    switch (level) {
        case 1:
            return 'Fine (comma + period)'
        case 2:
            return 'Standard (sentence)'
        case 3:
            return 'Coarse (2 sentences)'
        default:
            return 'Unknown'
    }
}

/**
 * Estimate shot count without full breakdown
 */
export function estimateShotCount(text: string, level: BreakdownLevel): number {
    const normalized = normalizeText(text)

    switch (level) {
        case 1:
            // Count commas and periods
            return (normalized.match(/[,.\!?]/g) || []).length
        case 2:
            // Count sentence endings
            return (normalized.match(/[.\!?]/g) || []).length
        case 3:
            // Half of sentences
            return Math.ceil((normalized.match(/[.\!?]/g) || []).length / 2)
        default:
            return 0
    }
}
