/**
 * Storybook Store Helpers
 * Pure helper functions used by store slices.
 */

import type {
  StorybookPage,
  StorybookCharacter,
  BookCharacter,
  TextPosition,
  BookFormat,
  PageLayout,
} from '../types/storybook.types'
import type { StorybookProject } from '../types/storybook.types'

// Generate unique IDs without uuid dependency
export function generateId(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }
  // Fallback for browsers without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// Common words to exclude from character detection
export const COMMON_WORDS = new Set([
  // Articles and conjunctions
  'The', 'And', 'But', 'Then', 'When', 'Where', 'What', 'How', 'This', 'That', 'There', 'Here',
  'Or', 'So', 'Yet', 'For', 'Nor', 'If', 'As', 'With', 'At', 'From', 'Into', 'During', 'Before',
  'After', 'Above', 'Below', 'To', 'Of', 'In', 'On', 'By', 'About', 'Against', 'Between', 'Through',
  // Pronouns
  'She', 'He', 'Her', 'His', 'Him', 'They', 'Them', 'Their', 'We', 'Us', 'Our', 'You', 'Your',
  'It', 'Its', 'My', 'Me', 'I',
  // Common sentence starters
  'One', 'Once', 'Some', 'Sometimes', 'Soon', 'Still', 'Such', 'Sure', 'Suddenly',
  'Now', 'Next', 'Never', 'New', 'No', 'Not', 'Nothing', 'Just', 'Each', 'Every', 'Even',
  'First', 'Finally', 'Far', 'Few', 'Well', 'While', 'Who', 'Why', 'Will', 'Would', 'Was', 'Were',
  // Common verbs at start
  'Being', 'Having', 'Going', 'Coming', 'Looking', 'Making', 'Taking', 'Seeing', 'Getting',
  'Feeling', 'Thinking', 'Knowing', 'Running', 'Walking', 'Sitting', 'Standing',
  // Time-related
  'Today', 'Tomorrow', 'Yesterday', 'Morning', 'Night', 'Day', 'Week', 'Month', 'Year',
  // Common descriptors
  'Little', 'Big', 'Small', 'Large', 'Long', 'Short', 'Good', 'Bad', 'Best', 'Worst',
  'Old', 'Young', 'All', 'Any', 'Many', 'Most', 'Much', 'More', 'Less', 'Very', 'Really',
  // Other common words
  'Maybe', 'Perhaps', 'However', 'Although', 'Because', 'Since', 'Until', 'Unless',
  'Another', 'Both', 'Other', 'Others', 'Either', 'Neither', 'Everything', 'Something',
  'Anything', 'Someone', 'Anyone', 'Everyone', 'Nobody', 'Everybody', 'Always', 'Usually'
])

// Extract character names from story text (looking for @mentions or capitalized names)
export function extractCharacterNames(storyText: string): { name: string; tag: string }[] {
  const characters: { name: string; tag: string }[] = []
  const seen = new Set<string>()

  // Look for @mentions first (highest priority)
  const mentionRegex = /@(\w+)/g
  let match
  while ((match = mentionRegex.exec(storyText)) !== null) {
    const name = match[1]
    if (!seen.has(name.toLowerCase()) && !COMMON_WORDS.has(name)) {
      seen.add(name.toLowerCase())
      characters.push({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        tag: `@${name}`,
      })
    }
  }

  // If no @mentions, look for proper names
  if (characters.length === 0) {
    // Look for capitalized words that appear multiple times (likely character names)
    // But exclude words at the start of sentences (after . ! ? or at text start)
    const nameRegex = /(?<=[a-z,;:]\s+)([A-Z][a-z]{2,})\b/g
    const nameCounts = new Map<string, number>()
    while ((match = nameRegex.exec(storyText)) !== null) {
      const name = match[1]
      // Skip common words and short words (likely not names)
      if (!COMMON_WORDS.has(name) && name.length >= 3) {
        nameCounts.set(name, (nameCounts.get(name) || 0) + 1)
      }
    }

    // Add names that appear at least twice
    for (const [name, count] of nameCounts) {
      if (count >= 2 && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase())
        characters.push({
          name,
          tag: `@${name}`,
        })
      }
    }
  }

  return characters
}

// Parse story text into pages (split by paragraph or ~100 words)
export function parseStoryIntoPages(storyText: string): StorybookPage[] {
  // Split by double newlines (paragraphs)
  const paragraphs = storyText
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)

  // If we have good paragraph breaks, use them
  if (paragraphs.length >= 3) {
    return paragraphs.map((text, index) => ({
      id: generateId(),
      pageNumber: index + 1,
      text,
      textPosition: 'bottom' as TextPosition,
    }))
  }

  // Otherwise, split by sentences (aim for ~50-100 words per page)
  const sentences = storyText.match(/[^.!?]+[.!?]+/g) || [storyText]
  const pages: StorybookPage[] = []
  let currentPageText = ''
  let wordCount = 0

  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/).length
    if (wordCount + sentenceWords > 80 && currentPageText) {
      pages.push({
        id: generateId(),
        pageNumber: pages.length + 1,
        text: currentPageText.trim(),
        textPosition: 'bottom',
      })
      currentPageText = sentence
      wordCount = sentenceWords
    } else {
      currentPageText += ' ' + sentence
      wordCount += sentenceWords
    }
  }

  // Add remaining text
  if (currentPageText.trim()) {
    pages.push({
      id: generateId(),
      pageNumber: pages.length + 1,
      text: currentPageText.trim(),
      textPosition: 'bottom',
    })
  }

  return pages
}

// Create initial project for paste mode
export function createInitialProject(
  title: string,
  storyText: string,
  bookFormat: BookFormat = 'square',
  targetAge: number = 7
): StorybookProject {
  return {
    id: generateId(),
    title,
    storyText,
    pages: [],
    bookCharacters: [],
    characters: [],
    style: undefined,
    coverImageUrl: undefined,
    titlePageImageUrl: undefined,
    status: 'draft',
    creditsUsed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    bookFormat,
    defaultLayout: 'image-with-text' as PageLayout,
    targetAge,
    storyMode: 'paste',
  }
}

// Create initial project for generate mode (educational)
export function createGenerateProject(
  characterName: string,
  characterAge: number,
  characterDescription?: string,
  bookFormat: BookFormat = 'square'
): StorybookProject {
  // Create initial main character with description (if provided)
  const mainCharacter: StorybookCharacter = {
    id: generateId(),
    name: characterName,
    tag: `@${characterName.replace(/\s+/g, '')}`,
    description: characterDescription,
  }

  const mainBookCharacter: BookCharacter = {
    id: mainCharacter.id, // same id as the legacy character
    name: characterName,
    tag: `@${characterName.replace(/\s+/g, '')}`,
    role: 'protagonist',
    description: characterDescription,
  }

  return {
    id: generateId(),
    title: `${characterName}'s Story`,
    storyText: '',
    pages: [],
    bookCharacters: [mainBookCharacter],
    characters: [mainCharacter],
    style: undefined,
    coverImageUrl: undefined,
    titlePageImageUrl: undefined,
    status: 'draft',
    creditsUsed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    bookFormat,
    defaultLayout: 'image-with-text' as PageLayout,
    targetAge: characterAge,
    storyMode: 'generate',
    mainCharacterName: characterName,
    mainCharacterAge: characterAge,
    storyCharacters: [], // Initialize empty array for additional characters
  }
}
