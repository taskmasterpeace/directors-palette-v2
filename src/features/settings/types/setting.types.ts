
// Model settings for shot animator
interface ModelSettingsEntry {
    duration: number
    resolution: '480p' | '720p' | '1080p'
    aspectRatio: '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | '9:21'
    fps: number
    cameraFixed: boolean
    seed?: number
}

// Settings configuration types
export interface ShotAnimatorSettings {
    id?: string
    selectedModel?: string
    modelSettings?: {
        'wan-2.2-5b-fast': ModelSettingsEntry
        'wan-2.2-i2v-fast': ModelSettingsEntry
        'seedance-pro-fast': ModelSettingsEntry
        'seedance-lite': ModelSettingsEntry
        'seedance-1.5-pro': ModelSettingsEntry
        'kling-2.5-turbo-pro': ModelSettingsEntry
        'p-video': ModelSettingsEntry
        'seedance-pro': ModelSettingsEntry  // Legacy
    }
}

export interface promptCategories {
    icon: string
    name: string
}
export interface Prompt {
    title: string
    prompt: string,
    category: string,
    tags: string[],
    quickAccess: boolean
}
export interface PromptLibrarySettings {
    categories: promptCategories[]
    prompts: Prompt[]
    quickPrompts?: Prompt[] // Optional for backward compatibility
}
export interface ShotCreatorSettings {
    id?: string
    aspectRatio: string
    resolution: string
    seed?: number
    model?: 'nano-banana-2' | 'z-image-turbo' | 'seedream-5-lite' | 'riverflow-2-pro'
    maxImages?: number
    sequentialGeneration?: boolean
    promptLibrary?: PromptLibrarySettings
    safetyFilterLevel?: string
    personGeneration?: string
}

export interface SettingsConfig {
    shotCreator: ShotCreatorSettings
    shotAnimator: ShotAnimatorSettings
}