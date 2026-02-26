/**
 * Character Slice
 * Character detection (regex + helpers), character management,
 * story characters (siblings/friends/pets), extracted elements.
 */

import type { StoreApi } from 'zustand'
import type { StorybookStore } from '../storybook.store'
import type {
  StorybookCharacter,
  BookCharacter,
  StoryCharacter,
} from '../../types/storybook.types'
import type { ExtractedElements } from '../../types/education.types'
import { generateId, extractCharacterNames, createGenerateProject } from '../storybook.helpers'

type Set = StoreApi<StorybookStore>['setState']
type Get = StoreApi<StorybookStore>['getState']

export const createCharacterSlice = (set: Set, get: Get) => ({
  // Character actions
  addCharacter: (name: string, tag: string) => {
    const { project } = get()
    if (project) {
      const newCharacter: StorybookCharacter = {
        id: generateId(),
        name,
        tag,
      }
      const bookChar: BookCharacter = {
        id: newCharacter.id,
        name,
        tag,
        role: 'protagonist',
      }
      set({
        project: {
          ...project,
          characters: [...project.characters, newCharacter],
          bookCharacters: [...(project.bookCharacters || []), bookChar],
          updatedAt: new Date(),
        },
      })
    }
  },

  updateCharacter: (id: string, updates: Partial<StorybookCharacter>) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          characters: project.characters.map(c =>
            c.id === id ? { ...c, ...updates } : c
          ),
          bookCharacters: (project.bookCharacters || []).map(c =>
            c.id === id ? { ...c, ...updates } : c
          ),
          updatedAt: new Date(),
        },
      })
    }
  },

  removeCharacter: (id: string) => {
    const { project } = get()
    if (project) {
      set({
        project: {
          ...project,
          characters: project.characters.filter(c => c.id !== id),
          bookCharacters: (project.bookCharacters || []).filter(c => c.id !== id),
          updatedAt: new Date(),
        },
      })
    }
  },

  detectCharacters: () => {
    const { project } = get()
    if (project?.storyText) {
      const detected = extractCharacterNames(project.storyText)
      const existingTags = new Set(project.characters.map(c => c.tag.toLowerCase()))

      // Add new characters that don't already exist
      const newCharacters: StorybookCharacter[] = detected
        .filter(c => !existingTags.has(c.tag.toLowerCase()))
        .map(c => ({
          id: generateId(),
          name: c.name,
          tag: c.tag,
        }))

      if (newCharacters.length > 0) {
        const newBookCharacters: BookCharacter[] = newCharacters.map(c => ({
          id: c.id,
          name: c.name,
          tag: c.tag,
          role: 'protagonist' as const,
        }))
        set({
          project: {
            ...project,
            characters: [...project.characters, ...newCharacters],
            bookCharacters: [...(project.bookCharacters || []), ...newBookCharacters],
            updatedAt: new Date(),
          },
        })
      }
    }
  },

  // Education: main character setup
  setMainCharacter: (name: string, age: number, description?: string) => {
    const { project } = get()
    if (project) {
      // Update or create main character with description
      const existingMainChar = project.characters[0]
      const charId = existingMainChar?.id || generateId()
      const updatedMainChar: StorybookCharacter = existingMainChar
        ? {
            ...existingMainChar,
            name,
            tag: `@${name.replace(/\s+/g, '')}`,
            description,
          }
        : {
            id: charId,
            name,
            tag: `@${name.replace(/\s+/g, '')}`,
            description,
          }

      // Build updated bookCharacters: update existing protagonist or add new one
      const existingBookChars = project.bookCharacters || []
      const existingBookMainChar = existingBookChars.find(c => c.id === charId)
      let updatedBookCharacters: BookCharacter[]
      if (existingBookMainChar) {
        updatedBookCharacters = existingBookChars.map(c =>
          c.id === charId
            ? { ...c, name, tag: `@${name.replace(/\s+/g, '')}`, description }
            : c
        )
      } else {
        const newBookChar: BookCharacter = {
          id: charId,
          name,
          tag: `@${name.replace(/\s+/g, '')}`,
          role: 'protagonist',
          description,
        }
        updatedBookCharacters = [newBookChar, ...existingBookChars]
      }

      set({
        project: {
          ...project,
          mainCharacterName: name,
          mainCharacterAge: age,
          characters: [updatedMainChar, ...project.characters.slice(1)],
          bookCharacters: updatedBookCharacters,
          title: `${name}'s Story`,
          targetAge: age,
          updatedAt: new Date(),
        },
      })
    } else {
      // Create new project for generate mode
      const newProject = createGenerateProject(name, age, description)
      set({ project: newProject })
    }
  },

  // Story character actions (siblings, friends, pets at setup)
  addStoryCharacter: (character: Omit<StoryCharacter, 'id'>) => {
    let { project } = get()

    // Create a default project if one doesn't exist yet
    // This allows adding characters before clicking Continue
    if (!project) {
      project = createGenerateProject('', 5)
      set({ project })
    }

    const newCharacter: StoryCharacter = {
      ...character,
      id: generateId(),
    }
    const existingCharacters = project.storyCharacters || []
    // Limit to 3 additional characters
    if (existingCharacters.length >= 3) {
      return
    }
    const bookChar: BookCharacter = {
      id: newCharacter.id,
      name: character.name,
      tag: `@${character.name.replace(/\s+/g, '')}`,
      role: 'supporting',
      characterRole: character.role,
      sourcePhotoUrls: character.photoUrl ? [character.photoUrl] : [],
      description: character.description,
      relationship: character.relationship,
      age: character.age,
    }
    set({
      project: {
        ...project,
        storyCharacters: [...existingCharacters, newCharacter],
        bookCharacters: [...(project.bookCharacters || []), bookChar],
        updatedAt: new Date(),
      },
    })
  },

  updateStoryCharacter: (id: string, updates: Partial<StoryCharacter>) => {
    const { project } = get()
    if (project && project.storyCharacters) {
      // Extract BookCharacter-compatible fields from StoryCharacter updates
      const { role: characterRole, ...bookUpdates } = updates
      const bookCharacterUpdates: Partial<BookCharacter> = {
        ...bookUpdates,
        ...(characterRole ? { characterRole } : {}),
      }
      set({
        project: {
          ...project,
          storyCharacters: project.storyCharacters.map(c =>
            c.id === id ? { ...c, ...updates } : c
          ),
          bookCharacters: (project.bookCharacters || []).map(c =>
            c.id === id ? { ...c, ...bookCharacterUpdates } : c
          ),
          updatedAt: new Date(),
        },
      })
    }
  },

  removeStoryCharacter: (id: string) => {
    const { project } = get()
    if (project && project.storyCharacters) {
      set({
        project: {
          ...project,
          storyCharacters: project.storyCharacters.filter(c => c.id !== id),
          bookCharacters: (project.bookCharacters || []).filter(c => c.id !== id),
          updatedAt: new Date(),
        },
      })
    }
  },

  setExtractedElements: (elements: ExtractedElements) => {
    const { project } = get()
    if (project) {
      // Split extracted characters by role
      const mainCharacters: StorybookCharacter[] = elements.characters
        .filter(char => char.role === 'main')
        .map(char => ({
          id: generateId(),
          name: char.name,
          tag: `@${char.name.replace(/\s+/g, '')}`,
          description: char.description || '',
        }))

      // Supporting characters go to storyCharacters array
      const supportingCharacters: StoryCharacter[] = elements.characters
        .filter(char => char.role === 'supporting')
        .map(char => ({
          id: generateId(),
          name: char.name,
          role: 'other' as const, // CharacterRole type for store
          description: char.description || '',
        }))

      // Build unified bookCharacters from both
      const mainBookChars: BookCharacter[] = mainCharacters.map(c => ({
        id: c.id,
        name: c.name,
        tag: c.tag,
        role: 'protagonist' as const,
        description: c.description,
      }))
      const supportBookChars: BookCharacter[] = supportingCharacters.map(c => ({
        id: c.id,
        name: c.name,
        tag: `@${c.name.replace(/\s+/g, '')}`,
        role: 'supporting' as const,
        characterRole: c.role,
        description: c.description,
      }))

      set({
        project: {
          ...project,
          extractedCharacters: elements.characters,
          extractedLocations: elements.locations,
          characters: mainCharacters,
          storyCharacters: [...(project.storyCharacters || []), ...supportingCharacters],
          bookCharacters: [...mainBookChars, ...supportBookChars],
          updatedAt: new Date(),
        },
      })
    }
  },
})
