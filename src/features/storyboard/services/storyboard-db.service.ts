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

/** Full project state saved to IndexedDB (fields that were previously only in localStorage) */
export interface StoredProjectState {
  id?: number
  projectId: number
  storyText: string
  breakdownLevel: number
  characters: unknown[]
  locations: unknown[]
  selectedPresetStyle: string | null
  currentStyleGuide: unknown | null
  extractionResult: unknown | null
  selectedModel: string
  selectedDirectorId: string | null
  generationSettings: unknown
  globalPromptPrefix: string
  globalPromptSuffix: string
  shotNotes: Record<number, string>
  isDocumentaryMode: boolean
}

class StoryboardDatabase extends Dexie {
  projects!: Table<StoryboardProject>
  prompts!: Table<StoredPrompts>
  images!: Table<StoredImages>
  chapters!: Table<StoredChapters>
  breakdowns!: Table<StoredBreakdown>
  projectState!: Table<StoredProjectState>

  constructor() {
    super('storyboard-projects')
    this.version(1).stores({
      projects: '++id, name, updatedAt',
      prompts: '++id, projectId',
      images: '++id, projectId',
      chapters: '++id, projectId',
      breakdowns: '++id, projectId',
    })
    this.version(2).stores({
      projects: '++id, name, updatedAt',
      prompts: '++id, projectId',
      images: '++id, projectId',
      chapters: '++id, projectId',
      breakdowns: '++id, projectId',
      projectState: '++id, projectId',
    })
  }
}

export const storyboardDb = new StoryboardDatabase()

// ── Project CRUD ─────────────────────────────────────

export async function createProject(name: string): Promise<number> {
  const now = new Date()
  return storyboardDb.projects.add({ name, createdAt: now, updatedAt: now })
}

export async function getProject(id: number): Promise<StoryboardProject | undefined> {
  return storyboardDb.projects.get(id)
}

export async function listProjects(): Promise<StoryboardProject[]> {
  return storyboardDb.projects.orderBy('updatedAt').reverse().toArray()
}

export async function updateProjectTimestamp(id: number): Promise<void> {
  await storyboardDb.projects.update(id, { updatedAt: new Date() })
}

export async function renameProject(id: number, name: string): Promise<void> {
  await storyboardDb.projects.update(id, { name, updatedAt: new Date() })
}

export async function deleteProject(id: number): Promise<void> {
  await storyboardDb.transaction('rw', [storyboardDb.projects, storyboardDb.prompts, storyboardDb.images, storyboardDb.chapters, storyboardDb.breakdowns, storyboardDb.projectState], async () => {
    await storyboardDb.prompts.where('projectId').equals(id).delete()
    await storyboardDb.images.where('projectId').equals(id).delete()
    await storyboardDb.chapters.where('projectId').equals(id).delete()
    await storyboardDb.breakdowns.where('projectId').equals(id).delete()
    await storyboardDb.projectState.where('projectId').equals(id).delete()
    await storyboardDb.projects.delete(id)
  })
}

// ── Data persistence ─────────────────────────────────

export async function savePrompts(projectId: number, prompts: StoredPrompts['prompts']): Promise<void> {
  const existing = await storyboardDb.prompts.where('projectId').equals(projectId).first()
  if (existing?.id) {
    await storyboardDb.prompts.update(existing.id, { prompts })
  } else {
    await storyboardDb.prompts.add({ projectId, prompts })
  }
  await updateProjectTimestamp(projectId)
}

export async function loadPrompts(projectId: number): Promise<StoredPrompts['prompts'] | null> {
  const record = await storyboardDb.prompts.where('projectId').equals(projectId).first()
  return record?.prompts ?? null
}

export async function saveImages(projectId: number, images: StoredImages['images']): Promise<void> {
  const existing = await storyboardDb.images.where('projectId').equals(projectId).first()
  if (existing?.id) {
    await storyboardDb.images.update(existing.id, { images })
  } else {
    await storyboardDb.images.add({ projectId, images })
  }
  await updateProjectTimestamp(projectId)
}

export async function loadImages(projectId: number): Promise<StoredImages['images'] | null> {
  const record = await storyboardDb.images.where('projectId').equals(projectId).first()
  return record?.images ?? null
}

export async function saveChapters(projectId: number, chapters: unknown[], documentaryChapters: unknown[]): Promise<void> {
  const existing = await storyboardDb.chapters.where('projectId').equals(projectId).first()
  if (existing?.id) {
    await storyboardDb.chapters.update(existing.id, { chapters, documentaryChapters })
  } else {
    await storyboardDb.chapters.add({ projectId, chapters, documentaryChapters })
  }
  await updateProjectTimestamp(projectId)
}

export async function loadChapters(projectId: number): Promise<{ chapters: unknown[]; documentaryChapters: unknown[] } | null> {
  const record = await storyboardDb.chapters.where('projectId').equals(projectId).first()
  return record ? { chapters: record.chapters, documentaryChapters: record.documentaryChapters } : null
}

export async function saveBreakdown(projectId: number, breakdown: unknown, level: number): Promise<void> {
  const existing = await storyboardDb.breakdowns.where('projectId').equals(projectId).first()
  if (existing?.id) {
    await storyboardDb.breakdowns.update(existing.id, { breakdown, level })
  } else {
    await storyboardDb.breakdowns.add({ projectId, breakdown, level })
  }
  await updateProjectTimestamp(projectId)
}

export async function loadBreakdown(projectId: number): Promise<{ breakdown: unknown; level: number } | null> {
  const record = await storyboardDb.breakdowns.where('projectId').equals(projectId).first()
  return record ? { breakdown: record.breakdown, level: record.level } : null
}

// ── Project State persistence ────────────────────────

export async function saveProjectState(projectId: number, state: Omit<StoredProjectState, 'id' | 'projectId'>): Promise<void> {
  const existing = await storyboardDb.projectState.where('projectId').equals(projectId).first()
  if (existing?.id) {
    await storyboardDb.projectState.update(existing.id, { ...state })
  } else {
    await storyboardDb.projectState.add({ projectId, ...state })
  }
}

export async function loadProjectState(projectId: number): Promise<Omit<StoredProjectState, 'id' | 'projectId'> | null> {
  const record = await storyboardDb.projectState.where('projectId').equals(projectId).first()
  if (!record) return null
  const {
    storyText, breakdownLevel, characters, locations,
    selectedPresetStyle, currentStyleGuide, extractionResult,
    selectedModel, selectedDirectorId, generationSettings,
    globalPromptPrefix, globalPromptSuffix, shotNotes, isDocumentaryMode,
  } = record
  return {
    storyText, breakdownLevel, characters, locations,
    selectedPresetStyle, currentStyleGuide, extractionResult,
    selectedModel, selectedDirectorId, generationSettings,
    globalPromptPrefix, globalPromptSuffix, shotNotes, isDocumentaryMode,
  }
}

/** Estimate the size of a project's stored data in bytes */
export async function estimateProjectSize(projectId: number): Promise<number> {
  const [prompts, images, chapters, breakdowns, projectState] = await Promise.all([
    storyboardDb.prompts.where('projectId').equals(projectId).first(),
    storyboardDb.images.where('projectId').equals(projectId).first(),
    storyboardDb.chapters.where('projectId').equals(projectId).first(),
    storyboardDb.breakdowns.where('projectId').equals(projectId).first(),
    storyboardDb.projectState.where('projectId').equals(projectId).first(),
  ])
  let size = 0
  if (prompts) size += JSON.stringify(prompts).length
  if (images) size += JSON.stringify(images).length
  if (chapters) size += JSON.stringify(chapters).length
  if (breakdowns) size += JSON.stringify(breakdowns).length
  if (projectState) size += JSON.stringify(projectState).length
  return size
}
