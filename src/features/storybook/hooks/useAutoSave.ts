"use client"

import { useEffect, useRef } from 'react'
import { useStorybookStore } from '../store/storybook.store'

/**
 * Auto-save hook - saves project every 30 seconds
 * Prevents data loss during long editing sessions
 */
export function useAutoSave() {
  const { project, saveProject, isSaving } = useStorybookStore()
  const lastSavedRef = useRef<string>('')
  const saveIntervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Don't auto-save if no project or already saving
    if (!project) {
      return
    }

    // Set up auto-save interval (30 seconds)
    saveIntervalRef.current = setInterval(() => {
      // Only save if project has changed since last save
      const currentProjectString = JSON.stringify(project)

      if (currentProjectString !== lastSavedRef.current && !isSaving) {
        console.log('[Auto-Save] Saving project...', new Date().toLocaleTimeString())
        saveProject()
        lastSavedRef.current = currentProjectString
      }
    }, 30000) // 30 seconds

    // Cleanup on unmount
    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current)
      }
    }
  }, [project, saveProject, isSaving])

  // Also save on page unload/close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (project && !isSaving) {
        // Synchronous save attempt (best effort)
        const currentProjectString = JSON.stringify(project)
        if (currentProjectString !== lastSavedRef.current) {
          console.log('[Auto-Save] Saving on page close...')
          saveProject()
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [project, saveProject, isSaving])

  return null
}
