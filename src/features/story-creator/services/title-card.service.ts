/**
 * Title Card Service
 * Handles chapter detection and title card generation for Story Creator
 */

import type { StoryShot, CreateShotInput } from '../types/story.types'

export class TitleCardService {
    /**
     * Detect chapters from shots and story text
     * @param storyText - The full story text to scan for chapter markers
     * @param shots - Array of story shots that may contain chapter assignments
     * @returns Array of unique chapter names
     */
    static detectChapters(storyText: string, shots: StoryShot[]): string[] {
        const chapters = new Set<string>()

        // Extract chapters from shots array
        shots.forEach(shot => {
            if (shot.chapter) {
                chapters.add(shot.chapter)
            }
        })

        // Scan story text for chapter markers
        // Matches patterns like:
        // - Chapter 1, Chapter One, Chapter I
        // - Part 1, Part One, Part I
        // - Section 1, Section One, Section I
        const chapterRegex = /^(Chapter|Part|Section)\s+(\d+|[IVXLCDM]+|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten).*$/gim
        let match: RegExpExecArray | null

        while ((match = chapterRegex.exec(storyText)) !== null) {
            // Add the full matched line as chapter name
            chapters.add(match[0].trim())
        }

        // Convert Set to Array and sort
        return Array.from(chapters).sort()
    }

    /**
     * Generate a prompt for creating a title card image
     * @param chapterName - The name of the chapter
     * @param styleDescription - Optional style description for the title card
     * @returns Formatted prompt string for image generation
     */
    static generateTitleCardPrompt(
        chapterName: string,
        styleDescription: string = ''
    ): string {
        // Use default style if none provided
        const style = styleDescription.trim() || 'cinematic title card, elegant typography'

        return `Create a cinematic title card that says "${chapterName}", ${style}`
    }

    /**
     * Create a title card shot input object
     * @param projectId - The project ID this shot belongs to
     * @param chapterName - The name of the chapter for this title card
     * @param sequenceNumber - The sequence number to insert before (will subtract 0.1)
     * @param styleDescription - Optional style description for the title card
     * @returns CreateShotInput object ready for database insertion
     */
    static createTitleCardShot(
        projectId: string,
        chapterName: string,
        sequenceNumber: number,
        styleDescription: string = ''
    ): CreateShotInput {
        return {
            project_id: projectId,
            sequence_number: sequenceNumber - 0.1, // Insert before the chapter's first shot
            chapter: chapterName,
            prompt: this.generateTitleCardPrompt(chapterName, styleDescription),
            reference_tags: [], // Title cards don't need reference tags
            metadata: {
                title_card_config: {
                    chapter_name: chapterName,
                    style_description: styleDescription || 'cinematic title card, elegant typography',
                    generated_automatically: true
                }
            }
        }
    }

    /**
     * Helper method to identify if a shot is a title card
     * @param shot - The shot to check
     * @returns True if the shot is a title card
     */
    static isTitleCard(shot: StoryShot): boolean {
        return shot.metadata?.title_card_config !== undefined
    }

    /**
     * Helper method to get the first shot sequence number for each chapter
     * @param shots - Array of story shots
     * @returns Map of chapter names to their first sequence number
     */
    static getChapterStartSequences(shots: StoryShot[]): Map<string, number> {
        const chapterStarts = new Map<string, number>()

        shots.forEach(shot => {
            if (shot.chapter && !this.isTitleCard(shot)) {
                const currentStart = chapterStarts.get(shot.chapter)
                if (currentStart === undefined || shot.sequence_number < currentStart) {
                    chapterStarts.set(shot.chapter, shot.sequence_number)
                }
            }
        })

        return chapterStarts
    }

    /**
     * Generate title card shots for all chapters in a project
     * @param projectId - The project ID
     * @param storyText - The full story text
     * @param shots - Array of existing story shots
     * @param styleDescription - Optional style description for all title cards
     * @returns Array of CreateShotInput objects for title cards
     */
    static generateAllTitleCards(
        projectId: string,
        storyText: string,
        shots: StoryShot[],
        styleDescription: string = ''
    ): CreateShotInput[] {
        // Detect all chapters
        const chapters = this.detectChapters(storyText, shots)

        // Get the first sequence number for each chapter
        const chapterStarts = this.getChapterStartSequences(shots)

        // Generate title cards for each chapter that has shots
        const titleCards: CreateShotInput[] = []

        chapters.forEach(chapter => {
            const startSequence = chapterStarts.get(chapter)
            if (startSequence !== undefined) {
                titleCards.push(
                    this.createTitleCardShot(
                        projectId,
                        chapter,
                        startSequence,
                        styleDescription
                    )
                )
            }
        })

        return titleCards
    }

    /**
     * Create a custom title card at a specific position (not auto-detected)
     * Useful for untitled chapters or manual insertion
     * @param projectId - The project ID
     * @param customTitle - Custom title text (e.g., "Prologue", "The Beginning")
     * @param sequenceNumber - Exact sequence number for this title card
     * @param styleDescription - Optional style description
     * @returns CreateShotInput object for the custom title card
     */
    static createCustomTitleCard(
        projectId: string,
        customTitle: string,
        sequenceNumber: number,
        styleDescription: string = ''
    ): CreateShotInput {
        return {
            project_id: projectId,
            sequence_number: sequenceNumber,
            chapter: customTitle, // Use custom title as chapter name
            prompt: this.generateTitleCardPrompt(customTitle, styleDescription),
            reference_tags: [],
            metadata: {
                title_card_config: {
                    chapter_name: customTitle,
                    style_description: styleDescription || 'cinematic title card, elegant typography',
                    generated_automatically: false // User-created
                }
            }
        }
    }

    /**
     * Normalize untitled chapters by generating default names
     * Useful when chapters exist but have no explicit titles
     * @param shots - Array of story shots
     * @returns Map of original chapter name to suggested title
     */
    static suggestTitlesForUntitledChapters(shots: StoryShot[]): Map<string, string> {
        const suggestions = new Map<string, string>()
        const uniqueChapters = new Set(shots.filter(s => s.chapter).map(s => s.chapter!))

        uniqueChapters.forEach((chapter) => {
            // If chapter name is just a number or very generic, suggest a better title
            if (/^(Chapter|Part|Section)\s+\d+$/i.test(chapter)) {
                // Already has "Chapter N" format - suggest adding subtitle
                suggestions.set(chapter, `${chapter}: [Untitled]`)
            } else if (/^\d+$/.test(chapter)) {
                // Just a number - suggest "Chapter N"
                suggestions.set(chapter, `Chapter ${chapter}`)
            }
        })

        return suggestions
    }

    /**
     * Get all existing title card shots in a project
     * @param shots - Array of story shots
     * @returns Array of shots that are title cards
     */
    static getTitleCardShots(shots: StoryShot[]): StoryShot[] {
        return shots.filter(shot => this.isTitleCard(shot))
    }

    /**
     * Check if a chapter already has a title card
     * @param shots - Array of story shots
     * @param chapterName - The chapter to check
     * @returns True if title card exists for this chapter
     */
    static hasTitleCard(shots: StoryShot[], chapterName: string): boolean {
        return shots.some(shot =>
            this.isTitleCard(shot) && shot.chapter === chapterName
        )
    }
}
