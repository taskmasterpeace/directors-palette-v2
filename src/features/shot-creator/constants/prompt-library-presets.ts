// Nano-Banana Model Specific Prompts for Director's Palette
// These prompts are optimized for the nano-banana model's capabilities

export interface PromptPreset {
  id: string
  title: string
  prompt: string
  categoryId: string
  tags: string[]
  isQuickAccess?: boolean
  reference?: string
}

export const PROMPT_CATEGORIES = [
  { id: 'cinematic', name: 'Cinematic Shots', icon: '🎬' },
  { id: 'characters', name: 'Character Styles', icon: '👤' },
  { id: 'lighting', name: 'Lighting Setups', icon: '💡' },
  { id: 'environments', name: 'Environments', icon: '🏞️' },
  { id: 'effects', name: 'Special Effects', icon: '✨' },
  { id: 'moods', name: 'Moods & Atmosphere', icon: '🎭' },
  { id: 'camera', name: 'Camera Angles', icon: '📷' },
  { id: 'styles', name: 'Art Styles', icon: '🎨' }
]

export const NANO_BANANA_PROMPTS: PromptPreset[] = [
]

// Function to get prompts by category
export function getPromptsByCategory(categoryId: string): PromptPreset[] {
  return NANO_BANANA_PROMPTS.filter(prompt => prompt.categoryId === categoryId)
}

// Function to get quick access prompts
export function getQuickAccessPrompts(): PromptPreset[] {
  return NANO_BANANA_PROMPTS.filter(prompt => prompt.isQuickAccess)
}

// Function to search prompts
export function searchPrompts(query: string): PromptPreset[] {
  const lowerQuery = query.toLowerCase()
  return NANO_BANANA_PROMPTS.filter(prompt =>
    prompt.title.toLowerCase().includes(lowerQuery) ||
    prompt.prompt.toLowerCase().includes(lowerQuery) ||
    prompt.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  )
}