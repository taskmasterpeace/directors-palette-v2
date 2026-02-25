/**
 * Chapter Detection Service
 * Auto-detects chapter boundaries in story text
 */

export interface StoryChapter {
    id: string
    sequence: number        // Chapter order (1, 2, 3...)
    title?: string          // "Chapter 1" or auto-generated
    startIndex: number      // Position in original text
    endIndex: number        // Position in original text
    segmentIndices: number[] // Which shot segments belong to this chapter
}

export interface ChapterDetectionResult {
    chapters: StoryChapter[]
    shouldChapter: boolean   // false for short stories
    reason: string           // "Story too short" or "Found 3 chapter markers"
}

interface ChapterMarker {
    index: number
    title?: string
    type: 'explicit' | 'divider' | 'blank-lines'
}

// Minimum thresholds
const MIN_CHARS_FOR_CHAPTERS = 500
const MIN_SENTENCES_FOR_CHAPTERS = 10
const LONG_STORY_THRESHOLD = 2000

/**
 * Count sentences in text (simple heuristic)
 */
function countSentences(text: string): number {
    // Match sentence-ending punctuation followed by space or end
    const matches = text.match(/[.!?]+[\s\n]|[.!?]+$/g)
    return matches ? matches.length : 0
}

/**
 * Generate a unique ID
 */
function generateId(): string {
    return `chapter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Find explicit chapter markers (Chapter N, Part N, etc.)
 */
function findExplicitMarkers(text: string): ChapterMarker[] {
    const markers: ChapterMarker[] = []

    // Patterns for chapter markers (case insensitive)
    const patterns = [
        /^(chapter\s*(\d+|[ivxlc]+))\s*[:.\-]?\s*(.*)$/gim,  // Chapter 1, Chapter I, Chapter 1: Title
        /^(part\s*(\d+|[ivxlc]+))\s*[:.\-]?\s*(.*)$/gim,     // Part 1, Part I
        /^(act\s*(\d+|[ivxlc]+))\s*[:.\-]?\s*(.*)$/gim,      // Act 1, Act I
        /^(scene\s*(\d+|[ivxlc]+))\s*[:.\-]?\s*(.*)$/gim,    // Scene 1, Scene I
    ]

    for (const pattern of patterns) {
        let match
        while ((match = pattern.exec(text)) !== null) {
            const fullMatch = match[0]
            const title = match[3]?.trim() || match[1]
            markers.push({
                index: match.index,
                title: title || fullMatch.trim(),
                type: 'explicit'
            })
        }
    }

    return markers.sort((a, b) => a.index - b.index)
}

/**
 * Find section header markers (standalone title lines like "From Cyphers to Credentials")
 * These are lines that:
 * - Are preceded by a blank line (or start of text)
 * - Are relatively short (under 80 chars)
 * - Don't end with typical sentence punctuation
 * - Are followed by a blank line or paragraph
 */
function findSectionHeaderMarkers(text: string): ChapterMarker[] {
    const markers: ChapterMarker[] = []

    // Pattern for section headers:
    // - Preceded by double newline (or start)
    // - Short line (under 80 chars) without sentence-ending punctuation
    // - Contains at least 2 words (to avoid single-word false positives)
    // - Followed by double newline
    const pattern = /(?:^|\n\n)([A-Z][^\n]{5,80}?)(?:\n\n)/g

    let match
    while ((match = pattern.exec(text)) !== null) {
        const headerText = match[1].trim()

        // Skip if it looks like a regular sentence (ends with . ! ?)
        if (/[.!?]$/.test(headerText)) continue

        // Skip if it's too short or just punctuation
        if (headerText.length < 10) continue

        // Skip if it doesn't have at least 2 words
        const wordCount = headerText.split(/\s+/).length
        if (wordCount < 2) continue

        // Skip if it looks like a quote or dialogue
        if (/^["']/.test(headerText)) continue

        // Check if it looks like a title (most words capitalized or has colon)
        const hasColon = headerText.includes(':')
        const words = headerText.split(/\s+/)
        const capitalizedWords = words.filter(w => /^[A-Z]/.test(w)).length
        const capitalRatio = capitalizedWords / words.length

        // Accept if has colon (like "The Jae Millz War: When Slick Talk Meets...")
        // Or if most words are capitalized (title case)
        if (hasColon || capitalRatio >= 0.5) {
            markers.push({
                index: match.index + (match[0].startsWith('\n') ? 2 : 0),
                title: headerText,
                type: 'explicit'
            })
        }
    }

    return markers.sort((a, b) => a.index - b.index)
}

/**
 * Find divider markers (---, ***, ===, etc.)
 */
function findDividerMarkers(text: string): ChapterMarker[] {
    const markers: ChapterMarker[] = []

    // Match lines that are just dividers (3+ of same character)
    const pattern = /^[ \t]*([*\-=~#]{3,})[ \t]*$/gm

    let match
    while ((match = pattern.exec(text)) !== null) {
        markers.push({
            index: match.index,
            type: 'divider'
        })
    }

    return markers
}

/**
 * Find double blank line markers
 */
function findBlankLineMarkers(text: string): ChapterMarker[] {
    const markers: ChapterMarker[] = []

    // Match 2+ consecutive blank lines
    const pattern = /\n\s*\n\s*\n/g

    let match
    while ((match = pattern.exec(text)) !== null) {
        markers.push({
            index: match.index,
            type: 'blank-lines'
        })
    }

    return markers
}

/**
 * Create chapter objects from markers
 */
function createChaptersFromMarkers(
    text: string,
    markers: ChapterMarker[]
): StoryChapter[] {
    if (markers.length === 0) {
        // Single chapter for entire text
        return [{
            id: generateId(),
            sequence: 1,
            title: 'Full Story',
            startIndex: 0,
            endIndex: text.length,
            segmentIndices: []
        }]
    }

    const chapters: StoryChapter[] = []

    // Add implicit first chapter if first marker isn't at start
    if (markers[0].index > 50) {
        chapters.push({
            id: generateId(),
            sequence: 1,
            title: 'Introduction',
            startIndex: 0,
            endIndex: markers[0].index,
            segmentIndices: []
        })
    }

    // Create chapters from markers
    for (let i = 0; i < markers.length; i++) {
        const marker = markers[i]
        const nextMarker = markers[i + 1]

        chapters.push({
            id: generateId(),
            sequence: chapters.length + 1,
            title: marker.title || `Chapter ${chapters.length + 1}`,
            startIndex: marker.index,
            endIndex: nextMarker ? nextMarker.index : text.length,
            segmentIndices: []
        })
    }

    return chapters
}

/**
 * Main chapter detection function
 */
export function detectChapters(storyText: string): ChapterDetectionResult {
    const trimmedText = storyText.trim()

    // Check if story is too short
    if (trimmedText.length < MIN_CHARS_FOR_CHAPTERS) {
        return {
            chapters: [{
                id: generateId(),
                sequence: 1,
                title: 'Full Story',
                startIndex: 0,
                endIndex: trimmedText.length,
                segmentIndices: []
            }],
            shouldChapter: false,
            reason: `Story too short (${trimmedText.length} chars, need ${MIN_CHARS_FOR_CHAPTERS}+)`
        }
    }

    const sentenceCount = countSentences(trimmedText)
    if (sentenceCount < MIN_SENTENCES_FOR_CHAPTERS) {
        return {
            chapters: [{
                id: generateId(),
                sequence: 1,
                title: 'Full Story',
                startIndex: 0,
                endIndex: trimmedText.length,
                segmentIndices: []
            }],
            shouldChapter: false,
            reason: `Story too short (${sentenceCount} sentences, need ${MIN_SENTENCES_FOR_CHAPTERS}+)`
        }
    }

    // Look for explicit markers first (highest priority) - "Chapter 1", "Part II", etc.
    const explicitMarkers = findExplicitMarkers(trimmedText)
    if (explicitMarkers.length > 0) {
        const chapters = createChaptersFromMarkers(trimmedText, explicitMarkers)
        return {
            chapters,
            shouldChapter: true,
            reason: `${explicitMarkers.length} chapter${explicitMarkers.length === 1 ? '' : 's'} detected`
        }
    }

    // Look for section headers (title-cased standalone lines)
    const sectionHeaders = findSectionHeaderMarkers(trimmedText)
    if (sectionHeaders.length >= 2) {
        // Need at least 2 headers to make chapters meaningful
        const chapters = createChaptersFromMarkers(trimmedText, sectionHeaders)
        return {
            chapters,
            shouldChapter: true,
            reason: `${sectionHeaders.length} chapter${sectionHeaders.length === 1 ? '' : 's'} detected from headings`
        }
    }

    // Look for divider markers (---, ***, ===)
    const dividerMarkers = findDividerMarkers(trimmedText)
    if (dividerMarkers.length > 0) {
        const chapters = createChaptersFromMarkers(trimmedText, dividerMarkers)
        return {
            chapters,
            shouldChapter: true,
            reason: `${dividerMarkers.length + 1} chapter${dividerMarkers.length === 0 ? '' : 's'} detected from dividers`
        }
    }

    // Look for double blank lines (lowest priority)
    const blankMarkers = findBlankLineMarkers(trimmedText)
    if (blankMarkers.length > 0 && blankMarkers.length <= 10) {
        // Only use blank lines if reasonable number (not just poor formatting)
        const chapters = createChaptersFromMarkers(trimmedText, blankMarkers)
        return {
            chapters,
            shouldChapter: true,
            reason: `${blankMarkers.length + 1} chapter${blankMarkers.length === 0 ? '' : 's'} detected from breaks`
        }
    }

    // No markers found - single chapter
    return {
        chapters: [{
            id: generateId(),
            sequence: 1,
            title: 'Full Story',
            startIndex: 0,
            endIndex: trimmedText.length,
            segmentIndices: []
        }],
        shouldChapter: false,
        reason: trimmedText.length > LONG_STORY_THRESHOLD
            ? 'Long story but no chapter markers found'
            : 'No chapter markers detected'
    }
}

/**
 * Map shot segments to chapters based on their text positions
 */
export function mapSegmentsToChapters(
    chapters: StoryChapter[],
    segments: Array<{ sequence: number; start_index: number; end_index: number }>
): StoryChapter[] {
    return chapters.map(chapter => ({
        ...chapter,
        segmentIndices: segments
            .filter(seg =>
                seg.start_index >= chapter.startIndex &&
                seg.end_index <= chapter.endIndex
            )
            .map(seg => seg.sequence)
    }))
}

/**
 * Get chapter for a specific text index
 */
export function getChapterForIndex(
    chapters: StoryChapter[],
    index: number
): StoryChapter | undefined {
    return chapters.find(ch => index >= ch.startIndex && index < ch.endIndex)
}

/**
 * Generate cinematic arc names for chapters using an LLM.
 * Falls back to default names on any error.
 */
export async function generateChapterArcNames(config: {
    apiKey: string
    model: string
    chapters: StoryChapter[]
    storyText: string
}): Promise<Array<{ index: number; name: string }>> {
    const { apiKey, model, chapters, storyText } = config

    // Single chapter — no need for LLM
    if (chapters.length <= 1) {
        return [{ index: 0, name: chapters[0]?.title || 'Full Story' }]
    }

    const defaultNames = chapters.map((ch, i) => ({
        index: i,
        name: ch.title || `Chapter ${i + 1}`
    }))

    try {
        // Build a preview of each chapter (first 300 chars)
        const chapterPreviews = chapters
            .map((ch, i) => {
                const text = storyText.slice(ch.startIndex, ch.endIndex).trim()
                const preview = text.length > 300 ? text.slice(0, 300) + '...' : text
                return `Chapter ${i + 1}:\n${preview}`
            })
            .join('\n\n')

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://directors-palette.vercel.app'
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a documentary filmmaker naming chapters for a film. Give each chapter a cinematic title (2-5 words) that captures its emotional core. Be specific and evocative — not generic titles like \'The Beginning\' or \'The End\'. Think like a Netflix documentary producer.'
                    },
                    {
                        role: 'user',
                        content: chapterPreviews
                    }
                ],
                tools: [
                    {
                        type: 'function',
                        function: {
                            name: 'name_chapters',
                            description: 'Assign cinematic arc names to each chapter',
                            parameters: {
                                type: 'object',
                                properties: {
                                    chapters: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                index: { type: 'number' },
                                                name: { type: 'string' }
                                            },
                                            required: ['index', 'name']
                                        }
                                    }
                                },
                                required: ['chapters']
                            }
                        }
                    }
                ],
                tool_choice: { type: 'function', function: { name: 'name_chapters' } }
            })
        })

        if (!response.ok) {
            return defaultNames
        }

        const data = await response.json()
        const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0]
        if (!toolCall?.function?.arguments) {
            return defaultNames
        }

        const parsed = JSON.parse(toolCall.function.arguments)
        const named: Array<{ index: number; name: string }> = parsed.chapters

        if (!Array.isArray(named) || named.length === 0) {
            return defaultNames
        }

        return named
    } catch {
        return defaultNames
    }
}
