'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useStoryboardStore } from '../store'
import {
  createProject,
  savePrompts,
  saveImages,
  saveChapters,
  saveBreakdown,
  saveProjectState,
  loadPrompts,
  loadImages,
  loadChapters,
  loadBreakdown,
  loadProjectState,
  updateProjectTimestamp,
} from '../services/storyboard-db.service'
import { createLogger } from '@/lib/logger'

const log = createLogger('StoryboardPersist')

export function useStoryboardPersistence() {
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const activeProjectId = useStoryboardStore(s => s.activeProjectId)
  const setActiveProjectId = useStoryboardStore(s => s.setActiveProjectId)

  // Monitored state
  const generatedPrompts = useStoryboardStore(s => s.generatedPrompts)
  const generatedImages = useStoryboardStore(s => s.generatedImages)
  const chapters = useStoryboardStore(s => s.chapters)
  const documentaryChapters = useStoryboardStore(s => s.documentaryChapters)
  const breakdownResult = useStoryboardStore(s => s.breakdownResult)
  const breakdownLevel = useStoryboardStore(s => s.breakdownLevel)
  const storyText = useStoryboardStore(s => s.storyText)

  // Additional state fields to persist per-project
  const characters = useStoryboardStore(s => s.characters)
  const locations = useStoryboardStore(s => s.locations)
  const selectedPresetStyle = useStoryboardStore(s => s.selectedPresetStyle)
  const currentStyleGuide = useStoryboardStore(s => s.currentStyleGuide)
  const extractionResult = useStoryboardStore(s => s.extractionResult)
  const selectedModel = useStoryboardStore(s => s.selectedModel)
  const selectedDirectorId = useStoryboardStore(s => s.selectedDirectorId)
  const generationSettings = useStoryboardStore(s => s.generationSettings)
  const globalPromptPrefix = useStoryboardStore(s => s.globalPromptPrefix)
  const globalPromptSuffix = useStoryboardStore(s => s.globalPromptSuffix)
  const shotNotes = useStoryboardStore(s => s.shotNotes)
  const isDocumentaryMode = useStoryboardStore(s => s.isDocumentaryMode)

  // Auto-save to IndexedDB (debounced 1s)
  const persistToDb = useCallback(async () => {
    if (!activeProjectId) return

    try {
      if (generatedPrompts.length > 0) {
        // Cast needed: GeneratedShotPrompt has richer types than StoredPrompts
        await savePrompts(activeProjectId, generatedPrompts as unknown as Parameters<typeof savePrompts>[1])
      }
      if (Object.keys(generatedImages).length > 0) {
        await saveImages(activeProjectId, generatedImages as unknown as Parameters<typeof saveImages>[1])
      }
      if (chapters.length > 0 || documentaryChapters.length > 0) {
        await saveChapters(activeProjectId, chapters as unknown[], documentaryChapters as unknown[])
      }
      if (breakdownResult) {
        await saveBreakdown(activeProjectId, breakdownResult, breakdownLevel)
      }

      // Save full project state (story text, settings, etc.)
      await saveProjectState(activeProjectId, {
        storyText,
        breakdownLevel,
        characters: characters as unknown[],
        locations: locations as unknown[],
        selectedPresetStyle,
        currentStyleGuide,
        extractionResult,
        selectedModel,
        selectedDirectorId,
        generationSettings,
        globalPromptPrefix,
        globalPromptSuffix,
        shotNotes,
        isDocumentaryMode,
      })

      await updateProjectTimestamp(activeProjectId)
      log.debug('Auto-saved to IndexedDB', { projectId: activeProjectId })
    } catch (err) {
      log.error('Failed to auto-save', { error: err instanceof Error ? err.message : String(err) })
    }
  }, [activeProjectId, generatedPrompts, generatedImages, chapters, documentaryChapters, breakdownResult, breakdownLevel, storyText, characters, locations, selectedPresetStyle, currentStyleGuide, extractionResult, selectedModel, selectedDirectorId, generationSettings, globalPromptPrefix, globalPromptSuffix, shotNotes, isDocumentaryMode])

  // Debounced save on state change
  useEffect(() => {
    if (!activeProjectId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(persistToDb, 1000)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [activeProjectId, persistToDb])

  // Auto-create project when story text is first set
  useEffect(() => {
    if (!activeProjectId && storyText && storyText.length > 50) {
      const name = storyText.slice(0, 40).replace(/\n/g, ' ').trim() + '...'
      createProject(name).then(id => {
        setActiveProjectId(id)
        log.info('Auto-created project', { id, name })
      })
    }
  }, [activeProjectId, storyText, setActiveProjectId])

  // Restore from IndexedDB
  const restoreProject = useCallback(async (projectId: number) => {
    const store = useStoryboardStore.getState()
    try {
      const [prompts, images, _chapterData, breakdownData, projectState] = await Promise.all([
        loadPrompts(projectId),
        loadImages(projectId),
        loadChapters(projectId),
        loadBreakdown(projectId),
        loadProjectState(projectId),
      ])

      // Restore project state (story text, settings, entities, etc.)
      if (projectState) {
        store.setStoryText(projectState.storyText || '')
        store.setBreakdownLevel(projectState.breakdownLevel as Parameters<typeof store.setBreakdownLevel>[0])
        if (projectState.characters && Array.isArray(projectState.characters)) {
          store.setCharacters(projectState.characters as Parameters<typeof store.setCharacters>[0])
        }
        if (projectState.locations && Array.isArray(projectState.locations)) {
          store.setLocations(projectState.locations as Parameters<typeof store.setLocations>[0])
        }
        store.setSelectedPresetStyle(projectState.selectedPresetStyle)
        store.setCurrentStyleGuide(projectState.currentStyleGuide as Parameters<typeof store.setCurrentStyleGuide>[0])
        store.setExtractionResult(projectState.extractionResult as Parameters<typeof store.setExtractionResult>[0])
        store.setSelectedModel(projectState.selectedModel || 'nano-banana-2')
        store.setSelectedDirector(projectState.selectedDirectorId)
        store.setGenerationSettings(projectState.generationSettings as Parameters<typeof store.setGenerationSettings>[0])
        store.setGlobalPromptPrefix(projectState.globalPromptPrefix || '')
        store.setGlobalPromptSuffix(projectState.globalPromptSuffix || '')
        if (projectState.shotNotes) {
          // Restore shot notes one by one
          for (const [seq, note] of Object.entries(projectState.shotNotes)) {
            store.setShotNote(Number(seq), note as string)
          }
        }
        store.setDocumentaryMode(projectState.isDocumentaryMode || false)
      }

      if (prompts && prompts.length > 0) {
        store.addGeneratedPrompts(prompts as unknown as Parameters<typeof store.addGeneratedPrompts>[0])
      }
      if (images && Object.keys(images).length > 0) {
        for (const [seq, img] of Object.entries(images)) {
          store.setGeneratedImage(Number(seq), img as unknown as Parameters<typeof store.setGeneratedImage>[1])
        }
      }
      if (breakdownData) {
        store.setBreakdownResult(breakdownData.breakdown as Parameters<typeof store.setBreakdownResult>[0])
      }

      log.info('Restored project from IndexedDB', { projectId })
    } catch (err) {
      log.error('Failed to restore project', { error: err instanceof Error ? err.message : String(err) })
    }
  }, [])

  // Restore on mount if activeProjectId is set
  useEffect(() => {
    if (activeProjectId) {
      restoreProject(activeProjectId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // only on mount

  return { restoreProject }
}
