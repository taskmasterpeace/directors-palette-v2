import type { TitleCard } from '../types/storyboard.types'

/**
 * Generate a title card image prompt for a documentary chapter.
 */
export function buildTitleCardPrompt(chapterName: string, stylePrompt?: string): string {
    const basePrompt = `Documentary title card. Large, bold, centered text reading "${chapterName}" in elegant cinematic typography. The text is the primary visual element, clearly legible against the background. Professional film production quality, clean composition, dramatic lighting.`

    if (stylePrompt) {
        return `${basePrompt} ${stylePrompt}`
    }

    return `${basePrompt} Dark cinematic background with subtle texture, warm accent lighting on the text.`
}

/**
 * Create initial TitleCard objects for documentary chapters.
 */
export function createTitleCards(
    chapters: Array<{ index: number; name: string }>,
    stylePrompt?: string
): TitleCard[] {
    return chapters.map((ch) => ({
        chapterIndex: ch.index,
        chapterName: ch.name,
        prompt: buildTitleCardPrompt(ch.name, stylePrompt),
        status: 'pending' as const,
    }))
}

/**
 * Rebuild a title card prompt when the chapter name changes.
 */
export function rebuildTitleCardPrompt(titleCard: TitleCard, newName: string, stylePrompt?: string): TitleCard {
    return {
        ...titleCard,
        chapterName: newName,
        prompt: buildTitleCardPrompt(newName, stylePrompt),
        imageUrl: undefined,
        status: 'pending' as const,
    }
}
