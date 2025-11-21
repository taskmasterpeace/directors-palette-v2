
// Settings configuration types
export interface ShotAnimatorSettings {
    id?: string
    modelSettings?: {
        'seedance-lite': {
            duration: number
            resolution: '480p' | '720p' | '1080p'
            aspectRatio: '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | '9:21'
            fps: number
            cameraFixed: boolean
            seed?: number
        }
        'seedance-pro': {
            duration: number
            resolution: '480p' | '720p' | '1080p'
            aspectRatio: '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9' | '9:21'
            fps: number
            cameraFixed: boolean
            seed?: number
        }
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
    model?: 'nano-banana' | 'nano-banana-pro' | 'gen4-image' | 'gen4-image-turbo' | 'seedream-4' | 'qwen-image' | 'qwen-image-edit'
    maxImages?: number
    sequentialGeneration?: boolean
    promptLibrary?: PromptLibrarySettings
}

export interface SettingsConfig {
    shotCreator: ShotCreatorSettings
    shotAnimator: ShotAnimatorSettings
}