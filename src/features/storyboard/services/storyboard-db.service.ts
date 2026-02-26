import Dexie, { type Table } from 'dexie'

export interface StoryboardProject {
  id?: number
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface StoredPrompts {
  id?: number
  projectId: number
  prompts: Array<{
    sequence: number
    prompt: string
    shotType: string
    originalText?: string
    characterRefs?: string[]
    locationRef?: { name: string; tag: string; reference_image_url?: string }
  }>
}

export interface StoredImages {
  id?: number
  projectId: number
  images: Record<number, {
    sequence: number
    status: string
    imageUrl?: string
    prompt: string
    config?: Record<string, unknown>
    videoStatus?: string
    videoUrl?: string
    animationPrompt?: string
    videoPredictionId?: string
  }>
}

export interface StoredChapters {
  id?: number
  projectId: number
  chapters: unknown[] // StoryChapter[]
  documentaryChapters: unknown[] // DocumentaryChapter[]
}

export interface StoredBreakdown {
  id?: number
  projectId: number
  breakdown: unknown // BreakdownResult
  level: number
}

class StoryboardDatabase extends Dexie {
  projects!: Table<StoryboardProject>
  prompts!: Table<StoredPrompts>
  images!: Table<StoredImages>
  chapters!: Table<StoredChapters>
  breakdowns!: Table<StoredBreakdown>

  constructor() {
    super('storyboard-projects')
    this.version(1).stores({
      projects: '++id, name, updatedAt',
      prompts: '++id, projectId',
      images: '++id, projectId',
      chapters: '++id, projectId',
      breakdowns: '++id, projectId',
    })
  }
}

export const storyboardDb = new StoryboardDatabase()
