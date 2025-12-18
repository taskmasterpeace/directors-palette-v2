/**
 * Scene Types
 * JSON schema types for the storybook scene prompting language
 */

import type { CharacterExpression, CharacterPosition, CameraShot, CameraAngle } from './storybook.types'

// Scene mood options
export type SceneMood =
  | 'happy'
  | 'sad'
  | 'tense'
  | 'peaceful'
  | 'mysterious'
  | 'exciting'
  | 'scary'
  | 'romantic'
  | 'funny'
  | 'dramatic'

// Lighting options
export type SceneLighting =
  | 'bright'
  | 'dim'
  | 'moonlit'
  | 'sunlit'
  | 'golden-hour'
  | 'candlelit'
  | 'dramatic'
  | 'soft'
  | 'natural'

// Time of day
export type TimeOfDay =
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'night'
  | 'dawn'
  | 'dusk'

// Character action in scene
export interface SceneCharacterAction {
  name: string // @CharacterName
  expression: CharacterExpression
  pose?: string // Description of pose/action
  target?: string // @CharacterName they're interacting with
  position: CharacterPosition
  action?: string // What they're doing (running, sitting, etc.)
}

// Full scene description
export interface SceneDescription {
  location: string
  mood?: SceneMood
  lighting?: SceneLighting
  timeOfDay?: TimeOfDay
  weather?: string
  details?: string // Additional scene details
}

// Camera settings for the scene
export interface SceneCamera {
  shot: CameraShot
  angle: CameraAngle
  focus?: string // What to focus on
}

// Complete scene specification
export interface SceneSpec {
  scene: SceneDescription
  characters: SceneCharacterAction[]
  camera: SceneCamera
  styleNotes?: string // Additional style instructions
}

// Prompt builder result
export interface BuiltPrompt {
  prompt: string
  characterRefs: string[] // @names used in the prompt
}

/**
 * Build a text prompt from a SceneSpec
 */
export function buildPromptFromScene(spec: SceneSpec, styleName?: string): BuiltPrompt {
  const lines: string[] = []
  const characterRefs: string[] = []

  // Scene line
  const sceneParts = [spec.scene.location]
  if (spec.scene.timeOfDay) sceneParts.push(spec.scene.timeOfDay)
  if (spec.scene.lighting) sceneParts.push(`${spec.scene.lighting} lighting`)
  if (spec.scene.mood) sceneParts.push(`${spec.scene.mood} mood`)
  if (spec.scene.weather) sceneParts.push(spec.scene.weather)
  lines.push(`Scene: ${sceneParts.join(', ')}`)
  if (spec.scene.details) {
    lines.push(spec.scene.details)
  }

  // Characters
  for (const char of spec.characters) {
    const charParts = [char.name]
    characterRefs.push(char.name)

    const details: string[] = []
    if (char.expression) details.push(char.expression)
    if (char.pose) details.push(char.pose)
    if (char.action) details.push(char.action)
    if (char.target) {
      details.push(`toward ${char.target}`)
      if (!characterRefs.includes(char.target)) {
        characterRefs.push(char.target)
      }
    }

    if (details.length > 0) {
      charParts.push(`(${details.join(', ')})`)
    }
    charParts.push(`on ${char.position}`)

    lines.push(charParts.join(' '))
  }

  // Camera
  lines.push(`Camera: ${spec.camera.shot} shot, ${spec.camera.angle}`)
  if (spec.camera.focus) {
    lines.push(`Focus on: ${spec.camera.focus}`)
  }

  // Style
  if (styleName) {
    lines.push(`Style: ${styleName}`)
  }
  if (spec.styleNotes) {
    lines.push(spec.styleNotes)
  }

  // Reference instruction
  lines.push('Use attached character sheets for consistency.')

  return {
    prompt: lines.join('\n'),
    characterRefs,
  }
}

/**
 * Parse natural text into a basic SceneSpec (simplified parser)
 * This will be enhanced with AI assistance in production
 */
export function parseTextToScene(text: string): Partial<SceneSpec> {
  // Extract @mentions
  const mentionRegex = /@(\w+)/g
  const mentions = [...text.matchAll(mentionRegex)].map(m => `@${m[1]}`)

  // Basic character extraction
  const characters: SceneCharacterAction[] = mentions.map((name, index) => ({
    name,
    expression: 'neutral' as CharacterExpression,
    position: index === 0 ? 'left' : index === 1 ? 'right' : 'center' as CharacterPosition,
  }))

  // Detect mood from keywords
  let mood: SceneMood | undefined
  const moodKeywords: Record<string, SceneMood> = {
    happy: 'happy',
    sad: 'sad',
    scared: 'scary',
    afraid: 'scary',
    excited: 'exciting',
    mysterious: 'mysterious',
    peaceful: 'peaceful',
    funny: 'funny',
    dramatic: 'dramatic',
    romantic: 'romantic',
  }
  for (const [keyword, moodValue] of Object.entries(moodKeywords)) {
    if (text.toLowerCase().includes(keyword)) {
      mood = moodValue
      break
    }
  }

  // Detect expressions from keywords
  const expressionKeywords: Record<string, CharacterExpression> = {
    whispered: 'whispering',
    whisper: 'whispering',
    shouted: 'shouting',
    shout: 'shouting',
    yelled: 'shouting',
    smiled: 'happy',
    laughed: 'happy',
    cried: 'sad',
    frowned: 'sad',
    surprised: 'surprised',
    angry: 'angry',
    mad: 'angry',
    confident: 'confident',
    smug: 'smug',
    spoke: 'speaking',
    said: 'speaking',
    asked: 'speaking',
  }

  // Update character expressions based on context
  for (const char of characters) {
    for (const [keyword, expression] of Object.entries(expressionKeywords)) {
      if (text.toLowerCase().includes(keyword)) {
        char.expression = expression
        break
      }
    }
  }

  return {
    scene: {
      location: 'scene location', // Will be filled by AI or user
      mood,
    },
    characters,
    camera: {
      shot: 'medium',
      angle: 'eye-level',
    },
  }
}
