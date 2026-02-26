'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useStoryboardStore } from '../store'
import {
  createProject,
  savePrompts,
  saveImages,
  saveChapters,
  saveBreakdown,
  loadPrompts,
  loadImages,
  loadChapters,
  loadBreakdown,
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
      await updateProjectTimestamp(activeProjectId)
      log.debug('Auto-saved to IndexedDB', { projectId: activeProjectId })
    } catch (err) {
      log.error('Failed to auto-save', { error: err instanceof Error ? err.message : String(err) })
    }
  }, [activeProjectId, generatedPrompts, generatedImages, chapters, documentaryChapters, breakdownResult, breakdownLevel])

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
      const [prompts, images, _chapterData, breakdownData] = await Promise.all([
        loadPrompts(projectId),
        loadImages(projectId),
        loadChapters(projectId),
        loadBreakdown(projectId),
      ])

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
